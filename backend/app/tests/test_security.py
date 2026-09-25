import io
import uuid
import pytest
from app.utils.file_validation import sanitize_filename, validate_uploaded_file
from app.services.storage_service import storage_service
from app.core.errors import FileValidationException
from app.database.session import get_db


def test_sanitize_filename_prevents_path_traversal():
    # Unix traversal
    assert sanitize_filename("../../../etc/passwd.txt") == "passwd.txt"
    # Windows traversal
    assert sanitize_filename("..\\..\\windows\\system32\\secret.pdf") == "secret.pdf"
    # Null byte injection
    assert "\x00" not in sanitize_filename("safe_file\x00.pdf.exe")


def test_sanitize_filename_rejects_empty_or_dots():
    with pytest.raises(FileValidationException):
        sanitize_filename("")
    with pytest.raises(FileValidationException):
        sanitize_filename("..")
    with pytest.raises(FileValidationException):
        sanitize_filename(".")


def test_storage_path_convention():
    user_id = uuid.uuid4()
    doc_id = uuid.uuid4()
    filename = "report.pdf"

    path = storage_service.get_storage_path(user_id=user_id, document_id=doc_id, filename=filename)
    expected = f"{user_id}/{doc_id}/{filename}"
    assert path == expected
    assert path.startswith(str(user_id))


def test_security_headers_present(client):
    response = client.get("/health")
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("X-XSS-Protection") == "1; mode=block"
    assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


def test_no_stack_trace_leakage_on_500(client, monkeypatch):
    # Simulate an unexpected error in a dependency
    def broken_db():
        raise RuntimeError("Secret DB connection credentials string: postgresql://admin:supersecret@10.0.0.1")

    from app.main import app
    app.dependency_overrides[get_db] = broken_db

    try:
        response = client.get("/api/v1/health")
        assert response.status_code == 500
        data = response.json()
        assert "supersecret" not in response.text
        assert "Traceback" not in response.text
        assert data["detail"] == "An internal server error occurred. Please try again later."
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_secret_keys_not_leaked_in_responses(client, user_a_headers):
    # Test all public endpoints for accidental secret reflection
    res1 = client.get("/health")
    assert "SUPABASE_SECRET_KEY" not in res1.text
    assert "GEMINI_API_KEY" not in res1.text

    res2 = client.get("/api/v1/users/me", headers=user_a_headers)
    assert "SUPABASE_SECRET_KEY" not in res2.text
    assert "GEMINI_API_KEY" not in res2.text



def test_cors_rejects_unauthorized_origin(client):
    # An unauthorized origin should not receive Access-Control-Allow-Origin: https://evil-attacker.com
    response = client.options(
        "/api/v1/documents",
        headers={
            "Origin": "https://evil-attacker.com",
            "Access-Control-Request-Method": "POST",
        },
    )
    # FastApi CORSMiddleware does not return allow origin for unauthorized origin
    assert response.headers.get("Access-Control-Allow-Origin") != "https://evil-attacker.com"
    assert response.headers.get("Access-Control-Allow-Origin") != "*"


def test_binary_masquerading_as_txt_rejected(client, user_a_headers):
    # Text file containing null bytes (binary disguised as text)
    file_content = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00Fake text file"
    files = {"file": ("malicious.txt", io.BytesIO(file_content), "text/plain")}
    response = client.post("/api/v1/documents", headers=user_a_headers, files=files)
    assert response.status_code == 400
    assert "null bytes" in response.json()["detail"].lower()

