import logging
from app.rag.extractors.base import BaseExtractor, ExtractedDocument, PageContent
from app.core.errors import FileValidationException

logger = logging.getLogger("rag.extractors.text")


class TextExtractor(BaseExtractor):
    def extract(self, file_bytes: bytes, filename: str) -> ExtractedDocument:
        if not file_bytes:
            raise FileValidationException(f"Text file '{filename}' is empty")

        text = ""
        # Try UTF-8 first, fallback to Latin-1
        try:
            text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text = file_bytes.decode("latin-1")
            except Exception as e:
                logger.warning("Failed to decode text file %s: %s", filename, str(e))
                raise FileValidationException(f"Invalid text encoding in file '{filename}'")

        return ExtractedDocument(
            text=text,
            pages=[PageContent(page=None, text=text)],
            metadata={"character_count": len(text), "extractor": "text"},
        )
