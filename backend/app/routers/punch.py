from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.project import Project
from app.models.punch_item import PunchItem
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.punch import PunchItemCreate, PunchItemUpdate, PunchItemOut, PunchSummary
from app.utils.notify import notify_user

router = APIRouter(prefix='/punch', tags=['punch'])


def _get_project(project_id: str, company_id, db: Session) -> Project:
    p = db.query(Project).filter(Project.id == project_id, Project.company_id == company_id).first()
    if not p:
        raise HTTPException(status_code=404, detail='Project not found')
    return p


def _item_out(item: PunchItem) -> PunchItemOut:
    return PunchItemOut(
        id=item.id,
        company_id=item.company_id,
        project_id=item.project_id,
        title=item.title,
        description=item.description,
        status=item.status,
        priority=item.priority,
        assigned_to_id=item.assigned_to_id,
        assigned_to_name=item.assigned_to.name if item.assigned_to else None,
        due_date=item.due_date,
        resolved_at=item.resolved_at,
        created_by_id=item.created_by_id,
        created_by_name=item.created_by.name if item.created_by else '',
        created_at=item.created_at,
    )


@router.get('/company/open-count')
def get_company_open_count(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    count = db.query(PunchItem).filter(
        PunchItem.company_id == user.company_id,
        PunchItem.status != 'Resolved',
    ).count()
    return {'count': count}


@router.get('/projects/{project_id}', response_model=list[PunchItemOut])
def list_items(
    project_id: str,
    status_filter: str | None = Query(None, alias='status'),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_project(project_id, user.company_id, db)
    q = db.query(PunchItem).filter(
        PunchItem.project_id == project_id,
        PunchItem.company_id == user.company_id,
    )
    if status_filter:
        q = q.filter(PunchItem.status == status_filter)
    items = q.order_by(
        PunchItem.status.asc(),
        PunchItem.priority.desc(),
        PunchItem.created_at.desc(),
    ).all()
    return [_item_out(i) for i in items]


@router.get('/projects/{project_id}/summary', response_model=PunchSummary)
def get_summary(
    project_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_project(project_id, user.company_id, db)
    items = db.query(PunchItem).filter(
        PunchItem.project_id == project_id,
        PunchItem.company_id == user.company_id,
    ).all()
    return PunchSummary(
        total=len(items),
        open=sum(1 for i in items if i.status == 'Open'),
        in_progress=sum(1 for i in items if i.status == 'In Progress'),
        resolved=sum(1 for i in items if i.status == 'Resolved'),
    )


@router.post('/projects/{project_id}', response_model=PunchItemOut, status_code=status.HTTP_201_CREATED)
def create_item(
    project_id: str,
    body: PunchItemCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_project(project_id, user.company_id, db)
    if body.assigned_to_id:
        assignee = db.query(User).filter(
            User.id == body.assigned_to_id, User.company_id == user.company_id,
        ).first()
        if not assignee:
            raise HTTPException(status_code=404, detail='Assignee not found')
    item = PunchItem(
        **body.model_dump(),
        project_id=project_id,
        company_id=user.company_id,
        created_by_id=user.id,
    )
    db.add(item)
    if body.assigned_to_id and body.assigned_to_id != user.id:
        notify_user(
            db,
            company_id=user.company_id,
            user_id=body.assigned_to_id,
            type='punch',
            title='Punch item assigned to you',
            message=f'{user.name} assigned you "{body.title}"',
            link=f'/projects/{project_id}',
        )
    db.commit()
    db.refresh(item)
    return _item_out(item)


@router.put('/{item_id}', response_model=PunchItemOut)
def update_item(
    item_id: str,
    body: PunchItemUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    item = db.query(PunchItem).filter(PunchItem.id == item_id, PunchItem.company_id == user.company_id).first()
    if not item:
        raise HTTPException(status_code=404, detail='Punch item not found')
    if body.assigned_to_id:
        assignee = db.query(User).filter(
            User.id == body.assigned_to_id, User.company_id == user.company_id,
        ).first()
        if not assignee:
            raise HTTPException(status_code=404, detail='Assignee not found')
    was_resolved = item.status == 'Resolved'
    prev_assignee = item.assigned_to_id
    for k, v in body.model_dump().items():
        setattr(item, k, v)
    if item.status == 'Resolved' and not was_resolved:
        item.resolved_at = datetime.now(timezone.utc)
        if item.created_by_id and item.created_by_id != user.id:
            notify_user(
                db,
                company_id=user.company_id,
                user_id=item.created_by_id,
                type='punch',
                title='Punch item resolved',
                message=f'{user.name} resolved "{item.title}"',
                link=f'/projects/{item.project_id}',
            )
    elif item.status != 'Resolved':
        item.resolved_at = None
    if item.assigned_to_id and item.assigned_to_id not in (prev_assignee, user.id):
        notify_user(
            db,
            company_id=user.company_id,
            user_id=item.assigned_to_id,
            type='punch',
            title='Punch item assigned to you',
            message=f'{user.name} assigned you "{item.title}"',
            link=f'/projects/{item.project_id}',
        )
    db.commit()
    db.refresh(item)
    return _item_out(item)


@router.patch('/{item_id}/resolve', response_model=PunchItemOut)
def resolve_item(
    item_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    item = db.query(PunchItem).filter(PunchItem.id == item_id, PunchItem.company_id == user.company_id).first()
    if not item:
        raise HTTPException(status_code=404, detail='Punch item not found')
    item.status = 'Resolved'
    item.resolved_at = datetime.now(timezone.utc)
    if item.created_by_id and item.created_by_id != user.id:
        notify_user(
            db,
            company_id=user.company_id,
            user_id=item.created_by_id,
            type='punch',
            title='Punch item resolved',
            message=f'{user.name} resolved "{item.title}"',
            link=f'/projects/{item.project_id}',
        )
    db.commit()
    db.refresh(item)
    return _item_out(item)


@router.delete('/{item_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    item = db.query(PunchItem).filter(PunchItem.id == item_id, PunchItem.company_id == user.company_id).first()
    if not item:
        raise HTTPException(status_code=404, detail='Punch item not found')
    db.delete(item)
    db.commit()
