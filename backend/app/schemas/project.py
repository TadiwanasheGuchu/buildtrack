import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel

ProjectStatus = Literal['Planning', 'Active', 'On Hold', 'Completed', 'Delayed']


class MilestoneCreate(BaseModel):
    title: str
    due_date: date | None = None


class MilestoneOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    due_date: date | None
    completed_at: datetime | None

    model_config = {'from_attributes': True}


class ProjectCreate(BaseModel):
    name: str
    location: str
    status: ProjectStatus = 'Planning'
    budget: Decimal = Decimal('0')
    start_date: date | None = None
    end_date: date | None = None
    description: str = ''


class ProjectUpdate(ProjectCreate):
    pass


class ProjectOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    name: str
    location: str
    status: str
    budget: Decimal
    start_date: date | None
    end_date: date | None
    description: str
    progress: int
    created_at: datetime

    model_config = {'from_attributes': True}


class MilestoneWithProjectOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    project_name: str
    title: str
    due_date: date | None
    completed_at: datetime | None
