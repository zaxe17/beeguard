"""
Email sender (verification OTP, password reset OTP, ...). Stdlib only —
no new packages needed.

WHY THERE ARE TWO WAYS TO SEND
  Railway blocks outgoing SMTP (ports 25/465/587) on the Free, Trial and
  Hobby plans, so Gmail SMTP works on your computer but NOT on Railway.
  An email API sends over normal HTTPS (port 443), which Railway allows.

  EMAIL_PROVIDER picks how mail is sent:
    "brevo"  -> Brevo HTTP API     (free: 300 emails/day, no domain needed —
                                    just verify your sender email in Brevo)
    "resend" -> Resend HTTP API    (free, but needs your own verified domain
                                    to send to other people's addresses)
    "smtp"   -> Gmail / any SMTP   (local XAMPP / your computer)
  If EMAIL_PROVIDER isn't set: Brevo if BREVO_API_KEY is set, else Resend if
  RESEND_API_KEY is set, else SMTP. So locally nothing changes; on Railway
  just add BREVO_API_KEY (and EMAIL_FROM_ADDRESS).

ENV VARIABLES (.env locally / Railway -> Variables)
  EMAIL_PROVIDER       optional: brevo | resend | smtp
  BREVO_API_KEY        Brevo -> SMTP & API -> API Keys (starts with "xkeysib-")
  RESEND_API_KEY       Resend -> API Keys (starts with "re_")
  EMAIL_FROM_ADDRESS   sender address; for Brevo it must be a VERIFIED sender
                       (Brevo -> Senders). Default: the address in SMTP_FROM.
  EMAIL_FROM_NAME      sender name shown in the inbox. Default: "BeeGuard".
  SMTP_*               unchanged (used only when sending via SMTP).
"""
import json
import os
import smtplib
import urllib.error
import urllib.request
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, parseaddr

from config.config import Config

HTTP_TIMEOUT_S = 15
BREVO_URL = "https://api.brevo.com/v3/smtp/email"
RESEND_URL = "https://api.resend.com/emails"


def _provider() -> str:
    chosen = (os.getenv("EMAIL_PROVIDER") or "").strip().lower()
    if chosen in ("brevo", "resend", "smtp"):
        return chosen
    if os.getenv("BREVO_API_KEY"):
        return "brevo"
    if os.getenv("RESEND_API_KEY"):
        return "resend"
    return "smtp"


def _sender() -> tuple[str, str]:
    """(name, address) of the sender."""
    smtp_name, smtp_addr = parseaddr(getattr(Config, "SMTP_FROM", "") or "")
    address = (
        os.getenv("EMAIL_FROM_ADDRESS")
        or smtp_addr
        or getattr(Config, "SMTP_USER", "")
        or ""
    ).strip()
    name = (os.getenv("EMAIL_FROM_NAME") or smtp_name or "BeeGuard").strip()
    if not address:
        raise RuntimeError(
            "No sender email configured. Set EMAIL_FROM_ADDRESS (or SMTP_FROM)."
        )
    return name, address


def _post_json(url: str, headers: dict, payload: dict) -> None:
    """HTTPS POST; raises RuntimeError with the provider's message on failure."""
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json", **headers},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT_S) as res:
            if res.status >= 300:
                raise RuntimeError(f"Email API answered {res.status}.")
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:300]
        raise RuntimeError(f"Email API error {e.code}: {detail}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"Couldn't reach the email API: {e.reason}") from e


def _send_brevo(to_email, subject, html_body, text_body) -> None:
    key = os.getenv("BREVO_API_KEY", "").strip()
    if not key:
        raise RuntimeError("BREVO_API_KEY is not set.")
    name, address = _sender()
    payload = {
        "sender": {"name": name, "email": address},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_body,
    }
    if text_body:
        payload["textContent"] = text_body
    _post_json(BREVO_URL, {"api-key": key}, payload)


def _send_resend(to_email, subject, html_body, text_body) -> None:
    key = os.getenv("RESEND_API_KEY", "").strip()
    if not key:
        raise RuntimeError("RESEND_API_KEY is not set.")
    name, address = _sender()
    payload = {
        "from": formataddr((name, address)),
        "to": [to_email],
        "subject": subject,
        "html": html_body,
    }
    if text_body:
        payload["text"] = text_body
    _post_json(RESEND_URL, {"Authorization": f"Bearer {key}"}, payload)


def _send_smtp(to_email, subject, html_body, text_body) -> None:
    if not Config.SMTP_USER or not Config.SMTP_PASSWORD:
        raise RuntimeError(
            "SMTP credentials are not configured. "
            "Set SMTP_USER and SMTP_PASSWORD in your .env file "
            "(or BREVO_API_KEY to send through Brevo instead)."
        )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = Config.SMTP_FROM
    msg["To"] = to_email

    if text_body:
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    with smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT, timeout=15) as s:
        s.ehlo()
        if Config.SMTP_USE_TLS:
            s.starttls()
            s.ehlo()
        s.login(Config.SMTP_USER, Config.SMTP_PASSWORD)
        s.sendmail(Config.SMTP_FROM, [to_email], msg.as_string())


