import uuid
import logging
from typing import Any, Dict
from sqlalchemy.orm import Session

from app.tools.base import BaseTool, ToolResult, ToolSchema, PermissionLevel
from app.rag.embeddings import embedding_service
from app.rag.retrieval import VectorRetriever

logger = logging.getLogger("tools.document_search")


class DocumentSearchTool(BaseTool):
    schema = ToolSchema(
        name="document_search",
        description="Search the user's uploaded RAG documents for relevant information. Use when the user asks questions about their documents, files, or uploaded content.",
        input_schema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query to find relevant document content",
                    "maxLength": 500,
                },
                "top_k": {
                    "type": "integer",
                    "description": "Maximum number of results to return (1-10)",
                    "minimum": 1,
                    "maximum": 10,
                    "default": 5,
                },
            },
            "required": ["query"],
        },
        permission_level=PermissionLevel.READ,
        emoji="🔎",
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
        if len(query) > 500:
            return ToolResult.fail("Query too long (max 500 chars)")

        top_k = int(arguments.get("top_k", 5))
        top_k = max(1, min(10, top_k))

        try:
            query_vector = embedding_service.embed_query(query)
            retriever = VectorRetriever(db)
            chunks = retriever.search_similar_chunks(
                query_vector=query_vector,
                owner_id=owner_id,
                top_k=top_k,
                similarity_threshold=0.25,
            )
        except Exception as e:
            logger.error("Document search error: %s", str(e))
            return ToolResult.fail(f"Document search failed: {str(e)}")

        if not chunks:
            return ToolResult.ok(
                data=[],
                summary="No relevant documents found for this query.",
            )

        results = [
            {
                "filename": c.filename,
                "content": c.content[:800],
                "similarity": round(c.similarity, 3),
                "chunk_index": c.chunk_index,
                "page": c.page,
            }
            for c in chunks
        ]
        summary = f"Found {len(results)} relevant document chunk(s). Top result from '{results[0]['filename']}'."
        return ToolResult.ok(data=results, summary=summary)
