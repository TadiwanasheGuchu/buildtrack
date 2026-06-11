from datetime import UTC, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.milestone import Milestone
from app.models.post import Post
from app.models.project import Project
from app.routers.auth import get_current_user
from app.models.user import User
from app.schemas.project import MilestoneCreate, MilestoneOut, MilestoneWithProjectOut, ProjectCreate, ProjectOut, ProjectUpdate
from app.utils.notify import notify_company

router = APIRouter(prefix='/projects', tags=['projects'])


def _recalc_progress(project: Project, db: Session) -> None:
    total = db.query(func.count(Milestone.id)).filter(Milestone.project_id == project.id).scalar() or 0
    done = db.query(func.count(Milestone.id)).filter(
        Milestone.project_id == project.id,
        Milestone.completed_at.isnot(None),
    ).scalar() or 0
    project.progress = int((done / total * 100)) if total else 0


@router.get('', response_model=list[ProjectOut])
def list_projects(
    status: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Project).filter(Project.company_id == user.company_id)
    if status:
        q = q.filter(Project.status == status)
    return q.order_by(Project.created_at.desc()).all()


@router.post('', response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    body: ProjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = Project(**body.model_dump(), company_id=user.company_id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get('/{project_id}', response_model=ProjectOut)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id, Project.company_id == user.company_id).first()
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    return project


@router.put('/{project_id}', response_model=ProjectOut)
def update_project(
    project_id: str,
    body: ProjectUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id, Project.company_id == user.company_id).first()
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    for key, val in body.model_dump().items():
        setattr(project, key, val)
    db.commit()
    db.refresh(project)
    return project


@router.delete('/{project_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id, Project.company_id == user.company_id).first()
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    # Existing databases predate the CASCADE on posts.project_id — delete explicitly
    db.query(Post).filter(Post.project_id == project_id).delete()
    db.delete(project)
    db.commit()


# ── Milestones ─────────────────────────────────────────────────────────────

@router.get('/milestones/upcoming', response_model=list[MilestoneWithProjectOut])
def get_upcoming_milestones(
    limit: int = 5,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = (
        db.query(Milestone, Project.name)
        .join(Project, Milestone.project_id == Project.id)
        .filter(
            Project.company_id == user.company_id,
            Milestone.completed_at.is_(None),
        )
        .order_by(Milestone.due_date.asc().nulls_last())
        .limit(limit)
        .all()
    )
    return [
        MilestoneWithProjectOut(
            id=m.id,
            project_id=m.project_id,
            project_name=project_name,
            title=m.title,
            due_date=m.due_date,
            completed_at=m.completed_at,
        )
        for m, project_name in rows
    ]


@router.get('/{project_id}/milestones', response_model=list[MilestoneOut])
def list_milestones(
    project_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id, Project.company_id == user.company_id).first()
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    return db.query(Milestone).filter(Milestone.project_id == project_id).order_by(Milestone.due_date).all()


@router.post('/{project_id}/milestones', response_model=MilestoneOut, status_code=status.HTTP_201_CREATED)
def create_milestone(
    project_id: str,
    body: MilestoneCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id, Project.company_id == user.company_id).first()
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    m = Milestone(**body.model_dump(), project_id=project_id)
    db.add(m)
    db.flush()
    _recalc_progress(project, db)
    db.commit()
    db.refresh(m)
    return m


@router.patch('/milestones/{milestone_id}/complete', response_model=MilestoneOut)
def complete_milestone(
    milestone_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    m = db.query(Milestone).join(Project).filter(
        Milestone.id == milestone_id,
        Project.company_id == user.company_id,
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail='Milestone not found')
    m.completed_at = datetime.now(UTC)
    project = db.query(Project).filter(Project.id == m.project_id).first()
    if project:
        _recalc_progress(project, db)
        notify_company(
            db,
            company_id=user.company_id,
            type='milestone',
            title='Milestone completed',
            message=f'{user.name} completed "{m.title}" on {project.name}',
            link=f'/projects/{project.id}',
            exclude_user_id=user.id,
        )
    db.commit()
    db.refresh(m)
    return m


@router.delete('/milestones/{milestone_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_milestone(
    milestone_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    m = db.query(Milestone).join(Project).filter(
        Milestone.id == milestone_id,
        Project.company_id == user.company_id,
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail='Milestone not found')
    project = db.query(Project).filter(Project.id == m.project_id).first()
    db.delete(m)
    db.flush()
    if project:
        _recalc_progress(project, db)
    db.commit()
