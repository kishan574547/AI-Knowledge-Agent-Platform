import re
import unicodedata
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from app.core.config import settings
from app.rag.extractors.base import ExtractedDocument


class DocumentChunkItem(BaseModel):
    chunk_index: int
    content: str
    page: Optional[int] = None
    char_count: int
    word_count: int
    metadata: Dict[str, Any] = {}


def clean_text(text: str) -> str:
    """
    Cleans and normalizes document text while preserving paragraph and table structure.
    1. Unicode normalization (NFKC)
    2. Normalize line endings (\r\n, \r -> \n)
    3. Remove null bytes and non-printable control characters (except \n, \t)
    4. Collapse excessive horizontal whitespace and trailing whitespace
    5. Collapse 3+ consecutive newlines into double newlines
    """
    if not text:
        return ""

    # Normalize unicode
    text = unicodedata.normalize("NFKC", text)

    # Normalize newlines
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Remove null bytes and dangerous control characters
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

    # Clean horizontal whitespace per line
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    text = "\n".join(lines)

    # Collapse excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


class TextChunker:
    def __init__(
        self,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
    ):
        self.chunk_size = chunk_size or settings.CHUNK_SIZE
        self.chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP

        if self.chunk_overlap >= self.chunk_size:
            raise ValueError("chunk_overlap must be smaller than chunk_size")

    def split_text(self, text: str) -> List[str]:
        """
        Splits a text string into overlapping chunks using structural separators.
        Separators priority: \n\n, \n, . , ! , ? , ' ', character fallback.
        """
        cleaned = clean_text(text)
        if not cleaned:
            return []

        if len(cleaned) <= self.chunk_size:
            return [cleaned]

        chunks: List[str] = []
        start = 0
        text_len = len(cleaned)

        while start < text_len:
            end = min(start + self.chunk_size, text_len)

            if end < text_len:
                # Search for best split break near end
                break_point = -1
                window = cleaned[start:end]

                # Try paragraph break
                para_idx = window.rfind("\n\n")
                if para_idx > self.chunk_size * 0.4:
                    break_point = start + para_idx + 2
                else:
                    # Try line break
                    line_idx = window.rfind("\n")
                    if line_idx > self.chunk_size * 0.4:
                        break_point = start + line_idx + 1
                    else:
                        # Try sentence end (. ! ?)
                        punct_match = list(re.finditer(r"[\.\!\?]\s+", window))
                        if punct_match and punct_match[-1].end() > self.chunk_size * 0.4:
                            break_point = start + punct_match[-1].end()
                        else:
                            # Try space
                            space_idx = window.rfind(" ")
                            if space_idx > self.chunk_size * 0.4:
                                break_point = start + space_idx + 1

                if break_point != -1 and break_point > start:
                    end = break_point

            chunk_text = cleaned[start:end].strip()
            if chunk_text:
                chunks.append(chunk_text)

            # Move start pointer forward respecting overlap
            stride = max(1, (end - start) - self.chunk_overlap)
            start += stride

        return chunks

    def chunk_document(
        self,
        extracted_doc: ExtractedDocument,
        filename: str,
    ) -> List[DocumentChunkItem]:
        """
        Chunks an extracted document across its pages/sections, preserving page metadata.
        """
        all_chunks: List[DocumentChunkItem] = []
        global_index = 0

        # If document has multi-page breakdown, chunk per page to retain precise page numbers
        if extracted_doc.pages and any(p.page is not None for p in extracted_doc.pages):
            for page_item in extracted_doc.pages:
                cleaned_page_text = clean_text(page_item.text)
                if not cleaned_page_text:
                    continue

                page_chunks = self.split_text(cleaned_page_text)
                for chunk_str in page_chunks:
                    all_chunks.append(
                        DocumentChunkItem(
                            chunk_index=global_index,
                            content=chunk_str,
                            page=page_item.page,
                            char_count=len(chunk_str),
                            word_count=len(chunk_str.split()),
                            metadata={
                                "filename": filename,
                                "page": page_item.page,
                                "chunk_index": global_index,
                            },
                        )
                    )
                    global_index += 1
        else:
            # Chunk single document body
            raw_chunks = self.split_text(extracted_doc.text)
            for chunk_str in raw_chunks:
                all_chunks.append(
                    DocumentChunkItem(
                        chunk_index=global_index,
                        content=chunk_str,
                        page=None,
                        char_count=len(chunk_str),
                        word_count=len(chunk_str.split()),
                        metadata={
                            "filename": filename,
                            "page": None,
                            "chunk_index": global_index,
                        },
                    )
                )
                global_index += 1

        return all_chunks
