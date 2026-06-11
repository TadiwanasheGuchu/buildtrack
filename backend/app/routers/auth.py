import secrets
from datetime import datetime, timedelta, timezone
import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.company import Company
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UpdateMeRequest,
    UserOut,
)
from app.utils.security import (
    create_access_token,
    decode_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.utils.email import send_reset_email
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

RESET_TOKEN_EXPIRE_MINUTES = 30


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = decode_token(token)
        user_id: str = payload["sub"]
    except (ValueError, KeyError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def _build_user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        company_id=user.company_id,
        company_name=user.company.name,
        avatar_url=user.avatar_url,
    )


def _issue_tokens(user: User, db: Session) -> TokenResponse:
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = generate_refresh_token()
    user.refresh_token_hash = hash_refresh_token(refresh_token)
    db.commit()
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=_build_user_out(user),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    company = Company(name=body.company_name)
    db.add(company)
    db.flush()
    user = User(
        company_id=company.id,
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role="owner",
    )
    db.add(user)
    db.flush()
    return _issue_tokens(user, db)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return _issue_tokens(user, db)


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return _build_user_out(current_user)


@router.patch("/me", response_model=UserOut)
def update_me(
    body: UpdateMeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.name = body.name.strip()
    db.commit()
    db.refresh(current_user)
    return _build_user_out(current_user)


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password_hash = hash_password(body.new_password)
    db.commit()


@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not settings.cloudinary_cloud_name:
        raise HTTPException(status_code=503, detail="Image uploads are not configured on this server")
    if file.content_type not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
        raise HTTPException(status_code=400, detail="Unsupported image type")

    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
    )
    contents = await file.read()
    result = cloudinary.uploader.upload(
        contents,
        folder="buildtrack/avatars",
        resource_type="image",
        transformation=[{"width": 256, "height": 256, "crop": "fill", "gravity": "face", "quality": "auto"}],
    )
    current_user.avatar_url = result["secure_url"]
    db.commit()
    db.refresh(current_user)
    return _build_user_out(current_user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    token_hash = hash_refresh_token(body.refresh_token)
    user = db.query(User).filter(User.refresh_token_hash == token_hash).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    return _issue_tokens(user, db)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.refresh_token_hash = None
    db.commit()


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    # Always return 204 to avoid email enumeration
    user = db.query(User).filter(User.email == body.email).first()
    if user:
        # Invalidate any existing unused tokens
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == False,  # noqa: E712
        ).update({"used": True})

        token = secrets.token_urlsafe(32)
        db.add(PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES),
        ))
        db.commit()

        reset_url = f"{settings.frontend_url}/reset-password?token={token}"
        try:
            send_reset_email(user.email, reset_url)
        except Exception:
            pass  # Silently ignore — prevents enumeration via timing/errors


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == body.token,
        PasswordResetToken.used == False,  # noqa: E712
    ).first()
    if not record or record.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user.password_hash = hash_password(body.password)
    user.refresh_token_hash = None  # invalidate all sessions on password reset
    record.used = True
    db.commit()
