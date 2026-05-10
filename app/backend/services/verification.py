import enum
import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from models.auth import EmailVerificationCode
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

CODE_TTL = timedelta(minutes=10)
RESEND_COOLDOWN = timedelta(seconds=60)
MAX_ATTEMPTS = 5
CODE_LENGTH = 6


class VerifyResult(str, enum.Enum):
    OK = "ok"
    INVALID = "invalid"
    EXPIRED = "expired"
    LOCKED = "locked"  # too many failed attempts
    NOT_FOUND = "not_found"


def generate_code() -> str:
    """Cryptographically secure 6-digit numeric code."""
    return "".join(secrets.choice("0123456789") for _ in range(CODE_LENGTH))


def hash_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


async def _load_code(db: AsyncSession, user_id: str) -> Optional[EmailVerificationCode]:
    result = await db.execute(
        select(EmailVerificationCode).where(EmailVerificationCode.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def create_or_replace_code(db: AsyncSession, user_id: str) -> str:
    """Replace any existing code for the user with a fresh one. Returns plaintext code."""
    code = generate_code()
    now = datetime.now(timezone.utc)
    expires_at = now + CODE_TTL

    existing = await _load_code(db, user_id)
    if existing is not None:
        existing.code_hash = hash_code(code)
        existing.expires_at = expires_at
        existing.attempts = 0
        existing.last_sent_at = now
    else:
        db.add(
            EmailVerificationCode(
                user_id=user_id,
                code_hash=hash_code(code),
                expires_at=expires_at,
                attempts=0,
                last_sent_at=now,
            )
        )
    await db.commit()
    return code


async def verify_code(db: AsyncSession, user_id: str, code: str) -> Tuple[VerifyResult, int]:
    """Verify the given code for user. Returns (result, attempts_remaining).

    On any failure, attempts is incremented. On 5 failed attempts, the code is locked
    until a new one is requested via resend.
    """
    record = await _load_code(db, user_id)
    if record is None:
        return VerifyResult.NOT_FOUND, 0

    now = datetime.now(timezone.utc)
    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if record.attempts >= MAX_ATTEMPTS:
        return VerifyResult.LOCKED, 0

    if expires_at < now:
        return VerifyResult.EXPIRED, max(0, MAX_ATTEMPTS - record.attempts)

    if hmac.compare_digest(record.code_hash, hash_code(code)):
        await db.delete(record)
        await db.commit()
        return VerifyResult.OK, 0

    record.attempts += 1
    await db.commit()
    remaining = max(0, MAX_ATTEMPTS - record.attempts)
    return (VerifyResult.LOCKED if remaining == 0 else VerifyResult.INVALID), remaining


async def can_resend(db: AsyncSession, user_id: str) -> Tuple[bool, Optional[datetime]]:
    """Check resend cooldown. Returns (allowed, next_allowed_at)."""
    record = await _load_code(db, user_id)
    if record is None:
        return True, None

    last_sent = record.last_sent_at
    if last_sent.tzinfo is None:
        last_sent = last_sent.replace(tzinfo=timezone.utc)
    next_allowed = last_sent + RESEND_COOLDOWN
    if datetime.now(timezone.utc) < next_allowed:
        return False, next_allowed
    return True, None


async def delete_code(db: AsyncSession, user_id: str) -> None:
    record = await _load_code(db, user_id)
    if record is not None:
        await db.delete(record)
        await db.commit()
