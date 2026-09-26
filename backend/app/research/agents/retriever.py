import logging
import uuid
from typing import Any, Dict, List, Optional, Set
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.rag.retrieval import VectorRetriever
from app.rag.embeddings import embedding_service
from app.repositories.memory_repo import MemoryRepository
from app.research.state import ResearchState, ResearchSource

logger = logging.getLogger("rag_system.research.retriever")

MAX_TOTAL_SOURCES = 15
CHUNKS_PER_TASK = 4


def retrieve_research_sources(state: ResearchState, db: Optional[Session] = None) -> Dict[str, Any]:
    """
    Retrieval Agent Node.
    Executes user-scoped semantic vector searches across documents and memory for each planned task.
    Deduplicates results and enforces maximum source limits.
    """
    owner_str = state.get("owner_id", "")
    tasks = state.get("tasks", [])
    
    if not owner_str:
        return {"sources": [], "current_step": "retrieval_completed", "error": "Missing owner_id"}

    try:
        owner_id = uuid.UUID(owner_str)
    except Exception:
        return {"sources": [], "current_step": "retrieval_completed", "error": "Invalid owner_id"}

    should_close_db = False
    if db is None:
        db = SessionLocal()
        should_close_db = True

    try:
        retriever = VectorRetriever(db)
        memory_repo = MemoryRepository(db)
        
        all_sources: List[ResearchSource] = []
        seen_contents: Set[str] = set()

        for task in tasks:
            sq = task.get("search_query", "").strip()
            if not sq:
                continue

            try:
                # 1. Embed search query
                query_vector = embedding_service.embed_query(sq)

                # 2. Vector search user's document chunks
                chunks = retriever.search_similar_chunks(
                    query_vector=query_vector,
                    owner_id=owner_id,
                    top_k=CHUNKS_PER_TASK,
                    similarity_threshold=0.25,
                )

                for chunk in chunks:
                    snippet_key = chunk.content[:120].strip()
                    if snippet_key in seen_contents:
                        continue
                    seen_contents.add(snippet_key)

                    all_sources.append({
                        "doc_id": str(chunk.document_id),
                        "chunk_id": str(chunk.chunk_id),
                        "filename": chunk.filename,
                        "content": chunk.content,
                        "similarity": round(float(chunk.similarity), 4),
                        "source_type": "document",
                        "page_number": chunk.page,
                    })

                # 3. Also check relevant user memories
                try:
                    memories = memory_repo.vector_search_memories(
                        query_embedding=query_vector,
                        owner_id=owner_id,
                        top_k=2,
                        min_similarity=0.45,
                    )
                    for mem, sim in memories:
                        mem_key = mem.content[:120].strip()
                        if mem_key in seen_contents:
                            continue
                        seen_contents.add(mem_key)

                        all_sources.append({
                            "doc_id": f"memory_{str(mem.id)[:8]}",
                            "chunk_id": str(mem.id),
                            "filename": f"Long-Term Memory ({mem.memory_type})",
                            "content": mem.content,
                            "similarity": round(float(sim), 4),
                            "source_type": "memory",
                            "page_number": None,
                        })
                except Exception as mem_err:
                    logger.debug(f"Memory vector search skipped or failed: {mem_err}")

            except Exception as task_err:
                logger.warning(f"Error retrieving for task '{task.get('id')}': {task_err}")

            if len(all_sources) >= MAX_TOTAL_SOURCES:
                break

        # Sort by similarity descending and cap
        all_sources.sort(key=lambda s: s.get("similarity", 0.0), reverse=True)
        final_sources = all_sources[:MAX_TOTAL_SOURCES]

        logger.info(f"Retrieval Agent fetched {len(final_sources)} unique evidence sources for owner {owner_id}")
        return {
            "sources": final_sources,
            "current_step": "retrieval_completed"
        }

    except Exception as e:
        logger.error(f"Retrieval Agent error: {str(e)}", exc_info=True)
        return {
            "sources": [],
            "current_step": "retrieval_completed",
            "error": str(e)
        }
    finally:
        if should_close_db:
            db.close()
