import uuid
from datetime import date
from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

SiteLogWeather = Enum(
    'Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Stormy', 'Windy',
    name='site_log_weather',
)


class SiteLog(Base):
    __tablename__ = 'site_logs'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False,
    )
    log_date: Mapped[date] = mapped_column(Date, nullable=False)
    weather: Mapped[str | None] = mapped_column(SiteLogWeather, nullable=True)
    temperature_c: Mapped[int | None] = mapped_column(Integer, nullable=True)
    crew_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    work_completed: Mapped[str] = mapped_column(Text, nullable=False)
    materials_delivered: Mapped[str | None] = mapped_column(Text, nullable=True)
    issues: Mapped[str | None] = mapped_column(Text, nullable=True)
    safety_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    created_by: Mapped['User'] = relationship('User', foreign_keys=[created_by_id])  # noqa: F821
