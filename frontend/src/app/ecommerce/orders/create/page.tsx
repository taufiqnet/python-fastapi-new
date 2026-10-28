"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import {
  CatalogProduct,
  CatalogVariant,
  CustomerOut,
  DeliveryServiceSettingOut,
  OrderCreateInput,
  OrderPaymentStatus,
  OrderFulfillmentStatus,
} from "@/types";
import { formatCurrency } from "@/lib/utils";
import { CreateCustomerModal } from "@/components/ecommerce/orders/create-customer-modal";
import { DeliverySettingsModal } from "@/components/ecommerce/delivery-settings-modal";
import { SearchableCustomerCombobox } from "@/components/ecommerce/orders/searchable-customer-combobox";
import {
  ArrowLeft,
  ShoppingBag,
  Plus,
  Trash2,
  User,
  UserPlus,
  Truck,
  DollarSign,
  PackageCheck,
  Send,
  Loader2,
  AlertCircle,
  MessageCircle,
  Phone,
  Store,
  Globe,
  CheckCircle,
  HelpCircle,
  Info,
  Settings,
} from "lucide-react";

interface LineItemState {
  id: string; // local temporary key
  productId: string;
  variantId: string;
  sku: string;
  title: string;
  variantSummary: string;
  stockQty: number;
  unitPrice: number;
  quantity: number;
}

