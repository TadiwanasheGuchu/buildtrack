from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.project import Project
from app.models.budget_line import BudgetLine
from app.models.cost_entry import CostEntry
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.budget import (
    BudgetLinesUpdate, BudgetLineOut,
    CostEntryCreate, CostEntryUpdate, CostEntryOut,
    BudgetSummary, CategorySummary, CompanyBudgetSummary,
    BUDGET_CATEGORIES,
)
from app.utils.notify import notify_company

router = APIRouter(prefix='/budget', tags=['budget'])


def _get_project(project_id: str, company_id, db: Session) -> Project:
    p = db.query(Project).filter(Project.id == project_id, Project.company_id == company_id).first()
    if not p:
        raise HTTPException(status_code=404, detail='Project not found')
    return p


def _entry_out(e: CostEntry) -> CostEntryOut:
    return CostEntryOut(
        id=e.id,
        company_id=e.company_id,
        project_id=e.project_id,
        category=e.category,
        description=e.description,
        amount=e.amount,
        vendor=e.vendor,
        date=e.date,
        created_by_id=e.created_by_id,
        created_by_name=e.created_by.name if e.created_by else '',
        created_at=e.created_at,
    )


# ── Company-wide summary ───────────────────────────────────────────────────

@router.get('/summary', response_model=CompanyBudgetSummary)
def get_company_summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    projects = db.query(Project).filter(Project.company_id == user.company_id).all()
    total_budget = sum((p.budget for p in projects), Decimal('0'))

    entries = db.query(CostEntry).filter(CostEntry.company_id == user.company_id).all()
    total_spent = sum((e.amount for e in entries), Decimal('0'))

    remaining = total_budget - total_spent
    percent_used = float(total_spent / total_budget * 100) if total_budget > 0 else 0.0

    return CompanyBudgetSummary(
        total_budget=total_budget,
        total_spent=total_spent,
        remaining=remaining,
        percent_used=round(percent_used, 1),
    )


# ── Project budget summary ─────────────────────────────────────────────────

@router.get('/projects/{project_id}/summary', response_model=BudgetSummary)
def get_project_summary(
    project_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = _get_project(project_id, user.company_id, db)

    lines = db.query(BudgetLine).filter(BudgetLine.project_id == project_id).all()
    entries = db.query(CostEntry).filter(CostEntry.project_id == project_id).all()

    line_map = {line.category: line.allocated_amount for line in lines}

    spent_map: dict[str, Decimal] = {}
    for entry in entries:
        spent_map[entry.category] = spent_map.get(entry.category, Decimal('0')) + entry.amount

    total_spent = sum(spent_map.values(), Decimal('0'))
    total_budget = project.budget
    remaining = total_budget - total_spent
    percent_used = float(total_spent / total_budget * 100) if total_budget > 0 else 0.0

    categories = [
        CategorySummary(
            category=cat,
            allocated=line_map.get(cat, Decimal('0')),
            spent=spent_map.get(cat, Decimal('0')),
            remaining=line_map.get(cat, Decimal('0')) - spent_map.get(cat, Decimal('0')),
        )
        for cat in BUDGET_CATEGORIES
    ]

    return BudgetSummary(
        total_budget=total_budget,
        total_spent=total_spent,
        remaining=remaining,
        percent_used=round(percent_used, 1),
        categories=categories,
    )


# ── Budget lines (allocations) ─────────────────────────────────────────────

@router.put('/projects/{project_id}/lines', response_model=list[BudgetLineOut])
def upsert_budget_lines(
    project_id: str,
    body: BudgetLinesUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_project(project_id, user.company_id, db)
    db.query(BudgetLine).filter(BudgetLine.project_id == project_id).delete()
    lines = [
        BudgetLine(project_id=project_id, category=li.category, allocated_amount=li.allocated_amount)
        for li in body.lines
    ]
    db.add_all(lines)
    db.commit()
    for line in lines:
        db.refresh(line)
    return [BudgetLineOut(id=l.id, project_id=l.project_id, category=l.category, allocated_amount=l.allocated_amount) for l in lines]


# ── Cost entries ───────────────────────────────────────────────────────────

@router.get('/projects/{project_id}/entries', response_model=list[CostEntryOut])
def list_entries(
    project_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_project(project_id, user.company_id, db)
    entries = (
        db.query(CostEntry)
        .filter(CostEntry.project_id == project_id, CostEntry.company_id == user.company_id)
        .order_by(CostEntry.date.desc(), CostEntry.created_at.desc())
        .all()
    )
    return [_entry_out(e) for e in entries]


@router.post('/projects/{project_id}/entries', response_model=CostEntryOut, status_code=status.HTTP_201_CREATED)
def create_entry(
    project_id: str,
    body: CostEntryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = _get_project(project_id, user.company_id, db)
    e = CostEntry(
        **body.model_dump(),
        project_id=project_id,
        company_id=user.company_id,
        created_by_id=user.id,
    )
    db.add(e)
    # Warn the company the first time spend crosses the project budget
    if project.budget and project.budget > 0:
        prev_spent = db.query(func.coalesce(func.sum(CostEntry.amount), 0)).filter(
            CostEntry.project_id == project_id,
        ).scalar() or Decimal('0')
        new_spent = Decimal(prev_spent) + e.amount
        if prev_spent <= project.budget < new_spent:
            notify_company(
                db,
                company_id=user.company_id,
                type='budget',
                title='Project over budget',
                message=f'{project.name} has exceeded its budget of R{project.budget:,.0f}',
                link=f'/projects/{project_id}',
            )
    db.commit()
    db.refresh(e)
    return _entry_out(e)


@router.put('/entries/{entry_id}', response_model=CostEntryOut)
def update_entry(
    entry_id: str,
    body: CostEntryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    e = db.query(CostEntry).filter(CostEntry.id == entry_id, CostEntry.company_id == user.company_id).first()
    if not e:
        raise HTTPException(status_code=404, detail='Cost entry not found')
    for k, v in body.model_dump().items():
        setattr(e, k, v)
    db.commit()
    db.refresh(e)
    return _entry_out(e)


@router.delete('/entries/{entry_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(
    entry_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    e = db.query(CostEntry).filter(CostEntry.id == entry_id, CostEntry.company_id == user.company_id).first()
    if not e:
        raise HTTPException(status_code=404, detail='Cost entry not found')
    db.delete(e)
    db.commit()
