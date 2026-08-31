from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


class BusinessProfileCreate(BaseModel):
    name_en: str
    short_name: str | None = ""
    legal_name: str | None = ""
    company_tagline: str | None = ""
    description: str | None = ""

    cr_number: str | None = ""
    vat_number: str | None = ""
    tax_number: str | None = ""
    license_number: str | None = ""
    license_expiry_date: date | None = None
    chamber_of_commerce_no: str | None = ""
    national_address: str | None = ""

    building_no: str | None = ""
    street: str | None = ""
    district: str | None = ""
    city: str | None = "Dhaka"
    state: str | None = ""
    country: str | None = "Bangladesh"
    zip_code: str | None = ""
    po_box: str | None = ""
    address_no: str | None = ""
    address_en: str | None = ""

    phone: str | None = ""
    mobile: str | None = ""
    whatsapp: str | None = ""
    email: EmailStr | None = None
    support_email: EmailStr | None = None
    sales_email: EmailStr | None = None
    invoice_email: EmailStr | None = None
    website: str | None = ""

    contact_person: str | None = ""
    contact_designation: str | None = ""
    contact_mobile: str | None = ""

    bank_name: str | None = ""
    bank_branch: str | None = ""
    bank_account_name: str | None = ""
    bank_account_number: str | None = ""
    bank_swift_code: str | None = ""
    bank_iban: str | None = ""

    facebook_url: str | None = ""
    linkedin_url: str | None = ""
    instagram_url: str | None = ""
    twitter_url: str | None = ""
    youtube_url: str | None = ""
    tiktok_url: str | None = ""

    currency_code: str = "BDT"
    currency_symbol: str = "৳"

    invoice_prefix: str = "INV"
    quotation_prefix: str = "QT"
    credit_note_prefix: str = "CN"
    purchase_order_prefix: str = "PO"
    invoice_sequence_start: int = 1
    vat_rate: Decimal = Decimal("0.1500")
    payment_terms: str | None = ""
    invoice_terms: str | None = ""
    invoice_footer: str | None = ""

    zatca_enabled: bool = True
    e_invoice_enabled: bool = True

    timezone: str = "Asia/Dhaka"
    language: str = "en"

    is_active: bool = True

    @field_validator(
        "email", "support_email", "sales_email", "invoice_email", mode="before"
    )
    @classmethod
    def blank_email_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v

    @field_validator("license_expiry_date", mode="before")
    @classmethod
    def blank_date_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v


class BusinessProfileResponse(BusinessProfileCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
