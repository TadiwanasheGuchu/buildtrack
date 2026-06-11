import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, EmailStr, Field

InviteRole = Literal['site_manager', 'worker', 'client']
TeamRole = Literal['owner', 'site_manager', 'worker', 'client']


class TeamMemberOut(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: str
    avatar_url: str | None = None
    created_at: datetime

    model_config = {'from_attributes': True}


class InviteCreate(BaseModel):
    email: EmailStr
    role: InviteRole = 'site_manager'


class InviteOut(BaseModel):
    id: uuid.UUID
    email: str
    role: str
    expires_at: datetime
    accepted_at: datetime | None
    created_at: datetime

    model_config = {'from_attributes': True}


class InviteInfoOut(BaseModel):
    email: str
    role: str
    company_name: str
    expires_at: datetime


class RoleUpdate(BaseModel):
    role: TeamRole


class AcceptInviteRequest(BaseModel):
    token: str
    name: str
    password: str


class CompanyUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=255)


class CompanyOut(BaseModel):
    id: uuid.UUID
    name: str

    model_config = {'from_attributes': True}
