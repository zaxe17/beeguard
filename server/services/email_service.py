"""
Email sender (verification OTP, password reset OTP, ...). Stdlib only —
no new packages needed.

EMAIL_PROVIDER picks how mail is sent:
    "smtp"   -> Gmail / any SMTP   (local computer, VPS, Railway Pro)
    "brevo"  -> Brevo HTTP API     (works on Railway Free/Hobby; port 443)
    "resend" -> Resend HTTP API    (needs your own verified domain)

If EMAIL_PROVIDER isn't set: Brevo if BREVO_API_KEY is set, else Resend if
RESEND_API_KEY is set, else SMTP.

NOTE: Railway blocks outgoing SMTP (ports 25/465/587) on the Free, Trial and
Hobby plans. SMTP works there only on Pro or on another host.

ENV VARIABLES (.env locally / Railway -> Variables)
  EMAIL_PROVIDER       optional: smtp | brevo | resend
  SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD / SMTP_FROM / SMTP_USE_TLS
  BREVO_API_KEY, RESEND_API_KEY, EMAIL_FROM_ADDRESS, EMAIL_FROM_NAME
"""
import json
import os
import smtplib
import socket
import ssl
import urllib.error
import urllib.request
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, formatdate, make_msgid, parseaddr

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
            "Set SMTP_USER and SMTP_PASSWORD (Gmail App Password) in your .env."
        )

    host, port = Config.SMTP_HOST, Config.SMTP_PORT
    from_name, from_addr = parseaddr(Config.SMTP_FROM)
    from_addr = from_addr or Config.SMTP_USER

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = formataddr((from_name or "BeeGuard", from_addr))
    msg["To"] = to_email
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain=from_addr.split("@")[-1])

    if text_body:
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    ctx = ssl.create_default_context()
    try:
        if port == 465:  # implicit SSL
            server = smtplib.SMTP_SSL(host, port, timeout=15, context=ctx)
        else:            # 587 + STARTTLS
            server = smtplib.SMTP(host, port, timeout=15)

        with server as s:
            s.ehlo()
            if port != 465 and Config.SMTP_USE_TLS:
                s.starttls(context=ctx)
                s.ehlo()
            s.login(Config.SMTP_USER, Config.SMTP_PASSWORD)
            s.sendmail(from_addr, [to_email], msg.as_string())

    except smtplib.SMTPAuthenticationError as e:
        raise RuntimeError(
            "SMTP login failed. For Gmail use a 16-character App Password "
            "(not your normal password) and make sure 2-Step Verification is on."
        ) from e
    except smtplib.SMTPException as e:
        raise RuntimeError(f"SMTP error: {e}") from e
    except (socket.timeout, OSError) as e:
        raise RuntimeError(
            f"Couldn't connect to {host}:{port} ({e}). If this is on Railway "
            "Free/Trial/Hobby, outgoing SMTP is blocked there; use Pro, another "
            "host, or an email API."
        ) from e


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