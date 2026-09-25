from fastapi import APIRouter, status
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
)
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(req: UserRegisterRequest):
    """
    Registers a new user through Supabase Auth.
    """
    return await auth_service.register(req)


@router.post("/login", response_model=TokenResponse)
async def login(req: UserLoginRequest):
    """
    Logs in an existing user through Supabase Auth.
    """
    return await auth_service.login(req)
