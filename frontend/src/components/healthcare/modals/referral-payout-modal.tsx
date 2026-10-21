"use client";

import React, { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { ReferralDoctorCommissionOut, ReferralPayoutPayload } from "@/types";
import { X, CheckCircle2, DollarSign, AlertCircle, Save, Loader2, CreditCard } from "lucide-react";

interface ReferralPayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  commission: ReferralDoctorCommissionOut | null;
  onSuccess: () => void;
}

export function ReferralPayoutModal({
  isOpen,
  onClose,
  commission,
  onSuccess,
}: ReferralPayoutModalProps) {
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !commission) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentReference.trim()) {
      setError("Please enter a payment reference or voucher number.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: ReferralPayoutPayload = {
        payment_reference: paymentReference.trim(),
        notes: notes.trim() || undefined,
      };

      await apiClient.post<ReferralDoctorCommissionOut>(
        `/healthcare/referrals/commissions/${commission.id}/payout`,
        payload
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to settle commission payout.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Settle Commission Payout</h2>
              <p className="text-xs text-slate-500">Record disbursement to referring doctor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Details Summary Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Referring Doctor:</span>
              <span className="font-bold text-slate-900">
                {commission.referring_doctor?.full_name || "Doctor"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Order Bill:</span>
              <span className="font-mono text-slate-700">৳{Number(commission.bill_amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Rate:</span>
              <span className="font-mono text-slate-700">{commission.commission_rate}%</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
              <span className="font-bold text-slate-800">Payable Commission:</span>
              <span className="font-black text-emerald-700">
                ৳{Number(commission.commission_amount).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Payment Reference */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Payment Reference / Cheque / Txn ID <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <CreditCard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. CQ-99212, CASH-VOUCHER-04, or MFS-TXN-77"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-bold text-slate-900 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Settlement Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Disbursed by accounts desk..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Mark as Disbursed
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
