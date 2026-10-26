"use client";

import React, { useRef, useState } from "react";
import { OrderDetail } from "@/types";
import { X, Printer, Building2, Receipt, Loader2, Download } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { Mushak63Modal } from "@/components/finance/mushak-6-3-modal";
import { exportElementToPdf } from "@/lib/pdf-export";

interface OrderInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderDetail | null;
}

export function OrderInvoiceModal({ isOpen, onClose, order }: OrderInvoiceModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isMushakModalOpen, setIsMushakModalOpen] = useState(false);
  const [isGeneratingMushak, setIsGeneratingMushak] = useState(false);
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);
  const [mushakInvoiceId, setMushakInvoiceId] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadInvoicePdf = async () => {
    if (!printAreaRef.current || !order) return;
    setIsDownloadingInvoice(true);
    try {
      await exportElementToPdf(
        printAreaRef.current,
        `Commercial-Invoice-${order.order_number}`
      );
    } catch (err) {
      console.error("Failed to generate commercial invoice PDF in frontend:", err);
    } finally {
      setIsDownloadingInvoice(false);
    }
  };

  const handleGenerateMushak = async () => {
    setIsGeneratingMushak(true);
    try {
      const res = await apiClient.post<{ invoice_id?: string }>(
        `/finance/mushak-6-3/generate-from-order/${order.id}?business_id=${order.business_id}`
      );
      if (res.data?.invoice_id) {
        setMushakInvoiceId(res.data.invoice_id);
      }
    } catch {
      // Backend may already have generated it, so we proceed to open the modal
    } finally {
      setIsGeneratingMushak(false);
      setIsMushakModalOpen(true);
    }
  };

  const shippingAddr =
    order.addresses?.find((a) => a.address_type === "shipping") || order.addresses?.[0];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[95vh]">
          {/* Controls Bar (hidden during print) */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/75 print:hidden">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Commercial Tax Invoice</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateMushak}
                disabled={isGeneratingMushak}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition shadow-xs disabled:opacity-50"
                title="Generate statutory Mushak 6.3 Tax Invoice"
              >
                {isGeneratingMushak ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Receipt className="w-3.5 h-3.5" />
                )}
                <span>কর চালানপত্র (মূসক-৬.৩)</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadInvoicePdf}
                disabled={isDownloadingInvoice}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold rounded-xl text-xs transition border border-slate-700 shadow-xs"
                title="Download invoice as PDF directly from Next.js"
              >
                {isDownloadingInvoice ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                )}
                <span>{isDownloadingInvoice ? "Creating PDF..." : "Download PDF"}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition shadow-xs"
              >
                <Printer className="w-4 h-4" /> Print Invoice
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

        {/* Printable Invoice Container */}
        <div ref={printAreaRef} className="p-8 overflow-y-auto space-y-6 text-slate-900 bg-white print:p-0">
          {/* Invoice Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-xl tracking-tight">
                <Building2 className="w-6 h-6" />
                <span>ProERP SaaS Platform</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Multi-Vendor Enterprise Commerce Suite</p>
              <p className="text-xs text-slate-500">Tax Registration: TRN-9847120491-BD</p>
            </div>

            <div className="text-right">
              <span className="text-xs uppercase font-extrabold text-indigo-600 tracking-wider">
                Official Invoice
              </span>
              <h2 className="text-xl font-mono font-bold text-slate-900 mt-0.5">
                {order.order_number}
              </h2>
              <p className="text-xs text-slate-500 mt-1">Date: {formatDate(order.created_at)}</p>
              <p className="text-xs font-semibold text-emerald-700 uppercase mt-0.5">
                Payment: {order.payment_status}
              </p>
            </div>
          </div>

          {/* Billing & Shipping Columns */}
          <div className="grid grid-cols-2 gap-8 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Billed / Shipped To:
              </span>
              {shippingAddr ? (
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-900 text-sm">{shippingAddr.recipient_name}</p>
                  <p className="text-slate-600">{shippingAddr.street}</p>
                  <p className="text-slate-600">
                    {shippingAddr.city}, {shippingAddr.state} {shippingAddr.zip_code}
                  </p>
                  <p className="text-slate-600">{shippingAddr.country}</p>
                  {shippingAddr.phone && (
                    <p className="text-slate-500 font-mono">Tel: {shippingAddr.phone}</p>
                  )}
                </div>
              ) : (
                <p className="text-slate-500">Walk-in Retail Customer</p>
              )}
            </div>

            <div className="text-right space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Logistics & Dispatch:
              </span>
              <p className="text-slate-700">
                Carrier: <strong>{order.courier_company || "Direct Dispatch"}</strong>
              </p>
              {order.tracking_id && (
                <p className="font-mono text-slate-600">Waybill: #{order.tracking_id}</p>
              )}
              <p className="text-slate-700">
                Fulfillment: <strong className="capitalize">{order.fulfillment_status}</strong>
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Item Description</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items && order.items.length > 0 ? (
                  order.items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {it.product_title || `Product Variant #${it.variant_id.substring(0, 8)}`}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-700">
                        {it.quantity}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        {formatCurrency(it.unit_price)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(it.subtotal)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400">
                      Standard Order Fulfillment
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end text-xs">
            <div className="w-64 space-y-2 border-t border-slate-200 pt-3">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(order.subtotal_amount)}
                </span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discounts Applied:</span>
                  <span>-{formatCurrency(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Shipping & Freight:</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(order.shipping_amount)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax (VAT/GST):</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(order.tax_amount)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-300 flex justify-between text-sm font-bold text-slate-900">
                <span>Total Due:</span>
                <span className="text-indigo-600">
                  {formatCurrency(order.total_amount)} {order.currency}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Terms */}
          <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-400 space-y-1">
            <p>Thank you for your business. Statutory BLA compliance certified.</p>
            <p>For inquiries, contact support@proerp.example.com</p>
          </div>
        </div>
      </div>
    </div>

    {/* Embedded Statutory Mushak 6.3 Modal */}
    <Mushak63Modal
      isOpen={isMushakModalOpen}
      onClose={() => setIsMushakModalOpen(false)}
      invoiceId={mushakInvoiceId || order.id}
      businessId={order.business_id}
    />
  </>
);
}
