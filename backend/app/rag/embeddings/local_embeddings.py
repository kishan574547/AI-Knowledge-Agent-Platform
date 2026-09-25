import logging
import threading
from typing import List, Optional
from app.core.config import settings

logger = logging.getLogger("rag.embeddings")


class LocalEmbeddingService:
    _instance: Optional["LocalEmbeddingService"] = None
    _lock = threading.Lock()

    def __init__(self):
        self.model_name = settings.EMBEDDING_MODEL
        self.expected_dim = settings.EMBEDDING_DIMENSIONS
        self._model = None
        self._model_lock = threading.Lock()

    @classmethod
    def get_instance(cls) -> "LocalEmbeddingService":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def _get_model(self):
        if self._model is None:
            with self._model_lock:
                if self._model is None:
                    logger.info("Loading local embedding model: %s", self.model_name)
                    from sentence_transformers import SentenceTransformer

                    self._model = SentenceTransformer(self.model_name)
                    logger.info("Loaded embedding model %s successfully", self.model_name)
        return self._model

    def validate_embedding(self, vector: List[float], label: str = "vector") -> List[float]:
        """
        Validates that generated embedding matches expected dimensions (384).
        """
        if not vector or len(vector) != self.expected_dim:
            raise ValueError(
                f"Embedding dimension mismatch for {label}: expected {self.expected_dim}, got {len(vector) if vector else 0}"
            )
        return vector

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Generates 384-dimensional embeddings for a batch of text chunks.
        """
        if not texts:
            return []

        model = self._get_model()
        # SentenceTransformers encode returns numpy ndarray
        embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)

        results: List[List[float]] = []
        for idx, emb in enumerate(embeddings):
            vec = emb.tolist() if hasattr(emb, "tolist") else list(emb)
            self.validate_embedding(vec, label=f"chunk_{idx}")
            results.append(vec)

        return results

    def embed_query(self, query: str) -> List[float]:
        """
        Generates 384-dimensional embedding for a single user question.
        """
        if not query or not query.strip():
            raise ValueError("Query cannot be empty for embedding generation")

        model = self._get_model()
        emb = model.encode(query.strip(), normalize_embeddings=True, show_progress_bar=False)
        vec = emb.tolist() if hasattr(emb, "tolist") else list(emb)
        return self.validate_embedding(vec, label="query")


embedding_service = LocalEmbeddingService.get_instance()
