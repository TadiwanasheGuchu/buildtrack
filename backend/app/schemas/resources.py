import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from pydantic import BaseModel

EquipmentStatusType = Literal['Available', 'In Use', 'Maintenance']


class EquipmentCreate(BaseModel):
    name: str
    category: str
    status: EquipmentStatusType = 'Available'
    project_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None


class EquipmentUpdate(BaseModel):
    name: str
    category: str
    status: EquipmentStatusType
    project_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None


class EquipmentOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    name: str
    category: str
    status: str
    project_id: Optional[uuid.UUID]
    project_name: Optional[str]
    notes: Optional[str]
    created_at: datetime


class MaterialCreate(BaseModel):
    name: str
    unit: str
    quantity: Decimal
    project_id: Optional[uuid.UUID] = None


class MaterialUpdate(BaseModel):
    name: str
    unit: str
    quantity: Decimal
    project_id: Optional[uuid.UUID] = None


class MaterialOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    project_id: Optional[uuid.UUID]
    project_name: Optional[str]
    name: str
    unit: str
    quantity: Decimal
    created_at: datetime


class VehicleCreate(BaseModel):
    name: str
    plate_number: str
    driver_name: Optional[str] = None
    project_id: Optional[uuid.UUID] = None


class VehicleUpdate(BaseModel):
    name: str
    plate_number: str
    driver_name: Optional[str] = None
    project_id: Optional[uuid.UUID] = None


class VehicleOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    name: str
    plate_number: str
    driver_name: Optional[str]
    project_id: Optional[uuid.UUID]
    project_name: Optional[str]
    created_at: datetime
