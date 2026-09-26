import uuid
import logging
from typing import Any, Dict, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.tools.base import BaseTool, ToolResult, ToolSchema, PermissionLevel
from app.repositories.task_repo import TaskRepository

logger = logging.getLogger("tools.task_create")


class TaskCreateTool(BaseTool):
    schema = ToolSchema(
        name="task_create",
        description="Create a new task for the user. Use when the user asks to create, add, or schedule a task or reminder. Always require confirmation before creating.",
        input_schema={
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Short task title (max 200 chars)",
                    "minLength": 1,
                    "maxLength": 200,
                },
                "description": {
                    "type": "string",
                    "description": "Optional longer description of the task",
                    "maxLength": 2000,
                },
                "due_at": {
                    "type": "string",
                    "description": "Optional ISO 8601 datetime for task due date (e.g. 2026-09-27T18:00:00Z)",
                    "format": "date-time",
                },
            },
            "required": ["title"],
        },
        permission_level=PermissionLevel.WRITE,
        emoji="✅",
    )

    def execute(
        self,
        arguments: Dict[str, Any],
        owner_id: uuid.UUID,
        db: Session,
    ) -> ToolResult:
        title = str(arguments.get("title", "")).strip()
        if not title:
            return ToolResult.fail("Task title cannot be empty")
        if len(title) > 200:
            title = title[:200]

        description_raw = arguments.get("description")
        description: Optional[str] = str(description_raw).strip() if description_raw else None
        if description and len(description) > 2000:
            description = description[:2000]

        due_at: Optional[datetime] = None
        raw_due = arguments.get("due_at")
        if raw_due:
            try:
                due_at = datetime.fromisoformat(str(raw_due).replace("Z", "+00:00"))
                if due_at.tzinfo is None:
                    due_at = due_at.replace(tzinfo=timezone.utc)
            except (ValueError, TypeError):
                logger.warning("Invalid due_at format: %s — ignoring", raw_due)
                due_at = None

        try:
            repo = TaskRepository(db)
            task = repo.create(
                owner_id=owner_id,
                title=title,
                description=description,
                due_at=due_at,
            )
            return ToolResult.ok(
                data={
                    "id": str(task.id),
                    "title": task.title,
                    "description": task.description,
                    "due_at": task.due_at.isoformat() if task.due_at else None,
                    "status": task.status,
                },
                summary=f"Task created: '{title}'" + (f" due {due_at.strftime('%Y-%m-%d %H:%M UTC')}" if due_at else ""),
            )
        except Exception as e:
            logger.error("Task create error: %s", str(e))
            return ToolResult.fail(f"Failed to create task: {str(e)}")
