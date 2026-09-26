"""
MCP Tool-Calling Agent.

Implements the full agent loop:
  User input
    -> Build prompt with tool descriptions
    -> Call Gemini
    -> Parse tool call or confirmation request from response
    -> Validate arguments
    -> Check permission (READ=auto, WRITE=require confirmation)
    -> Execute tool via ToolExecutor
    -> Append tool result to conversation
    -> Final Gemini response
    -> Return to user

Security:
  - owner_id is always from authenticated user
  - Max 5 tool calls per turn
  - Prompt injection defended in system prompt and validators
  - Retrieved content treated as untrusted data
"""
from __future__ import annotations

import re
import json
import uuid
import logging
from typing import Any, Dict, List, Optional, Tuple
from enum import Enum
from dataclasses import dataclass, field
from sqlalchemy.orm import Session

from app.agents.prompt_builder import build_system_prompt, build_user_message
from app.mcp.tool_executor import ToolExecutor, MAX_TOOL_CALLS_PER_TURN
from app.tools.base import PermissionLevel
from app.tools.registry import ToolRegistry
from app.core.errors import AppSecurityException

logger = logging.getLogger("agents.tool_calling_agent")

_TOOL_CALL_RE = re.compile(
    r"```tool_call\s*([\s\S]+?)```",
    re.MULTILINE,
)
_CONFIRM_RE = re.compile(
    r"```confirmation_request\s*([\s\S]+?)```",
    re.MULTILINE,
)


class AgentEventType(str, Enum):
    TEXT = "text"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    CONFIRMATION_REQUEST = "confirmation_request"
    ERROR = "error"


@dataclass
class AgentEvent:
    type: AgentEventType
    content: Any = None
    tool_name: Optional[str] = None
    arguments: Optional[Dict[str, Any]] = None
    success: Optional[bool] = None
    summary: Optional[str] = None


@dataclass
class AgentResponse:
    final_answer: str
    events: List[AgentEvent] = field(default_factory=list)
    pending_confirmation: Optional[Dict[str, Any]] = None
    tool_calls_made: int = 0
    requires_confirmation: bool = False


