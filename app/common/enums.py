import enum

from sqlalchemy import Enum as SAEnum


def pg_enum(python_enum: type[enum.Enum], name: str) -> SAEnum:
    """
    Use this instead of raw sqlalchemy.Enum(SomeEnum) on every enum column
    in the app.

    Why: SQLAlchemy's Enum() stores the Python enum member's .name in
    Postgres by default (e.g. "RESTOCK"), not its .value (e.g. "restock").
    That silently diverges from what our Pydantic schemas serialize
    (StockMovementReason.RESTOCK.value == "restock"), and breaks outright
    the moment any raw SQL (a CheckConstraint, a manual migration, a report
    query) references the lowercase value directly — see the
    stock_movements CREATE TABLE failure this fixed.

    `name=` is required explicitly (not inferred from the Python class name)
    so the Postgres enum TYPE name stays stable even if the Python class
    gets renamed later — renaming the type requires a migration either way,
    but this at least makes it a deliberate choice, not an accident.
    """
    return SAEnum(
        python_enum,
        name=name,
        values_callable=lambda x: [e.value for e in x],
    )


class Currency(str, enum.Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    BDT = "BDT"


class Status(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"
