import io
import uuid
from app.repositories.document_repo import DocumentRepository
from app.repositories.conversation_repo import ConversationRepository
from app.tests.conftest import USER_A_ID, USER_B_ID


def test_user_a_document_isolated_from_user_b(client, user_a_headers, user_b_headers):
    # User A uploads a document
    file_content = b"Secret confidential document owned by User A"
    files = {"file": ("user_a_confidential.txt", io.BytesIO(file_content), "text/plain")}
    upload_res = client.post("/api/v1/documents", headers=user_a_headers, files=files)
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["id"]

    # User A can access it
    get_res_a = client.get(f"/api/v1/documents/{doc_id}", headers=user_a_headers)
    assert get_res_a.status_code == 200
    assert get_res_a.json()["id"] == doc_id

    # User B CANNOT access User A's document (returns 404 to avoid leaking existence)
    get_res_b = client.get(f"/api/v1/documents/{doc_id}", headers=user_b_headers)
    assert get_res_b.status_code == 404

    # User B CANNOT delete User A's document
    del_res_b = client.delete(f"/api/v1/documents/{doc_id}", headers=user_b_headers)
    assert del_res_b.status_code == 404

    # User B CANNOT access User A's signed download URL
    download_res_b = client.get(f"/api/v1/documents/{doc_id}/download-url", headers=user_b_headers)
    assert download_res_b.status_code == 404

    # User A CAN access User A's signed download URL
    download_res_a = client.get(f"/api/v1/documents/{doc_id}/download-url", headers=user_a_headers)
    assert download_res_a.status_code == 200
    assert "download_url" in download_res_a.json()

    # User B's list should NOT contain User A's document
    list_res_b = client.get("/api/v1/documents", headers=user_b_headers)
    assert list_res_b.status_code == 200
    user_b_doc_ids = [item["id"] for item in list_res_b.json()["items"]]
    assert doc_id not in user_b_doc_ids


def test_chunk_isolation_between_users(db_session):
    user_a_uuid = uuid.UUID(USER_A_ID)
    user_b_uuid = uuid.UUID(USER_B_ID)

    doc_repo = DocumentRepository(db_session)
    doc_a = doc_repo.create(
        owner_id=user_a_uuid,
        filename="doc_a.txt",
        storage_path=f"{user_a_uuid}/test/doc_a.txt",
        file_type="text/plain",
        file_size=100,
    )

    chunk = doc_repo.create_chunk(
        document_id=doc_a.id,
        owner_id=user_a_uuid,
        chunk_index=0,
        content="Secret chunk content for User A",
    )

    # Scoped repository query for User A finds it
    chunks_a = doc_repo.get_chunks_by_document(document_id=doc_a.id, owner_id=user_a_uuid)
    assert len(chunks_a) == 1
    assert chunks_a[0].content == "Secret chunk content for User A"

    # Scoped repository query for User B finds NOTHING
    chunks_b = doc_repo.get_chunks_by_document(document_id=doc_a.id, owner_id=user_b_uuid)
    assert len(chunks_b) == 0


def test_conversation_isolation_between_users(db_session):
    user_a_uuid = uuid.UUID(USER_A_ID)
    user_b_uuid = uuid.UUID(USER_B_ID)

    conv_repo = ConversationRepository(db_session)
    conv_a = conv_repo.create_conversation(owner_id=user_a_uuid, title="User A Private Chat")
    conv_repo.create_message(
        conversation_id=conv_a.id,
        owner_id=user_a_uuid,
        role="user",
        content="Private question",
    )

    # User A gets conversation
    retrieved_a = conv_repo.get_by_id(conv_a.id, user_a_uuid)
    assert retrieved_a is not None
    assert retrieved_a.title == "User A Private Chat"

    # User B CANNOT get User A's conversation
    retrieved_b = conv_repo.get_by_id(conv_a.id, user_b_uuid)
    assert retrieved_b is None

    # User B CANNOT list User A's messages
    messages_b = conv_repo.get_messages(conv_a.id, user_b_uuid)
    assert len(messages_b) == 0
