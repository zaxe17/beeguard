"""SMTP-based email sender. Uses stdlib only."""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from config.config import Config


class EmailService:
    @staticmethod
    def send(to_email: str, subject: str, html_body: str,
             text_body: str | None = None) -> None:
        """Raises on failure. Caller decides how to surface errors."""
        if not Config.SMTP_USER or not Config.SMTP_PASSWORD:
            raise RuntimeError(
                "SMTP credentials are not configured. "
                "Set SMTP_USER and SMTP_PASSWORD in your .env file."
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