class ToolCallingAgent:
    def __init__(self, db: Session, owner_id: uuid.UUID):
        self.db = db
        self.owner_id = owner_id  # Always from authenticated backend user
        self.executor = ToolExecutor(db=db, owner_id=owner_id)
        self.registry = ToolRegistry.get()
        self._system_prompt = build_system_prompt(max_tool_calls=MAX_TOOL_CALLS_PER_TURN)

    def _call_gemini(self, messages: List[Dict[str, str]], system_prompt: str) -> str:
        """Calls the Gemini model with the conversation history."""
        try:
            from app.core.config import settings
            from google import genai
            from google.genai import types

            if not settings.GEMINI_API_KEY:
                raise AppSecurityException("LLM service not configured")

            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            contents = "\n\n".join(
                f"{'USER' if m['role'] == 'user' else 'ASSISTANT'}: {m['content']}"
                for m in messages
            )

            config = types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.2,
                max_output_tokens=2000,
            )

            models_to_try = [
                settings.GEMINI_MODEL,
                "gemini-3.5-flash",
                "gemini-3.5-flash-lite",
                "gemini-3.6-flash",
                "gemini-3.1-flash-lite",
            ]
            candidate_models = list(dict.fromkeys(models_to_try))

            last_err = None
            for model in candidate_models:
                try:
                    response = client.models.generate_content(
                        model=model,
                        contents=contents,
                        config=config,
                    )
                    if response and response.text:
                        return response.text.strip()
                except Exception as e:
                    last_err = e
                    logger.warning("Gemini model %s failed: %s", model, str(e))
                    continue

            raise AppSecurityException("All Gemini models failed. Please try again later.")
        except AppSecurityException:
            raise
        except Exception as e:
            logger.error("Gemini call error: %s", str(e))
            raise AppSecurityException("Error communicating with AI service")

    def _parse_tool_call(self, text: str) -> Optional[Tuple[str, Dict[str, Any]]]:
        """Extracts and parses a tool_call JSON block from the model response."""
        match = _TOOL_CALL_RE.search(text)
        if not match:
            return None
        try:
            data = json.loads(match.group(1).strip())
            tool_name = str(data.get("tool", "")).strip()
            arguments = data.get("arguments", {})
            if not isinstance(arguments, dict):
                arguments = {}
            return tool_name, arguments
        except (json.JSONDecodeError, AttributeError) as e:
            logger.warning("Failed to parse tool_call JSON: %s", str(e))
            return None

    def _parse_confirmation_request(self, text: str) -> Optional[Dict[str, Any]]:
        """Extracts a confirmation_request JSON block."""
        match = _CONFIRM_RE.search(text)
        if not match:
            return None
        try:
            data = json.loads(match.group(1).strip())
            return data
        except (json.JSONDecodeError, AttributeError):
            return None

    def _strip_code_blocks(self, text: str) -> str:
        """Removes tool_call and confirmation_request code blocks from display text."""
        text = _TOOL_CALL_RE.sub("", text)
        text = _CONFIRM_RE.sub("", text)
        return text.strip()

    def chat(self, user_message: str) -> AgentResponse:
        """
        Main agent entry point for a new message (no pending confirmation).
        """
        sanitized_input = build_user_message(user_message)
        messages: List[Dict[str, str]] = [
            {"role": "user", "content": sanitized_input}
        ]
        events: List[AgentEvent] = []

        return self._run_agent_loop(messages=messages, events=events)

    def confirm_and_execute(
        self,
        pending: Dict[str, Any],
        user_message: str,
    ) -> AgentResponse:
        """
        Executes a pending WRITE tool after user has confirmed.
        """
        tool_name = str(pending.get("tool", "")).strip()
        arguments = pending.get("arguments", {})
        events: List[AgentEvent] = []

        # Verify it is indeed a WRITE tool
        tool = self.registry.get_tool(tool_name)
        if not tool:
            return AgentResponse(
                final_answer=f"Tool '{tool_name}' no longer available.",
                events=events,
            )
        if tool.permission_level != PermissionLevel.WRITE:
            return AgentResponse(
                final_answer="Confirmation not required for this tool.",
                events=events,
            )

        # Execute the confirmed tool
        events.append(AgentEvent(
            type=AgentEventType.TOOL_CALL,
            tool_name=tool_name,
            arguments=arguments,
        ))

        result = self.executor.execute(tool_name=tool_name, arguments=arguments)
        events.append(AgentEvent(
            type=AgentEventType.TOOL_RESULT,
            tool_name=tool_name,
            success=result.success,
            summary=result.summary,
            content=result.data if result.success else result.error,
        ))

        # Build final answer from result
        if result.success:
            summary = result.summary or "Done."
            data_str = json.dumps(result.data, indent=2, default=str) if result.data else ""
            context = f"Tool '{tool_name}' result:\n{summary}"
            if data_str:
                context += f"\n\nDetails:\n{data_str}"
            messages = [
                {"role": "user", "content": f"The user confirmed the action. {context}"},
            ]
            try:
                final = self._call_gemini(messages, self._system_prompt)
                final = self._strip_code_blocks(final)
            except Exception:
                final = summary
        else:
            final = f"Sorry, the action failed: {result.error}"

        return AgentResponse(
            final_answer=final,
            events=events,
            tool_calls_made=len(self.executor.execution_log),
        )

    def _run_agent_loop(
        self,
        messages: List[Dict[str, str]],
        events: List[AgentEvent],
    ) -> AgentResponse:
        """
        Core agent loop:
        1. Call Gemini
        2. Check response for tool_call or confirmation_request
        3. If READ tool → execute immediately and loop
        4. If WRITE tool → return confirmation_request to user
        5. If no tool → return final answer
        """
        iteration = 0
        max_iterations = MAX_TOOL_CALLS_PER_TURN + 1

        while iteration < max_iterations:
            iteration += 1

            try:
                raw_response = self._call_gemini(messages, self._system_prompt)
            except AppSecurityException as e:
                return AgentResponse(
                    final_answer=f"AI service error: {str(e.detail)}",
                    events=events,
                )

            # Check for tool call
            parsed_tool = self._parse_tool_call(raw_response)
            if parsed_tool:
                tool_name, arguments = parsed_tool
                tool = self.registry.get_tool(tool_name)

                if not tool:
                    # Unknown tool — treat as text response
                    events.append(AgentEvent(type=AgentEventType.ERROR, content=f"Unknown tool: {tool_name}"))
                    break

                events.append(AgentEvent(
                    type=AgentEventType.TOOL_CALL,
                    tool_name=tool_name,
                    arguments=arguments,
                ))

                if tool.permission_level == PermissionLevel.WRITE:
                    # WRITE tool — check if we have a confirmation block
                    confirm_data = self._parse_confirmation_request(raw_response)
                    pending = confirm_data or {
                        "tool": tool_name,
                        "arguments": arguments,
                        "action": f"Execute {tool_name} with the provided arguments",
                    }
                    display_text = self._strip_code_blocks(raw_response)
                    if not display_text:
                        display_text = f"I'd like to {tool.description.lower()}. Shall I proceed?"
                    return AgentResponse(
                        final_answer=display_text,
                        events=events,
                        pending_confirmation=pending,
                        requires_confirmation=True,
                        tool_calls_made=self.executor._call_count,
                    )

                # READ tool — execute immediately
                result = self.executor.execute(tool_name=tool_name, arguments=arguments)
                events.append(AgentEvent(
                    type=AgentEventType.TOOL_RESULT,
                    tool_name=tool_name,
                    success=result.success,
                    summary=result.summary,
                    content=result.data if result.success else result.error,
                ))

                # Append result to conversation for next iteration
                result_content = json.dumps(result.data, default=str) if result.success else result.error
                tool_result_msg = f"Tool '{tool_name}' result (success={result.success}):\n{result.summary or ''}\nData: {result_content}"
                messages.append({"role": "assistant", "content": raw_response})
                messages.append({"role": "user", "content": f"TOOL_RESULT: {tool_result_msg}\nNow provide a helpful answer to the user based on these results."})
                continue

            # Check for confirmation request without tool call block
            confirm_data = self._parse_confirmation_request(raw_response)
            if confirm_data and confirm_data.get("tool"):
                display_text = self._strip_code_blocks(raw_response)
                return AgentResponse(
                    final_answer=display_text or "Awaiting your confirmation.",
                    events=events,
                    pending_confirmation=confirm_data,
                    requires_confirmation=True,
                    tool_calls_made=self.executor._call_count,
                )

            # No tool call — this is the final answer
            final_text = self._strip_code_blocks(raw_response)
            if not final_text:
                final_text = raw_response
            return AgentResponse(
                final_answer=final_text,
                events=events,
                tool_calls_made=self.executor._call_count,
            )

        # Max iterations reached
        return AgentResponse(
            final_answer="I've reached the maximum number of steps for this turn. Please try a more specific question.",
            events=events,
            tool_calls_made=self.executor._call_count,
        )
