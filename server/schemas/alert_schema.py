# schemas/alert_schema.py
#
# pip install pydantic
#
# Response shape for GET /api/pesticide/alerts/<alert_id>.
#
# Using a schema here isn't just tidiness — MySQL DECIMAL columns
# (latitude, longitude, danger_radius_km) come back from the driver as
# Decimal or, depending on cursor/connector config, as strings. Left
# unhandled, that's exactly the bug that broke the "today" alerts list
# on the frontend (`a.latitude.toFixed is not a function`). Pydantic's
# `field_validator` below coerces those fields to `float` in one place,
# so every consumer of this endpoint gets real numbers, not surprises.

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator


class AlertDetailOut(BaseModel):
    alert_id: str
    title: str
    source: str  # "admin" | "beekeeper"
    status: str  # risk_level lowercased — matches the frontend's "high" | "medium" | "low"

    location: str
    latitude: float
    longitude: float

    pesticide_type: Optional[str] = None
    application_method: Optional[str] = None
    description: Optional[str] = None

    danger_radius_km: float

    scheduled_date: datetime
    expiration_date: Optional[datetime] = None
    created_at: datetime

    issued_by: Optional[str] = None
    contact: Optional[str] = None

    @field_validator("latitude", "longitude", "danger_radius_km", mode="before")
    @classmethod
    def _coerce_numeric(cls, v):
        if isinstance(v, Decimal):
            return float(v)
        if isinstance(v, str):
            return float(v)
        return v

    def to_json(self) -> dict:
        """dict with datetimes as ISO strings, ready for jsonify()."""
        return self.model_dump(mode="json")