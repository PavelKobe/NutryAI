#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Desc   :

import asyncio
import importlib
import os
import pkgutil
from logging.config import fileConfig
from pathlib import Path

from dotenv import load_dotenv

# Сначала окружение (до импорта core.database / models)
_app_env = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_app_env)
_dev_env = Path(__file__).resolve().parents[1] / ".env_development"
if _dev_env.is_file() and os.environ.get("ENVIRONMENT", "").strip().lower() != "prod":
    load_dotenv(_dev_env, override=True)

import models
from alembic import context
from core.database import Base
from sqlalchemy import pool
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

# Automatically import all ORM models under Models
for _, module_name, _ in pkgutil.iter_modules(models.__path__):
    importlib.import_module(f"{models.__name__}.{module_name}")

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


def _normalize_url_for_async_engine(raw: str) -> str:
    """Как в core.database: postgresql:// → postgresql+asyncpg, иначе create_async_engine тянет psycopg2."""
    raw = (raw or "").strip()
    if not raw:
        return raw
    try:
        url = make_url(raw)
    except Exception:
        return raw
    drivername = url.drivername or ""
    if "+asyncpg" in drivername or "+aiosqlite" in drivername or "+aiomysql" in drivername:
        return raw
    if drivername in ("postgresql", "postgres"):
        return str(url.set(drivername="postgresql+asyncpg"))
    if drivername == "sqlite":
        return str(url.set(drivername="sqlite+aiosqlite"))
    if drivername == "mysql":
        return str(url.set(drivername="mysql+aiomysql"))
    if drivername == "mariadb":
        return str(url.set(drivername="mariadb+aiomysql"))
    return raw


_db_url = _normalize_url_for_async_engine(os.environ.get("DATABASE_URL") or "")
if _db_url:
    config.set_main_option("sqlalchemy.url", _db_url)

target_metadata = Base.metadata


def alembic_include_object(object, name, type_, reflected, compare_to):
    # type_ can be 'table', 'index', 'column', 'constraint'
    # ignore particular table_name
    if type_ == "table" and name in ["users", "sessions", "oidc_states", "payments"]:
        return False
    return True


async def run_migrations_online():
    url = _normalize_url_for_async_engine(config.get_main_option("sqlalchemy.url") or "")
    if not url:
        raise RuntimeError(
            "DATABASE_URL пустой: задайте app/.env, app/backend/.env_development (локально) или export DATABASE_URL перед alembic."
        )
    connectable = create_async_engine(url, poolclass=pool.NullPool)
    async with connectable.connect() as connection:
        await connection.run_sync(
            lambda sync_conn: context.configure(
                connection=sync_conn,
                target_metadata=target_metadata,
                compare_type=True,
                compare_server_default=True,
                include_object=alembic_include_object,
            )
        )
        async with connection.begin():
            await connection.run_sync(lambda sync_conn: context.run_migrations())
    await connectable.dispose()


def run_migrations():
    try:
        # If there is no event loop currently, use asyncio.run directly
        loop = asyncio.get_running_loop()
        loop.create_task(run_migrations_online())
    except RuntimeError:
        asyncio.run(run_migrations_online())


run_migrations()
