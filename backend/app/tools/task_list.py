import uuid
import logging
from typing import Any, Dict
from sqlalchemy.orm import Session

from app.tools.base import BaseTool, ToolResult, ToolSchema, PermissionLevel
from app.repositories.task_repo import TaskRepository

logger = logging.getLogger("tools.task_list")

VALID_STATUSES = {"pending", "completed", "cancelled"}


class TaskListTool(BaseTool):
    schema = ToolSchema(
        name="task_list",
        description="List the user's tasks. Use when the user asks to see, show, or list their tasks, reminders, or to-dos.",
        input_schema={
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                    "description": "Filter by status: pending, completed, or cancelled. Omit for all tasks.",
                    "enum": ["pending", "completed", "cancelled"],
                },
                "limit": {
                    "type": "integer",
                    "description": "Max number of tasks to return (1-50)",
                    "minimum": 1,
                    "maximum": 50,
                    "default": 20,
                },
            },
            "required": [],
        },
        permission_level=PermissionLevel.READ,
        emoji="📋",
    )

    def execute(
        self,
        arguments: Dict[str, Any],
        owner_id: uuid.UUID,
        db: Session,
    ) -> ToolResult:
        status_raw = arguments.get("status")
        status = str(status_raw).lower() if status_raw else None
        if status and status not in VALID_STATUSES:
            status = None

        try:
            limit = int(arguments.get("limit", 20))
            limit = max(1, min(50, limit))
        except (TypeError, ValueError):
            limit = 20

        try:
            repo = TaskRepository(db)
            tasks, total = repo.list_by_owner(owner_id=owner_id, status=status, limit=limit)
        except Exception as e:
            logger.error("Task list error: %s", str(e))
            return ToolResult.fail(f"Failed to list tasks: {str(e)}")

        if not tasks:
            label = f"with status '{status}'" if status else ""
            return ToolResult.ok(data=[], summary=f"No tasks found {label}.")

        results = [
            {
                "id": str(t.id),
                "title": t.title,
                "description": t.description,
                "status": t.status,
                "due_at": t.due_at.isoformat() if t.due_at else None,
                "created_at": t.created_at.isoformat(),
            }
            for t in tasks
        ]
        return ToolResult.ok(data=results, summary=f"Found {total} task(s) (showing {len(results)}).")
