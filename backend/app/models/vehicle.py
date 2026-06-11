import uuid
from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Vehicle(Base):
    __tablename__ = 'vehicles'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    plate_number: Mapped[str] = mapped_column(String(50), nullable=False)
    driver_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey('projects.id', ondelete='SET NULL'), nullable=True,
    )
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped['Project | None'] = relationship('Project', foreign_keys=[project_id])  # noqa: F821
