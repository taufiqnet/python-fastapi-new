"use client";

import React, { useState, useEffect } from "react";
import { OrderDetail, OrderPaymentStatus, OrderFulfillmentStatus, OrderStatusUpdateInput } from "@/types";
import { X, CheckCircle, AlertCircle, Loader2, Edit3 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";

interface OrderStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: OrderDetail) => void;
  order: OrderDetail | null;
  businessId: number;
}

export function OrderStatusModal({
  isOpen,
  onClose,
  onSuccess,
  order,
  businessId,
}: OrderStatusModalProps) {
  const { toast } = useToast();

  const [paymentStatus, setPaymentStatus] = useState<OrderPaymentStatus>("pending");
  const [fulfillmentStatus, setFulfillmentStatus] = useState<OrderFulfillmentStatus>("unfulfilled");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setPaymentStatus(order.payment_status);
      setFulfillmentStatus(order.fulfillment_status);
      setNote("");
    }
    setError(null);
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload: OrderStatusUpdateInput = {
      payment_status: paymentStatus,
      fulfillment_status: fulfillmentStatus,
      note: note.trim() || undefined,
    };

    try {
      const res = await apiClient.put<OrderDetail>(
        `/orders/${order.id}/status?business_id=${businessId}`,
        payload
      );
      toast.success("Order status updated successfully");
      onSuccess(res.data);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to update order status.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Update Order Status</h2>
              <p className="text-xs text-slate-500 font-mono">#{order.order_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Status
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as OrderPaymentStatus)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="pending">Pending Payment</option>
              <option value="authorized">Authorized</option>
              <option value="paid">Paid in Full</option>
              <option value="partially_refunded">Partially Refunded</option>
              <option value="refunded">Fully Refunded</option>
              <option value="failed">Failed / Declined</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fulfillment Status
            </label>
            <select
              value={fulfillmentStatus}
              onChange={(e) => setFulfillmentStatus(e.target.value as OrderFulfillmentStatus)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="unfulfilled">Unfulfilled</option>
              <option value="processing">Processing & Packing</option>
              <option value="shipped">Shipped & In Transit</option>
              <option value="delivered">Delivered to Customer</option>
              <option value="cancelled">Cancelled</option>
              <option value="returned">Returned</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status Change Note (Audit Trail)
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Handed over to courier driver, or refund confirmed via payment gateway..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Save Status
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
