import uuid
from datetime import date
from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

PunchStatus = Enum('Open', 'In Progress', 'Resolved', name='punch_status')
PunchPriority = Enum('Low', 'Medium', 'High', 'Critical', name='punch_priority')


class PunchItem(Base):
    __tablename__ = 'punch_items'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(PunchStatus, default='Open', nullable=False)
    priority: Mapped[str] = mapped_column(PunchPriority, default='Medium', nullable=False)
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True,
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    resolved_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    assigned_to: Mapped['User | None'] = relationship('User', foreign_keys=[assigned_to_id])  # noqa: F821
    created_by: Mapped['User'] = relationship('User', foreign_keys=[created_by_id])  # noqa: F821
