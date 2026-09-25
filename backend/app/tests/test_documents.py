import io
import uuid
import pytest


def test_upload_txt_document(client, user_a_headers):
    file_content = b"This is a sample document for RAG system testing."
    files = {"file": ("sample.txt", io.BytesIO(file_content), "text/plain")}
    response = client.post("/api/v1/documents", headers=user_a_headers, files=files)
    assert response.status_code == 201
    data = response.json()
    assert data["filename"] == "sample.txt"
    assert data["file_type"] == "text/plain"
    assert data["file_size"] == len(file_content)
    assert data["status"] == "ready"
    assert "id" in data


def test_upload_pdf_document(client, user_a_headers):
    file_content = b"%PDF-1.4 Mock PDF Content For Testing"
    files = {"file": ("whitepaper.pdf", io.BytesIO(file_content), "application/pdf")}
    response = client.post("/api/v1/documents", headers=user_a_headers, files=files)
    assert response.status_code == 201
    data = response.json()
    assert data["filename"] == "whitepaper.pdf"
    assert data["file_type"] == "application/pdf"


def test_list_documents(client, user_a_headers):
    file_content = b"List testing content"
    files = {"file": ("list_test.txt", io.BytesIO(file_content), "text/plain")}
    client.post("/api/v1/documents", headers=user_a_headers, files=files)

    response = client.get("/api/v1/documents", headers=user_a_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


def test_get_document_detail(client, user_a_headers):
    file_content = b"Detail test content"
    files = {"file": ("detail.txt", io.BytesIO(file_content), "text/plain")}
    upload_res = client.post("/api/v1/documents", headers=user_a_headers, files=files)
    doc_id = upload_res.json()["id"]

    response = client.get(f"/api/v1/documents/{doc_id}", headers=user_a_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == doc_id
    assert data["filename"] == "detail.txt"
    assert "chunks_count" in data


def test_delete_document(client, user_a_headers):
    file_content = b"To be deleted"
    files = {"file": ("delete_me.txt", io.BytesIO(file_content), "text/plain")}
    upload_res = client.post("/api/v1/documents", headers=user_a_headers, files=files)
    doc_id = upload_res.json()["id"]

    del_res = client.delete(f"/api/v1/documents/{doc_id}", headers=user_a_headers)
    assert del_res.status_code == 204

    # Verify 404 after deletion
    get_res = client.get(f"/api/v1/documents/{doc_id}", headers=user_a_headers)
    assert get_res.status_code == 404


def test_invalid_document_id_not_found(client, user_a_headers):
    random_id = str(uuid.uuid4())
    response = client.get(f"/api/v1/documents/{random_id}", headers=user_a_headers)
    assert response.status_code == 404


def test_invalid_document_id_malformed(client, user_a_headers):
    response = client.get("/api/v1/documents/not-a-valid-uuid", headers=user_a_headers)
    assert response.status_code == 422


def test_upload_unsupported_file_extension(client, user_a_headers):
    file_content = b"Executable binary code"
    files = {"file": ("malicious.exe", io.BytesIO(file_content), "application/octet-stream")}
    response = client.post("/api/v1/documents", headers=user_a_headers, files=files)
    assert response.status_code == 400
    assert "extension" in response.json()["detail"].lower()


def test_upload_mismatched_pdf_magic_bytes(client, user_a_headers):
    file_content = b"Corrupted fake pdf header"
    files = {"file": ("fake.pdf", io.BytesIO(file_content), "application/pdf")}
    response = client.post("/api/v1/documents", headers=user_a_headers, files=files)
    assert response.status_code == 400
    assert "signature" in response.json()["detail"].lower()


def test_upload_empty_file_rejected(client, user_a_headers):
    files = {"file": ("empty.txt", io.BytesIO(b""), "text/plain")}
    response = client.post("/api/v1/documents", headers=user_a_headers, files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_upload_oversized_file_rejected(client, user_a_headers, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "MAX_FILE_SIZE_MB", 1)  # 1MB limit for test

    oversized_content = b"X" * (1024 * 1024 + 100)
    files = {"file": ("oversized.txt", io.BytesIO(oversized_content), "text/plain")}
    response = client.post("/api/v1/documents", headers=user_a_headers, files=files)
    assert response.status_code == 400
    assert "exceeds maximum allowed size" in response.json()["detail"].lower()

