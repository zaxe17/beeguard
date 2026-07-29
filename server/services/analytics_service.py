"""
Read-only analytics aggregations for the beekeeper dashboard,
yield reports (Feature 5), and historical trends (Feature 6).

Everything is beekeeper-scoped: callers pass the JWT's user_id
and we filter every SQL join on hives.beekeeper_id.
"""
import datetime as dt

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


class AnalyticsService:

    # ── Dashboard summary tiles ──────────────
    @staticmethod
    def dashboard_summary(beekeeper_id: str) -> dict:
        hive_counts = HiveModel.count_by_beekeeper(beekeeper_id)

        yield_agg = _as_floats(
            YieldModel.aggregate_for_beekeeper(beekeeper_id) or {},
            ("total_kg", "avg_kg", "max_kg", "min_kg"),
        )

        # This-month total kg
        today = dt.date.today()
        month_start = today.replace(day=1)
        this_month = _as_floats(
            YieldModel.aggregate_for_beekeeper(
                beekeeper_id, since=month_start, until=today
            ) or {},
            ("total_kg", "avg_kg", "max_kg", "min_kg"),
        )

        # Previous month for the delta arrow / % on the summary chart
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

    # ── Monthly yield trend (Line.tsx) ───────
    @staticmethod
    def monthly_yield_trend(beekeeper_id: str, months: int = 12) -> dict:
        rows = YieldModel.monthly_series(beekeeper_id, months=months)
        categories = [r["period"] for r in rows]
        data       = [float(r["total_kg"] or 0) for r in rows]
        return {"categories": categories, "data": data}

    # ── Per-hive this-month yield (Hives page list) ──
    @staticmethod
    def hive_monthly_totals(beekeeper_id: str) -> dict:
        """
        Returns {hive_id: total_kg_this_month} for every hive owned by
        the beekeeper, in one query — replaces the old approach of
        fetching each hive's full harvest history client-side just to
        sum the current month.
        """
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
        return [
            {"label": k, "value": int(v), "color": palette[k]}
            for k, v in keymap.items()
        ]

    # ── Report data (Feature 5) ──────────────
    @staticmethod
    def report_dataset(beekeeper_id: str,
                        date_from: dt.date | None = None,
                        date_to:   dt.date | None = None,
                        hive_id:   str  | None = None) -> dict:
        """
        Assembles the full dataset the PDF report and Historical
        Trends screen consume. When `hive_id` is supplied we scope
        to that hive; otherwise all hives owned by the beekeeper.
        """
        # ── Hive selection ────────────────────
        if hive_id:
            hive = HiveModel.find_by_id_and_beekeeper(hive_id, beekeeper_id)
            if not hive:
                raise PermissionError("Hive does not exist or is not owned.")
            hives = [hive]
        else:
            hives = HiveModel.list_by_beekeeper(beekeeper_id)

        # ── Per-hive block ────────────────────
        hive_blocks = []
        for h in hives:
            hid = h["hive_id"]
            history = YieldModel.list_by_hive(hid)
            # optional date-range filter (leave baseline row in for context)
            if date_from or date_to:
                history = [
                    y for y in history
                    if (date_from is None or y["yield_date"] >= date_from)
                    and (date_to   is None or y["yield_date"] <= date_to)
                ]
            agg = _as_floats(
                YieldModel.aggregate_for_hive(hid) or {},
                ("total_kg", "avg_kg", "max_kg", "min_kg"),
            )
            recs = QueenRecommendationModel.history_for_hive(hid, limit=10)
            for r in recs:
                r["evaluated_at"]    = _iso(r.get("evaluated_at"))
                r["acknowledged_at"] = _iso(r.get("acknowledged_at"))
                r["resolved_at"]     = _iso(r.get("resolved_at"))
                for k in ("yield_baseline_kg", "yield_current_kg", "yield_pct"):
                    if r.get(k) is not None:
                        r[k] = float(r[k])

            # Normalise dates + Decimal in history
            norm_history = []
            for y in history:
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

        # ── Portfolio-level rollup ────────────
        portfolio = _as_floats(
            YieldModel.aggregate_for_beekeeper(
                beekeeper_id, since=date_from, until=date_to
            ) or {},
            ("total_kg", "avg_kg", "max_kg", "min_kg"),
        )

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

    # ── Historical trends (Feature 6) ────────
    @staticmethod
    def seasonal_comparison(beekeeper_id: str, hive_id: str | None = None) -> list[dict]:
        """
        Groups yield by (YEAR, MONTH) so the UI can render
        year-over-year comparisons ('Jan 2025' vs 'Jan 2026', ...).
        """
        base = """
            SELECT YEAR(y.yield_date)  AS yr,
                   MONTH(y.yield_date) AS mo,
                   COALESCE(SUM(y.yield_kg), 0) AS total_kg,
                   COUNT(*) AS harvests
            FROM yields y
            JOIN hives h ON h.hive_id = y.hive_id
            WHERE h.beekeeper_id = %s AND y.is_baseline = FALSE
        """
        params: list = [beekeeper_id]
        if hive_id:
            base += " AND y.hive_id = %s"
            params.append(hive_id)
        base += " GROUP BY yr, mo ORDER BY yr ASC, mo ASC"
        rows = Database.execute(base, tuple(params), fetchall=True) or []
        return [
            {
                "year":     int(r["yr"]),
                "month":    int(r["mo"]),
                "total_kg": float(r["total_kg"] or 0),
                "harvests": int(r["harvests"] or 0),
            }
            for r in rows
        ]