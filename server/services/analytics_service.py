"""
Read-only analytics aggregations for the beekeeper dashboard,
yield reports (Feature 5), and historical trends (Feature 6).

Everything is beekeeper-scoped: callers pass the JWT's user_id
and we filter every SQL join on hives.beekeeper_id.

pandas is used for the aggregation-heavy paths (monthly trend,
seasonal comparison, report dataset roll-ups) so grouping/summing
logic lives in one well-tested library instead of hand-rolled
dict accumulation.
"""
import datetime as dt

import pandas as pd

from config.database import Database
from models.hive import HiveModel
from models.yield_record import YieldModel
from models.queen_recommendation import QueenRecommendationModel


def _iso(d):
    if isinstance(d, (dt.date, dt.datetime)):
        return d.isoformat()
    return d


def _as_floats(row: dict, keys: tuple[str, ...]) -> dict:
    """Cast Decimal / None -> float / None so JSON is friendly."""
    for k in keys:
        if k in row and row[k] is not None:
            row[k] = float(row[k])
    return row


def _yields_dataframe(rows: list[dict]) -> pd.DataFrame:
    """
    Builds a typed DataFrame from raw `yields` rows.
    Empty-safe: returns a DataFrame with the right columns even
    when `rows` is empty, so downstream .groupby() calls don't blow up.
    """
    df = pd.DataFrame(rows, columns=["yield_id", "hive_id", "yield_date",
                                      "yield_kg", "is_baseline", "created_at"])
    if df.empty:
        return df
    df["yield_date"] = pd.to_datetime(df["yield_date"])
    df["yield_kg"] = pd.to_numeric(df["yield_kg"], errors="coerce").fillna(0.0)
    df["is_baseline"] = df["is_baseline"].astype(bool)
    return df


