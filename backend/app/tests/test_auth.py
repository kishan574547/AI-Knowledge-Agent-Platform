import pytest
from app.tests.conftest import USER_A_ID


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]


def test_user_registration_flow(client, monkeypatch):
    from app.services.auth_service import auth_service
    from app.schemas.auth import TokenResponse

    async def mock_register(req):
        return TokenResponse(
            access_token="mock_access_token_123",
            token_type="bearer",
            expires_in=3600,
            user={"id": USER_A_ID, "email": req.email},
        )

    monkeypatch.setattr(auth_service, "register", mock_register)

    payload = {
        "email": "newuser@example.com",
        "password": "SecurePassword123!",
        "full_name": "New User",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "user" in data


def test_user_login_flow(client, monkeypatch):
    from app.services.auth_service import auth_service
    from app.schemas.auth import TokenResponse

    async def mock_login(req):
        return TokenResponse(
            access_token="mock_access_token_123",
            token_type="bearer",
            expires_in=3600,
            user={"id": USER_A_ID, "email": req.email},
        )

    monkeypatch.setattr(auth_service, "login", mock_login)

    payload = {
        "email": "user@example.com",
        "password": "SecurePassword123!",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"



def test_protected_api_access_authorized(client, user_a_headers):
    response = client.get("/api/v1/users/me", headers=user_a_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == USER_A_ID
    assert data["email"] == "user_a@test.com"


def test_unauthorized_api_access_missing_header(client):
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401
    assert "detail" in response.json()


def test_unauthorized_api_access_invalid_format(client):
    response = client.get("/api/v1/users/me", headers={"Authorization": "InvalidFormatToken"})
    assert response.status_code == 401


def test_invalid_authentication_token(client):
    response = client.get("/api/v1/users/me", headers={"Authorization": "Bearer totally.invalid.signature"})
    assert response.status_code == 401
