import logging

from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from services.oauth import YandexOAuthService, VkIdOAuthService
from services.auth import AuthService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["oauth"])

_ERROR_URL = "https://nutriaidiary.com/auth/error"


def _frontend_callback() -> str:
    try:
        return getattr(settings, "frontend_oauth_callback")
    except AttributeError:
        return "https://nutriaidiary.com/auth/callback"


@router.get("/yandex")
async def yandex_login(db: AsyncSession = Depends(get_db)):
    """Redirect the user to Yandex OAuth authorization page."""
    state = await YandexOAuthService.create_state(db)
    url = YandexOAuthService.get_auth_url(state)
    logger.info("Redirecting to Yandex OAuth")
    return RedirectResponse(url)


@router.get("/yandex/callback")
async def yandex_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Handle Yandex OAuth callback, issue JWT, redirect to frontend."""
    # 1. Validate CSRF state
    valid = await YandexOAuthService.validate_and_delete_state(db, state)
    if not valid:
        logger.warning("Yandex callback: invalid or expired state")
        return RedirectResponse(f"{_ERROR_URL}?reason=invalid_state")

    try:
        # 2. Exchange code → access token
        access_token = await YandexOAuthService.exchange_code(code)

        # 3. Fetch user info from Yandex
        user_info = await YandexOAuthService.get_user_info(access_token)

        # 4. Find or create user in DB
        user = await YandexOAuthService.find_or_create_user(
            db=db,
            email=user_info["email"],
            name=user_info["name"],
            yandex_id=user_info["yandex_id"],
        )

        # 5. Issue app JWT
        auth_service = AuthService(db)
        token, _, _ = await auth_service.issue_app_token(user)

        # 6. Redirect to frontend callback with token
        callback = _frontend_callback()
        logger.info("Yandex OAuth success for %s", user_info["email"])
        return RedirectResponse(f"{callback}?token={token}")

    except Exception as exc:
        logger.error("Yandex OAuth error: %s", exc, exc_info=True)
        return RedirectResponse(f"{_ERROR_URL}?reason=yandex_error")


@router.get("/vkid")
async def vkid_login(db: AsyncSession = Depends(get_db)):
    """Redirect the user to VK ID authorization page (OAuth 2.1 + PKCE)."""
    state, code_verifier = await VkIdOAuthService.create_state(db)
    url = VkIdOAuthService.get_auth_url(state, code_verifier)
    logger.info("Redirecting to VK ID OAuth")
    return RedirectResponse(url)


@router.get("/vkid/callback")
async def vkid_callback(
    code: str = Query(...),
    state: str = Query(...),
    device_id: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Handle VK ID OAuth callback, issue JWT, redirect to frontend."""
    # 1. Validate state and retrieve code_verifier
    code_verifier = await VkIdOAuthService.pop_state(db, state)
    if not code_verifier:
        logger.warning("VK ID callback: invalid or expired state")
        return RedirectResponse(f"{_ERROR_URL}?reason=invalid_state")

    try:
        # 2. Exchange code → {access_token, email, user_id}
        token_data = await VkIdOAuthService.exchange_code(code, code_verifier, device_id)
        access_token = token_data["access_token"]
        email = token_data.get("email")
        user_id = token_data.get("user_id")

        # 3. Fetch name (and email fallback) from VK ID user_info
        user_info = await VkIdOAuthService.get_user_info(access_token)
        if not email:
            email = user_info.get("email")

        if not email:
            # VK пользователи могут не иметь email (регистрация по телефону)
            email = f"vk{user_id}@users.id.vk.com"
            logger.info("VK ID: no email for user_id=%s, using synthetic %s", user_id, email)

        # 4. Find or create user in DB
        user = await VkIdOAuthService.find_or_create_user(
            db=db,
            email=email,
            name=user_info["name"],
            vk_id=str(user_id),
        )

        # 5. Issue app JWT
        auth_service = AuthService(db)
        token, _, _ = await auth_service.issue_app_token(user)

        # 6. Redirect to frontend callback with token
        callback = _frontend_callback()
        logger.info("VK ID OAuth success for %s", email)
        return RedirectResponse(f"{callback}?token={token}")

    except Exception as exc:
        logger.error("VK ID OAuth error: %s", exc, exc_info=True)
        return RedirectResponse(f"{_ERROR_URL}?reason=vkid_error")
