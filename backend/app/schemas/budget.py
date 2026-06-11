import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel

BUDGET_CATEGORIES = ['Labour', 'Materials', 'Equipment', 'Subcontractors', 'Permits & Fees', 'Other']


class BudgetLineIn(BaseModel):
    category: str
    allocated_amount: Decimal


class BudgetLinesUpdate(BaseModel):
    lines: list[BudgetLineIn]


class BudgetLineOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    category: str
    allocated_amount: Decimal


class CostEntryCreate(BaseModel):
    category: str
    description: str
    amount: Decimal
    vendor: Optional[str] = None
    date: date


class CostEntryUpdate(BaseModel):
    category: str
    description: str
    amount: Decimal
    vendor: Optional[str] = None
    date: date


class CostEntryOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    project_id: uuid.UUID
    category: str
    description: str
    amount: Decimal
    vendor: Optional[str]
    date: date
    created_by_id: uuid.UUID
    created_by_name: str
    created_at: datetime


class CategorySummary(BaseModel):
    category: str
    allocated: Decimal
    spent: Decimal
    remaining: Decimal


class BudgetSummary(BaseModel):
    total_budget: Decimal
    total_spent: Decimal
    remaining: Decimal
    percent_used: float
    categories: list[CategorySummary]


class CompanyBudgetSummary(BaseModel):
    total_budget: Decimal
    total_spent: Decimal
    remaining: Decimal
    percent_used: float
