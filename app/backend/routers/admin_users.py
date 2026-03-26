from typing import Optional

from core.database import get_db
from dependencies.auth import get_admin_user
from fastapi import APIRouter, Depends, HTTPException, Query, status
from models.auth import User
from schemas.admin import AdminUserListResponse, AdminUserOut, AdminUserPatch
from schemas.auth import UserResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/admin/users", tags=["admin-users"])


@router.get("", response_model=AdminUserListResponse)
async def list_users(
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    email_contains: Optional[str] = Query(None, max_length=255),
    role: Optional[str] = Query(None, pattern="^(user|admin)$"),
):
    q = select(User)
    count_q = select(func.count()).select_from(User)
    if email_contains:
        needle = f"%{email_contains.strip().lower()}%"
        q = q.where(User.email.ilike(needle))
        count_q = count_q.where(User.email.ilike(needle))
    if role:
        q = q.where(User.role == role)
        count_q = count_q.where(User.role == role)

    total = int((await db.execute(count_q)).scalar_one())
    q = q.order_by(User.created_at.desc().nulls_last()).offset(skip).limit(limit)
    rows = (await db.execute(q)).scalars().all()
    return AdminUserListResponse(
        items=[AdminUserOut.model_validate(u) for u in rows],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{user_id}", response_model=AdminUserOut)
async def get_user(
    user_id: str,
    _admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    row = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return AdminUserOut.model_validate(row)


@router.patch("/{user_id}", response_model=AdminUserOut)
async def patch_user(
    user_id: str,
    body: AdminUserPatch,
    admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    row = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    data = body.model_dump(exclude_unset=True)
    if not data:
        return AdminUserOut.model_validate(row)

    if user_id == admin.id and data.get("role") == "user":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove own admin role",
        )
    if user_id == admin.id and data.get("is_active") is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate own account",
        )

    for key, val in data.items():
        setattr(row, key, val)
    await db.commit()
    await db.refresh(row)
    return AdminUserOut.model_validate(row)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    admin: UserResponse = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete user row. Related payments cascade; other user_id rows may orphan until cleaned."""
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete own account",
        )
    row = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    await db.delete(row)
    await db.commit()
