import logging

from core.database import get_db
from dependencies.auth import get_current_user
from fastapi import APIRouter, Depends, HTTPException, status
from schemas.auth import (
    AuthTokenResponse,
    EmailLoginRequest,
    EmailRegisterRequest,
    UserResponse,
)
from services.auth import AuthService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])
logger = logging.getLogger(__name__)


@router.post("/register", response_model=AuthTokenResponse)
async def register(payload: EmailRegisterRequest, db: AsyncSession = Depends(get_db)):
    """Регистрация по email и паролю."""
    auth_service = AuthService(db)
    try:
        user = await auth_service.register_with_email(
            email=str(payload.email),
            password=payload.password,
            name=payload.name,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e

    token, expires_at, _ = await auth_service.issue_app_token(user=user)
    return AuthTokenResponse(
        token=token,
        expires_at=int(expires_at.timestamp()),
    )


@router.post("/login", response_model=AuthTokenResponse)
async def login(payload: EmailLoginRequest, db: AsyncSession = Depends(get_db)):
    """Вход по email и паролю."""
    auth_service = AuthService(db)
    user = await auth_service.authenticate_email(str(payload.email), payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
        )

    token, expires_at, _ = await auth_service.issue_app_token(user=user)
    return AuthTokenResponse(
        token=token,
        expires_at=int(expires_at.timestamp()),
    )


@router.get("/logout")
async def logout():
    """Клиент удаляет JWT из localStorage; ответ для совместимости со старым SDK."""
    return {}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    """Текущий пользователь по Bearer JWT."""
    return current_user


# Совместимость: старый SDK вызывал GET /login с редиректом на OIDC — возвращаем 401 и подсказку.
@router.get("/login")
async def login_deprecated():
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Используйте POST /api/v1/auth/login с email и паролем",
    )
