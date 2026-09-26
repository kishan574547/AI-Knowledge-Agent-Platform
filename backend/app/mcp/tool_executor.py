"""
MCP Tool Executor.

Controls:
- Maximum tool calls per agent turn (loop protection)
- Validates arguments before execution
- Enforces owner_id always from authenticated user
- Logs every tool execution attempt
"""
from __future__ import annotations

import uuid
import logging
import time
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.tools.base import ToolResult, PermissionLevel
from app.tools.registry import ToolRegistry
from app.mcp.validators import validate_tool_arguments

logger = logging.getLogger("mcp.executor")

MAX_TOOL_CALLS_PER_TURN = 5          # Hard limit per agent turn
TOOL_EXECUTION_TIMEOUT_SEC = 30.0    # Max seconds for a single tool


class ToolExecutionRecord:
    def __init__(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        result: ToolResult,
        duration_ms: float,
    ):
        self.tool_name = tool_name
        self.arguments = arguments
        self.result = result
        self.duration_ms = duration_ms


class ToolExecutor:
    def __init__(self, db: Session, owner_id: uuid.UUID):
        self.db = db
        # owner_id is always sourced from authenticated backend user — NEVER from LLM
        self._owner_id = owner_id
        self._call_count = 0
        self.execution_log: List[ToolExecutionRecord] = []
        self._registry = ToolRegistry.get()

    @property
    def calls_remaining(self) -> int:
        return MAX_TOOL_CALLS_PER_TURN - self._call_count

    def execute(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
    ) -> ToolResult:
        """
        Executes a tool with full validation and ownership enforcement.
        Never executes if call limit is reached.
        Never trusts owner_id from arguments.
        """
        # 1. Loop protection
        if self._call_count >= MAX_TOOL_CALLS_PER_TURN:
            logger.warning("Tool call limit reached (%d) for user %s", MAX_TOOL_CALLS_PER_TURN, self._owner_id)
            return ToolResult.fail(
                f"Maximum tool call limit ({MAX_TOOL_CALLS_PER_TURN}) reached for this turn."
            )

        # 2. Tool lookup
        tool = self._registry.get_tool(tool_name)
        if not tool:
            logger.warning("Unknown tool requested: '%s' by user %s", tool_name, self._owner_id)
            return ToolResult.fail(f"Unknown tool: '{tool_name}'")

        # 3. Strip any owner_id from LLM-generated arguments (security: never trust it)
        sanitized_args = {k: v for k, v in arguments.items() if k != "owner_id"}

        # 4. Validate arguments against schema
        is_valid, error_msg = validate_tool_arguments(
            tool_name=tool_name,
            arguments=sanitized_args,
            input_schema=tool.schema.input_schema,
        )
        if not is_valid:
            logger.warning("Argument validation failed for tool '%s': %s", tool_name, error_msg)
            return ToolResult.fail(f"Argument validation failed: {error_msg}")

        # 5. Execute tool (owner_id always from authenticated user)
        self._call_count += 1
        t_start = time.perf_counter()

        try:
            result = tool.execute(
                arguments=sanitized_args,
                owner_id=self._owner_id,   # ALWAYS authenticated user, not from LLM
                db=self.db,
            )
        except Exception as e:
            logger.error("Unhandled error in tool '%s': %s", tool_name, str(e), exc_info=True)
            result = ToolResult.fail(f"Tool execution error: {str(e)}")

        duration_ms = (time.perf_counter() - t_start) * 1000
        self.execution_log.append(
            ToolExecutionRecord(
                tool_name=tool_name,
                arguments=sanitized_args,
                result=result,
                duration_ms=round(duration_ms, 2),
            )
        )

        logger.info(
            "Tool '%s' executed in %.1fms for user %s — success=%s",
            tool_name,
            duration_ms,
            str(self._owner_id),
            result.success,
        )
        return result
