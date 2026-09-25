import os
from app.rag.extractors.base import BaseExtractor, ExtractedDocument, PageContent
from app.rag.extractors.pdf_extractor import PDFExtractor
from app.rag.extractors.docx_extractor import DocxExtractor
from app.rag.extractors.text_extractor import TextExtractor
from app.rag.extractors.markdown_extractor import MarkdownExtractor
from app.core.errors import FileValidationException


def get_extractor(filename: str) -> BaseExtractor:
    _, ext = os.path.splitext(filename.lower())
    if ext == ".pdf":
        return PDFExtractor()
    elif ext == ".docx":
        return DocxExtractor()
    elif ext == ".txt":
        return TextExtractor()
    elif ext == ".md":
        return MarkdownExtractor()
    else:
        raise FileValidationException(f"Unsupported document format for extraction: '{ext}'")


__all__ = [
    "BaseExtractor",
    "ExtractedDocument",
    "PageContent",
    "PDFExtractor",
    "DocxExtractor",
    "TextExtractor",
    "MarkdownExtractor",
    "get_extractor",
]
