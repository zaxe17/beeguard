import smtplib
from email.mime.text import MIMEText

SMTP_USER = "johnevansgutierrez9@gmail.com"
SMTP_PASSWORD = "nifm rlts nmuu bhdp"  # ilagay dito yung app password mo

msg = MIMEText("Test lang")
msg["Subject"] = "Test"
msg["From"] = SMTP_USER
msg["To"] = SMTP_USER

with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as s:
    s.ehlo()
    s.starttls()
    s.ehlo()
    s.login(SMTP_USER, SMTP_PASSWORD)
    s.sendmail(SMTP_USER, [SMTP_USER], msg.as_string())
    print("SUCCESS")