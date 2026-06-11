from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.project import Project
from app.models.site_log import SiteLog
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.site_log import SiteLogCreate, SiteLogUpdate, SiteLogOut

router = APIRouter(prefix='/site-logs', tags=['site-logs'])


def _get_project(project_id: str, company_id, db: Session) -> Project:
    p = db.query(Project).filter(Project.id == project_id, Project.company_id == company_id).first()
    if not p:
        raise HTTPException(status_code=404, detail='Project not found')
    return p


def _log_out(log: SiteLog) -> SiteLogOut:
    return SiteLogOut(
        id=log.id,
        company_id=log.company_id,
        project_id=log.project_id,
        log_date=log.log_date,
        weather=log.weather,
        temperature_c=log.temperature_c,
        crew_count=log.crew_count,
        work_completed=log.work_completed,
        materials_delivered=log.materials_delivered,
        issues=log.issues,
        safety_notes=log.safety_notes,
        created_by_id=log.created_by_id,
        created_by_name=log.created_by.name if log.created_by else '',
        created_at=log.created_at,
    )


@router.get('/projects/{project_id}', response_model=list[SiteLogOut])
def list_logs(
    project_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_project(project_id, user.company_id, db)
    logs = db.query(SiteLog).filter(
        SiteLog.project_id == project_id,
        SiteLog.company_id == user.company_id,
    ).order_by(SiteLog.log_date.desc(), SiteLog.created_at.desc()).offset(skip).limit(limit).all()
    return [_log_out(l) for l in logs]


@router.post('/projects/{project_id}', response_model=SiteLogOut, status_code=status.HTTP_201_CREATED)
def create_log(
    project_id: str,
    body: SiteLogCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_project(project_id, user.company_id, db)
    log = SiteLog(
        **body.model_dump(),
        project_id=project_id,
        company_id=user.company_id,
        created_by_id=user.id,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return _log_out(log)


@router.put('/{log_id}', response_model=SiteLogOut)
def update_log(
    log_id: str,
    body: SiteLogUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    log = db.query(SiteLog).filter(SiteLog.id == log_id, SiteLog.company_id == user.company_id).first()
    if not log:
        raise HTTPException(status_code=404, detail='Site log not found')
    for k, v in body.model_dump().items():
        setattr(log, k, v)
    db.commit()
    db.refresh(log)
    return _log_out(log)


@router.delete('/{log_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_log(
    log_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    log = db.query(SiteLog).filter(SiteLog.id == log_id, SiteLog.company_id == user.company_id).first()
    if not log:
        raise HTTPException(status_code=404, detail='Site log not found')
    db.delete(log)
    db.commit()
