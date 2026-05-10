import logging
from typing import Optional

import httpx
from core.config import settings

logger = logging.getLogger(__name__)

_RESEND_API_URL = "https://api.resend.com/emails"


def _verification_email_html(code: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 32px 16px; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <h1 style="color: #10b981; font-size: 24px; margin: 0 0 16px;">NutryAI</h1>
    <p style="color: #111827; font-size: 16px; margin: 0 0 16px;">Здравствуйте!</p>
    <p style="color: #4b5563; font-size: 14px; margin: 0 0 24px;">Ваш код подтверждения:</p>
    <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; padding: 20px; background: #f3f4f6; text-align: center; border-radius: 8px; color: #111827;">
      {code}
    </div>
    <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0;">Код действует 10 минут. Если вы не регистрировались — проигнорируйте это письмо.</p>
    <p style="color: #9ca3af; font-size: 12px; margin: 32px 0 0;">Вопросы: olesia.kobelewa@yandex.ru</p>
  </div>
</body>
</html>"""


async def send_verification_email(to: str, code: str) -> None:
    """Send a 6-digit verification code via Resend.

    Falls back to logging the code in stdout if RESEND_API_KEY is not set
    (dev convenience for working without internet / before account setup).
    """
    api_key: str = (getattr(settings, "resend_api_key", "") or "").strip()
    from_email: str = (getattr(settings, "resend_from_email", "") or "onboarding@resend.dev").strip()
    from_name: str = (getattr(settings, "resend_from_name", "") or "NutryAI").strip()

    if not api_key:
        logger.warning(
            "RESEND_API_KEY not configured — verification code for %s would be: %s (dev fallback)",
            to,
            code,
        )
        return

    payload: dict = {
        "from": f"{from_name} <{from_email}>",
        "to": [to],
        "subject": "Код подтверждения NutryAI",
        "html": _verification_email_html(code),
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                _RESEND_API_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            data: Optional[dict] = resp.json() if resp.content else None
            email_id = (data or {}).get("id", "unknown")
            logger.info("Verification email sent to %s (resend id=%s)", to, email_id)
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Resend rejected verification email to %s: status=%s body=%s",
            to,
            exc.response.status_code,
            exc.response.text[:500],
        )
        raise
    except httpx.HTTPError as exc:
        logger.error("Resend transport error sending to %s: %s", to, exc)
        raise
