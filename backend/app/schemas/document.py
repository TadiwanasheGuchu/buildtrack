import uuid
from datetime import datetime
from pydantic import BaseModel

DOC_CATEGORIES = ['Plans & Drawings', 'Contracts', 'Permits', 'Reports', 'Specifications', 'Other']


class DocumentCreate(BaseModel):
    name: str
    file_url: str
    file_type: str
    file_size: int
    category: str = 'Other'


class DocumentOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    project_id: uuid.UUID
    name: str
    file_url: str
    file_type: str
    file_size: int
    category: str
    uploaded_by_id: uuid.UUID
    uploaded_by_name: str
    created_at: datetime
