import enum


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
