"""
PDF report generator for Feature 5 (Yield Analytics Reports).

Uses ReportLab's Platypus flowables so the report degrades gracefully
on long histories (page breaks, table splits). Returns raw PDF bytes;
the route layer streams them with the correct Content-Disposition.

The input is the dict produced by AnalyticsService.report_dataset(),
so the service layer has NO SQL of its own — it is a pure formatter.
"""
import io
import datetime as dt

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether,
)


# ── ReportLab styles (single source) ───────────────────────
_BASE = getSampleStyleSheet()
STYLES = {
    "title":  ParagraphStyle("t",  parent=_BASE["Title"],   fontSize=20, spaceAfter=6),
    "h1":     ParagraphStyle("h1", parent=_BASE["Heading1"], fontSize=14, spaceBefore=10, spaceAfter=6,
                              textColor=colors.HexColor("#4A2F00")),
    "h2":     ParagraphStyle("h2", parent=_BASE["Heading2"], fontSize=12, spaceBefore=8, spaceAfter=4,
                              textColor=colors.HexColor("#7A6A58")),
    "body":   ParagraphStyle("b",  parent=_BASE["BodyText"], fontSize=9.5, leading=12),
    "small":  ParagraphStyle("s",  parent=_BASE["BodyText"], fontSize=8,   leading=10,
                              textColor=colors.grey),
}

# BeeGuard palette — reuse from the frontend so the PDF matches
BEE_YELLOW  = colors.HexColor("#FFDB4F")
BEE_ORANGE  = colors.HexColor("#FF9A00")
BEE_BROWN   = colors.HexColor("#4A2F00")
GRID_GREY   = colors.HexColor("#DDDDDD")


def _fmt_kg(v) -> str:
    if v is None: return "—"
    return f"{float(v):.2f} kg"


def _fmt_pct(v) -> str:
    if v is None: return "—"
    return f"{float(v):.1f}%"


def _fmt_date(v) -> str:
    return v if v else "—"


