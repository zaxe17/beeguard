"""
Sets alerts.affected_area to "Barangay, City" (e.g. "Moonwalk, Parañaque")
for every alert — fills the empty ones and fixes wrong ones (a city
district like "Parañaque District 2", or a subdivision like "Airport
Village" instead of the barangay).

Run from the `server` folder, with your venv active and internet on:

    python scripts/fill_alert_places.py

It looks up one spot per second (OpenStreetMap's limit), so 20 alerts
take about 20 seconds; spots already looked up (saved in
data/place_names.json) are instant. Safe to run again anytime — an alert
whose barangay can't be found right now is left as it is.
"""
import os
import sys

# Make `config`, `utils` importable when run as a script.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.database import Database             # noqa: E402
from utils.place_name import reverse_place_name  # noqa: E402


def main() -> None:
    rows = Database.execute(
        """
        SELECT alert_id, latitude, longitude, affected_area
        FROM alerts
        ORDER BY scheduled_date DESC
        """,
        (),
        fetchall=True,
    ) or []

    if not rows:
        print("No alerts yet. Nothing to do.")
        return

    total = len(rows)
    print(f"Looking up {total} alert place name(s)...")
    updated = 0
    for i, row in enumerate(rows, start=1):
        alert_id = row["alert_id"]
        old = row["affected_area"]
        name = reverse_place_name(row["latitude"], row["longitude"])

        if not name:
            print(f"  [{i}/{total}] {alert_id}: not found right now (kept: {old or 'empty'})")
            continue
        if name == old:
            print(f"  [{i}/{total}] {alert_id}: {name} (already correct)")
            continue

        Database.execute(
            "UPDATE alerts SET affected_area = %s WHERE alert_id = %s",
            (name, alert_id),
            commit=True,
        )
        updated += 1
        was = f"  (was: {old})" if old else ""
        print(f"  [{i}/{total}] {alert_id}: {name}{was}")

    print(f"Done — {updated} alert(s) updated.")


if __name__ == "__main__":
    main()