import uuid
from decimal import Decimal
from pydantic import BaseModel


class ProjectReportRow(BaseModel):
    id: uuid.UUID
    name: str
    status: str
    progress: int
    budget: Decimal
    spent: Decimal
    percent_used: float
    milestones_total: int
    milestones_completed: int
    punch_open: int


class PortfolioReport(BaseModel):
    projects_total: int
    projects_by_status: dict[str, int]
    total_budget: Decimal
    total_spent: Decimal
    budget_percent_used: float
    milestones_total: int
    milestones_completed: int
    milestones_overdue: int
    on_time_rate: float | None  # % of completed milestones done by their due date; None if no data
    punch_open: int
    punch_resolved: int
    projects: list[ProjectReportRow]