export default function CreateOrderPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const businessId = user?.business_id || 1;

  // Loading States
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Data Sources
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [customers, setCustomers] = useState<CustomerOut[]>([]);

  // Customer Modal State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Form Fields - Channel / Source
  const [orderSource, setOrderSource] = useState<string>("facebook");

  // Form Fields - Customer Mode
  const [isGuest, setIsGuest] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  // Form Fields - Recipient / Shipping Details
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [shippingStreet, setShippingStreet] = useState("");
  const [shippingCity, setShippingCity] = useState("Dhaka");
  const [shippingZip, setShippingZip] = useState("");

  // Form Fields - Line Items
  const [items, setItems] = useState<LineItemState[]>([]);

  // Form Fields - Delivery & Courier
  const [deliverySettings, setDeliverySettings] = useState<DeliveryServiceSettingOut[]>([]);
  const [loadingDeliverySettings, setLoadingDeliverySettings] = useState<boolean>(true);
  const [isDeliverySettingsModalOpen, setIsDeliverySettingsModalOpen] = useState<boolean>(false);
  const [shippingFee, setShippingFee] = useState<number>(70);
  const [courierCompany, setCourierCompany] = useState<string>("");
  const [deliveryMethod, setDeliveryMethod] = useState<string>("Inside Dhaka City");
  const [trackingId, setTrackingId] = useState<string>("");

  // Form Fields - Financials & Payment
  const [applyVat, setApplyVat] = useState<boolean>(true);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<OrderPaymentStatus>("pending");
  const [fulfillmentStatus, setFulfillmentStatus] = useState<OrderFulfillmentStatus>("unfulfilled");
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash on Delivery (COD)");
  const [customerNote, setCustomerNote] = useState<string>("");

  // Fetch Delivery Settings from API
  const fetchDeliverySettings = useCallback(async () => {
    try {
      setLoadingDeliverySettings(true);
      const res = await apiClient.get<DeliveryServiceSettingOut[]>(
        `/shipping/delivery-settings?business_id=${businessId}`
      );
      const list = res.data || [];
      setDeliverySettings(list);
      const def = list.find((d) => d.is_default) || list[0];
      if (def) {
        setDeliveryMethod(def.name);
        setShippingFee(def.charge);
        if (def.region?.toLowerCase().includes("dhaka")) {
          setShippingCity("Dhaka");
        }
      }
    } catch (err) {
      console.error("Failed to load delivery settings:", err);
    } finally {
      setLoadingDeliverySettings(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchDeliverySettings();
  }, [fetchDeliverySettings]);

  // Load Catalog & Customers
  useEffect(() => {
    async function fetchData() {
      try {
        setLoadingCatalog(true);
        const catalogRes = await apiClient.get<CatalogProduct[]>(
          `/orders/catalog/products?business_id=${businessId}`
        );
        setCatalog(catalogRes.data || []);
      } catch (err) {
        console.error("Failed to load catalog:", err);
      } finally {
        setLoadingCatalog(false);
      }

      try {
        setLoadingCustomers(true);
        const customersRes = await apiClient.get<CustomerOut[]>(
          `/customers?business_id=${businessId}&limit=100`
        );
        setCustomers(customersRes.data || []);
      } catch (err) {
        console.error("Failed to load customers:", err);
      } finally {
        setLoadingCustomers(false);
      }
    }

    fetchData();
  }, [businessId]);

  // Handle Delivery Setting Selection
  const handleSelectDeliverySetting = (setting: DeliveryServiceSettingOut) => {
    setDeliveryMethod(setting.name);
    setShippingFee(setting.charge);
    if (setting.default_courier) {
      setCourierCompany(setting.default_courier);
    }
    if (setting.region?.toLowerCase().includes("dhaka")) {
      setShippingCity("Dhaka");
    }
  };

  // When a registered customer is selected, pre-fill recipient details
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (!customerId) {
      setRecipientName("");
      setRecipientPhone("");
      setRecipientEmail("");
      setShippingStreet("");
      return;
    }
    const found = customers.find((c) => c.id === customerId);
    if (found) {
      setRecipientName(found.full_name || `${found.first_name} ${found.last_name || ""}`.trim());
      setRecipientPhone(found.phone || "");
      setRecipientEmail(found.email || "");
      if (found.address) {
        setShippingStreet(found.address);
      }
    }
  };

  // Line item helpers
  const handleAddItem = () => {
    // Find first available product and variant
    const firstProduct = catalog.find((p) => p.variants && p.variants.length > 0);
    if (!firstProduct || !firstProduct.variants[0]) {
      toast.warning("No Catalog Available", "No active products or SKUs found in inventory.");
      return;
    }
    const firstVariant = firstProduct.variants[0];

    const newItem: LineItemState = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      productId: firstProduct.id,
      variantId: firstVariant.id,
      sku: firstVariant.sku,
      title: firstProduct.title,
      variantSummary: firstVariant.attr_summary || firstVariant.sku,
      stockQty: firstVariant.stock_qty,
      unitPrice: firstVariant.price,
      quantity: 1,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = catalog.find((p) => p.id === productId);
    if (!product || !product.variants || product.variants.length === 0) return;
    const variant = product.variants[0];

    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        productId: product.id,
        variantId: variant.id,
        sku: variant.sku,
        title: product.title,
        variantSummary: variant.attr_summary || variant.sku,
        stockQty: variant.stock_qty,
        unitPrice: variant.price,
      };
      return next;
    });
  };

  const handleVariantChange = (index: number, variantId: string) => {
    const item = items[index];
    const product = catalog.find((p) => p.id === item.productId);
    if (!product) return;
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) return;

    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        variantId: variant.id,
        sku: variant.sku,
        variantSummary: variant.attr_summary || variant.sku,
        stockQty: variant.stock_qty,
        unitPrice: variant.price,
      };
      return next;
    });
  };

  const handlePriceChange = (index: number, price: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        unitPrice: Math.max(0, price),
      };
      return next;
    });
  };

  const handleQuantityChange = (index: number, qty: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        quantity: Math.max(1, qty),
      };
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Financial Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
  }, [items]);

  // Bangladesh 15% standard VAT on subtotal after discount
  const vatAmount = useMemo(() => {
    if (!applyVat) return 0;
    const taxableBase = Math.max(0, subtotal - (discountAmount || 0));
    return Number((taxableBase * 0.15).toFixed(2));
  }, [subtotal, discountAmount, applyVat]);

  const grandTotal = useMemo(() => {
    const total =
      subtotal + (shippingFee || 0) + (vatAmount || 0) + (otherCharges || 0) - (discountAmount || 0);
    return Math.max(0, Number(total.toFixed(2)));
  }, [subtotal, shippingFee, vatAmount, otherCharges, discountAmount]);

  // Handle Form Submission
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form Validations
    if (!recipientName.trim()) {
      setErrorMessage("Recipient full name is required.");
      return;
    }
    if (!recipientPhone.trim()) {
      setErrorMessage("Contact phone number is required for courier delivery.");
      return;
    }
    if (!shippingStreet.trim()) {
      setErrorMessage("Delivery street address is required.");
      return;
    }
    if (items.length === 0) {
      setErrorMessage("Please add at least one line item to the order.");
      return;
    }

    setSubmitting(true);

    try {
      // Determine guest email or fallback
      const guestEmail =
        recipientEmail.trim() ||
        `${recipientPhone.replace(/[^0-9]/g, "") || "customer"}@social.proerp.local`;

      const orderPayload: OrderCreateInput = {
        business_id: businessId,
        user_id: isGuest ? null : selectedCustomerId || null,
        guest_email: guestEmail,
        order_source: orderSource,
        payment_channel: orderSource,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        fulfillment_status: fulfillmentStatus,
        delivery_method: deliveryMethod,
        courier_company: courierCompany,
        tracking_id: trackingId.trim() || undefined,
        shipping_amount: Number(shippingFee) || 0,
        tax_amount: vatAmount,
        discount_amount: Number(discountAmount) || 0,
        other_charges: Number(otherCharges) || 0,
        customer_note: customerNote.trim() || undefined,
        currency: "BDT",
        items: items.map((it) => ({
          variant_id: it.variantId,
          quantity: it.quantity,
          unit_price: it.unitPrice,
        })),
        shipping_address: {
          address_type: "shipping",
          recipient_name: recipientName.trim(),
          phone: recipientPhone.trim(),
          street: shippingStreet.trim(),
          city: shippingCity.trim() || "Dhaka",
          state: shippingCity.trim() || "Dhaka",
          zip_code: shippingZip.trim() || undefined,
          country: "Bangladesh",
        },
      };

      const res = await apiClient.post<{ id: string; order_number: string }>(
        "/orders",
        orderPayload
      );

      toast.success(
        "Order Created Successfully",
        `Order ${res.data.order_number} has been created and synced.`
      );
      router.push("/ecommerce/orders");
    } catch (err: any) {
      console.error("Order creation failed:", err);
      const detail =
        err.response?.data?.detail ||
        err.message ||
        "Failed to create order. Please check all required fields.";
      setErrorMessage(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Header Breadcrumbs & Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Link
                href="/ecommerce/orders"
                className="hover:text-indigo-600 transition flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Orders
              </Link>
              <span>/</span>
              <span className="text-indigo-600 font-bold uppercase tracking-wider">
                Manual & Social POS
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <ShoppingBag className="w-7 h-7 text-indigo-600" />
              Create Sales Order
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Place manual, Facebook, WhatsApp, or phone orders with custom line pricing and direct
              courier fulfillment.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/ecommerce/orders"
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl text-xs transition"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleSubmitOrder}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving Order...
                </>
              ) : (
                <>
                  <PackageCheck className="w-4 h-4" /> Place Order (
                  {formatCurrency(grandTotal, "BDT")})
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="font-medium">{errorMessage}</p>
          </div>
        )}

        {/* Main Grid: Form Left, Sticky Summary Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Columns (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Channel / Order Source Selector */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Order Channel & Origin</h2>
                  <p className="text-xs text-slate-500">
                    Select where this customer inquiry was initiated
                  </p>
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {orderSource.replace("_", " ")}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setOrderSource("facebook")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition ${
                    orderSource === "facebook"
                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-xs ring-1 ring-blue-400"
                      : "border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-1.5">
                    <Globe className="w-4 h-4" />
                  </div>
                  Facebook
                </button>

                <button
                  type="button"
                  onClick={() => setOrderSource("whatsapp")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition ${
                    orderSource === "whatsapp"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-xs ring-1 ring-emerald-400"
                      : "border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1.5">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() => setOrderSource("phone")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition ${
                    orderSource === "phone"
                      ? "border-amber-500 bg-amber-50 text-amber-700 shadow-xs ring-1 ring-amber-400"
                      : "border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mb-1.5">
                    <Phone className="w-4 h-4" />
                  </div>
                  Phone Call
                </button>

                <button
                  type="button"
                  onClick={() => setOrderSource("walk_in")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition ${
                    orderSource === "walk_in"
                      ? "border-purple-500 bg-purple-50 text-purple-700 shadow-xs ring-1 ring-purple-400"
                      : "border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mb-1.5">
                    <Store className="w-4 h-4" />
                  </div>
                  Walk-in / POS
                </button>

                <button
                  type="button"
                  onClick={() => setOrderSource("online_store")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition ${
                    orderSource === "online_store"
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-400"
                      : "border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-1.5">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  Online Store
                </button>
              </div>
            </div>

            {/* 2. Customer Information & Selector */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-600" />
                    Customer Details
                  </h2>
                  <p className="text-xs text-slate-500">
                    Select an existing contact or enter guest delivery information
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsGuest(!isGuest)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                      isGuest
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {isGuest ? "✓ Guest Checkout Mode" : "Switch to Guest"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCustomerModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs transition border border-indigo-200"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    + New Customer
                  </button>
                </div>
              </div>

              {!isGuest ? (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Search & Select Customer (By Name, Phone Number, or Email)
                  </label>
                  <SearchableCustomerCombobox
                    customers={customers}
                    value={selectedCustomerId}
                    onChange={(custId) => handleCustomerSelect(custId)}
                    onOpenCreateCustomer={() => setIsCustomerModalOpen(true)}
                    placeholder="Type customer name or phone (e.g. 0171...) to search and select..."
                  />
                </div>
              ) : (
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Guest checkout will automatically generate a localized contact identifier
                    without creating a persistent account.
                  </span>
                </div>
              )}

              {/* Delivery Recipient Contact Details */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Recipient Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tanvir Ahmed"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 01712345678"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="customer@gmail.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Shipping Address Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Delivery Street Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="House/Road/Sector, Area (e.g. Road 12, Banani)"
                    value={shippingStreet}
                    onChange={(e) => setShippingStreet(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                    placeholder="Dhaka, Chattogram, etc."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            </div>

            {/* 3. Product & SKU Line Items Table */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-indigo-600" />
                    Order Line Items
                  </h2>
                  <p className="text-xs text-slate-500">
                    Add catalog products, select variants/SKUs, and negotiate unit prices
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={loadingCatalog || catalog.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Line Item
                </button>
              </div>

              {items.length === 0 ? (
                <div className="py-12 border-2 border-dashed border-slate-200 rounded-2xl text-center flex flex-col items-center justify-center gap-2 bg-slate-50/50">
                  <ShoppingBag className="w-8 h-8 text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">No items added to order</p>
                  <p className="text-[11px] text-slate-400">
                    Click "Add Line Item" to select products from your business catalog.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={loadingCatalog || catalog.length === 0}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Select First Product
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                        <th className="py-2.5 px-3">Product Title</th>
                        <th className="py-2.5 px-3">Variant / SKU & Stock</th>
                        <th className="py-2.5 px-3 w-28 text-right">Unit Price (৳)</th>
                        <th className="py-2.5 px-3 w-24 text-center">Qty</th>
                        <th className="py-2.5 px-3 w-28 text-right">Subtotal</th>
                        <th className="py-2.5 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {items.map((it, idx) => {
                        const curProduct = catalog.find((p) => p.id === it.productId);
                        const availableVariants = curProduct?.variants || [];

                        return (
                          <tr key={it.id} className="hover:bg-slate-50/50">
                            {/* Product Selector */}
                            <td className="py-3 px-3">
                              <select
                                value={it.productId}
                                onChange={(e) => handleProductChange(idx, e.target.value)}
                                className="w-full max-w-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white"
                              >
                                {catalog.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.title}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Variant Selector & Stock Badge */}
                            <td className="py-3 px-3">
                              <div className="space-y-1">
                                <select
                                  value={it.variantId}
                                  onChange={(e) => handleVariantChange(idx, e.target.value)}
                                  className="w-full max-w-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white"
                                >
                                  {availableVariants.map((v) => (
                                    <option key={v.id} value={v.id}>
                                      {v.sku} {v.attr_summary ? `(${v.attr_summary})` : ""} —{" "}
                                      {formatCurrency(v.price, "BDT")}
                                    </option>
                                  ))}
                                </select>

                                <div>
                                  {it.stockQty > 5 ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                      <CheckCircle className="w-3 h-3" /> Stock: {it.stockQty} units
                                    </span>
                                  ) : it.stockQty > 0 ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                      Low Stock: {it.stockQty} left
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                      Out of stock (Backorder)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Negotiated Unit Price */}
                            <td className="py-3 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={it.unitPrice}
                                onChange={(e) => handlePriceChange(idx, Number(e.target.value))}
                                className="w-24 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-right font-semibold focus:bg-white"
                              />
                            </td>

                            {/* Quantity Stepper */}
                            <td className="py-3 px-3 text-center">
                              <div className="inline-flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(idx, it.quantity - 1)}
                                  className="px-2 py-1 hover:bg-slate-200 text-slate-600 transition"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={it.quantity}
                                  onChange={(e) =>
                                    handleQuantityChange(idx, parseInt(e.target.value) || 1)
                                  }
                                  className="w-10 text-center bg-transparent text-xs font-bold focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(idx, it.quantity + 1)}
                                  className="px-2 py-1 hover:bg-slate-200 text-slate-600 transition"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* Row Subtotal */}
                            <td className="py-3 px-3 text-right font-extrabold text-slate-900">
                              {formatCurrency(it.unitPrice * it.quantity, "BDT")}
                            </td>

                            {/* Delete Line */}
                            <td className="py-3 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Remove Line"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 4. Delivery & Courier Method */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-indigo-600" />
                  Delivery & Courier Service
                </h2>
                <button
                  type="button"
                  onClick={() => setIsDeliverySettingsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Configure Rates
                </button>
              </div>

              {/* Delivery Presets populated from Settings */}
              {loadingDeliverySettings ? (
                <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  Loading delivery rates...
                </div>
              ) : deliverySettings.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center">
                  <p className="text-xs text-slate-500">No delivery services configured.</p>
                  <button
                    type="button"
                    onClick={() => setIsDeliverySettingsModalOpen(true)}
                    className="mt-1 text-xs text-indigo-600 font-bold hover:underline"
                  >
                    Click here to add delivery pricing
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {deliverySettings.map((ds) => {
                    const isSelected = deliveryMethod === ds.name;
                    return (
                      <button
                        key={ds.id}
                        type="button"
                        onClick={() => handleSelectDeliverySetting(ds)}
                        className={`p-3 rounded-xl border text-xs text-left transition ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-1 ring-indigo-500 shadow-xs"
                            : "border-slate-200 hover:bg-slate-50 text-slate-700 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-900">{ds.name}</p>
                          {ds.is_default && (
                            <span className="text-[9px] font-bold uppercase text-emerald-700 bg-emerald-100/70 px-1 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-extrabold text-indigo-700 mt-1">
                          ৳{ds.charge.toFixed(2)} Delivery Charge
                        </p>
                        {ds.estimated_days && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{ds.estimated_days}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Courier Company & Tracking */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label htmlFor="courier_company_select" className="block text-xs font-semibold text-slate-700 mb-1">
                    Courier Partner
                  </label>
                  <select
                    id="courier_company_select"
                    value={courierCompany}
                    onChange={(e) => setCourierCompany(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white"
                  >
                    <option value="">-- Select Courier Partner (Optional) --</option>
                    <option value="Pathao">Pathao Courier</option>
                    <option value="Steadfast">Steadfast Courier</option>
                    <option value="RedX">RedX Logistics</option>
                    <option value="Paperfly">Paperfly</option>
                    <option value="Sundarban">Sundarban Courier</option>
                    <option value="Self Delivery">In-House / Self Delivery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Delivery Method
                  </label>
                  <input
                    type="text"
                    value={deliveryMethod}
                    onChange={(e) => setDeliveryMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tracking Consignment ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PTH-884920"
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 5. Customer Notes */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <label className="block text-xs font-bold text-slate-900">
                Customer Note / Special Handling Instructions
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Call before delivery, urgent delivery requested before 5 PM..."
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Right Column: Sticky Order Financials & Placement */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5 sticky top-24">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Financial Breakdown
              </h2>

              {/* Adjustments: Delivery Fee, Discount, Tax */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Shipping Fee (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={shippingFee}
                    onChange={(e) => setShippingFee(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-right focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Special Discount (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-right text-rose-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Other / Handling Charges (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={otherCharges}
                    onChange={(e) => setOtherCharges(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-right focus:bg-white"
                  />
                </div>

                {/* 15% VAT Checkbox */}
                <div className="pt-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={applyVat}
                      onChange={(e) => setApplyVat(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Mushak 15% VAT (BLA/NBR)</span>
                  </label>
                  <span className="font-mono font-bold text-slate-800">
                    {formatCurrency(vatAmount, "BDT")}
                  </span>
                </div>
              </div>

              {/* Payment Status & Method */}
              <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white"
                  >
                    <option value="Cash on Delivery (COD)">Cash on Delivery (COD)</option>
                    <option value="bKash Merchant">bKash (Advance Payment)</option>
                    <option value="Nagad">Nagad (Advance Payment)</option>
                    <option value="Rocket">Rocket (DBBL)</option>
                    <option value="Bank Transfer">Direct Bank Transfer</option>
                    <option value="POS Card Swipe">POS Card Swipe</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Payment Status
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as OrderPaymentStatus)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs text-slate-800 focus:bg-white"
                    >
                      <option value="pending">Pending (COD)</option>
                      <option value="paid">Paid</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Fulfillment Status
                    </label>
                    <select
                      value={fulfillmentStatus}
                      onChange={(e) =>
                        setFulfillmentStatus(e.target.value as OrderFulfillmentStatus)
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs text-slate-800 focus:bg-white"
                    >
                      <option value="unfulfilled">Unfulfilled</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Order Totals Summary */}
              <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Line Items Subtotal</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(subtotal, "BDT")}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-500">
                  <span>Shipping Fee</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(shippingFee, "BDT")}
                  </span>
                </div>

                {applyVat && (
                  <div className="flex items-center justify-between text-slate-500">
                    <span>VAT (15%)</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(vatAmount, "BDT")}
                    </span>
                  </div>
                )}

                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-rose-600">
                    <span>Discount</span>
                    <span className="font-semibold">
                      -{formatCurrency(discountAmount, "BDT")}
                    </span>
                  </div>
                )}

                {otherCharges > 0 && (
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Other Charges</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(otherCharges, "BDT")}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-900">Grand Total</span>
                  <span className="text-xl font-black text-indigo-700">
                    {formatCurrency(grandTotal, "BDT")}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={submitting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting Order...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Confirm & Place Order
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Customer Registration Inline Modal */}
        <CreateCustomerModal
          isOpen={isCustomerModalOpen}
          onClose={() => setIsCustomerModalOpen(false)}
          businessId={businessId}
          onCustomerCreated={(newCust) => {
            setCustomers((prev) => [newCust, ...prev]);
            setIsGuest(false);
            handleCustomerSelect(newCust.id);
          }}
        />

        {/* Delivery Rates & Courier Settings Modal */}
        <DeliverySettingsModal
          isOpen={isDeliverySettingsModalOpen}
          onClose={() => setIsDeliverySettingsModalOpen(false)}
          businessId={businessId}
          onUpdated={fetchDeliverySettings}
        />
      </div>
    </DashboardLayout>
  );
}
