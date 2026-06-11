"""Helpers to queue in-app notifications.

These add Notification rows to the session without committing — the caller's
commit persists them atomically with the event that triggered them.
"""
import uuid
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.user import User


def notify_user(
    db: Session,
    *,
    company_id,
    user_id,
    type: str,
    title: str,
    message: str,
    link: str | None = None,
) -> None:
    db.add(Notification(
        company_id=company_id,
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        link=link,
    ))


def notify_company(
    db: Session,
    *,
    company_id,
    type: str,
    title: str,
    message: str,
    link: str | None = None,
    exclude_user_id: uuid.UUID | None = None,
) -> None:
    """Notify every user in the company, optionally excluding the actor."""
    q = db.query(User.id).filter(User.company_id == company_id)
    if exclude_user_id is not None:
        q = q.filter(User.id != exclude_user_id)
    for (user_id,) in q.all():
        notify_user(
            db,
            company_id=company_id,
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            link=link,
        )