class ReportService:

    @staticmethod
    def render_yield_report(dataset: dict, beekeeper: dict) -> bytes:
        """
        dataset: output of AnalyticsService.report_dataset()
        beekeeper: {'id','name','email','farm_name','apiary_type'}
        Returns: PDF bytes.
        """
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf, pagesize=A4,
            leftMargin=18*mm, rightMargin=18*mm,
            topMargin=18*mm, bottomMargin=18*mm,
            title="BeeGuard Yield Analytics Report",
            author="BeeGuard",
        )

        story: list = []
        story += ReportService._header(beekeeper, dataset)
        story += ReportService._portfolio_block(dataset)
        story += ReportService._monthly_trend_block(dataset)
        story.append(PageBreak())
        story += ReportService._per_hive_blocks(dataset)

        doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
        return buf.getvalue()

    # ── Sections ──────────────────────────────
    @staticmethod
    def _header(bk: dict, ds: dict) -> list:
        filters = ds.get("filters") or {}
        gen_at = ds.get("generated_at", "")
        # Trim to seconds for the header
        gen_at_short = gen_at.replace("T", " ").split(".")[0]

        rows = [
            ["Beekeeper",  bk.get("name") or "—",     "Farm",         bk.get("farm_name") or "—"],
            ["Email",      bk.get("email") or "—",    "Apiary type",  bk.get("apiary_type") or "—"],
            ["Generated",  gen_at_short + " UTC",     "Report id",    (bk.get("id") or "—") + "-" + dt.datetime.utcnow().strftime("%Y%m%d%H%M%S")],
            ["Date range", f"{filters.get('date_from') or 'inception'} → {filters.get('date_to') or 'today'}",
                           "Hive scope",   filters.get("hive_id") or "All hives"],
        ]
        tbl = Table(rows, colWidths=[28*mm, 60*mm, 28*mm, 58*mm])
        tbl.setStyle(TableStyle([
            ("FONT",         (0,0), (-1,-1), "Helvetica", 9),
            ("BACKGROUND",   (0,0), (0,-1), colors.HexColor("#F8F4E1")),
            ("BACKGROUND",   (2,0), (2,-1), colors.HexColor("#F8F4E1")),
            ("TEXTCOLOR",    (0,0), (0,-1), BEE_BROWN),
            ("TEXTCOLOR",    (2,0), (2,-1), BEE_BROWN),
            ("GRID",         (0,0), (-1,-1), 0.25, GRID_GREY),
            ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
        ]))
        return [
            Paragraph("BeeGuard — Yield Analytics Report", STYLES["title"]),
            Paragraph("Historical harvests · Trend analysis · Queen recommendations", STYLES["small"]),
            Spacer(1, 6),
            tbl,
            Spacer(1, 10),
        ]

    @staticmethod
    def _portfolio_block(ds: dict) -> list:
        agg = ds.get("portfolio_aggregate") or {}
        rows = [
            ["Metric",             "Value"],
            ["Total harvests",     f"{int(agg.get('harvests') or 0)}"],
            ["Total yield",        _fmt_kg(agg.get("total_kg"))],
            ["Average per harvest",_fmt_kg(agg.get("avg_kg"))],
            ["Highest single harvest", _fmt_kg(agg.get("max_kg"))],
            ["Lowest single harvest",  _fmt_kg(agg.get("min_kg"))],
        ]
        tbl = Table(rows, colWidths=[70*mm, 60*mm])
        tbl.setStyle(TableStyle([
            ("BACKGROUND",   (0,0), (-1,0), BEE_YELLOW),
            ("TEXTCOLOR",    (0,0), (-1,0), BEE_BROWN),
            ("FONT",         (0,0), (-1,0), "Helvetica-Bold", 10),
            ("FONT",         (0,1), (-1,-1), "Helvetica", 9.5),
            ("GRID",         (0,0), (-1,-1), 0.25, GRID_GREY),
            ("ALIGN",        (1,1), (1,-1), "RIGHT"),
        ]))
        return [Paragraph("Portfolio summary", STYLES["h1"]), tbl, Spacer(1, 10)]

    @staticmethod
    def _monthly_trend_block(ds: dict) -> list:
        trend = ds.get("monthly_trend") or {"categories": [], "data": []}
        cats  = trend.get("categories") or []
        data  = trend.get("data") or []

        if not cats:
            return [Paragraph("Monthly trend", STYLES["h1"]),
                    Paragraph("No harvest data in the last 12 months.", STYLES["body"]),
                    Spacer(1, 8)]

        rows = [["Month", "Total kg"]]
        for period, kg in zip(cats, data):
            rows.append([period, f"{float(kg):.2f}"])

        tbl = Table(rows, colWidths=[40*mm, 40*mm])
        tbl.setStyle(TableStyle([
            ("BACKGROUND",   (0,0), (-1,0), BEE_ORANGE),
            ("TEXTCOLOR",    (0,0), (-1,0), colors.white),
            ("FONT",         (0,0), (-1,0), "Helvetica-Bold", 10),
            ("FONT",         (0,1), (-1,-1), "Helvetica", 9.5),
            ("GRID",         (0,0), (-1,-1), 0.25, GRID_GREY),
            ("ALIGN",        (1,1), (1,-1), "RIGHT"),
        ]))
        return [Paragraph("Monthly yield trend (last 12 months)", STYLES["h1"]),
                tbl, Spacer(1, 10)]

    @staticmethod
    def _per_hive_blocks(ds: dict) -> list:
        blocks: list = [Paragraph("Per-hive detail", STYLES["h1"])]
        hives = ds.get("hives") or []

        if not hives:
            blocks.append(Paragraph("This beekeeper has no hives yet.", STYLES["body"]))
            return blocks

        for h in hives:
            blocks.append(KeepTogether(ReportService._hive_card(h)))
            blocks.append(Spacer(1, 8))
        return blocks

    @staticmethod
    def _hive_card(h: dict) -> list:
        header_rows = [
            ["Hive",       h.get("hive_id") or "—", "Name",           h.get("hive_name") or "—"],
            ["Species",    h.get("bee_species") or "—", "State",      h.get("hive_state") or "—"],
            ["Established",_fmt_date(h.get("date_established")),
                           "Queen installed", _fmt_date(h.get("queen_installed_date"))],
            ["Health",     h.get("health_status") or "—",
                           "Baseline",  f"{_fmt_kg(h.get('baseline_kg'))}"
                                        f" ({h.get('baseline_year') or '—'})"],
        ]
        htbl = Table(header_rows, colWidths=[22*mm, 52*mm, 26*mm, 74*mm])
        htbl.setStyle(TableStyle([
            ("FONT",       (0,0), (-1,-1), "Helvetica", 9),
            ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#F8F4E1")),
            ("BACKGROUND", (2,0), (2,-1), colors.HexColor("#F8F4E1")),
            ("GRID",       (0,0), (-1,-1), 0.25, GRID_GREY),
        ]))

        # Aggregate
        agg = h.get("aggregate") or {}
        agg_rows = [
            ["Harvests", "Total", "Avg", "Max", "Min"],
            [
                str(int(agg.get("harvests") or 0)),
                _fmt_kg(agg.get("total_kg")),
                _fmt_kg(agg.get("avg_kg")),
                _fmt_kg(agg.get("max_kg")),
                _fmt_kg(agg.get("min_kg")),
            ],
        ]
        atbl = Table(agg_rows, colWidths=[26*mm]*5)
        atbl.setStyle(TableStyle([
            ("BACKGROUND",   (0,0), (-1,0), BEE_YELLOW),
            ("TEXTCOLOR",    (0,0), (-1,0), BEE_BROWN),
            ("FONT",         (0,0), (-1,0), "Helvetica-Bold", 9),
            ("FONT",         (0,1), (-1,-1), "Helvetica", 9),
            ("GRID",         (0,0), (-1,-1), 0.25, GRID_GREY),
            ("ALIGN",        (0,0), (-1,-1), "CENTER"),
        ]))

        # Harvest history
        hist = h.get("harvests") or []
        hist_rows = [["Date", "Yield (kg)", "Baseline?"]]
        for y in hist:
            hist_rows.append([
                y.get("yield_date") or "—",
                f"{float(y['yield_kg']):.2f}" if y.get("yield_kg") is not None else "—",
                "Yes" if y.get("is_baseline") else "",
            ])
        ytbl = Table(hist_rows, colWidths=[40*mm, 40*mm, 30*mm], repeatRows=1)
        ytbl.setStyle(TableStyle([
            ("BACKGROUND",   (0,0), (-1,0), BEE_ORANGE),
            ("TEXTCOLOR",    (0,0), (-1,0), colors.white),
            ("FONT",         (0,0), (-1,0), "Helvetica-Bold", 9),
            ("FONT",         (0,1), (-1,-1), "Helvetica", 9),
            ("GRID",         (0,0), (-1,-1), 0.25, GRID_GREY),
            ("ALIGN",        (1,1), (2,-1), "CENTER"),
        ]))

        # Recommendations
        recs = h.get("recommendations") or []
        rec_rows = [["Evaluated", "Level", "Reason", "Baseline / Current / %"]]
        for r in recs:
            rec_rows.append([
                (r.get("evaluated_at") or "").split("T")[0],
                r.get("level") or "—",
                r.get("reason") or "—",
                f"{_fmt_kg(r.get('yield_baseline_kg'))} / "
                f"{_fmt_kg(r.get('yield_current_kg'))} / "
                f"{_fmt_pct(r.get('yield_pct'))}",
            ])
        rtbl = Table(rec_rows, colWidths=[26*mm, 22*mm, 62*mm, 60*mm], repeatRows=1)
        rtbl.setStyle(TableStyle([
            ("BACKGROUND",   (0,0), (-1,0), BEE_BROWN),
            ("TEXTCOLOR",    (0,0), (-1,0), colors.white),
            ("FONT",         (0,0), (-1,0), "Helvetica-Bold", 9),
            ("FONT",         (0,1), (-1,-1), "Helvetica", 8.5),
            ("GRID",         (0,0), (-1,-1), 0.25, GRID_GREY),
            ("VALIGN",       (0,0), (-1,-1), "TOP"),
        ]))

        return [
            Paragraph(f"Hive {h.get('hive_id')} — {h.get('hive_name') or ''}", STYLES["h2"]),
            htbl,
            Spacer(1, 4),
            Paragraph("Aggregate", STYLES["h2"]),
            atbl,
            Spacer(1, 4),
            Paragraph("Harvest history", STYLES["h2"]),
            ytbl,
            Spacer(1, 4),
            Paragraph("Queen recommendations", STYLES["h2"]),
            rtbl,
        ]


def _footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.grey)
    canvas.drawString(18*mm, 10*mm, "BeeGuard · Yield Analytics Report")
    canvas.drawRightString(A4[0] - 18*mm, 10*mm, f"Page {doc.page}")
    canvas.restoreState()