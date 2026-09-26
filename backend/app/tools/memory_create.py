import uuid
import logging
from typing import Any, Dict
from sqlalchemy.orm import Session

from app.tools.base import BaseTool, ToolResult, ToolSchema, PermissionLevel
from app.schemas.memory import MemoryCreate
from app.services.memory_service import MemoryService
from app.core.errors import AppSecurityException

logger = logging.getLogger("tools.memory_create")

VALID_MEMORY_TYPES = {"fact", "preference", "goal", "skill", "project", "personal_context", "instruction"}


class MemoryCreateTool(BaseTool):
    schema = ToolSchema(
        name="memory_create",
        description="Store a new long-term memory for the user. Use when the user explicitly asks to remember something or when important facts about the user should be persisted.",
        input_schema={
            "type": "object",
            "properties": {
                "content": {
                    "type": "string",
                    "description": "The memory content to store",
                    "minLength": 3,
                    "maxLength": 1000,
                },
                "memory_type": {
                    "type": "string",
                    "description": "Type of memory: fact, preference, goal, skill, project, personal_context, instruction",
                    "enum": ["fact", "preference", "goal", "skill", "project", "personal_context", "instruction"],
                    "default": "fact",
                },
                "importance": {
                    "type": "number",
                    "description": "Importance score 0.1-2.0",
                    "minimum": 0.1,
                    "maximum": 2.0,
                    "default": 1.0,
                },
            },
            "required": ["content"],
        },
        permission_level=PermissionLevel.WRITE,
        emoji="📝",
    )

    def execute(
        self,
        arguments: Dict[str, Any],
        owner_id: uuid.UUID,
        db: Session,
    ) -> ToolResult:
        content = str(arguments.get("content", "")).strip()
        if not content or len(content) < 3:
            return ToolResult.fail("Memory content too short (min 3 chars)")
        if len(content) > 1000:
            return ToolResult.fail("Memory content too long (max 1000 chars)")

        memory_type = str(arguments.get("memory_type", "fact")).lower()
        if memory_type not in VALID_MEMORY_TYPES:
            memory_type = "fact"

        try:
            importance = float(arguments.get("importance", 1.0))
            importance = max(0.1, min(2.0, importance))
        except (TypeError, ValueError):
            importance = 1.0

        try:
            svc = MemoryService(db)
            memory = svc.create_memory(
                owner_id=owner_id,
                data=MemoryCreate(
                    content=content,
                    memory_type=memory_type,
                    importance=importance,
                ),
            )
            return ToolResult.ok(
                data={"id": str(memory.id), "content": memory.content, "memory_type": memory.memory_type},
                summary=f"Memory created: '{content[:60]}...' (type: {memory_type})",
            )
        except AppSecurityException as e:
            return ToolResult.fail(str(e.detail))
        except Exception as e:
            logger.error("Memory create error: %s", str(e))
            return ToolResult.fail(f"Failed to create memory: {str(e)}")
