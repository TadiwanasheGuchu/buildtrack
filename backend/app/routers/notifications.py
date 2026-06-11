from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.notification import NotificationOut, UnreadCount

router = APIRouter(prefix='/notifications', tags=['notifications'])


@router.get('', response_model=list[NotificationOut])
def list_notifications(
    unread_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Notification).filter(Notification.user_id == user.id)
    if unread_only:
        q = q.filter(Notification.read.is_(False))
    return q.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()


@router.get('/unread-count', response_model=UnreadCount)
def get_unread_count(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    count = db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.read.is_(False),
    ).count()
    return UnreadCount(count=count)


@router.patch('/read-all', status_code=status.HTTP_204_NO_CONTENT)
def mark_all_read(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.read.is_(False),
    ).update({'read': True})
    db.commit()


@router.patch('/{notification_id}/read', response_model=NotificationOut)
def mark_read(
    notification_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user.id,
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail='Notification not found')
    n.read = True
    db.commit()
    db.refresh(n)
    return n


@router.delete('/{notification_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user.id,
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail='Notification not found')
    db.delete(n)
    db.commit()
