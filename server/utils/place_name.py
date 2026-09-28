# utils/place_name.py
#
# Coordinates -> "Barangay, City" (e.g. "Moonwalk, Parañaque"), looked up
# on the SERVER with OpenStreetMap's Nominatim (through geopy, which
# BeeGuard already uses for distances — no new package, no API key).
#
# Why on the server: Nominatim allows only 1 request per second and
# blocks (HTTP 429) anyone who asks faster. When every browser looked
# names up by itself, the pages together went over that limit and got
# blocked. Now:
#   - every page asks OUR backend (GET /api/places/reverse),
#   - the backend asks Nominatim at most once per second,
#   - every answer is saved to data/place_names.json and shared by all
#     users, so each spot is looked up only ONCE, ever.
#
# Barangay = Nominatim's "quarter" (cities) or "village" (provinces).
# "neighbourhood" is a subdivision INSIDE a barangay (e.g. "Airport
# Village" inside Moonwalk) and city_district is bigger than a barangay
# ("Parañaque District 2") — neither is used as the barangay.
#
# Never raises: returns None if the name can't be found right now
# (no internet, Nominatim blocking us) — it's simply tried again later.

import json
import os
import re
import threading
import time

from geopy.geocoders import Nominatim

# Nominatim asks every app to identify itself. You can put your own
# contact in .env, e.g. NOMINATIM_USER_AGENT="BeeGuard capstone (you@gmail.com)"
_USER_AGENT = os.getenv("NOMINATIM_USER_AGENT", "BeeGuard capstone project")
_TIMEOUT_S = 8
_MIN_GAP_S = 1.1              # Nominatim usage policy: max 1 request / second
_COOLDOWN_S = 120             # after a 429, don't ask again for this long
_MAX_LEN = 100                # alerts.affected_area is VARCHAR(100)

_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_CACHE_FILE = os.path.join(_BACKEND_ROOT, "data", "place_names.json")

_nominatim = Nominatim(user_agent=_USER_AGENT)
_lock = threading.Lock()
_last_call = 0.0
_blocked_until = 0.0
_cache: dict[str, str] = {}
_cache_loaded = False

# "Parañaque District 2", "District IV" — never shown as the barangay.
_DISTRICT_RE = re.compile(r"\bdistrict\b", re.IGNORECASE)


# ── saved names (shared by every user) ─────────
def _load_cache() -> None:
    global _cache_loaded
    if _cache_loaded:
        return
    _cache_loaded = True
    try:
        with open(_CACHE_FILE, encoding="utf-8") as f:
            saved = json.load(f)
        if isinstance(saved, dict):
            _cache.update({k: v for k, v in saved.items() if isinstance(v, str) and v})
    except FileNotFoundError:
        pass
    except Exception as e:
        print(f"[PLACE-NAME] Couldn't read {_CACHE_FILE}: {e}")


def _save_cache() -> None:
    try:
        os.makedirs(os.path.dirname(_CACHE_FILE), exist_ok=True)
        tmp = _CACHE_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(_cache, f, ensure_ascii=False, indent=1)
        os.replace(tmp, _CACHE_FILE)
    except Exception as e:
        print(f"[PLACE-NAME] Couldn't save {_CACHE_FILE}: {e}")


def _key(lat: float, lng: float) -> str:
    return f"{lat:.4f},{lng:.4f}"


# ── picking barangay + city ────────────────────
def _label(address: dict) -> str | None:
    """
    "Barangay, City" from Nominatim's address parts, or None when there's
    no barangay (a city-only name is never saved; it's tried again later).
    """
    barangay = None
    for c in (
        address.get("quarter"),
        address.get("village"),
        address.get("suburb"),
        address.get("hamlet"),
    ):
        if c and not _DISTRICT_RE.search(c):
            barangay = c
            break
    if not barangay:
        return None

    city = (
        address.get("city")
        or address.get("town")
        or address.get("municipality")
        or address.get("county")
        or address.get("state")
    )
    parts = [barangay] + ([city] if city and city != barangay else [])
    return ", ".join(parts)[:_MAX_LEN]


# ── public ─────────────────────────────────────
def cached_place_name(lat, lng) -> str | None:
    """Saved name only — never calls Nominatim."""
    try:
        lat, lng = float(lat), float(lng)
    except (TypeError, ValueError):
        return None
    with _lock:
        _load_cache()
        return _cache.get(_key(lat, lng))


def reverse_place_name(lat, lng) -> str | None:
    """'Barangay, City' for these coordinates, or None if not found right now."""
    global _last_call, _blocked_until
    try:
        lat, lng = float(lat), float(lng)
    except (TypeError, ValueError):
        return None
    key = _key(lat, lng)

    with _lock:  # one Nominatim request at a time, max 1 per second
        _load_cache()
        if key in _cache:
            return _cache[key]
        if time.monotonic() < _blocked_until:
            return None  # Nominatim is blocking us — don't make it worse

        wait = _last_call + _MIN_GAP_S - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        try:
            location = _nominatim.reverse(
                (lat, lng),
                exactly_one=True,
                language="en",
                zoom=18,
                addressdetails=True,
                timeout=_TIMEOUT_S,
            )
        except Exception as e:  # network error, timeout, 429 rate limit...
            if "429" in str(e):
                _blocked_until = time.monotonic() + _COOLDOWN_S
                print(f"[PLACE-NAME] Nominatim says too many requests — pausing "
                      f"lookups for {_COOLDOWN_S} seconds.")
            else:
                print(f"[PLACE-NAME] Lookup failed for {key}: {e}")
            location = None
        finally:
            _last_call = time.monotonic()

        if not location:
            return None
        label = _label((location.raw or {}).get("address") or {})
        if label:
            _cache[key] = label
            _save_cache()
        return label