import secrets
from datetime import UTC, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.invitation import Invitation
from app.models.user import User
from app.routers.auth import get_current_user, _build_user_out, _issue_tokens
from app.schemas.team import (
    AcceptInviteRequest, CompanyOut, CompanyUpdate, InviteCreate, InviteInfoOut, InviteOut, RoleUpdate, TeamMemberOut,
)
from app.models.company import Company
from app.utils.email import send_invite_email
from app.utils.notify import notify_company
from app.utils.security import hash_password
from app.schemas.auth import TokenResponse

router = APIRouter(prefix='/team', tags=['team'])

INVITE_EXPIRE_DAYS = 7


def _owner_only(user: User) -> None:
    if user.role != 'owner':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Only owners can perform this action')


# ── Company ────────────────────────────────────────────────────────────────

@router.patch('/company', response_model=CompanyOut)
def rename_company(
    body: CompanyUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _owner_only(user)
    company = db.query(Company).filter(Company.id == user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail='Company not found')
    company.name = body.name.strip()
    db.commit()
    db.refresh(company)
    return company


# ── Members ────────────────────────────────────────────────────────────────

@router.get('/members', response_model=list[TeamMemberOut])
def list_members(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return (
        db.query(User)
        .filter(User.company_id == user.company_id)
        .order_by(User.created_at)
        .all()
    )


@router.patch('/members/{user_id}/role', response_model=TeamMemberOut)
def change_role(
    user_id: str,
    body: RoleUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _owner_only(user)
    target = db.query(User).filter(User.id == user_id, User.company_id == user.company_id).first()
    if not target:
        raise HTTPException(status_code=404, detail='Member not found')
    if str(target.id) == str(user.id):
        raise HTTPException(status_code=400, detail='You cannot change your own role')
    target.role = body.role
    db.commit()
    db.refresh(target)
    return target


@router.delete('/members/{user_id}', status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    user_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _owner_only(user)
    target = db.query(User).filter(User.id == user_id, User.company_id == user.company_id).first()
    if not target:
        raise HTTPException(status_code=404, detail='Member not found')
    if str(target.id) == str(user.id):
        raise HTTPException(status_code=400, detail='You cannot remove yourself')
    db.delete(target)
    db.commit()


# ── Invitations ────────────────────────────────────────────────────────────

@router.post('/invite', response_model=InviteOut, status_code=status.HTTP_201_CREATED)
def send_invite(
    body: InviteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _owner_only(user)

    if db.query(User).filter(User.email == body.email, User.company_id == user.company_id).first():
        raise HTTPException(status_code=400, detail='This person is already a team member')

    existing = db.query(Invitation).filter(
        Invitation.email == body.email,
        Invitation.company_id == user.company_id,
        Invitation.accepted_at.is_(None),
        Invitation.expires_at > datetime.now(UTC),
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail='A pending invite already exists for this email')

    token = secrets.token_urlsafe(32)
    invite = Invitation(
        company_id=user.company_id,
        email=body.email,
        role=body.role,
        token=token,
        invited_by_id=user.id,
        expires_at=datetime.now(UTC) + timedelta(days=INVITE_EXPIRE_DAYS),
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    try:
        send_invite_email(body.email, token, user.company.name, user.name, body.role)
    except Exception:
        pass  # Don't fail the request if email sending fails

    return invite


@router.get('/invite/{token}', response_model=InviteInfoOut)
def get_invite_info(token: str, db: Session = Depends(get_db)):
    invite = db.query(Invitation).filter(
        Invitation.token == token,
        Invitation.accepted_at.is_(None),
        Invitation.expires_at > datetime.now(UTC),
    ).first()
    if not invite:
        raise HTTPException(status_code=400, detail='Invalid or expired invitation')
    return InviteInfoOut(
        email=invite.email,
        role=invite.role,
        company_name=invite.company.name,
        expires_at=invite.expires_at,
    )


@router.post('/invite/accept', response_model=TokenResponse)
def accept_invite(body: AcceptInviteRequest, db: Session = Depends(get_db)):
    invite = db.query(Invitation).filter(
        Invitation.token == body.token,
        Invitation.accepted_at.is_(None),
        Invitation.expires_at > datetime.now(UTC),
    ).first()
    if not invite:
        raise HTTPException(status_code=400, detail='Invalid or expired invitation')

    if db.query(User).filter(User.email == invite.email).first():
        raise HTTPException(status_code=400, detail='An account with this email already exists')

    new_user = User(
        company_id=invite.company_id,
        name=body.name,
        email=invite.email,
        password_hash=hash_password(body.password),
        role=invite.role,
    )
    db.add(new_user)
    invite.accepted_at = datetime.now(UTC)
    db.flush()
    notify_company(
        db,
        company_id=invite.company_id,
        type='team',
        title='New team member',
        message=f'{new_user.name} joined the team as {new_user.role.replace("_", " ")}',
        link='/settings/team',
        exclude_user_id=new_user.id,
    )
    return _issue_tokens(new_user, db)
