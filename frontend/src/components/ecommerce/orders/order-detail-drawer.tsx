"use client";

import React from "react";
import { OrderDetail, OrderPaymentStatus, OrderFulfillmentStatus } from "@/types";
import {
  X,
  ShoppingBag,
  Truck,
  CreditCard,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  Printer,
  Edit,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface OrderDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderDetail | null;
  onOpenStatusModal: (order: OrderDetail) => void;
  onOpenInvoiceModal: (order: OrderDetail) => void;
}

export function OrderDetailDrawer({
  isOpen,
  onClose,
  order,
  onOpenStatusModal,
  onOpenInvoiceModal,
}: OrderDetailDrawerProps) {
  if (!isOpen || !order) return null;

  const getPaymentStatusBadge = (status: OrderPaymentStatus) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Paid
          </span>
        );
      case "pending":
      case "authorized":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> {status}
          </span>
        );
      case "refunded":
      case "partially_refunded":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <RotateCcw className="w-3 h-3" /> {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const getFulfillmentStatusBadge = (status: OrderFulfillmentStatus) => {
    switch (status) {
      case "delivered":
      case "fulfilled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> {status}
          </span>
        );
      case "shipped":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Truck className="w-3 h-3" /> Shipped
          </span>
        );
      case "unfulfilled":
      case "partially_fulfilled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> {status}
          </span>
        );
      case "cancelled":
      case "returned":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3" /> {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const shippingAddr =
    order.addresses?.find((a) => a.address_type === "shipping") || order.addresses?.[0];
  const billingAddr =
    order.addresses?.find((a) => a.address_type === "billing") || shippingAddr;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 font-mono">
                  {order.order_number}
                </h2>
                {getPaymentStatusBadge(order.payment_status)}
                {getFulfillmentStatusBadge(order.fulfillment_status)}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Placed on {formatDate(order.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenInvoiceModal(order)}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-700 transition"
              title="Print Commercial Invoice"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onOpenStatusModal(order)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs transition"
            >
              <Edit className="w-3.5 h-3.5" /> Update Status
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Items Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Ordered Line Items ({order.items?.length || 0})
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Item & SKU</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-4 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4">
                          <p className="font-semibold text-slate-900">
                            {it.product_title || `Variant #${it.variant_id.substring(0, 8)}`}
                          </p>
                          {it.sku && <p className="text-[11px] font-mono text-slate-400">{it.sku}</p>}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                          {it.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {formatCurrency(it.unit_price)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                          {formatCurrency(it.subtotal)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-400">
                        No item records attached to this order.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Items Subtotal:</span>
              <span className="font-medium text-slate-900">
                {formatCurrency(order.subtotal_amount)}
              </span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Promotional Discounts:</span>
                <span>-{formatCurrency(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Delivery & Shipping:</span>
              <span className="font-medium text-slate-900">
                {formatCurrency(order.shipping_amount)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Estimated Taxes (VAT/GST):</span>
              <span className="font-medium text-slate-900">{formatCurrency(order.tax_amount)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
              <span>Grand Total:</span>
              <span className="text-base text-indigo-600">
                {formatCurrency(order.total_amount)} {order.currency}
              </span>
            </div>
          </div>

          {/* Logistics & Payment Channels */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-500" /> Payment Details
              </span>
              <p className="font-semibold text-slate-900">
                Method: {order.payment_method || "Online Card"}
              </p>
              {order.payment_channel && (
                <p className="text-slate-500">Channel: {order.payment_channel}</p>
              )}
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-slate-500" /> Logistics & Carrier
              </span>
              <p className="font-semibold text-slate-900">
                Carrier: {order.courier_company || "Standard Dispatch"}
              </p>
              {order.tracking_id && (
                <p className="text-slate-500 font-mono">Tracking: #{order.tracking_id}</p>
              )}
            </div>
          </div>

          {/* Shipping & Billing Addresses */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" /> Delivery Address
              </span>
              {shippingAddr ? (
                <>
                  <p className="font-semibold text-slate-900">{shippingAddr.recipient_name}</p>
                  <p className="text-slate-600">{shippingAddr.street}</p>
                  <p className="text-slate-600">
                    {shippingAddr.city}, {shippingAddr.state} {shippingAddr.zip_code}
                  </p>
                  <p className="text-slate-600">{shippingAddr.country}</p>
                  {shippingAddr.phone && (
                    <p className="text-slate-400 font-mono text-[11px]">Tel: {shippingAddr.phone}</p>
                  )}
                </>
              ) : (
                <p className="text-slate-400">No shipping address recorded</p>
              )}
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" /> Billing Address
              </span>
              {billingAddr ? (
                <>
                  <p className="font-semibold text-slate-900">{billingAddr.recipient_name}</p>
                  <p className="text-slate-600">{billingAddr.street}</p>
                  <p className="text-slate-600">
                    {billingAddr.city}, {billingAddr.state} {billingAddr.zip_code}
                  </p>
                  <p className="text-slate-600">{billingAddr.country}</p>
                </>
              ) : (
                <p className="text-slate-400">Same as shipping address</p>
              )}
            </div>
          </div>

          {/* Audit Status History */}
          {order.status_history && order.status_history.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Lifecycle Audit Trail
              </h3>
              <div className="space-y-2">
                {order.status_history.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-800 capitalize">
                        {h.status_type.replace(/_/g, " ")}: {h.status_value}
                      </span>
                      {h.note && <p className="text-slate-500 text-[11px] mt-0.5">{h.note}</p>}
                    </div>
                    <span className="text-slate-400 text-[11px] shrink-0">
                      {formatDate(h.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
