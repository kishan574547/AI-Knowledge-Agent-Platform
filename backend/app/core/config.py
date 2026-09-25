import os
from typing import List, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "Production RAG Document Q&A System"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # CORS Settings
    CORS_ORIGINS: Union[str, List[str]] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Database
    DATABASE_URL: str = "postgresql+psycopg2://postgres:password@localhost:5432/postgres"

    # Supabase Auth & Storage
    SUPABASE_URL: str = "https://placeholder-project.supabase.co"
    SUPABASE_PUBLISHABLE_KEY: str = "placeholder-publishable-key"
    SUPABASE_SECRET_KEY: str = "placeholder-secret-key"
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_STORAGE_BUCKET: str = "documents"

    # Google Gemini LLM
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash"

    # Local Embeddings
    EMBEDDING_PROVIDER: str = "local"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSIONS: int = 384

    # Chunking Configuration
    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 120

    # RAG Retrieval Configuration
    RAG_TOP_K: int = 5
    RAG_SIMILARITY_THRESHOLD: float = 0.25
    MAX_CONTEXT_CHARS: int = 12000
    MAX_QUESTION_LENGTH: int = 2000
    MAX_RAG_DOCUMENT_IDS: int = 20

    # File Upload Security Settings
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_MIME_TYPES: Union[str, List[str]] = [
        "application/pdf",
        "text/plain",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/markdown",
    ]
    ALLOWED_EXTENSIONS: Union[str, List[str]] = [".pdf", ".txt", ".docx", ".md"]

    @field_validator("ALLOWED_MIME_TYPES", mode="before")
    @classmethod
    def assemble_allowed_mimes(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip().lower() for i in v.split(",") if i.strip()]
        return v

    @field_validator("ALLOWED_EXTENSIONS", mode="before")
    @classmethod
    def assemble_allowed_extensions(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip().lower() for i in v.split(",") if i.strip()]
        return v

    @model_validator(mode="after")
    def validate_rag_settings(self) -> "Settings":
        if self.CHUNK_OVERLAP >= self.CHUNK_SIZE:
            raise ValueError("CHUNK_OVERLAP must be smaller than CHUNK_SIZE")
        if self.CHUNK_SIZE <= 0 or self.CHUNK_OVERLAP < 0:
            raise ValueError("CHUNK_SIZE must be positive and CHUNK_OVERLAP non-negative")
        if self.RAG_TOP_K <= 0:
            raise ValueError("RAG_TOP_K must be a positive integer")
        if self.MAX_CONTEXT_CHARS <= 0:
            raise ValueError("MAX_CONTEXT_CHARS must be a positive integer")
        if self.MAX_QUESTION_LENGTH <= 0:
            raise ValueError("MAX_QUESTION_LENGTH must be a positive integer")
        if self.MAX_RAG_DOCUMENT_IDS <= 0:
            raise ValueError("MAX_RAG_DOCUMENT_IDS must be a positive integer")
        return self

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
