# utils/logger.py
"""
SYSTEM LOG FILES for the BeeGuard backend.

Creates a `logs/` folder next to app.py (override with LOG_DIR in .env) with:

  logs/app.log    everything: every API request (method, path, status, time,
                  user, IP), plus every print() the backend already does
                  ([REGISTER] ..., [BACKUP] ..., [CVSCAN] ..., etc.)
  logs/error.log  only errors — server crashes with the full traceback,
                  500 responses, failed emails, etc.
  logs/auth.log   audit trail — sign in (success / failed), sign up,
                  email verification, forgot/reset password, user deletion.

Each file rotates at 5 MB and keeps 5 old copies (app.log.1 ... app.log.5),
so the folder never grows past ~90 MB.

NEVER logged: passwords, OTP codes, tokens, request bodies.

Usage:
    from utils.logger import setup_logging, audit
    setup_logging(app)                       # once, in create_app()
    audit("LOGIN_SUCCESS", user_id="C-0001", role="citizen")
"""
import logging
import os
import sys
import threading
import time
import uuid
from logging.handlers import RotatingFileHandler

from flask import g, has_request_context, request

LOG_DIR = os.getenv(
    "LOG_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs"),
)
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
MAX_BYTES = 5 * 1024 * 1024
BACKUP_COUNT = 5

FORMAT = "%(asctime)s | %(levelname)-7s | %(name)s | %(request_id)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Loggers used around the app
app_logger = logging.getLogger("beeguard")
auth_logger = logging.getLogger("beeguard.auth")
console_logger = logging.getLogger("beeguard.console")
request_logger = logging.getLogger("beeguard.request")

_configured = False


class _SafeRotatingFileHandler(RotatingFileHandler):
    """
    On Windows, Flask's debug reloader runs TWO processes that both hold
    the log file open, so renaming it during rotation can fail with
    PermissionError. Instead of crashing the request, skip that rotation
    and keep writing — it will rotate on a later write.
    """

    def doRollover(self):
        try:
            super().doRollover()
        except (PermissionError, OSError):
            if self.stream is None:
                self.stream = self._open()


class _RequestIdFilter(logging.Filter):
    """Adds the current request's short id (or '-') to every log line, so
    all lines from one request — including its traceback — can be matched."""

    def filter(self, record):
        rid = "-"
        if has_request_context():
            rid = getattr(g, "request_id", "-")
        record.request_id = rid
        return True


class _ConsoleTee:
    """
    Wraps sys.stdout: everything still prints to the terminal as before,
    AND each printed line is copied into app.log (lines that look like
    errors also go to error.log). This captures all the existing
    print(f"[TAG] ...") calls without editing every file.
    """

    ERROR_WORDS = ("error", "failed", "traceback", "exception")

    def __init__(self, original):
        self._original = original
        self._buffer = ""
        self._lock = threading.Lock()

    def write(self, text):
        self._original.write(text)
        with self._lock:
            self._buffer += text
            lines = []
            while "\n" in self._buffer:
                line, self._buffer = self._buffer.split("\n", 1)
                lines.append(line)
        for line in lines:
            line = line.rstrip()
            if not line:
                continue
            lowered = line.lower()
            if any(w in lowered for w in self.ERROR_WORDS):
                console_logger.error(line)
            else:
                console_logger.info(line)
        return len(text)

    def flush(self):
        self._original.flush()

    def __getattr__(self, name):
        # isatty(), encoding, fileno(), ... -> the real stdout
        return getattr(self._original, name)


def _file_handler(filename: str, level: int) -> logging.Handler:
    handler = _SafeRotatingFileHandler(
        os.path.join(LOG_DIR, filename),
        maxBytes=MAX_BYTES,
        backupCount=BACKUP_COUNT,
        encoding="utf-8",
        delay=True,  # file opened on first write
    )
    handler.setLevel(level)
    handler.setFormatter(logging.Formatter(FORMAT, DATE_FORMAT))
    handler.addFilter(_RequestIdFilter())
    return handler


def _client_ip() -> str:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "-"


def _current_user() -> str:
    user_id = getattr(g, "user_id", None)
    role = getattr(g, "role", None)
    if user_id:
        return f"{role or '?'}:{user_id}"
    return "guest"


def audit(event: str, **fields) -> None:
    """
    One line in auth.log (and app.log), e.g.
      LOGIN_FAILED | identifier=juan | ip=127.0.0.1 | reason=Invalid credentials.
    Pass only safe values — never passwords, codes or tokens.
    """
    parts = [event]
    if has_request_context():
        fields.setdefault("ip", _client_ip())
    for key, value in fields.items():
        if value is None or value == "":
            continue
        parts.append(f"{key}={value}")
    auth_logger.info(" | ".join(parts))


def setup_logging(app) -> None:
    """Call once in create_app(). Safe to call again (does nothing)."""
    global _configured
    if _configured:
        return
    _configured = True

    os.makedirs(LOG_DIR, exist_ok=True)
    # Keep log files out of git (they can hold emails / IPs).
    gitignore = os.path.join(LOG_DIR, ".gitignore")
    if not os.path.exists(gitignore):
        try:
            with open(gitignore, "w", encoding="utf-8") as f:
                f.write("*\n")
        except OSError:
            pass
    level = getattr(logging, LOG_LEVEL, logging.INFO)

    app_file = _file_handler("app.log", level)
    error_file = _file_handler("error.log", logging.ERROR)
    auth_file = _file_handler("auth.log", logging.INFO)

    # "beeguard" and its children (auth / console / request) -> app.log + error.log
    app_logger.setLevel(level)
    app_logger.addHandler(app_file)
    app_logger.addHandler(error_file)
    app_logger.propagate = False

    # Audit events also get their own file.
    auth_logger.setLevel(logging.INFO)
    auth_logger.addHandler(auth_file)

    # Flask's own logger — this is where unhandled exceptions (the 500s)
    # are written with their full traceback.
    app.logger.setLevel(level)
    app.logger.addHandler(app_file)
    app.logger.addHandler(error_file)

    # Copy every print() into the log files too.
    if not isinstance(sys.stdout, _ConsoleTee):
        sys.stdout = _ConsoleTee(sys.stdout)

    # ── per-request logging ──
    @app.before_request
    def _log_request_start():
        g.request_id = uuid.uuid4().hex[:8]
        g.request_started = time.perf_counter()

    @app.after_request
    def _log_request_end(response):
        # Skip CORS preflights — they'd double every line.
        if request.method == "OPTIONS":
            return response

        started = getattr(g, "request_started", None)
        ms = (time.perf_counter() - started) * 1000 if started else 0.0
        status = response.status_code
        line = (
            f"{request.method} {request.full_path.rstrip('?')} -> {status} "
            f"({ms:.0f} ms) | user={_current_user()} | ip={_client_ip()}"
        )

        # Images/files being served are noisy — keep them out unless DEBUG.
        is_file = not request.path.startswith("/api/")
        if status >= 500:
            request_logger.error(line)
        elif status >= 400:
            request_logger.warning(line)
        elif is_file:
            request_logger.debug(line)
        else:
            request_logger.info(line)

        response.headers["X-Request-ID"] = getattr(g, "request_id", "-")
        return response

    app_logger.info(f"BeeGuard backend started — logging to {LOG_DIR}")