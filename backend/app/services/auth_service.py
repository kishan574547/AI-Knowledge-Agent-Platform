import logging
import uuid
import httpx
from typing import Dict, Any, Optional
from app.core.config import settings
from app.core.errors import AppAuthenticationException, AppSecurityException
from app.schemas.auth import UserRegisterRequest, UserLoginRequest, TokenResponse

logger = logging.getLogger("auth_service")


class AuthService:
    def __init__(self):
        self.supabase_url = settings.SUPABASE_URL
        self.anon_key = settings.SUPABASE_PUBLISHABLE_KEY

    async def register(self, req: UserRegisterRequest) -> TokenResponse:
        """
        Registers a new user with Supabase Auth.
        """
        if self.supabase_url and not self.supabase_url.startswith("https://placeholder"):
            url = f"{self.supabase_url}/auth/v1/signup"
            headers = {
                "apikey": self.anon_key,
                "Content-Type": "application/json",
            }
            payload = {
                "email": req.email,
                "password": req.password,
                "data": {
                    "full_name": req.full_name or "",
                },
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                try:
                    resp = await client.post(url, json=payload, headers=headers)
                    data = resp.json()
                    if resp.status_code >= 400:
                        msg = data.get("msg") or data.get("message") or "Registration failed"
                        raise AppSecurityException(detail=msg, status_code=resp.status_code)

                    user = data.get("user") or {}
                    access_token = data.get("access_token") or "registration_confirmation_pending"
                    return TokenResponse(
                        access_token=access_token,
                        token_type="bearer",
                        expires_in=data.get("expires_in"),
                        refresh_token=data.get("refresh_token"),
                        user=user,
                    )
                except httpx.RequestError as e:
                    logger.error("Supabase auth request error: %s", str(e))
                    raise AppSecurityException("Authentication service unavailable", status_code=503)

        # Mock register for local testing/development without live Supabase
        mock_user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, req.email))
        return TokenResponse(
            access_token=f"mock_token_{mock_user_id}",
            token_type="bearer",
            expires_in=3600,
            user={
                "id": mock_user_id,
                "email": req.email,
                "user_metadata": {"full_name": req.full_name},
            },
        )

    async def login(self, req: UserLoginRequest) -> TokenResponse:
        """
        Authenticates user with Supabase Auth.
        """
        if self.supabase_url and not self.supabase_url.startswith("https://placeholder"):
            url = f"{self.supabase_url}/auth/v1/token?grant_type=password"
            headers = {
                "apikey": self.anon_key,
                "Content-Type": "application/json",
            }
            payload = {
                "email": req.email,
                "password": req.password,
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                try:
                    resp = await client.post(url, json=payload, headers=headers)
                    data = resp.json()
                    if resp.status_code >= 400:
                        msg = data.get("error_description") or data.get("msg") or "Invalid email or password"
                        raise AppAuthenticationException(detail=msg)

                    return TokenResponse(
                        access_token=data.get("access_token", ""),
                        token_type="bearer",
                        expires_in=data.get("expires_in"),
                        refresh_token=data.get("refresh_token"),
                        user=data.get("user", {}),
                    )
                except httpx.RequestError as e:
                    logger.error("Supabase login request error: %s", str(e))
                    raise AppAuthenticationException("Authentication service unavailable")

        # Mock login for local testing
        mock_user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, req.email))
        return TokenResponse(
            access_token=f"mock_token_{mock_user_id}",
            token_type="bearer",
            expires_in=3600,
            user={
                "id": mock_user_id,
                "email": req.email,
            },
        )


auth_service = AuthService()
