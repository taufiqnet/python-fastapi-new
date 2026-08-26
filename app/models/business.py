from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import DECIMAL, Boolean, Date, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class BusinessProfile(Base):
    __tablename__ = "business_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )

    # Company Identity
    name_en: Mapped[str] = mapped_column(String(255))
    short_name: Mapped[str | None] = mapped_column(String(100), default="")
    legal_name: Mapped[str | None] = mapped_column(String(255), default="")
    company_tagline: Mapped[str | None] = mapped_column(String(255), default="")
    description: Mapped[str | None] = mapped_column(Text, default="")

    logo: Mapped[str | None] = mapped_column(String(500), nullable=True)
    favicon: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Registration & Compliance
    cr_number: Mapped[str | None] = mapped_column(String(50), unique=True, default="")
    vat_number: Mapped[str | None] = mapped_column(String(50), unique=True, default="")
    tax_number: Mapped[str | None] = mapped_column(String(50), default="")
    license_number: Mapped[str | None] = mapped_column(String(100), default="")
    license_expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    chamber_of_commerce_no: Mapped[str | None] = mapped_column(String(100), default="")
    national_address: Mapped[str | None] = mapped_column(String(255), default="")

    # Structured Address
    building_no: Mapped[str | None] = mapped_column(String(20), default="")
    street: Mapped[str | None] = mapped_column(String(150), default="")
    district: Mapped[str | None] = mapped_column(String(100), default="")
    city: Mapped[str | None] = mapped_column(String(100), default="Dhaka")
    state: Mapped[str | None] = mapped_column(String(100), default="")
    country: Mapped[str | None] = mapped_column(String(100), default="Bangladesh")
    zip_code: Mapped[str | None] = mapped_column(String(20), default="")
    po_box: Mapped[str | None] = mapped_column(String(20), default="")
    address_no: Mapped[str | None] = mapped_column(String(20), default="")
    address_en: Mapped[str | None] = mapped_column(Text, default="")

    # Contact Information
    phone: Mapped[str | None] = mapped_column(String(30), default="")
    mobile: Mapped[str | None] = mapped_column(String(30), default="")
    whatsapp: Mapped[str | None] = mapped_column(String(30), default="")
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    support_email: Mapped[str | None] = mapped_column(
        String(255), nullable=True, default=None
    )
    sales_email: Mapped[str | None] = mapped_column(
        String(255), nullable=True, default=None
    )
    invoice_email: Mapped[str | None] = mapped_column(
        String(255), nullable=True, default=None
    )
    website: Mapped[str | None] = mapped_column(String(500), default="")

    # Contact Person
    contact_person: Mapped[str | None] = mapped_column(String(255), default="")
    contact_designation: Mapped[str | None] = mapped_column(String(100), default="")
    contact_mobile: Mapped[str | None] = mapped_column(String(30), default="")

    # Banking Information
    bank_name: Mapped[str | None] = mapped_column(String(100), default="")
    bank_branch: Mapped[str | None] = mapped_column(String(100), default="")
    bank_account_name: Mapped[str | None] = mapped_column(String(255), default="")
    bank_account_number: Mapped[str | None] = mapped_column(String(50), default="")
    bank_swift_code: Mapped[str | None] = mapped_column(String(20), default="")
    bank_iban: Mapped[str | None] = mapped_column(String(34), default="")

    # Social Media
    facebook_url: Mapped[str | None] = mapped_column(String(500), default="")
    linkedin_url: Mapped[str | None] = mapped_column(String(500), default="")
    instagram_url: Mapped[str | None] = mapped_column(String(500), default="")
    twitter_url: Mapped[str | None] = mapped_column(String(500), default="")
    youtube_url: Mapped[str | None] = mapped_column(String(500), default="")
    tiktok_url: Mapped[str | None] = mapped_column(String(500), default="")

    # Currency Settings
    currency_code: Mapped[str] = mapped_column(String(10), default="BDT")
    currency_symbol: Mapped[str] = mapped_column(String(10), default="৳")

    # Invoice Configuration
    invoice_prefix: Mapped[str] = mapped_column(String(20), default="INV")
    quotation_prefix: Mapped[str] = mapped_column(String(20), default="QT")
    credit_note_prefix: Mapped[str] = mapped_column(String(20), default="CN")
    purchase_order_prefix: Mapped[str] = mapped_column(String(20), default="PO")
    invoice_sequence_start: Mapped[int] = mapped_column(Integer, default=1)
    vat_rate: Mapped[Decimal] = mapped_column(DECIMAL(5, 4), default=Decimal("0.1500"))
    payment_terms: Mapped[str | None] = mapped_column(Text, default="")
    invoice_terms: Mapped[str | None] = mapped_column(Text, default="")
    invoice_footer: Mapped[str | None] = mapped_column(Text, default="")

    # E-Invoicing / ZATCA
    zatca_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    e_invoice_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # Localization
    timezone: Mapped[str] = mapped_column(String(100), default="Asia/Dhaka")
    language: Mapped[str] = mapped_column(String(20), default="en")

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    @property
    def full_address(self) -> str:
        return ", ".join(self.full_address_lines())

    def full_address_lines(self) -> list[str]:
        parts = [
            self.building_no and f"Building {self.building_no}",
            self.street,
            self.district,
            self.city,
            self.state,
            self.country,
            self.zip_code,
            self.po_box and f"P.O Box {self.po_box}",
        ]
        return [p for p in parts if p]
