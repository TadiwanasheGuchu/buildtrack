import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: uuid.UUID
    type: str
    title: str
    message: str
    link: Optional[str]
    read: bool
    created_at: datetime

    model_config = {'from_attributes': True}


class UnreadCount(BaseModel):
    count: int
