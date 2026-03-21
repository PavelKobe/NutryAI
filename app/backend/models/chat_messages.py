from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Chat_messages(Base):
    __tablename__ = "chat_messages"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    role = Column(String, nullable=True)
    content = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)