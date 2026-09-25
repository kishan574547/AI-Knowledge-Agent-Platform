import os
import re
import unicodedata
from typing import Tuple
from fastapi import UploadFile
from app.core.config import settings
from app.core.errors import FileValidationException

# Magic bytes signature definitions for supported types
MAGIC_SIGNATURES = {
    ".pdf": [b"%PDF-"],
    ".docx": [b"PK\x03\x04"],  # ZIP container header used by DOCX
}


def sanitize_filename(filename: str) -> str:
    """
    Sanitize input filename:
    1. Removes directory separators and path traversal characters (../, ..\\)
    2. Strips null bytes and non-printable characters
    3. Normalizes unicode characters
    4. Ensures safe filename length
    """
    if not filename:
        raise FileValidationException("Filename cannot be empty")

    # Remove path traversal sequences and null bytes
    filename = filename.replace("\x00", "")
    filename = os.path.basename(filename)
    filename = re.sub(r"[\/\\]", "", filename)

    # Normalize unicode
    filename = unicodedata.normalize("NFKD", filename)
    filename = re.sub(r"[^\w\s\.-]", "", filename).strip()

    if not filename or filename == "." or filename == "..":
        raise FileValidationException("Invalid filename format")

    if len(filename) > 200:
        name, ext = os.path.splitext(filename)
        filename = f"{name[:190]}{ext}"

    return filename


async def validate_uploaded_file(file: UploadFile) -> Tuple[bytes, str, str, int]:
    """
    Performs comprehensive security and integrity validation on uploaded files:
    1. Validates filename sanitization and safety
    2. Validates file extension against allowed extensions
    3. Validates MIME type against allowed types
    4. Validates file size against MAX_FILE_SIZE_MB
    5. Validates file headers/magic bytes
    Returns: (file_bytes, safe_filename, mime_type, file_size)
    """
    if not file.filename:
        raise FileValidationException("No filename provided")

    safe_filename = sanitize_filename(file.filename)
    _, ext = os.path.splitext(safe_filename)
    ext = ext.lower()

    if ext not in settings.ALLOWED_EXTENSIONS:
        raise FileValidationException(
            f"File extension '{ext}' is not supported. Allowed extensions: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    content_type = file.content_type or "application/octet-stream"
    content_type_lower = content_type.lower().split(";")[0].strip()

    if content_type_lower not in settings.ALLOWED_MIME_TYPES:
        # Check if extension is valid and map browser-specific MIME type to canonical MIME type
        if ext == ".docx" and content_type_lower in [
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/zip",
            "application/x-zip-compressed",
            "application/octet-stream",
            "application/msword",
        ]:
            content_type_lower = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif ext == ".pdf" and content_type_lower in ["application/pdf", "application/octet-stream", "application/x-pdf"]:
            content_type_lower = "application/pdf"
        elif ext in [".txt", ".md"] and content_type_lower in ["text/plain", "text/markdown", "application/octet-stream", "text/x-markdown"]:
            content_type_lower = "text/plain" if ext == ".txt" else "text/markdown"
        else:
            raise FileValidationException(
                f"File MIME type '{content_type}' is not allowed for extension '{ext}'"
            )

    # Read content and validate size
    try:
        content = await file.read()
    except Exception:
        raise FileValidationException("Failed to read uploaded file data")

    file_size = len(content)

    if file_size == 0:
        raise FileValidationException("File is empty (0 bytes)")

    if file_size > settings.max_file_size_bytes:
        raise FileValidationException(
            f"File size ({file_size / (1024 * 1024):.2f} MB) exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB} MB"
        )

    # Magic byte header checks
    if ext in MAGIC_SIGNATURES:
        signatures = MAGIC_SIGNATURES[ext]
        matches = any(content.startswith(sig) for sig in signatures)
        if not matches:
            raise FileValidationException(
                f"File content does not match expected {ext.upper()} format signature"
            )
    elif ext in [".txt", ".md"]:
        # Verify text file is valid unicode and not binary
        if b"\x00" in content:
            raise FileValidationException("Text file contains null bytes (binary content not allowed)")
        try:
            content.decode("utf-8")
        except UnicodeDecodeError:
            try:
                content.decode("latin-1")
            except Exception:
                raise FileValidationException("Text file encoding is invalid or unreadable")

    return content, safe_filename, content_type_lower, file_size

