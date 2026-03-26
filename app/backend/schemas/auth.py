from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    role: str = "user"
    is_active: bool = True
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class EmailRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: Optional[str] = Field(None, max_length=255)

    @field_validator("password")
    @classmethod
    def password_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Пароль не может быть пустым")
        return v


class EmailLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class AuthTokenResponse(BaseModel):
    token: str
    token_type: str = "Bearer"
    expires_at: int  # unix seconds
