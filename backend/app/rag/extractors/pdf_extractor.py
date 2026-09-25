import io
import logging
from typing import List
from pypdf import PdfReader
from app.rag.extractors.base import BaseExtractor, ExtractedDocument, PageContent
from app.core.errors import FileValidationException

logger = logging.getLogger("rag.extractors.pdf")


class PDFExtractor(BaseExtractor):
    def extract(self, file_bytes: bytes, filename: str) -> ExtractedDocument:
        if not file_bytes:
            raise FileValidationException(f"PDF file '{filename}' is empty")

        try:
            reader = PdfReader(io.BytesIO(file_bytes))
        except Exception as e:
            logger.warning("Failed to parse PDF %s: %s", filename, type(e).__name__)
            raise FileValidationException(f"Corrupted or invalid PDF format in '{filename}'")

        pages: List[PageContent] = []
        full_text_parts: List[str] = []

        try:
            for idx, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                page_num = idx + 1
                pages.append(PageContent(page=page_num, text=page_text))
                if page_text.strip():
                    full_text_parts.append(page_text)
        except Exception as e:
            logger.warning("Error reading pages from PDF %s: %s", filename, type(e).__name__)
            raise FileValidationException(f"Failed to extract text from PDF '{filename}'")

        combined_text = "\n\n".join(full_text_parts)
        return ExtractedDocument(
            text=combined_text,
            pages=pages,
            metadata={"total_pages": len(reader.pages), "extractor": "pdf"},
        )
