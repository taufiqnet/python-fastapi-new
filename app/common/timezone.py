"""
app/common/timezone.py
Centralized timezone & datetime utilities for Bangladesh Standard Time (BST)
and ISO UTC compliance across ProERP SaaS.
"""
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

# Bangladesh Standard Time is UTC+6:00 with no Daylight Saving Time
try:
    BANGLADESH_TZ = ZoneInfo("Asia/Dhaka")
except Exception:
    BANGLADESH_TZ = timezone(timedelta(hours=6), name="Asia/Dhaka")
UTC_TZ = timezone.utc


def now_bd() -> datetime:
    """Return the current timezone-aware datetime in Bangladesh (Asia/Dhaka, UTC+6)."""
    return datetime.now(BANGLADESH_TZ)


def today_bd() -> date:
    """Return current calendar date in Bangladesh."""
    return now_bd().date()


def time_bd() -> time:
    """Return current clock time in Bangladesh without microseconds."""
    return now_bd().time().replace(microsecond=0)


def utc_now() -> datetime:
    """Return the current timezone-aware datetime in UTC."""
    return datetime.now(UTC_TZ)


def to_bd(dt: datetime) -> datetime:
    """Convert any naive or aware datetime to Bangladesh timezone."""
    if dt.tzinfo is None:
        # If naive, assume stored as UTC in Postgres
        dt = dt.replace(tzinfo=UTC_TZ)
    return dt.astimezone(BANGLADESH_TZ)


def to_utc(dt: datetime) -> datetime:
    """Convert any naive or aware datetime to UTC."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=BANGLADESH_TZ)
    return dt.astimezone(UTC_TZ)


def get_bangladesh_fiscal_year(target_date: date | None = None) -> tuple[str, date, date]:
    """
    Returns Bangladesh income/fiscal year (July 1 to June 30).
    Example for Oct 2026: ('2026-2027', date(2026, 7, 1), date(2027, 6, 30))
    """
    d = target_date or today_bd()
    if d.month >= 7:
        start_year = d.year
        end_year = d.year + 1
    else:
        start_year = d.year - 1
        end_year = d.year
    fy_str = f"{start_year}-{end_year}"
    return fy_str, date(start_year, 7, 1), date(end_year, 6, 30)


def derive_assessment_year(fy_str: str) -> str:
    """
    Derive Bangladesh Assessment Year from Income/Fiscal Year.
    e.g., Income Year '2026-2027' -> Assessment Year '2027-2028'
    """
    normalized = fy_str.replace("–", "-").strip()
    parts = normalized.split("-")
    if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit():
        start_yr = int(parts[0])
        end_yr = int(parts[1])
        return f"{start_yr + 1}-{end_yr + 1}"
    return fy_str
