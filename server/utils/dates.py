# utils/dates.py
"""
"Today" for BeeGuard = today in the Philippines (UTC+8, no daylight
saving), no matter what timezone the server's clock is set to.

Why: date checks like "harvest date cannot be in the future" used
dt.date.today(), i.e. the SERVER's date. On a server running on UTC
(most hosting, Docker, WSL), the date only changes at 8:00 AM Philippine
time — so before 8 AM, picking today's date was rejected as "in the
future". Using the Philippine date everywhere fixes that.
"""
import datetime as dt

PH_TZ = dt.timezone(dt.timedelta(hours=8), name="Asia/Manila")


def ph_now() -> dt.datetime:
    """Current Philippine date & time (timezone-aware)."""
    return dt.datetime.now(PH_TZ)


def ph_today() -> dt.date:
    """Today's date in the Philippines."""
    return ph_now().date()