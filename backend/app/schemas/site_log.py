import uuid
from datetime import date, datetime
from typing import Literal, Optional
from pydantic import BaseModel

SiteLogWeatherType = Literal['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Stormy', 'Windy']


class SiteLogCreate(BaseModel):
    log_date: date
    weather: Optional[SiteLogWeatherType] = None
    temperature_c: Optional[int] = None
    crew_count: Optional[int] = None
    work_completed: str
    materials_delivered: Optional[str] = None
    issues: Optional[str] = None
    safety_notes: Optional[str] = None


class SiteLogUpdate(BaseModel):
    log_date: date
    weather: Optional[SiteLogWeatherType] = None
    temperature_c: Optional[int] = None
    crew_count: Optional[int] = None
    work_completed: str
    materials_delivered: Optional[str] = None
    issues: Optional[str] = None
    safety_notes: Optional[str] = None


class SiteLogOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    project_id: uuid.UUID
    log_date: date
    weather: Optional[str]
    temperature_c: Optional[int]
    crew_count: Optional[int]
    work_completed: str
    materials_delivered: Optional[str]
    issues: Optional[str]
    safety_notes: Optional[str]
    created_by_id: uuid.UUID
    created_by_name: str
    created_at: datetime
