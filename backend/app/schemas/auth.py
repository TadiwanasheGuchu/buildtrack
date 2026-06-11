import uuid
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    company_name: str
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UpdateMeRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    role: str
    company_id: uuid.UUID
    company_name: str
    avatar_url: str | None = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut
