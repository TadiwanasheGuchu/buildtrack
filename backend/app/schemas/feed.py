import uuid
from datetime import datetime
from pydantic import BaseModel


class PostCreate(BaseModel):
    project_id: uuid.UUID
    content: str
    image_url: str | None = None


class PostOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    project_name: str
    author_id: uuid.UUID
    author_name: str
    author_avatar_url: str | None
    content: str
    image_url: str | None
    created_at: datetime
