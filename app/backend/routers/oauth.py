import logging

from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from services.oauth import YandexOAuthService
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
