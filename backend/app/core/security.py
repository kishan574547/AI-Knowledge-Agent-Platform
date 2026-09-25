import logging
from typing import Optional, Dict, Any
import jwt
from jwt.exceptions import PyJWTError, ExpiredSignatureError, InvalidTokenError
import httpx
from pydantic import BaseModel
from app.core.config import settings
from app.core.errors import AppAuthenticationException

logger = logging.getLogger("security")


class AuthenticatedUser(BaseModel):
    id: str
    email: Optional[str] = None
    role: Optional[str] = None
    user_metadata: Dict[str, Any] = {}
    app_metadata: Dict[str, Any] = {}


def verify_supabase_jwt(token: str) -> AuthenticatedUser:
    """
    Verifies a Supabase JWT token.
    1. First attempts JWT signature verification using SUPABASE_JWT_SECRET if configured.
    2. Fallback: calls Supabase Auth user endpoint /auth/v1/user using the token.
    3. Rejects expired or invalid tokens.
    """
    if not token or not token.strip():
        raise AppAuthenticationException("Missing or empty authentication token")

    # If test mock mode or JWT secret provided
    if settings.SUPABASE_JWT_SECRET and settings.SUPABASE_JWT_SECRET != "placeholder-jwt-secret":
        try:
            # Supabase tokens usually use HS256 signed with SUPABASE_JWT_SECRET
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            user_id = payload.get("sub")
            if not user_id:
                raise AppAuthenticationException("Invalid token payload: missing sub")
            
            return AuthenticatedUser(
                id=str(user_id),
                email=payload.get("email"),
                role=payload.get("role", "authenticated"),
                user_metadata=payload.get("user_metadata", {}),
                app_metadata=payload.get("app_metadata", {}),
            )
        except ExpiredSignatureError:
            raise AppAuthenticationException("Authentication token has expired")
        except InvalidTokenError as e:
            logger.warning("Local JWT verification failed: %s", type(e).__name__)
            # Fall through to Supabase API check

    # If Supabase URL is reachable and not placeholder, call /auth/v1/user
    if settings.SUPABASE_URL and not settings.SUPABASE_URL.startswith("https://placeholder"):
        try:
            headers = {
                "Authorization": f"Bearer {token}",
                "apikey": settings.SUPABASE_PUBLISHABLE_KEY,
            }
            with httpx.Client(timeout=5.0) as client:
                resp = client.get(f"{settings.SUPABASE_URL}/auth/v1/user", headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return AuthenticatedUser(
                        id=str(data.get("id")),
                        email=data.get("email"),
                        role=data.get("role", "authenticated"),
                        user_metadata=data.get("user_metadata", {}),
                        app_metadata=data.get("app_metadata", {}),
                    )
                elif resp.status_code == 401 or resp.status_code == 403:
                    raise AppAuthenticationException("Invalid or expired authentication token")
                else:
                    logger.error("Supabase auth endpoint returned status %d", resp.status_code)
                    raise AppAuthenticationException("Could not validate authentication token")
        except httpx.RequestError as e:
            logger.error("Network error connecting to Supabase Auth: %s", str(e))
            raise AppAuthenticationException("Authentication service unavailable")
    
    # Reject any token that could not be cryptographically verified
    raise AppAuthenticationException("Invalid or untrusted authentication credentials")