class AnalyticsService:

    # ── Dashboard summary tiles ──────────────
    @staticmethod
    def dashboard_summary(beekeeper_id: str) -> dict:
        hive_counts = HiveModel.count_by_beekeeper(beekeeper_id)

        yield_agg = _as_floats(
            YieldModel.aggregate_for_beekeeper(beekeeper_id) or {},
            ("total_kg", "avg_kg", "max_kg", "min_kg"),
        )

        today = dt.date.today()
        month_start = today.replace(day=1)
        this_month = _as_floats(
            YieldModel.aggregate_for_beekeeper(
                beekeeper_id, since=month_start, until=today
            ) or {},
            ("total_kg", "avg_kg", "max_kg", "min_kg"),
        )

        first_this = month_start
        last_prev  = first_this - dt.timedelta(days=1)
        first_prev = last_prev.replace(day=1)
        prev_month = _as_floats(
            YieldModel.aggregate_for_beekeeper(
                beekeeper_id, since=first_prev, until=last_prev
            ) or {},
            ("total_kg", "avg_kg", "max_kg", "min_kg"),
        )

        cur_kg  = float(this_month.get("total_kg") or 0)
        prev_kg = float(prev_month.get("total_kg") or 0)
        change_amount  = round(cur_kg - prev_kg, 2)
        change_percent = round(((cur_kg - prev_kg) / prev_kg * 100.0), 2) if prev_kg > 0 else 0.0

        open_recs = QueenRecommendationModel.list_open_for_beekeeper(beekeeper_id)
        replace_count = sum(1 for r in open_recs if r["level"] == "Replace")
        monitor_count = sum(1 for r in open_recs if r["level"] == "Monitor")

        return {
            "hives":  hive_counts,
            "yield_totals": {
                "all_time":   yield_agg,
                "this_month": this_month,
                "prev_month": prev_month,
                "change_amount":  change_amount,
                "change_percent": change_percent,
            },
            "recommendations": {
                "open":     len(open_recs),
                "replace":  replace_count,
                "monitor":  monitor_count,
            },
        }

    # ── Yield trend (Line.tsx) — ONE POINT PER HARVEST ENTRY ──
    @staticmethod
    def monthly_yield_trend(beekeeper_id: str, months: int = 12) -> dict:
        """
        Pulls raw (non-baseline) harvest rows for every hive owned by
        the beekeeper within the lookback window, sorted chronologically.

        IMPORTANT: this does NOT sum multiple harvests that fall in the
        same calendar month into a single point. Each harvest entry is
        its own point on the trend line — e.g. two harvests in Aug 2026
        produce two separate "Aug 2026" points, not one summed point.
        This matches what the frontend's harvestSeason.ts grouping
        expects (it groups these per-entry points into "harvest
        seasons" for the x-axis); summing here would collapse a whole
        season down to a single dot and the chart would have nothing
        to draw a line between.
        """
        hives = HiveModel.list_by_beekeeper(beekeeper_id)
        hive_ids = [h["hive_id"] for h in hives]
        if not hive_ids:
            return {"categories": [], "data": []}

        cutoff = dt.date.today() - dt.timedelta(days=31 * months)

        all_rows: list[dict] = []
        for hid in hive_ids:
            rows = YieldModel.list_by_hive(hid)
            all_rows.extend(rows)

        df = _yields_dataframe(all_rows)
        if df.empty:
            return {"categories": [], "data": []}

        df = df[(~df["is_baseline"]) & (df["yield_date"].dt.date >= cutoff)]
        if df.empty:
            return {"categories": [], "data": []}

        df = df.sort_values("yield_date")
        df["period"] = df["yield_date"].dt.strftime("%Y-%m")

        return {
            "categories": df["period"].tolist(),
            "data":       [round(float(v), 2) for v in df["yield_kg"].tolist()],
        }

    # ── Per-hive yield trend (History page, multi-line) ──
    @staticmethod
    def hive_yield_trends(beekeeper_id: str, months: int = 12) -> dict:
        """
        Per-hive yield trend for multi-line comparison charts on the
        History page. Returns ONE SHARED x-axis — every non-baseline
        harvest across ALL of the beekeeper's hives, sorted
        chronologically — plus one series per hive, aligned to that
        shared axis. A hive's series is `None` everywhere except at
        the index/indices where it actually harvested.

        The frontend should render each series with `spanGaps: true`
        so a hive's line only connects its own points, even though
        the shared x-axis also contains other hives' harvest dates.
        """
        hives = HiveModel.list_by_beekeeper(beekeeper_id)
        if not hives:
            return {"categories": [], "series": []}

        cutoff = dt.date.today() - dt.timedelta(days=31 * months)

        all_rows: list[dict] = []
        for h in hives:
            all_rows.extend(YieldModel.list_by_hive(h["hive_id"]))

        df = _yields_dataframe(all_rows)
        if df.empty:
            return {"categories": [], "series": []}

        df = df[(~df["is_baseline"]) & (df["yield_date"].dt.date >= cutoff)]
        if df.empty:
            return {"categories": [], "series": []}

        df = df.sort_values("yield_date").reset_index(drop=True)
        df["period"] = df["yield_date"].dt.strftime("%Y-%m")

        categories = df["period"].tolist()
        hive_ids = [h["hive_id"] for h in hives]

        series = []
        for hid in hive_ids:
            values = [
                round(float(kg), 2) if row_hid == hid else None
                for row_hid, kg in zip(df["hive_id"], df["yield_kg"])
            ]
            if any(v is not None for v in values):
                # hive_name intentionally set to the hive_id code
                # (e.g. "HV-000001") — this becomes the legend label
                # on the History multi-line chart.
                series.append({"hive_id": hid, "hive_name": hid, "data": values})

        return {"categories": categories, "series": series}

    # ── Per-hive this-month yield (Hives page list) ──
    @staticmethod
    def hive_monthly_totals(beekeeper_id: str) -> dict:
        rows = YieldModel.this_month_by_hive(beekeeper_id)
        return {r["hive_id"]: float(r["total_kg"] or 0) for r in rows}

    # ── Hive health doughnut (Doughnut.tsx) ──
    @staticmethod
    def hive_health_distribution(beekeeper_id: str) -> list[dict]:
        c = HiveModel.count_by_beekeeper(beekeeper_id)
        palette = {
            "Healthy":         "#00cc00",
            "Needs Attention": "#f89d36",
            "Weak":            "#ffdb4f",
            "Diseased":        "#ff0000",
        }
        keymap = {
            "Healthy":         c.get("healthy", 0),
            "Needs Attention": c.get("needs_attention", 0),
            "Weak":            c.get("weak", 0),
            "Diseased":        c.get("diseased", 0),
        }
        # Only return slices that actually have hives in them. When the
        # beekeeper has zero hives total, return an empty list so the
        # frontend can show its own "No data" placeholder instead of
        # four empty-but-present legend labels.
        total = sum(keymap.values())
        if total == 0:
            return []
        return [
            {"label": k, "value": int(v), "color": palette[k]}
            for k, v in keymap.items()
            if v > 0
        ]

    # ── Report data (Feature 5) — pandas for per-hive + portfolio rollups ──
    @staticmethod
    def report_dataset(beekeeper_id: str,
                        date_from: dt.date | None = None,
                        date_to:   dt.date | None = None,
                        hive_id:   str  | None = None) -> dict:
        if hive_id:
            hive = HiveModel.find_by_id_and_beekeeper(hive_id, beekeeper_id)
            if not hive:
                raise PermissionError("Hive does not exist or is not owned.")
            hives = [hive]
        else:
            hives = HiveModel.list_by_beekeeper(beekeeper_id)

        hive_blocks = []
        portfolio_frames: list[pd.DataFrame] = []

        for h in hives:
            hid = h["hive_id"]
            raw_history = YieldModel.list_by_hive(hid)
            df = _yields_dataframe(raw_history)

            if not df.empty and (date_from or date_to):
                if date_from:
                    df = df[df["yield_date"].dt.date >= date_from]
                if date_to:
                    df = df[df["yield_date"].dt.date <= date_to]

            non_baseline = df[~df["is_baseline"]] if not df.empty else df
            portfolio_frames.append(non_baseline)

            if not non_baseline.empty:
                agg = {
                    "harvests": int(len(non_baseline)),
                    "total_kg": round(float(non_baseline["yield_kg"].sum()), 2),
                    "avg_kg":   round(float(non_baseline["yield_kg"].mean()), 2),
                    "max_kg":   round(float(non_baseline["yield_kg"].max()), 2),
                    "min_kg":   round(float(non_baseline["yield_kg"].min()), 2),
                }
            else:
                agg = {"harvests": 0, "total_kg": 0.0, "avg_kg": 0.0,
                       "max_kg": 0.0, "min_kg": 0.0}

            recs = QueenRecommendationModel.history_for_hive(hid, limit=10)
            for r in recs:
                r["evaluated_at"]    = _iso(r.get("evaluated_at"))
                r["acknowledged_at"] = _iso(r.get("acknowledged_at"))
                r["resolved_at"]     = _iso(r.get("resolved_at"))
                for k in ("yield_baseline_kg", "yield_current_kg", "yield_pct"):
                    if r.get(k) is not None:
                        r[k] = float(r[k])

            norm_history = []
            for y in raw_history:
                if date_from and y.get("yield_date") and y["yield_date"] < date_from:
                    continue
                if date_to and y.get("yield_date") and y["yield_date"] > date_to:
                    continue
                norm_history.append({
                    "yield_id":    y.get("yield_id"),
                    "yield_date":  _iso(y.get("yield_date")),
                    "yield_kg":    float(y["yield_kg"]) if y.get("yield_kg") is not None else None,
                    "is_baseline": bool(y.get("is_baseline")),
                    "created_at":  _iso(y.get("created_at")),
                })

            hive_blocks.append({
                "hive_id":          hid,
                "hive_name":        h.get("hive_name"),
                "bee_species":      h.get("bee_species"),
                "date_established": _iso(h.get("date_established")),
                "queen_installed_date": _iso(h.get("queen_installed_date")),
                "health_status":    h.get("health_status"),
                "hive_state":       h.get("hive_state"),
                "baseline_kg":      float(h["historical_yield_kg"]) if h.get("historical_yield_kg") is not None else None,
                "baseline_year":    h.get("historical_yield_year"),
                "harvests":         norm_history,
                "aggregate":        agg,
                "recommendations":  recs,
            })

        # ── Portfolio-level rollup via pandas concat ──
        if portfolio_frames:
            combined = pd.concat(
                [f for f in portfolio_frames if not f.empty],
                ignore_index=True,
            ) if any(not f.empty for f in portfolio_frames) else pd.DataFrame()
        else:
            combined = pd.DataFrame()

        if not combined.empty:
            portfolio = {
                "harvests": int(len(combined)),
                "total_kg": round(float(combined["yield_kg"].sum()), 2),
                "avg_kg":   round(float(combined["yield_kg"].mean()), 2),
                "max_kg":   round(float(combined["yield_kg"].max()), 2),
                "min_kg":   round(float(combined["yield_kg"].min()), 2),
            }
        else:
            portfolio = {"harvests": 0, "total_kg": 0.0, "avg_kg": 0.0,
                         "max_kg": 0.0, "min_kg": 0.0}

        return {
            "generated_at":  dt.datetime.utcnow().isoformat() + "Z",
            "beekeeper_id":  beekeeper_id,
            "filters": {
                "date_from": _iso(date_from),
                "date_to":   _iso(date_to),
                "hive_id":   hive_id,
            },
            "portfolio_aggregate": portfolio,
            "monthly_trend":       AnalyticsService.monthly_yield_trend(beekeeper_id, months=12),
            "hives":               hive_blocks,
        }

    # ── Historical trends (Feature 6) — pandas groupby(year, month) ──
    @staticmethod
    def seasonal_comparison(beekeeper_id: str, hive_id: str | None = None) -> list[dict]:
        """
        Groups yield by (YEAR, MONTH) so the UI can render
        year-over-year comparisons ('Jan 2025' vs 'Jan 2026', ...).
        Uses pandas groupby instead of a raw SQL GROUP BY so the same
        DataFrame machinery used elsewhere in this service handles it.

        NOTE: unlike monthly_yield_trend(), this one intentionally
        stays summed-per-month — it's for a year-over-year comparison
        view, not the per-harvest trend line, so a single total per
        (year, month) is the correct shape here.
        """
        hives = (
            [HiveModel.find_by_id_and_beekeeper(hive_id, beekeeper_id)]
            if hive_id else HiveModel.list_by_beekeeper(beekeeper_id)
        )
        hives = [h for h in hives if h]
        if not hives:
            return []

        all_rows: list[dict] = []
        for h in hives:
            all_rows.extend(YieldModel.list_by_hive(h["hive_id"]))

        df = _yields_dataframe(all_rows)
        if df.empty:
            return []

        df = df[~df["is_baseline"]]
        if df.empty:
            return []

        df["yr"] = df["yield_date"].dt.year
        df["mo"] = df["yield_date"].dt.month

        grouped = (
            df.groupby(["yr", "mo"], as_index=False)
              .agg(total_kg=("yield_kg", "sum"), harvests=("yield_kg", "count"))
              .sort_values(["yr", "mo"])
        )

        return [
            {
                "year":     int(row["yr"]),
                "month":    int(row["mo"]),
                "total_kg": round(float(row["total_kg"]), 2),
                "harvests": int(row["harvests"]),
            }
            for _, row in grouped.iterrows()
        ]