"""
MCP Tool Base Definitions.

Each tool defines:
  - name (unique identifier)
  - description (shown to the LLM and UI)
  - input_schema (JSON Schema dict for validation)
  - permission_level (READ or WRITE)
  - execute(...) handler

Security contract:
  - owner_id is ALWAYS sourced from the authenticated backend user.
  - owner_id is NEVER accepted from LLM-generated arguments.
  - Tool execution validates all arguments against the schema before execution.
"""
from __future__ import annotations

import uuid
import logging
from enum import Enum
from typing import Any, Dict, Optional
from dataclasses import dataclass, field
from sqlalchemy.orm import Session

logger = logging.getLogger("tools.base")


class PermissionLevel(str, Enum):
    READ = "read"       # Document search, memory search, task list — no confirmation needed
    WRITE = "write"     # Create / delete / complete — requires explicit user confirmation


@dataclass
class ToolResult:
    success: bool
    data: Any = None
    error: Optional[str] = None
    summary: Optional[str] = None   # Human-readable summary for the agent

    @classmethod
    def ok(cls, data: Any, summary: str = "") -> "ToolResult":
        return cls(success=True, data=data, summary=summary)

    @classmethod
    def fail(cls, error: str) -> "ToolResult":
        return cls(success=False, error=error)


@dataclass
class ToolSchema:
    name: str
    description: str
    input_schema: Dict[str, Any]    # JSON Schema
    permission_level: PermissionLevel
    emoji: str = "🔧"


class BaseTool:
    """Abstract base for all MCP tools."""

    schema: ToolSchema  # subclasses must define this

    def execute(
        self,
        arguments: Dict[str, Any],
        owner_id: uuid.UUID,
        db: Session,
    ) -> ToolResult:
        raise NotImplementedError

    @property
    def name(self) -> str:
        return self.schema.name

    @property
    def description(self) -> str:
        return self.schema.description

    @property
    def permission_level(self) -> PermissionLevel:
        return self.schema.permission_level
