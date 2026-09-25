from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class PageContent(BaseModel):
    page: Optional[int] = None
    text: str


class ExtractedDocument(BaseModel):
    text: str
    pages: List[PageContent]
    metadata: Dict[str, Any] = {}


class BaseExtractor(ABC):
    @abstractmethod
    def extract(self, file_bytes: bytes, filename: str) -> ExtractedDocument:
        """
        Extract text and structure from raw document bytes.
        """
        pass
