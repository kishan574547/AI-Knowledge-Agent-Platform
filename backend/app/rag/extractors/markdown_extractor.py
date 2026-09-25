import logging
from app.rag.extractors.base import BaseExtractor, ExtractedDocument, PageContent
from app.core.errors import FileValidationException

logger = logging.getLogger("rag.extractors.markdown")


class MarkdownExtractor(BaseExtractor):
    def extract(self, file_bytes: bytes, filename: str) -> ExtractedDocument:
        if not file_bytes:
            raise FileValidationException(f"Markdown file '{filename}' is empty")

        text = ""
        try:
            text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text = file_bytes.decode("latin-1")
            except Exception as e:
                logger.warning("Failed to decode markdown file %s: %s", filename, str(e))
                raise FileValidationException(f"Invalid markdown encoding in file '{filename}'")

        return ExtractedDocument(
            text=text,
            pages=[PageContent(page=None, text=text)],
            metadata={"character_count": len(text), "extractor": "markdown"},
        )
