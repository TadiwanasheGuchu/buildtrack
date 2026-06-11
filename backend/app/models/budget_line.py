import uuid
from decimal import Decimal
from sqlalchemy import ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class BudgetLine(Base):
    __tablename__ = 'budget_lines'
    __table_args__ = (UniqueConstraint('project_id', 'category'),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False,
    )
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    allocated_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=0)
