import uuid
import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.database.session import get_db
from app.main import app
from app.core.config import settings
from app.models.profile import Profile
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.memory import Memory
from app.models.task import Task
from app.models.research import ResearchSession

# In-memory SQLite for high-speed isolated automated testing
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Constant test user UUIDs
USER_A_ID = str(uuid.UUID("11111111-1111-1111-1111-111111111111"))
USER_B_ID = str(uuid.UUID("22222222-2222-2222-2222-222222222222"))
TEST_JWT_SECRET = "test-secret-key-for-unit-testing-only-12345"


def create_mock_jwt(user_id: str, email: str = "test@example.com") -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": "authenticated",
        "aud": "authenticated",
        "user_metadata": {"full_name": f"User {user_id[:4]}"},
    }
    return jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")


@pytest.fixture(scope="session", autouse=True)
def setup_test_settings():
    settings.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
    settings.SUPABASE_URL = ""


@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def user_a_headers():
    token = create_mock_jwt(USER_A_ID, "user_a@test.com")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def user_b_headers():
    token = create_mock_jwt(USER_B_ID, "user_b@test.com")
    return {"Authorization": f"Bearer {token}"}
