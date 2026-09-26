import uuid
import logging
from typing import Any, Dict
from sqlalchemy.orm import Session

from app.tools.base import BaseTool, ToolResult, ToolSchema, PermissionLevel
from app.repositories.task_repo import TaskRepository

logger = logging.getLogger("tools.task_complete")


class TaskCompleteTool(BaseTool):
    schema = ToolSchema(
        name="task_complete",
        description="Mark a specific task as completed. Use when the user says they finished, completed, or checked off a task.",
        input_schema={
            "type": "object",
            "properties": {
                "task_id": {
                    "type": "string",
                    "description": "UUID of the task to mark complete (from task_list results)",
                    "format": "uuid",
                },
            },
            "required": ["task_id"],
        },
        permission_level=PermissionLevel.WRITE,
        emoji="☑️",
    )

    def execute(
        self,
        arguments: Dict[str, Any],
        owner_id: uuid.UUID,
        db: Session,
    ) -> ToolResult:
        raw_id = str(arguments.get("task_id", "")).strip()
        try:
            task_id = uuid.UUID(raw_id)
        except (ValueError, AttributeError):
            return ToolResult.fail("Invalid task_id — must be a valid UUID")

        try:
            repo = TaskRepository(db)
            task = repo.complete(task_id=task_id, owner_id=owner_id)
            if not task:
                return ToolResult.fail("Task not found or access denied")
            return ToolResult.ok(
                data={"id": str(task.id), "title": task.title, "status": task.status},
                summary=f"Task '{task.title}' marked as completed.",
            )
        except Exception as e:
            logger.error("Task complete error: %s", str(e))
            return ToolResult.fail(f"Failed to complete task: {str(e)}")
