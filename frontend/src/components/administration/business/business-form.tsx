"use client";

import React, { useState } from "react";
import {
  BusinessProfile,
  BusinessProfileInput,
} from "@/types";
import { LogoUpload } from "./logo-upload";
import {
  Building2,
  FileCheck2,
  MapPin,
  PhoneCall,
  Landmark,
  Receipt,
  Share2,
  Save,
  Loader2,
  Check,
} from "lucide-react";
import { useToast } from "@/context/toast-context";

type ActiveTab =
  | "identity"
  | "compliance"
  | "address"
  | "contact"
  | "banking"
  | "invoicing"
  | "social";

interface BusinessFormProps {
  initialData?: BusinessProfile | null;
  onSave: (data: BusinessProfileInput) => Promise<void>;
  onUploadLogo?: (file: File) => Promise<void>;
  onRemoveLogo?: () => Promise<void>;
  isSuperadmin?: boolean;
  plans?: { id: number; name: string }[];
  isEdit?: boolean;
}

export function BusinessForm({
  initialData,
  onSave,
  onUploadLogo,
  onRemoveLogo,
  isSuperadmin = false,
  plans = [],
  isEdit = false,
}: BusinessFormProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>("identity");
  const [saving, setSaving] = useState(false);

  // 1. Identity
  const [nameEn, setNameEn] = useState(initialData?.name_en || "");
  const [shortName, setShortName] = useState(initialData?.short_name || "");
  const [legalName, setLegalName] = useState(initialData?.legal_name || "");
  const [companyTagline, setCompanyTagline] = useState(initialData?.company_tagline || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [subscriptionPlanId, setSubscriptionPlanId] = useState<number | null>(
    initialData?.subscription_plan_id ?? 1
  );
  const [isActive, setIsActive] = useState<boolean>(initialData?.is_active ?? true);

  // 2. Compliance
  const [crNumber, setCrNumber] = useState(initialData?.cr_number || "");
  const [vatNumber, setVatNumber] = useState(initialData?.vat_number || "");
  const [taxNumber, setTaxNumber] = useState(initialData?.tax_number || "");
  const [licenseNumber, setLicenseNumber] = useState(initialData?.license_number || "");
  const [licenseExpiryDate, setLicenseExpiryDate] = useState(
    initialData?.license_expiry_date || ""
  );
  const [chamberOfCommerceNo, setChamberOfCommerceNo] = useState(
    initialData?.chamber_of_commerce_no || ""
  );
  const [nationalAddress, setNationalAddress] = useState(
    initialData?.national_address || ""
  );

  // 3. Address
  const [buildingNo, setBuildingNo] = useState(initialData?.building_no || "");
  const [street, setStreet] = useState(initialData?.street || "");
  const [district, setDistrict] = useState(initialData?.district || "");
  const [city, setCity] = useState(initialData?.city || "Dhaka");
  const [state, setState] = useState(initialData?.state || "");
  const [country, setCountry] = useState(initialData?.country || "Bangladesh");
  const [zipCode, setZipCode] = useState(initialData?.zip_code || "");
  const [poBox, setPoBox] = useState(initialData?.po_box || "");
  const [addressEn, setAddressEn] = useState(initialData?.address_en || "");

  // 4. Contact
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [mobile, setMobile] = useState(initialData?.mobile || "");
  const [whatsapp, setWhatsapp] = useState(initialData?.whatsapp || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [supportEmail, setSupportEmail] = useState(initialData?.support_email || "");
  const [salesEmail, setSalesEmail] = useState(initialData?.sales_email || "");
  const [invoiceEmail, setInvoiceEmail] = useState(initialData?.invoice_email || "");
  const [website, setWebsite] = useState(initialData?.website || "");
  const [contactPerson, setContactPerson] = useState(initialData?.contact_person || "");
  const [contactDesignation, setContactDesignation] = useState(
    initialData?.contact_designation || ""
  );
  const [contactMobile, setContactMobile] = useState(initialData?.contact_mobile || "");

  // 5. Banking
  const [bankName, setBankName] = useState(initialData?.bank_name || "");
  const [bankBranch, setBankBranch] = useState(initialData?.bank_branch || "");
  const [bankAccountName, setBankAccountName] = useState(
    initialData?.bank_account_name || ""
  );
  const [bankAccountNumber, setBankAccountNumber] = useState(
    initialData?.bank_account_number || ""
  );
  const [bankSwiftCode, setBankSwiftCode] = useState(
    initialData?.bank_swift_code || ""
  );
  const [bankIban, setBankIban] = useState(initialData?.bank_iban || "");

  // 6. Invoicing & Taxes
  const [currencyCode, setCurrencyCode] = useState(initialData?.currency_code || "BDT");
  const [currencySymbol, setCurrencySymbol] = useState(
    initialData?.currency_symbol || "৳"
  );
  const [invoicePrefix, setInvoicePrefix] = useState(
    initialData?.invoice_prefix || "INV"
  );
  const [quotationPrefix, setQuotationPrefix] = useState(
    initialData?.quotation_prefix || "QT"
  );
  const [creditNotePrefix, setCreditNotePrefix] = useState(
    initialData?.credit_note_prefix || "CN"
  );
  const [purchaseOrderPrefix, setPurchaseOrderPrefix] = useState(
    initialData?.purchase_order_prefix || "PO"
  );
  const [invoiceSequenceStart, setInvoiceSequenceStart] = useState<number>(
    initialData?.invoice_sequence_start ?? 1
  );
  const [vatRate, setVatRate] = useState<number | string>(
    initialData?.vat_rate ? String(initialData.vat_rate) : "0.1500"
  );
  const [paymentTerms, setPaymentTerms] = useState(initialData?.payment_terms || "");
  const [invoiceTerms, setInvoiceTerms] = useState(initialData?.invoice_terms || "");
  const [invoiceFooter, setInvoiceFooter] = useState(
    initialData?.invoice_footer || ""
  );
  const [zatcaEnabled, setZatcaEnabled] = useState(
    initialData?.zatca_enabled ?? true
  );
  const [eInvoiceEnabled, setEInvoiceEnabled] = useState(
    initialData?.e_invoice_enabled ?? true
  );
  const [timezone, setTimezone] = useState(initialData?.timezone || "Asia/Dhaka");
  const [language, setLanguage] = useState(initialData?.language || "en");

  // 7. Social Media
  const [facebookUrl, setFacebookUrl] = useState(initialData?.facebook_url || "");
  const [linkedinUrl, setLinkedinUrl] = useState(initialData?.linkedin_url || "");
  const [instagramUrl, setInstagramUrl] = useState(initialData?.instagram_url || "");
  const [twitterUrl, setTwitterUrl] = useState(initialData?.twitter_url || "");
  const [youtubeUrl, setYoutubeUrl] = useState(initialData?.youtube_url || "");
  const [tiktokUrl, setTiktokUrl] = useState(initialData?.tiktok_url || "");

  const tabs: { key: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "identity", label: "Identity", icon: Building2 },
    { key: "compliance", label: "Compliance & Tax", icon: FileCheck2 },
    { key: "address", label: "Address", icon: MapPin },
    { key: "contact", label: "Contact", icon: PhoneCall },
    { key: "banking", label: "Banking", icon: Landmark },
    { key: "invoicing", label: "Invoicing & VAT", icon: Receipt },
    { key: "social", label: "Social Links", icon: Share2 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) {
      toast.error("Validation Error", "Company name is required.");
      setActiveTab("identity");
      return;
    }

    setSaving(true);
    try {
      const payload: BusinessProfileInput = {
        name_en: nameEn.trim(),
        short_name: shortName.trim() || undefined,
        legal_name: legalName.trim() || undefined,
        company_tagline: companyTagline.trim() || undefined,
        description: description.trim() || undefined,

        cr_number: crNumber.trim() || null,
        vat_number: vatNumber.trim() || null,
        tax_number: taxNumber.trim() || undefined,
        license_number: licenseNumber.trim() || undefined,
        license_expiry_date: licenseExpiryDate ? licenseExpiryDate : null,
        chamber_of_commerce_no: chamberOfCommerceNo.trim() || undefined,
        national_address: nationalAddress.trim() || undefined,

        building_no: buildingNo.trim() || undefined,
        street: street.trim() || undefined,
        district: district.trim() || undefined,
        city: city.trim() || "Dhaka",
        state: state.trim() || undefined,
        country: country.trim() || "Bangladesh",
        zip_code: zipCode.trim() || undefined,
        po_box: poBox.trim() || undefined,
        address_en: addressEn.trim() || undefined,

        phone: phone.trim() || undefined,
        mobile: mobile.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        email: email.trim() || null,
        support_email: supportEmail.trim() || null,
        sales_email: salesEmail.trim() || null,
        invoice_email: invoiceEmail.trim() || null,
        website: website.trim() || undefined,
        contact_person: contactPerson.trim() || undefined,
        contact_designation: contactDesignation.trim() || undefined,
        contact_mobile: contactMobile.trim() || undefined,

        bank_name: bankName.trim() || undefined,
        bank_branch: bankBranch.trim() || undefined,
        bank_account_name: bankAccountName.trim() || undefined,
        bank_account_number: bankAccountNumber.trim() || undefined,
        bank_swift_code: bankSwiftCode.trim() || undefined,
        bank_iban: bankIban.trim() || undefined,

        facebook_url: facebookUrl.trim() || undefined,
        linkedin_url: linkedinUrl.trim() || undefined,
        instagram_url: instagramUrl.trim() || undefined,
        twitter_url: twitterUrl.trim() || undefined,
        youtube_url: youtubeUrl.trim() || undefined,
        tiktok_url: tiktokUrl.trim() || undefined,

        currency_code: currencyCode.trim() || "BDT",
        currency_symbol: currencySymbol.trim() || "৳",
        invoice_prefix: invoicePrefix.trim() || "INV",
        quotation_prefix: quotationPrefix.trim() || "QT",
        credit_note_prefix: creditNotePrefix.trim() || "CN",
        purchase_order_prefix: purchaseOrderPrefix.trim() || "PO",
        invoice_sequence_start: Number(invoiceSequenceStart) || 1,
        vat_rate: Number(vatRate) || 0.15,
        payment_terms: paymentTerms.trim() || undefined,
        invoice_terms: invoiceTerms.trim() || undefined,
        invoice_footer: invoiceFooter.trim() || undefined,

        zatca_enabled: zatcaEnabled,
        e_invoice_enabled: eInvoiceEnabled,
        timezone: timezone.trim() || "Asia/Dhaka",
        language: language.trim() || "en",

        is_active: isActive,
        subscription_plan_id: subscriptionPlanId,
      };

      await onSave(payload);
    } catch (err: unknown) {
      let msg = "Failed to save business profile.";
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        msg = axErr.response?.data?.detail || msg;
      }
      toast.error("Save Failed", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full">
      {/* Top Segmented Tab Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-1.5 flex items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActiveTab = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                isActiveTab
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        {/* TAB 1: IDENTITY */}
        {activeTab === "identity" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                Company Branding &amp; Identity
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Primary company brand name, official legal registration, and logo assets
              </p>
            </div>

            {/* Logo Upload Component */}
            {onUploadLogo && onRemoveLogo && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Company Official Logo
                </label>
                <LogoUpload
                  currentLogoUrl={initialData?.logo}
                  onUpload={onUploadLogo}
                  onRemove={onRemoveLogo}
                  disabled={saving}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Company Name (English) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. Acme International Ltd"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Short / Display Name
                </label>
                <input
                  type="text"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  placeholder="e.g. Acme Ltd"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Registered Legal Name
                </label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="e.g. Acme International Corporation PLC"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Company Tagline
                </label>
                <input
                  type="text"
                  value={companyTagline}
                  onChange={(e) => setCompanyTagline(e.target.value)}
                  placeholder="e.g. Empowering Modern Commerce &amp; Enterprise"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              {isSuperadmin && plans.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Assigned Subscription Plan
                  </label>
                  <select
                    value={subscriptionPlanId || ""}
                    onChange={(e) => setSubscriptionPlanId(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isSuperadmin && (
                <div className="flex items-center pt-6">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      Tenant Business Active &amp; Operational
                    </span>
                  </label>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Company Bio / Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief overview of business operations, services, and profile..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COMPLIANCE */}
        {activeTab === "compliance" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-indigo-600" />
                Legal Registration &amp; Tax Compliance
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official commercial registration, VAT/Tax identification, and government licenses
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Commercial Registration (CR / RJSC No)
                </label>
                <input
                  type="text"
                  value={crNumber}
                  onChange={(e) => setCrNumber(e.target.value)}
                  placeholder="e.g. C-123456"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  VAT Registration / BIN Number
                </label>
                <input
                  type="text"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  placeholder="e.g. 001234567-0101"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tax Identification Number (TIN / Tax ID)
                </label>
                <input
                  type="text"
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  placeholder="e.g. 123456789012"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Trade License Number
                </label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. TRAD/DNCC/123456"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  License Expiry Date
                </label>
                <input
                  type="date"
                  value={licenseExpiryDate}
                  onChange={(e) => setLicenseExpiryDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Chamber of Commerce Membership No
                </label>
                <input
                  type="text"
                  value={chamberOfCommerceNo}
                  onChange={(e) => setChamberOfCommerceNo(e.target.value)}
                  placeholder="e.g. DCCI-8899"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  National / Government Registered Address
                </label>
                <input
                  type="text"
                  value={nationalAddress}
                  onChange={(e) => setNationalAddress(e.target.value)}
                  placeholder="e.g. Registered Corporate Address per RJSC / Tax filings"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ADDRESS */}
        {activeTab === "address" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Physical Headquarters &amp; Mailing Address
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Structured address fields used for invoicing, shipping labels, and VAT compliance
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Building / Suite / Level No
                </label>
                <input
                  type="text"
                  value={buildingNo}
                  onChange={(e) => setBuildingNo(e.target.value)}
                  placeholder="e.g. Tower 1, Level 8"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Street / Road
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="e.g. Gulshan Avenue, Road 11"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  District / Area
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Gulshan-1"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Dhaka"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  State / Province / Division
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Dhaka Division"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Country
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. Bangladesh"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Postal / ZIP Code
                </label>
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="e.g. 1212"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  P.O. Box
                </label>
                <input
                  type="text"
                  value={poBox}
                  onChange={(e) => setPoBox(e.target.value)}
                  placeholder="e.g. GPO Box 543"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Complete Address (Display on Invoices)
                </label>
                <textarea
                  rows={2}
                  value={addressEn}
                  onChange={(e) => setAddressEn(e.target.value)}
                  placeholder="e.g. Level 8, Plot 45, Gulshan Avenue, Gulshan-1, Dhaka-1212, Bangladesh"
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CONTACT */}
        {activeTab === "contact" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-indigo-600" />
                Contact Directory &amp; Support Channels
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official communication lines, support channels, and primary contact representative
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Primary Phone
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +880 2 9888888"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. +880 1711 000000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  WhatsApp Support
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="e.g. +880 1711 000000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Official Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@acme.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Support Email
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="support@acme.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Billing / Invoice Email
                </label>
                <input
                  type="email"
                  value={invoiceEmail}
                  onChange={(e) => setInvoiceEmail(e.target.value)}
                  placeholder="billing@acme.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Website URL
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://www.acme.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Primary Contact Person
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Designation / Role
                </label>
                <input
                  type="text"
                  value={contactDesignation}
                  onChange={(e) => setContactDesignation(e.target.value)}
                  placeholder="e.g. Managing Director"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: BANKING */}
        {activeTab === "banking" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-indigo-600" />
                Corporate Banking &amp; Remittance Details
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Bank account information displayed on invoices and purchase orders for client payments
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Standard Chartered Bank"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={bankBranch}
                  onChange={(e) => setBankBranch(e.target.value)}
                  placeholder="e.g. Gulshan Branch"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Name / Title
                </label>
                <input
                  type="text"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  placeholder="e.g. Acme International Ltd"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Number
                </label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="e.g. 01-1234567-01"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  SWIFT / BIC Code
                </label>
                <input
                  type="text"
                  value={bankSwiftCode}
                  onChange={(e) => setBankSwiftCode(e.target.value)}
                  placeholder="e.g. SCBLBDDX"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  IBAN Number
                </label>
                <input
                  type="text"
                  value={bankIban}
                  onChange={(e) => setBankIban(e.target.value)}
                  placeholder="e.g. BD00SCBL..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: INVOICING & VAT */}
        {activeTab === "invoicing" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-600" />
                Invoicing, Currency &amp; Tax Configuration
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure document prefixes, sequence numbering, tax calculation, and terms
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Currency Code
                </label>
                <input
                  type="text"
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value)}
                  placeholder="e.g. BDT, USD, SAR"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  placeholder="e.g. ৳, $, ﷼"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Default VAT Rate (Fraction)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="1"
                  value={vatRate}
                  onChange={(e) => setVatRate(e.target.value)}
                  placeholder="0.1500 for 15%"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  e.g. 0.1500 = 15% Standard VAT
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Invoice Sequence Start
                </label>
                <input
                  type="number"
                  min="1"
                  value={invoiceSequenceStart}
                  onChange={(e) => setInvoiceSequenceStart(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Invoice Prefix
                </label>
                <input
                  type="text"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  placeholder="INV"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Quotation Prefix
                </label>
                <input
                  type="text"
                  value={quotationPrefix}
                  onChange={(e) => setQuotationPrefix(e.target.value)}
                  placeholder="QT"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Credit Note Prefix
                </label>
                <input
                  type="text"
                  value={creditNotePrefix}
                  onChange={(e) => setCreditNotePrefix(e.target.value)}
                  placeholder="CN"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Purchase Order Prefix
                </label>
                <input
                  type="text"
                  value={purchaseOrderPrefix}
                  onChange={(e) => setPurchaseOrderPrefix(e.target.value)}
                  placeholder="PO"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>
            </div>

            {/* E-Invoicing & ZATCA Toggles */}
            <div className="pt-2 flex flex-wrap items-center gap-6 border-t border-slate-100">
              <label className="inline-flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={eInvoiceEnabled}
                  onChange={(e) => setEInvoiceEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Enable Electronic Invoicing (E-Invoicing)
                </span>
              </label>

              <label className="inline-flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={zatcaEnabled}
                  onChange={(e) => setZatcaEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span className="text-xs font-semibold text-slate-800">
                  ZATCA / Regulatory QR Code Integration
                </span>
              </label>
            </div>

            {/* Terms & Footer Notes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Default Payment Terms
                </label>
                <textarea
                  rows={2}
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g. Payment due within 15 days of invoice issue date."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Invoice Terms &amp; Conditions
                </label>
                <textarea
                  rows={2}
                  value={invoiceTerms}
                  onChange={(e) => setInvoiceTerms(e.target.value)}
                  placeholder="e.g. Goods received in good condition cannot be returned."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Invoice Footer Text
                </label>
                <textarea
                  rows={2}
                  value={invoiceFooter}
                  onChange={(e) => setInvoiceFooter(e.target.value)}
                  placeholder="e.g. Thank you for your business!"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: SOCIAL MEDIA */}
        {activeTab === "social" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-600" />
                Social Media Presence &amp; Marketing Channels
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official social media links displayed on customer portal, receipts, and invoices
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Facebook Page URL
                </label>
                <input
                  type="url"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/yourbrand"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  LinkedIn Page URL
                </label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/company/yourbrand"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Instagram Profile URL
                </label>
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/yourbrand"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  X (formerly Twitter) URL
                </label>
                <input
                  type="url"
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  placeholder="https://x.com/yourbrand"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  YouTube Channel URL
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/@yourbrand"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  TikTok Profile URL
                </label>
                <input
                  type="url"
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  placeholder="https://tiktok.com/@yourbrand"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Save Action Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition disabled:opacity-50 cursor-pointer"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isEdit ? "Save Profile Changes" : "Create Business Profile"}
        </button>
      </div>
    </form>
  );
}
