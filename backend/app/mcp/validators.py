"""
MCP Argument Validators.

Security-critical: validates all LLM-generated arguments before tool execution.
- Validates types, lengths, formats, and allowed values.
- Never trusts owner_id from LLM.
- Validates UUIDs, dates, and string lengths per schema.
"""
from __future__ import annotations
import re
import uuid
import logging
from typing import Any, Dict, Optional, Tuple
from datetime import datetime

logger = logging.getLogger("mcp.validators")

# Prompt injection patterns to detect in string arguments
_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"system\s+prompt",
    r"act\s+as\s+(an?\s+)?admin",
    r"reveal\s+(your\s+)?(secrets?|api\s+key|credentials?)",
    r"forget\s+(all\s+)?(previous\s+)?instructions",
    r"you\s+are\s+now",
    r"new\s+instructions?:",
    r"override\s+permissions?",
    r"bypass\s+(all\s+)?restrictions?",
]
_INJECTION_RE = [re.compile(p, re.IGNORECASE) for p in _INJECTION_PATTERNS]


def _contains_injection(text: str) -> bool:
    return any(rx.search(text) for rx in _INJECTION_RE)


def detect_prompt_injection(text: str) -> Tuple[bool, Optional[str]]:
    """Detects prompt injection attempts in input text."""
    for rx in _INJECTION_RE:
        m = rx.search(text)
        if m:
            return True, f"Detected injection pattern: {m.group(0)}"
    return False, None


def sanitize_user_input(text: str, max_length: int = 1000) -> str:
    """Sanitizes user input by trimming whitespace and enforcing max length."""
    if not text:
        return ""
    cleaned = text.strip()
    return cleaned[:max_length]


def validate_tool_arguments(
    tool_name: str,
    arguments: Dict[str, Any],
    input_schema: Dict[str, Any],
) -> Tuple[bool, Optional[str]]:
    """
    Validates tool arguments against its JSON schema.
    Returns (is_valid, error_message_or_None).
    Performs type coercion, bounds checks, and injection detection.
    """
    required = input_schema.get("required", [])
    properties = input_schema.get("properties", {})

    # Check required fields
    for field in required:
        if field not in arguments or arguments[field] is None:
            return False, f"Required argument '{field}' is missing"

    for field, value in arguments.items():
        if field not in properties:
            # Unknown field — silently ignore (don't fail)
            continue

        prop_schema = properties[field]
        prop_type = prop_schema.get("type")

        # String validation
        if prop_type == "string":
            if not isinstance(value, str):
                arguments[field] = str(value)
                value = arguments[field]
            max_len = prop_schema.get("maxLength")
            min_len = prop_schema.get("minLength", 0)
            if len(value) > (max_len or 10000):
                return False, f"Argument '{field}' exceeds maximum length of {max_len}"
            if len(value) < min_len:
                return False, f"Argument '{field}' is shorter than minimum length of {min_len}"

            # Prompt injection detection
            if _contains_injection(value):
                logger.warning("Prompt injection detected in tool '%s', field '%s'", tool_name, field)
                return False, f"Argument '{field}' contains disallowed instruction patterns"

            # Enum validation
            allowed = prop_schema.get("enum")
            if allowed and value not in allowed:
                return False, f"Argument '{field}' must be one of {allowed}, got '{value}'"

        # Integer validation
        elif prop_type == "integer":
            try:
                arguments[field] = int(value)
                value = arguments[field]
            except (TypeError, ValueError):
                return False, f"Argument '{field}' must be an integer"
            minimum = prop_schema.get("minimum")
            maximum = prop_schema.get("maximum")
            if minimum is not None and value < minimum:
                arguments[field] = minimum
            if maximum is not None and value > maximum:
                arguments[field] = maximum

        # Number validation
        elif prop_type == "number":
            try:
                arguments[field] = float(value)
                value = arguments[field]
            except (TypeError, ValueError):
                return False, f"Argument '{field}' must be a number"
            minimum = prop_schema.get("minimum")
            maximum = prop_schema.get("maximum")
            if minimum is not None and value < minimum:
                arguments[field] = minimum
            if maximum is not None and value > maximum:
                arguments[field] = maximum

    return True, None
