"""Проверка DATABASE_URL из .env_development (asyncpg, как в приложении). Запуск из app/backend: python scripts/check_db_connection.py"""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv


def _dsn() -> str:
    backend = Path(__file__).resolve().parents[1]
    load_dotenv(backend / ".env_development", override=True)
    raw = os.environ.get("DATABASE_URL", "").strip()
    if not raw:
        print("DATABASE_URL пустой — проверь .env_development", file=sys.stderr)
        sys.exit(1)
    return raw.replace("postgresql+asyncpg://", "postgresql://")


async def main() -> None:
    import asyncpg

    dsn = _dsn()
    conn = await asyncpg.connect(dsn=dsn)
    try:
        v = await conn.fetchval("select 1")
        print("ok", v)
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
