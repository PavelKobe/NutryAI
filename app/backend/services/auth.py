import logging
import os
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

from core.auth import create_access_token
from core.config import settings
from core.database import db_manager
from core.passwords import hash_password, verify_password
from models.auth import User
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_by_email(self, email: str) -> Optional[User]:
        normalized = email.strip().lower()
        result = await self.db.execute(select(User).where(User.email == normalized))
        return result.scalar_one_or_none()

    async def register_with_email(
        self,
        email: str,
        password: str,
        name: Optional[str] = None,
    ) -> User:
        normalized = email.strip().lower()
        existing = await self.get_user_by_email(normalized)
        if existing:
            raise ValueError("Пользователь с таким email уже зарегистрирован")

        display_name = (name or "").strip() or normalized.split("@", 1)[0]
        user = User(
            id=str(uuid.uuid4()),
            email=normalized,
            password_hash=hash_password(password),
            name=display_name,
            last_login=datetime.now(timezone.utc),
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def authenticate_email(self, email: str, password: str) -> Optional[User]:
        user = await self.get_user_by_email(email.strip().lower())
        if not user or not user.password_hash:
            return None
        if not getattr(user, "is_active", True):
            return None
        if not verify_password(password, user.password_hash):
            return None
        user.last_login = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def issue_app_token(
        self,
        user: User,
    ) -> Tuple[str, datetime, Dict[str, Any]]:
        """Generate application JWT token for the authenticated user."""
        try:
            expires_minutes = int(getattr(settings, "jwt_expire_minutes", 60))
        except (TypeError, ValueError):
            logger.warning("Invalid JWT_EXPIRE_MINUTES value; fallback to 60 minutes")
            expires_minutes = 60
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)

        claims: Dict[str, Any] = {
            "sub": user.id,
            "email": user.email,
            "role": user.role,
            "is_active": bool(getattr(user, "is_active", True)),
        }

        if user.name:
            claims["name"] = user.name
        if user.last_login:
            claims["last_login"] = user.last_login.isoformat()
        token = create_access_token(claims, expires_minutes=expires_minutes)

        return token, expires_at, claims


def _dev_admin_bootstrap_password() -> Optional[str]:
    """ENVIRONMENT=dev only: one-shot password from ADMIN_BOOTSTRAP_PASSWORD when admin has no hash."""
    if os.environ.get("ENVIRONMENT", "").strip().lower() != "dev":
        return None
    p = (os.environ.get("ADMIN_BOOTSTRAP_PASSWORD") or "").strip()
    return p or None


async def initialize_admin_user():
    """Create or update admin from ADMIN_USER_ID / ADMIN_USER_EMAIL; optional dev bootstrap password."""
    if "MGX_IGNORE_INIT_ADMIN" in os.environ:
        logger.info("Ignore initialize admin")
        return

    from services.database import initialize_database

    await initialize_database()

    admin_user_id = getattr(settings, "admin_user_id", "")
    admin_user_email = getattr(settings, "admin_user_email", "")

    if not admin_user_id or not admin_user_email:
        logger.warning("Admin user ID or email not configured, skipping admin initialization")
        return

    normalized_email = admin_user_email.strip().lower()
    bootstrap = _dev_admin_bootstrap_password()

    async with db_manager.async_session_maker() as db:
        result = await db.execute(select(User).where(User.id == admin_user_id))
        user = result.scalar_one_or_none()

        if user:
            if user.role != "admin":
                user.role = "admin"
            user.email = normalized_email
            if hasattr(user, "is_active") and user.is_active is False:
                user.is_active = True
            if bootstrap and not user.password_hash:
                user.password_hash = hash_password(bootstrap)
            await db.commit()
            logger.debug("Updated admin user %s", admin_user_id)
            return

        conflict = await db.execute(select(User).where(User.email == normalized_email))
        if conflict.scalar_one_or_none():
            logger.warning("Admin email already used by another user, skipping admin row creation")
            return

        pw = hash_password(bootstrap) if bootstrap else None
        admin_user = User(id=admin_user_id, email=normalized_email, role="admin", password_hash=pw)
        db.add(admin_user)
        await db.commit()
        logger.debug("Created admin user: %s", admin_user_id)
