import uuid
import logging
from typing import Optional, List, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from app.models.task import Task

logger = logging.getLogger("task_repo")


class TaskRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        owner_id: uuid.UUID,
        title: str,
        description: Optional[str] = None,
        due_at: Optional[datetime] = None,
    ) -> Task:
        task = Task(
            owner_id=owner_id,
            title=title.strip(),
            description=description.strip() if description else None,
            due_at=due_at,
            status="pending",
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def get_by_id(self, task_id: uuid.UUID, owner_id: uuid.UUID) -> Optional[Task]:
        """Strict owner-scoped lookup — never leaks other users' tasks."""
        stmt = select(Task).where(
            Task.id == task_id,
            Task.owner_id == owner_id,
        )
        return self.db.scalars(stmt).first()

    def list_by_owner(
        self,
        owner_id: uuid.UUID,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Task], int]:
        base = select(Task).where(Task.owner_id == owner_id)
        count_q = select(func.count(Task.id)).where(Task.owner_id == owner_id)

        if status:
            base = base.where(Task.status == status)
            count_q = count_q.where(Task.status == status)

        total = self.db.scalar(count_q) or 0
        items = list(
            self.db.scalars(
                base.order_by(Task.due_at.asc().nullslast(), desc(Task.created_at))
                .offset(skip)
                .limit(limit)
            ).all()
        )
        return items, total

    def complete(self, task_id: uuid.UUID, owner_id: uuid.UUID) -> Optional[Task]:
        task = self.get_by_id(task_id, owner_id)
        if not task:
            return None
        task.status = "completed"
        self.db.commit()
        self.db.refresh(task)
        return task

    def delete(self, task_id: uuid.UUID, owner_id: uuid.UUID) -> bool:
        task = self.get_by_id(task_id, owner_id)
        if not task:
            return False
        self.db.delete(task)
        self.db.commit()
        return True
