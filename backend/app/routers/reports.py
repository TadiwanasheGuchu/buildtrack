import csv
import io
import re
from datetime import UTC, datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.cost_entry import CostEntry
from app.models.milestone import Milestone
from app.models.project import Project
from app.models.punch_item import PunchItem
from app.models.site_log import SiteLog
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.report import PortfolioReport, ProjectReportRow

router = APIRouter(prefix='/reports', tags=['reports'])


def _get_project(project_id: str, company_id, db: Session) -> Project:
    p = db.query(Project).filter(Project.id == project_id, Project.company_id == company_id).first()
    if not p:
        raise HTTPException(status_code=404, detail='Project not found')
    return p


def _safe_filename(name: str) -> str:
    return re.sub(r'[^A-Za-z0-9_-]+', '-', name).strip('-').lower() or 'project'


def _csv_response(header: list[str], rows: list[list], filename: str) -> StreamingResponse:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(header)
    writer.writerows(rows)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type='text/csv',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )


def _build_portfolio(company_id, db: Session) -> PortfolioReport:
    projects = db.query(Project).filter(Project.company_id == company_id).order_by(Project.created_at.desc()).all()
    project_ids = [p.id for p in projects]

    milestones = db.query(Milestone).filter(Milestone.project_id.in_(project_ids)).all() if project_ids else []
    punch_items = db.query(PunchItem).filter(PunchItem.company_id == company_id).all()
    entries = db.query(CostEntry).filter(CostEntry.company_id == company_id).all()

    spent_by_project: dict = {}
    for e in entries:
        spent_by_project[e.project_id] = spent_by_project.get(e.project_id, Decimal('0')) + e.amount

    ms_by_project: dict = {}
    for m in milestones:
        ms_by_project.setdefault(m.project_id, []).append(m)

    punch_open_by_project: dict = {}
    for i in punch_items:
        if i.status != 'Resolved':
            punch_open_by_project[i.project_id] = punch_open_by_project.get(i.project_id, 0) + 1

    rows = []
    for p in projects:
        spent = spent_by_project.get(p.id, Decimal('0'))
        p_ms = ms_by_project.get(p.id, [])
        rows.append(ProjectReportRow(
            id=p.id,
            name=p.name,
            status=p.status,
            progress=p.progress,
            budget=p.budget,
            spent=spent,
            percent_used=round(float(spent / p.budget * 100), 1) if p.budget and p.budget > 0 else 0.0,
            milestones_total=len(p_ms),
            milestones_completed=sum(1 for m in p_ms if m.completed_at),
            punch_open=punch_open_by_project.get(p.id, 0),
        ))

    total_budget = sum((p.budget for p in projects), Decimal('0'))
    total_spent = sum(spent_by_project.values(), Decimal('0'))

    today = datetime.now(UTC).date()
    completed = [m for m in milestones if m.completed_at]
    completed_with_due = [m for m in completed if m.due_date]
    on_time = sum(1 for m in completed_with_due if m.completed_at.date() <= m.due_date)
    overdue = sum(1 for m in milestones if not m.completed_at and m.due_date and m.due_date < today)

    by_status: dict[str, int] = {}
    for p in projects:
        by_status[p.status] = by_status.get(p.status, 0) + 1

    return PortfolioReport(
        projects_total=len(projects),
        projects_by_status=by_status,
        total_budget=total_budget,
        total_spent=total_spent,
        budget_percent_used=round(float(total_spent / total_budget * 100), 1) if total_budget > 0 else 0.0,
        milestones_total=len(milestones),
        milestones_completed=len(completed),
        milestones_overdue=overdue,
        on_time_rate=round(on_time / len(completed_with_due) * 100, 1) if completed_with_due else None,
        punch_open=sum(1 for i in punch_items if i.status != 'Resolved'),
        punch_resolved=sum(1 for i in punch_items if i.status == 'Resolved'),
        projects=rows,
    )


@router.get('/portfolio', response_model=PortfolioReport)
def get_portfolio_report(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _build_portfolio(user.company_id, db)


@router.get('/portfolio/csv')
def export_portfolio_csv(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    report = _build_portfolio(user.company_id, db)
    rows = [
        [r.name, r.status, r.progress, r.budget, r.spent, r.percent_used,
         r.milestones_completed, r.milestones_total, r.punch_open]
        for r in report.projects
    ]
    return _csv_response(
        ['Project', 'Status', 'Progress %', 'Budget (ZAR)', 'Spent (ZAR)', 'Budget Used %',
         'Milestones Completed', 'Milestones Total', 'Open Punch Items'],
        rows,
        f'portfolio-report-{datetime.now(UTC).date()}.csv',
    )


@router.get('/projects/{project_id}/csv')
def export_project_csv(
    project_id: str,
    report: str = Query(..., pattern='^(milestones|cost-entries|punch|site-logs)$'),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = _get_project(project_id, user.company_id, db)
    stem = _safe_filename(project.name)
    today = datetime.now(UTC).date()

    if report == 'milestones':
        items = db.query(Milestone).filter(Milestone.project_id == project_id).order_by(Milestone.due_date).all()
        return _csv_response(
            ['Title', 'Due Date', 'Completed At', 'Status'],
            [[m.title, m.due_date or '', m.completed_at.date() if m.completed_at else '',
              'Completed' if m.completed_at else 'Pending'] for m in items],
            f'{stem}-milestones-{today}.csv',
        )

    if report == 'cost-entries':
        items = db.query(CostEntry).filter(CostEntry.project_id == project_id).order_by(CostEntry.date.desc()).all()
        return _csv_response(
            ['Date', 'Category', 'Description', 'Vendor', 'Amount (ZAR)', 'Logged By'],
            [[e.date, e.category, e.description, e.vendor or '', e.amount,
              e.created_by.name if e.created_by else ''] for e in items],
            f'{stem}-cost-entries-{today}.csv',
        )

    if report == 'punch':
        items = db.query(PunchItem).filter(PunchItem.project_id == project_id).order_by(PunchItem.created_at.desc()).all()
        return _csv_response(
            ['Title', 'Description', 'Status', 'Priority', 'Assigned To', 'Due Date', 'Resolved At', 'Created By'],
            [[i.title, i.description or '', i.status, i.priority,
              i.assigned_to.name if i.assigned_to else '', i.due_date or '',
              i.resolved_at.date() if i.resolved_at else '',
              i.created_by.name if i.created_by else ''] for i in items],
            f'{stem}-punch-list-{today}.csv',
        )

    # site-logs
    items = db.query(SiteLog).filter(SiteLog.project_id == project_id).order_by(SiteLog.log_date.desc()).all()
    return _csv_response(
        ['Date', 'Weather', 'Temp (°C)', 'Crew', 'Work Completed', 'Materials Delivered', 'Issues', 'Safety Notes', 'Logged By'],
        [[l.log_date, l.weather or '', l.temperature_c if l.temperature_c is not None else '',
          l.crew_count if l.crew_count is not None else '', l.work_completed,
          l.materials_delivered or '', l.issues or '', l.safety_notes or '',
          l.created_by.name if l.created_by else ''] for l in items],
        f'{stem}-site-logs-{today}.csv',
    )
