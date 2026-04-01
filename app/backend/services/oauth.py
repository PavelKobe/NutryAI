import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from models.auth import OIDCState, User
from services.auth import AuthService

logger = logging.getLogger(__name__)

_VK_AUTH_URL = "https://oauth.vk.com/authorize"
_VK_TOKEN_URL = "https://oauth.vk.com/access_token"
_VK_USERINFO_URL = "https://api.vk.com/method/users.get"
_VK_API_VERSION = "5.131"

_YANDEX_AUTH_URL = "https://oauth.yandex.ru/authorize"
_YANDEX_TOKEN_URL = "https://oauth.yandex.ru/token"
_YANDEX_USERINFO_URL = "https://login.yandex.ru/info"


class YandexOAuthService:

    # ------------------------------------------------------------------
    # State helpers (CSRF protection)
    # ------------------------------------------------------------------

    @staticmethod
    async def create_state(db: AsyncSession) -> str:
        """Generate a random state token and persist it for 10 minutes."""
        state = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        obj = OIDCState(
            state=state,
            nonce="",
            code_verifier="",
            expires_at=expires_at,
        )
        db.add(obj)
        await db.commit()
        logger.debug("Created OIDC state %s", state[:8])
        return state

    @staticmethod
    async def validate_and_delete_state(db: AsyncSession, state: str) -> bool:
        """Return True if state is valid (exists + not expired) and delete it."""
        result = await db.execute(select(OIDCState).where(OIDCState.state == state))
        obj = result.scalar_one_or_none()
        if not obj:
            logger.warning("OIDC state not found: %s", state[:8])
            return False
        if obj.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            logger.warning("OIDC state expired: %s", state[:8])
            await db.delete(obj)
            await db.commit()
            return False
        await db.delete(obj)
        await db.commit()
        return True

    # ------------------------------------------------------------------
    # Authorization URL
    # ------------------------------------------------------------------

    @staticmethod
    def get_auth_url(state: str) -> str:
        """Build the Yandex OAuth authorization URL."""
        client_id = getattr(settings, "yandex_client_id", "")
        redirect_uri = getattr(settings, "yandex_redirect_uri", "")
        params = {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "state": state,
            "scope": "login:email login:info",
        }
        return f"{_YANDEX_AUTH_URL}?{urlencode(params)}"

    # ------------------------------------------------------------------
    # Token exchange
    # ------------------------------------------------------------------

    @staticmethod
    async def exchange_code(code: str) -> str:
        """Exchange authorization code for Yandex access token."""
        client_id = getattr(settings, "yandex_client_id", "")
        client_secret = getattr(settings, "yandex_client_secret", "")
        redirect_uri = getattr(settings, "yandex_redirect_uri", "")

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                _YANDEX_TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            resp.raise_for_status()
            data = resp.json()

        access_token = data.get("access_token")
        if not access_token:
            raise ValueError(f"Yandex token exchange failed: {data}")
        logger.debug("Yandex token exchange OK")
        return access_token

    # ------------------------------------------------------------------
    # User info
    # ------------------------------------------------------------------

    @staticmethod
    async def get_user_info(access_token: str) -> dict:
        """Fetch user profile from Yandex Login API."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                _YANDEX_USERINFO_URL,
                params={"format": "json"},
                headers={"Authorization": f"OAuth {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()

        email = data.get("default_email") or data.get("emails", [None])[0]
        if not email:
            raise ValueError("Yandex did not return an email address")

        logger.debug("Yandex user info OK: %s", email)
        return {
            "email": email.strip().lower(),
            "name": data.get("display_name") or data.get("real_name") or email.split("@")[0],
            "yandex_id": str(data.get("id", "")),
        }

    # ------------------------------------------------------------------
    # Find or create user
    # ------------------------------------------------------------------

    @staticmethod
    async def find_or_create_user(
        db: AsyncSession,
        email: str,
        name: str,
        yandex_id: str,
    ) -> User:
        """Return existing user or create a new OAuth-only user (no password)."""
        auth_service = AuthService(db)
        user = await auth_service.get_user_by_email(email)

        if user:
            user.last_login = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(user)
            logger.info("Yandex login: existing user %s", email)
            return user

        user = User(
            id=str(uuid.uuid4()),
            email=email,
            name=name,
            password_hash=None,
            last_login=datetime.now(timezone.utc),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info("Yandex login: created new user %s", email)
        return user


class VkIdOAuthService:

    # ------------------------------------------------------------------
    # State helpers (CSRF protection) — same logic as Yandex
    # ------------------------------------------------------------------

    @staticmethod
    async def create_state(db: AsyncSession) -> str:
        """Generate a random state token and persist it for 10 minutes."""
        state = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        obj = OIDCState(state=state, nonce="", code_verifier="", expires_at=expires_at)
        db.add(obj)
        await db.commit()
        logger.debug("Created VK OIDC state %s", state[:8])
        return state

    @staticmethod
    async def validate_and_delete_state(db: AsyncSession, state: str) -> bool:
        """Return True if state is valid (exists + not expired) and delete it."""
        result = await db.execute(select(OIDCState).where(OIDCState.state == state))
        obj = result.scalar_one_or_none()
        if not obj:
            logger.warning("VK OIDC state not found: %s", state[:8])
            return False
        if obj.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            logger.warning("VK OIDC state expired: %s", state[:8])
            await db.delete(obj)
            await db.commit()
            return False
        await db.delete(obj)
        await db.commit()
        return True

    # ------------------------------------------------------------------
    # Authorization URL
    # ------------------------------------------------------------------

    @staticmethod
    def get_auth_url(state: str) -> str:
        """Build the VK OAuth authorization URL."""
        client_id = getattr(settings, "vk_client_id", "")
        redirect_uri = getattr(settings, "vk_redirect_uri", "")
        params = {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "state": state,
            "scope": "email",
            "display": "page",
            "v": _VK_API_VERSION,
        }
        return f"{_VK_AUTH_URL}?{urlencode(params)}"

    # ------------------------------------------------------------------
    # Token exchange
    # ------------------------------------------------------------------

    @staticmethod
    async def exchange_code(code: str) -> dict:
        """Exchange authorization code for VK access token.

        VK returns email directly in this response (not in user info).
        Returns dict with keys: access_token, email (may be absent), user_id.
        """
        client_id = getattr(settings, "vk_client_id", "")
        client_secret = getattr(settings, "vk_client_secret", "")
        redirect_uri = getattr(settings, "vk_redirect_uri", "")

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                _VK_TOKEN_URL,
                params={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "code": code,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        if "error" in data:
            raise ValueError(f"VK token exchange failed: {data}")

        logger.debug("VK token exchange OK, user_id=%s", data.get("user_id"))
        return {
            "access_token": data["access_token"],
            "email": (data.get("email") or "").strip().lower() or None,
            "user_id": data.get("user_id"),
        }

    # ------------------------------------------------------------------
    # User info
    # ------------------------------------------------------------------

    @staticmethod
    async def get_user_info(access_token: str, user_id: int) -> dict:
        """Fetch first/last name from VK API."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                _VK_USERINFO_URL,
                params={
                    "user_ids": user_id,
                    "fields": "first_name,last_name",
                    "access_token": access_token,
                    "v": _VK_API_VERSION,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        items = data.get("response", [])
        if not items:
            raise ValueError("VK users.get returned empty response")

        item = items[0]
        first = item.get("first_name", "")
        last = item.get("last_name", "")
        name = f"{first} {last}".strip() or f"vk_{user_id}"
        logger.debug("VK user info OK: %s", name)
        return {"name": name}

    # ------------------------------------------------------------------
    # Find or create user
    # ------------------------------------------------------------------

    @staticmethod
    async def find_or_create_user(
        db: AsyncSession,
        email: str,
        name: str,
        vk_id: str,
    ) -> User:
        """Return existing user or create a new OAuth-only user (no password)."""
        auth_service = AuthService(db)
        user = await auth_service.get_user_by_email(email)

        if user:
            user.last_login = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(user)
            logger.info("VK login: existing user %s", email)
            return user

        user = User(
            id=str(uuid.uuid4()),
            email=email,
            name=name,
            password_hash=None,
            last_login=datetime.now(timezone.utc),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info("VK login: created new user %s", email)
        return user
