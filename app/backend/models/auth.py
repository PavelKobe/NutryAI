from models.base import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String, text
from sqlalchemy.sql import func


class User(Base):
    __tablename__ = "users"

    id = Column(String(255), primary_key=True, index=True)
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=True)
    name = Column(String(255), nullable=True)
    role = Column(String(50), default="user", nullable=False)  # user/admin
    is_active = Column(Boolean, nullable=False, server_default=text("true"), default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)


class OIDCState(Base):
    __tablename__ = "oidc_states"

    id = Column(Integer, primary_key=True, index=True)
    state = Column(String(255), unique=True, index=True, nullable=False)
    nonce = Column(String(255), nullable=False)
    code_verifier = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
