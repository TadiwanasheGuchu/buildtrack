import resend
from app.config import settings


def send_invite_email(to_email: str, token: str, company_name: str, invited_by: str, role: str) -> None:
    invite_url = f"{settings.frontend_url}/accept-invite?token={token}"
    role_label = role.replace('_', ' ').title()
    resend.api_key = settings.resend_api_key
    resend.Emails.send({
        "from": "TerraConstruct <noreply@resend.dev>",
        "to": to_email,
        "subject": f"You've been invited to join {company_name} on TerraConstruct",
        "html": f"""
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
  <h2 style="margin-bottom:8px">You're invited!</h2>
  <p style="color:#555;margin-bottom:8px">
    <strong>{invited_by}</strong> has invited you to join
    <strong>{company_name}</strong> on TerraConstruct as a <strong>{role_label}</strong>.
  </p>
  <p style="color:#555;margin-bottom:24px">
    Click the button below to set up your account. This link expires in 7 days.
  </p>
  <a href="{invite_url}"
     style="display:inline-block;background:#c45c2e;color:#fff;padding:12px 24px;
            border-radius:6px;text-decoration:none;font-weight:600">
    Accept Invitation
  </a>
  <p style="color:#999;font-size:13px;margin-top:24px">
    If you weren't expecting this, you can safely ignore this email.
  </p>
</div>
""",
    })


def send_reset_email(to_email: str, reset_url: str) -> None:
    resend.api_key = settings.resend_api_key
    resend.Emails.send({
        "from": "TerraConstruct <noreply@resend.dev>",
        "to": to_email,
        "subject": "Reset your TerraConstruct password",
        "html": f"""
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
  <h2 style="margin-bottom:8px">Reset your password</h2>
  <p style="color:#555;margin-bottom:24px">
    Click the button below to reset your password. This link expires in 30 minutes.
  </p>
  <a href="{reset_url}"
     style="display:inline-block;background:#c45c2e;color:#fff;padding:12px 24px;
            border-radius:6px;text-decoration:none;font-weight:600">
    Reset Password
  </a>
  <p style="color:#999;font-size:13px;margin-top:24px">
    If you didn't request this, you can safely ignore this email.
  </p>
</div>
""",
    })
