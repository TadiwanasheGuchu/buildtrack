import uuid
from decimal import Decimal
from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

ProjectStatus = Enum(
    'Planning', 'Active', 'On Hold', 'Completed', 'Delayed',
    name='project_status',
)


class Project(Base):
    __tablename__ = 'projects'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(ProjectStatus, default='Planning', nullable=False)
    budget: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    start_date: Mapped[Date] = mapped_column(Date, nullable=True)
    end_date: Mapped[Date] = mapped_column(Date, nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    progress: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    milestones: Mapped[list['Milestone']] = relationship('Milestone', back_populates='project', cascade='all, delete-orphan')  # noqa: F821
