import uuid
import logging
from typing import Any, Dict
from sqlalchemy.orm import Session

from app.tools.base import BaseTool, ToolResult, ToolSchema, PermissionLevel
from app.services.memory_service import MemoryService
from app.core.errors import ResourceNotFoundException

logger = logging.getLogger("tools.memory_delete")


class MemoryDeleteTool(BaseTool):
    schema = ToolSchema(
        name="memory_delete",
        description="Delete a specific memory by ID. Use only when the user explicitly asks to forget or remove a specific memory entry.",
        input_schema={
            "type": "object",
            "properties": {
                "memory_id": {
                    "type": "string",
                    "description": "UUID of the memory to delete (obtained from memory_search results)",
                    "format": "uuid",
                },
            },
            "required": ["memory_id"],
        },
        permission_level=PermissionLevel.WRITE,
        emoji="🗑️",
    )

    def execute(
        self,
        arguments: Dict[str, Any],
        owner_id: uuid.UUID,
        db: Session,
    ) -> ToolResult:
        raw_id = str(arguments.get("memory_id", "")).strip()
        try:
            memory_id = uuid.UUID(raw_id)
        except (ValueError, AttributeError):
            return ToolResult.fail("Invalid memory_id format — must be a valid UUID")

        try:
            svc = MemoryService(db)
            svc.delete_memory(memory_id=memory_id, owner_id=owner_id)
            return ToolResult.ok(
                data={"deleted_id": str(memory_id)},
                summary=f"Memory {str(memory_id)[:8]}... deleted successfully.",
            )
        except ResourceNotFoundException:
            return ToolResult.fail("Memory not found or access denied")
        except Exception as e:
            logger.error("Memory delete error: %s", str(e))
            return ToolResult.fail(f"Failed to delete memory: {str(e)}")
