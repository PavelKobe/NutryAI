import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from core.config import settings
from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError

logger = logging.getLogger(__name__)


class AccessTokenError(Exception):
    """Custom exception for application JWT access token errors."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


def create_access_token(claims: Dict[str, Any], expires_minutes: Optional[int] = None) -> str:
    """Create signed JWT access token from provided claims."""
    if not settings.jwt_secret_key:
        logger.error("JWT secret key is not configured")
        raise ValueError("JWT secret key is not configured")

    now = datetime.now(timezone.utc)
    token_claims = claims.copy()

    expiry_minutes = expires_minutes if expires_minutes is not None else int(settings.jwt_expire_minutes)
    expire_at = now + timedelta(minutes=expiry_minutes)

    token_claims.update(
        {
            "exp": expire_at,
            "iat": now,
            "nbf": now,
        }
    )

    token = jwt.encode(token_claims, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    user_id = token_claims.get("sub", "unknown")
    user_hash = hashlib.sha256(str(user_id).encode()).hexdigest()[:8] if user_id != "unknown" else "unknown"
    logger.debug("Authentication token created for user hash: %s", user_hash)
    return token


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate JWT access token."""
    if not settings.jwt_secret_key:
        logger.error("JWT secret key is not configured")
        raise AccessTokenError("Authentication service is misconfigured")

    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub", "unknown")
        user_hash = hashlib.sha256(str(user_id).encode()).hexdigest()[:8] if user_id != "unknown" else "unknown"
        logger.debug("Authentication token validated for user hash: %s", user_hash)
        return payload
    except ExpiredSignatureError as exc:
        logger.info("Authentication token has expired")
        raise AccessTokenError("Token has expired") from exc
    except JWTError as exc:
        logger.warning("Token validation failed: %s", type(exc).__name__)
        raise AccessTokenError("Invalid authentication token") from exc


_VERIFICATION_SCOPE = "email_verify"
_VERIFICATION_TOKEN_EXPIRES_MINUTES = 15


def create_verification_token(user_id: str) -> str:
    """Short-lived JWT for the email verification step (scope=email_verify, 15 min)."""
    if not settings.jwt_secret_key:
        raise ValueError("JWT secret key is not configured")

    now = datetime.now(timezone.utc)
    claims = {
        "sub": user_id,
        "scope": _VERIFICATION_SCOPE,
        "iat": now,
        "nbf": now,
        "exp": now + timedelta(minutes=_VERIFICATION_TOKEN_EXPIRES_MINUTES),
    }
    return jwt.encode(claims, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_verification_token(token: str) -> str:
    """Decode and validate a verification-scoped JWT, returning user_id."""
    if not settings.jwt_secret_key:
        raise AccessTokenError("Authentication service is misconfigured")
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except ExpiredSignatureError as exc:
        raise AccessTokenError("Verification token expired") from exc
    except JWTError as exc:
        raise AccessTokenError("Invalid verification token") from exc

    if payload.get("scope") != _VERIFICATION_SCOPE:
        raise AccessTokenError("Token scope mismatch")

    user_id = payload.get("sub")
    if not user_id:
        raise AccessTokenError("Verification token has no subject")
    return str(user_id)


def decode_expired_token(token: str, max_age_days: int = 7) -> Dict[str, Any]:
    """Decode an expired JWT without verifying expiration (for refresh).

    Only tokens expired within max_age_days are accepted.
    Signature is still verified.
    """
    if not settings.jwt_secret_key:
        raise AccessTokenError("Authentication service is misconfigured")

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"verify_exp": False},
        )
    except JWTError as exc:
        raise AccessTokenError("Invalid authentication token") from exc

    # Reject tokens expired more than max_age_days ago
    exp = payload.get("exp")
    if exp:
        expired_at = datetime.fromtimestamp(exp, tz=timezone.utc)
        age = datetime.now(timezone.utc) - expired_at
        if age.days > max_age_days:
            raise AccessTokenError("Token expired too long ago")

    return payload
