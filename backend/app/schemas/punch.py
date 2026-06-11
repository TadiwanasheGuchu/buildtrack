import uuid
from datetime import date, datetime
from typing import Literal, Optional
from pydantic import BaseModel

PunchStatusType = Literal['Open', 'In Progress', 'Resolved']
PunchPriorityType = Literal['Low', 'Medium', 'High', 'Critical']


class PunchItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: PunchPriorityType = 'Medium'
    status: PunchStatusType = 'Open'
    assigned_to_id: Optional[uuid.UUID] = None
    due_date: Optional[date] = None


class PunchItemUpdate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: PunchPriorityType
    status: PunchStatusType
    assigned_to_id: Optional[uuid.UUID] = None
    due_date: Optional[date] = None


class PunchItemOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    project_id: uuid.UUID
    title: str
    description: Optional[str]
    status: str
    priority: str
    assigned_to_id: Optional[uuid.UUID]
    assigned_to_name: Optional[str]
    due_date: Optional[date]
    resolved_at: Optional[datetime]
    created_by_id: uuid.UUID
    created_by_name: str
    created_at: datetime


class PunchSummary(BaseModel):
    total: int
    open: int
    in_progress: int
    resolved: int
