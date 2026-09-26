"""
Persistent Conversation & History Test Suite.

Comprehensive tests covering:
 - Conversation Creation (RAG & MCP types)
 - Conversation Listing & Filtering (by type, pagination)
 - Message Persistence & Chronological Retrieval
 - Source Citations & Tool Events Retention
 - Rename & Deletion Cascading
 - Cross-User Data Isolation
 - Unauthorized Access Rejection
"""
import uuid
import pytest
from unittest.mock import patch

from app.models.conversation import Conversation
from app.models.message import Message
from app.repositories.conversation_repo import ConversationRepository, generate_title_from_text


@pytest.fixture
def test_user_a():
    return uuid.UUID("11111111-1111-1111-1111-111111111111")


@pytest.fixture
def test_user_b():
    return uuid.UUID("22222222-2222-2222-2222-222222222222")


class TestTitleGeneration:
    def test_deterministic_title_shortening(self):
        assert generate_title_from_text("what is postgres pgvector indexing?") == "Postgres pgvector indexing?"
        assert generate_title_from_text("explain the difference between rag and fine-tuning") == "The difference between rag and..."
        assert generate_title_from_text("") == "New Conversation"


class TestConversationRepository:
    def test_create_and_get_conversation(self, db_session, test_user_a):
        repo = ConversationRepository(db_session)
        conv = repo.create_conversation(owner_id=test_user_a, title="RAG Q&A Session", conversation_type="rag")
        assert conv.id is not None
        assert conv.owner_id == test_user_a
        assert conv.conversation_type == "rag"
        assert conv.title == "RAG Q&A Session"

        fetched = repo.get_by_id(conv.id, test_user_a)
        assert fetched is not None
        assert fetched.id == conv.id

    def test_list_by_owner_with_type_filter(self, db_session, test_user_a, test_user_b):
        repo = ConversationRepository(db_session)
        repo.create_conversation(owner_id=test_user_a, title="RAG 1", conversation_type="rag")
        repo.create_conversation(owner_id=test_user_a, title="MCP 1", conversation_type="mcp")
        repo.create_conversation(owner_id=test_user_b, title="User B Conv", conversation_type="rag")

        # User A all conversations
        all_a, total_a = repo.list_by_owner(test_user_a)
        assert total_a == 2
        assert len(all_a) == 2

        # User A filtered by MCP
        mcp_a, total_mcp = repo.list_by_owner(test_user_a, conversation_type="mcp")
        assert total_mcp == 1
        assert mcp_a[0].conversation_type == "mcp"
        assert mcp_a[0].title == "MCP 1"

        # User A filtered by RAG
        rag_a, total_rag = repo.list_by_owner(test_user_a, conversation_type="rag")
        assert total_rag == 1
        assert rag_a[0].title == "RAG 1"

    def test_message_creation_and_chronological_retrieval(self, db_session, test_user_a):
        repo = ConversationRepository(db_session)
        conv = repo.create_conversation(owner_id=test_user_a, title="New Conversation", conversation_type="mcp")

        # Create user message
        m1 = repo.create_message(
            conversation_id=conv.id,
            owner_id=test_user_a,
            role="user",
            content="Search my documents for internship deadlines",
        )

        # Title auto-updated from default
        assert conv.title != "New Conversation"

        # Create assistant message with sources and events
        m2 = repo.create_message(
            conversation_id=conv.id,
            owner_id=test_user_a,
            role="assistant",
            content="Found deadlines: March 31",
            sources=[{"doc_id": "1", "filename": "internships.pdf"}],
            events=[{"type": "tool_call", "tool_name": "document_search", "success": True}],
        )

        messages = repo.get_messages(conv.id, test_user_a)
        assert len(messages) == 2
        assert messages[0].id == m1.id
        assert messages[0].role == "user"
        assert messages[1].id == m2.id
        assert messages[1].role == "assistant"
        assert len(messages[1].sources) == 1
        assert len(messages[1].events) == 1

    def test_cross_user_isolation(self, db_session, test_user_a, test_user_b):
        repo = ConversationRepository(db_session)
        conv_a = repo.create_conversation(owner_id=test_user_a, title="User A Secret")
        repo.create_message(conversation_id=conv_a.id, owner_id=test_user_a, role="user", content="Secret data")

        # User B cannot get conversation
        assert repo.get_by_id(conv_a.id, test_user_b) is None

        # User B cannot get messages
        assert repo.get_messages(conv_a.id, test_user_b) == []

        # User B cannot rename
        assert repo.update_title(conv_a.id, test_user_b, "Hacked") is None

        # User B cannot delete
        assert repo.delete(conv_a.id, test_user_b) is False

        # User A's data remains safe
        assert repo.get_by_id(conv_a.id, test_user_a) is not None
        assert len(repo.get_messages(conv_a.id, test_user_a)) == 1

    def test_delete_cascades_messages(self, db_session, test_user_a):
        repo = ConversationRepository(db_session)
        conv = repo.create_conversation(owner_id=test_user_a, title="To Delete")
        repo.create_message(conversation_id=conv.id, owner_id=test_user_a, role="user", content="Msg 1")
        repo.create_message(conversation_id=conv.id, owner_id=test_user_a, role="assistant", content="Msg 2")

        assert len(repo.get_messages(conv.id, test_user_a)) == 2
        deleted = repo.delete(conv.id, test_user_a)
        assert deleted is True

        # Messages deleted
        assert repo.get_messages(conv.id, test_user_a) == []


class TestConversationAPI:
    def test_unauthorized_endpoints(self, client):
        assert client.get("/api/v1/conversations").status_code == 401
        assert client.post("/api/v1/conversations", json={"title": "Test"}).status_code == 401
        assert client.get(f"/api/v1/conversations/{uuid.uuid4()}").status_code == 401
        assert client.patch(f"/api/v1/conversations/{uuid.uuid4()}", json={"title": "New"}).status_code == 401
        assert client.delete(f"/api/v1/conversations/{uuid.uuid4()}").status_code == 401

    def test_conversation_crud_flow(self, client, user_a_headers, user_b_headers):
        # 1. Create conversation
        create_res = client.post(
            "/api/v1/conversations",
            json={"title": "My MCP Chat", "conversation_type": "mcp"},
            headers=user_a_headers,
        )
        assert create_res.status_code == 201
        data = create_res.json()
        conv_id = data["id"]
        assert data["title"] == "My MCP Chat"
        assert data["conversation_type"] == "mcp"

        # 2. List conversations
        list_res = client.get("/api/v1/conversations?conversation_type=mcp", headers=user_a_headers)
        assert list_res.status_code == 200
        assert list_res.json()["total"] >= 1

        # 3. Get conversation details
        get_res = client.get(f"/api/v1/conversations/{conv_id}", headers=user_a_headers)
        assert get_res.status_code == 200
        assert get_res.json()["id"] == conv_id
        assert get_res.json()["messages"] == []

        # 4. Cross-user isolation: User B cannot get User A's conversation
        b_res = client.get(f"/api/v1/conversations/{conv_id}", headers=user_b_headers)
        assert b_res.status_code == 404

        # 5. Rename conversation
        patch_res = client.patch(
            f"/api/v1/conversations/{conv_id}",
            json={"title": "Renamed MCP Chat"},
            headers=user_a_headers,
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["title"] == "Renamed MCP Chat"

        # 6. Delete conversation
        del_res = client.delete(f"/api/v1/conversations/{conv_id}", headers=user_a_headers)
        assert del_res.status_code == 204

        # 7. 404 after deletion
        assert client.get(f"/api/v1/conversations/{conv_id}", headers=user_a_headers).status_code == 404
