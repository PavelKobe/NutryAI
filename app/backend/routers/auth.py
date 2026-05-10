import logging
from datetime import datetime, timezone

from core.auth import (
    AccessTokenError,
    create_verification_token,
    decode_expired_token,
    decode_verification_token,
)
from core.database import get_db
from core.limiter import limiter
from dependencies.auth import get_bearer_token, get_current_user
from fastapi import APIRouter, Depends, HTTPException, Request, status
from models.auth import User
from schemas.auth import (
    AuthTokenResponse,
    EmailLoginRequest,
    EmailRegisterRequest,
    EmailVerificationStartResponse,
    ResendVerificationRequest,
    ResendVerificationResponse,
    UserResponse,
    VerifyEmailRequest,
)
from services.auth import AuthService
from services.email import send_verification_email
from services.subscription import SubscriptionService
from services.verification import (
    VerifyResult,
    can_resend,
    create_or_replace_code,
    verify_code,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])
logger = logging.getLogger(__name__)


async def _start_verification(db: AsyncSession, user: User) -> EmailVerificationStartResponse:
    """Generate a fresh code, send it to the user, return verification token."""
    code = await create_or_replace_code(db, user.id)
    try:
        await send_verification_email(user.email, code)
    except Exception:
        # Письмо не доставлено — не валим регистрацию: пользователь сможет
        # запросить повторную отправку. Код в БД уже сохранён.
        logger.exception("Failed to send verification email to %s", user.email)
    token = create_verification_token(user.id)
    return EmailVerificationStartResponse(verification_token=token, email=user.email)


@router.post("/register", response_model=EmailVerificationStartResponse)
@limiter.limit("5/minute")
async def register(request: Request, payload: EmailRegisterRequest, db: AsyncSession = Depends(get_db)):
    """Регистрация по email и паролю.

    Создаёт пользователя с email_verified=false, отправляет 6-значный код
    подтверждения. Возвращает короткий verification_token; access JWT будет
    выдан только после успешного подтверждения через /verify-email.
    """
    auth_service = AuthService(db)
    try:
        user = await auth_service.register_with_email(
            email=str(payload.email),
            password=payload.password,
            name=payload.name,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e

    sub_service = SubscriptionService(db)
    await sub_service.assign_free_plan(user.id)

    return await _start_verification(db, user)


@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, payload: EmailLoginRequest, db: AsyncSession = Depends(get_db)):
    """Вход по email и паролю.

    Если email пользователя ещё не подтверждён — возвращает 403 с
    verification_token, фронт редиректит на /verify-email.
    """
    auth_service = AuthService(db)
    user = await auth_service.authenticate_email(str(payload.email), payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
        )

    if not getattr(user, "email_verified", True):
        return await _send_unverified_response(db, user)

    token, expires_at, _ = await auth_service.issue_app_token(user=user)
    return AuthTokenResponse(
        token=token,
        expires_at=int(expires_at.timestamp()),
    )


async def _send_unverified_response(db: AsyncSession, user: User):
    """Build a 403 with verification_token + send a fresh code if cooldown allows."""
    allowed, _ = await can_resend(db, user.id)
    if allowed:
        try:
            code = await create_or_replace_code(db, user.id)
            await send_verification_email(user.email, code)
        except Exception:
            logger.exception("Failed to (re)send verification email to %s", user.email)
    token = create_verification_token(user.id)
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "code": "email_not_verified",
            "verification_token": token,
            "email": user.email,
        },
    )


@router.post("/verify-email", response_model=AuthTokenResponse)
@limiter.limit("10/minute")
async def verify_email(request: Request, payload: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    """Подтвердить email кодом из письма. При успехе выдаёт полный access JWT."""
    try:
        user_id = decode_verification_token(payload.verification_token)
    except AccessTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=exc.message) from exc

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")

    if getattr(user, "email_verified", False):
        # Already verified (e.g. tab race). Return a fresh access token.
        auth_service = AuthService(db)
        token, expires_at, _ = await auth_service.issue_app_token(user=user)
        return AuthTokenResponse(token=token, expires_at=int(expires_at.timestamp()))

    outcome, remaining = await verify_code(db, user_id, payload.code)

    if outcome is VerifyResult.OK:
        user.email_verified = True
        user.email_verified_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(user)
        auth_service = AuthService(db)
        token, expires_at, _ = await auth_service.issue_app_token(user=user)
        return AuthTokenResponse(token=token, expires_at=int(expires_at.timestamp()))

    if outcome is VerifyResult.NOT_FOUND:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Код не найден, запросите новый",
        )
    if outcome is VerifyResult.EXPIRED:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Срок действия кода истёк, запросите новый",
        )
    if outcome is VerifyResult.LOCKED:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Слишком много попыток, запросите новый код",
        )

    # INVALID
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={"code": "invalid_code", "attempts_remaining": remaining},
    )


@router.post("/resend-verification", response_model=ResendVerificationResponse)
@limiter.limit("10/minute")
async def resend_verification(
    request: Request,
    payload: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Отправить новый код подтверждения (с rate-limit'ом 60 сек)."""
    try:
        user_id = decode_verification_token(payload.verification_token)
    except AccessTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=exc.message) from exc

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")

    if getattr(user, "email_verified", False):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email уже подтверждён")

    allowed, next_allowed_at = await can_resend(db, user_id)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "resend_cooldown",
                "can_resend_at": int(next_allowed_at.timestamp()) if next_allowed_at else None,
            },
        )

    code = await create_or_replace_code(db, user_id)
    try:
        await send_verification_email(user.email, code)
    except Exception:
        logger.exception("Failed to resend verification email to %s", user.email)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Не удалось отправить письмо, попробуйте позже",
        )
    return ResendVerificationResponse(ok=True)


@router.post("/refresh", response_model=AuthTokenResponse)
@limiter.limit("20/minute")
async def refresh_token(
    request: Request,
    token: str = Depends(get_bearer_token),
    db: AsyncSession = Depends(get_db),
):
    """Обновить протухший JWT (до 7 дней). Возвращает новый токен."""
    try:
        payload = decode_expired_token(token)
    except AccessTokenError as exc:
        raise HTTPException(status_code=401, detail=exc.message)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not getattr(user, "is_active", True):
        raise HTTPException(status_code=401, detail="User not found or disabled")

    auth_service = AuthService(db)
    new_token, expires_at, _ = await auth_service.issue_app_token(user=user)
    return AuthTokenResponse(token=new_token, expires_at=int(expires_at.timestamp()))


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
