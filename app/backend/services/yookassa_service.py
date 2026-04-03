"""
YooKassa service — обёртка над синхронным yookassa SDK для async-кода.

Все вызовы SDK оборачиваем в asyncio.to_thread(), чтобы не блокировать event loop.
"""

import asyncio
import logging
import uuid
from decimal import Decimal
from typing import Any

from core.config import settings
from yookassa import Configuration, Payment, Refund
from yookassa.domain.common import ConfirmationType

logger = logging.getLogger(__name__)


def _configure() -> None:
    """Инициализирует SDK учётными данными из настроек."""
    Configuration.account_id = settings.yookassa_shop_id
    Configuration.secret_key = settings.yookassa_secret_key


class YooKassaService:
    """Сервис для работы с YooKassa API."""

    async def create_payment(
        self,
        *,
        amount: Decimal,
        description: str,
        return_url: str,
        billing: str,
        idempotency_key: str,
    ) -> tuple[str, str]:
        """
        Создаёт платёж в YooKassa.

        Returns:
            (confirmation_url, yookassa_payment_id)
        """
        _configure()

        payload: dict[str, Any] = {
            "amount": {
                "value": f"{amount:.2f}",
                "currency": "RUB",
            },
            "confirmation": {
                "type": ConfirmationType.REDIRECT,
                "return_url": return_url,
            },
            "capture": True,
            "description": description,
            "metadata": {
                "billing": billing,
                "idempotency_key": idempotency_key,
            },
        }

        def _create() -> Any:
            return Payment.create(payload, idempotency_key)

        payment = await asyncio.to_thread(_create)

        confirmation_url: str = payment.confirmation.confirmation_url
        yookassa_payment_id: str = payment.id
        logger.info("YooKassa payment created: %s", yookassa_payment_id)
        return confirmation_url, yookassa_payment_id

    async def get_payment(self, yookassa_payment_id: str) -> Any:
        """Получает объект платежа из YooKassa (для верификации webhook)."""
        _configure()

        def _get() -> Any:
            return Payment.find_one(yookassa_payment_id)

        return await asyncio.to_thread(_get)

    async def capture_payment(
        self,
        yookassa_payment_id: str,
        amount: Decimal,
    ) -> Any:
        """Захватывает (подтверждает) двухстадийный платёж."""
        _configure()

        payload: dict[str, Any] = {
            "amount": {
                "value": f"{amount:.2f}",
                "currency": "RUB",
            }
        }

        def _capture() -> Any:
            idempotency_key = str(uuid.uuid4())
            return Payment.capture(yookassa_payment_id, payload, idempotency_key)

        payment = await asyncio.to_thread(_capture)
        logger.info("YooKassa payment captured: %s", yookassa_payment_id)
        return payment

    async def create_refund(
        self,
        yookassa_payment_id: str,
        amount: Decimal,
    ) -> Any:
        """Создаёт возврат платежа."""
        _configure()

        payload: dict[str, Any] = {
            "payment_id": yookassa_payment_id,
            "amount": {
                "value": f"{amount:.2f}",
                "currency": "RUB",
            },
        }

        def _refund() -> Any:
            idempotency_key = str(uuid.uuid4())
            return Refund.create(payload, idempotency_key)

        refund = await asyncio.to_thread(_refund)
        logger.info("YooKassa refund created for payment: %s", yookassa_payment_id)
        return refund
