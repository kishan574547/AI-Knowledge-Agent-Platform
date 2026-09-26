import uuid
import logging
from typing import Any, Dict
from sqlalchemy.orm import Session

from app.tools.base import BaseTool, ToolResult, ToolSchema, PermissionLevel
from app.services.memory_service import MemoryService

logger = logging.getLogger("tools.memory_search")


class MemorySearchTool(BaseTool):
    schema = ToolSchema(
        name="memory_search",
        description="Search the user's long-term memory for stored facts, preferences, goals, and skills. Use when the user asks about what the AI remembers or when recalling user-specific context.",
        input_schema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The query to search memories with",
                    "maxLength": 300,
                },
                "top_k": {
                    "type": "integer",
                    "description": "Maximum number of memories to return (1-10)",
                    "minimum": 1,
                    "maximum": 10,
                    "default": 5,
                },
            },
            "required": ["query"],
        },
        permission_level=PermissionLevel.READ,
        emoji="🧠",
    )

    def execute(
        self,
        arguments: Dict[str, Any],
        owner_id: uuid.UUID,
        db: Session,
    ) -> ToolResult:
        query = str(arguments.get("query", "")).strip()
        if not query:
            return ToolResult.fail("Query cannot be empty")
        if len(query) > 300:
            return ToolResult.fail("Query too long (max 300 chars)")

        top_k = int(arguments.get("top_k", 5))
        top_k = max(1, min(10, top_k))

        try:
            svc = MemoryService(db)
            memories = svc.retrieve_relevant_memories(
                owner_id=owner_id,
                query=query,
                top_k=top_k,
                similarity_threshold=0.30,
            )
        except Exception as e:
            logger.error("Memory search error: %s", str(e))
            return ToolResult.fail(f"Memory search failed: {str(e)}")

        if not memories:
            return ToolResult.ok(data=[], summary="No relevant memories found.")

        results = [
            {
                "id": str(m.id),
                "content": m.content,
                "memory_type": m.memory_type,
                "importance": m.importance,
                "similarity": round(m.similarity, 3),
            }
            for m in memories
        ]
        summary = f"Found {len(results)} relevant memory entry(ies)."
        return ToolResult.ok(data=results, summary=summary)