_SENDERS = {"brevo": _send_brevo, "resend": _send_resend, "smtp": _send_smtp}


class EmailService:
    @staticmethod
    def provider() -> str:
        """Which way mail is sent right now (for logs / debugging)."""
        return _provider()

    @staticmethod
    def send(to_email: str, subject: str, html_body: str,
             text_body: str | None = None) -> None:
        """Raises on failure. Caller decides how to surface errors."""
        provider = _provider()
        try:
            _SENDERS[provider](to_email, subject, html_body, text_body)
        except Exception as e:
            print(f"[EMAIL] Sending via {provider} to {to_email} failed: {e}")
            raise

    @staticmethod
    def send_verification_otp(to_email: str, name: str, code: str,
                              ttl_minutes: int) -> None:
        subject = "Verify your BeeGuard account"
        text_body = (
            f"Hi {name or 'there'},\n\n"
            f"Your BeeGuard verification code is: {code}\n"
            f"This code expires in {ttl_minutes} minutes.\n\n"
            "If you did not create an account, please ignore this email."
        )
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;
                    padding: 24px; border: 1px solid #eee; border-radius: 12px;">
          <h2 style="color: #ff9a00; margin-top: 0;">Verify your BeeGuard account</h2>
          <p>Hi {name or 'there'},</p>
          <p>Your 6-digit verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px;
                      background: #fff8e1; color: #4a2f00; text-align: center;
                      padding: 16px; border-radius: 8px; margin: 16px 0;">
            {code}
          </div>
          <p>This code expires in <b>{ttl_minutes} minutes</b>.</p>
          <p style="color: #888; font-size: 12px;">
            If you did not create an account, you can safely ignore this email.
          </p>
        </div>
        """
        EmailService.send(to_email, subject, html_body, text_body)

    # NEW — Forgot Password (OTP purpose 'password_reset').
    @staticmethod
    def send_password_reset_otp(to_email: str, name: str, code: str,
                                ttl_minutes: int) -> None:
        subject = "Reset your BeeGuard password"
        text_body = (
            f"Hi {name or 'there'},\n\n"
            f"Your BeeGuard password reset code is: {code}\n"
            f"This code expires in {ttl_minutes} minutes.\n\n"
            "If you did not ask to reset your password, you can ignore this "
            "email — your password will stay the same."
        )
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;
                    padding: 24px; border: 1px solid #eee; border-radius: 12px;">
          <h2 style="color: #ff9a00; margin-top: 0;">Reset your BeeGuard password</h2>
          <p>Hi {name or 'there'},</p>
          <p>Your 6-digit password reset code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px;
                      background: #fff8e1; color: #4a2f00; text-align: center;
                      padding: 16px; border-radius: 8px; margin: 16px 0;">
            {code}
          </div>
          <p>This code expires in <b>{ttl_minutes} minutes</b>.</p>
          <p style="color: #888; font-size: 12px;">
            If you did not ask to reset your password, you can safely ignore
            this email — your password will stay the same.
          </p>
        </div>
        """
        EmailService.send(to_email, subject, html_body, text_body)