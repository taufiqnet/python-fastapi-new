"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, AlertCircle, Building2, Clock, FileText } from "lucide-react";
import { PayrollPeriodOut, PayrollPeriodCreatePayload, PayrollPeriodUpdatePayload } from "@/types";

interface BusinessOption {
  id: number;
  name_en: string;
}

interface PeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: PayrollPeriodCreatePayload | PayrollPeriodUpdatePayload, id?: string) => Promise<boolean>;
  period?: PayrollPeriodOut | null;
  businesses: BusinessOption[];
  isSuperuser: boolean;
  currentBusinessId: number;
}

export function PeriodModal({
  isOpen,
  onClose,
  onSave,
  period,
  businesses,
  isSuperuser,
  currentBusinessId,
}: PeriodModalProps) {
  const isEdit = Boolean(period);

  const [name, setName] = useState<string>("");
  const [businessId, setBusinessId] = useState<number>(currentBusinessId || 1);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [status, setStatus] = useState<string>("draft");
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (period) {
      setName(period.name);
      setBusinessId(period.business_id || currentBusinessId || 1);
      setStartDate(period.start_date);
      setEndDate(period.end_date);
      setStatus(typeof period.status === "string" ? period.status : (period.status as any).value || "draft");
      setPaymentDate(period.payment_date || "");
      setNotes(period.notes || "");
    } else {
      setName("");
      setBusinessId(currentBusinessId || 1);
      // Default to first and last day of current month
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const firstDay = new Date(y, m, 1).toISOString().split("T")[0];
      const lastDay = new Date(y, m + 1, 0).toISOString().split("T")[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
      setStatus("draft");
      setPaymentDate("");
      setNotes("");
    }
    setError(null);
  }, [period, isOpen, currentBusinessId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Period name is required.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Start date and end date are required.");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError("End date cannot be earlier than start date.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload: PayrollPeriodCreatePayload = {
      name: name.trim(),
      business_id: Number(businessId),
      start_date: startDate,
      end_date: endDate,
      status,
      payment_date: paymentDate || null,
      notes: notes.trim() || null,
    };

    const success = await onSave(payload, period?.id);
    setSubmitting(false);
    if (success) {
      onClose();
    } else {
      setError("Failed to save payroll period. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {isEdit ? "Edit Payroll Period" : "Create Payroll Period"}
              </h2>
              <p className="text-xs text-slate-500">
                {isEdit ? "Update cycle boundary dates and status" : "Define a new salary cycle window for payslip generation"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Period Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Period Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={100}
              placeholder="e.g. October 2026, 2026-Q4"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Business Select (Superuser) */}
          {isSuperuser && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Business Profile <span className="text-rose-500">*</span>
              </label>
              <select
                value={businessId}
                onChange={(e) => setBusinessId(Number(e.target.value))}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                required
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name_en} (ID: {b.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                required
              >
                <option value="draft">Draft</option>
                <option value="processing">Processing</option>
                <option value="locked">Locked</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            {/* Disbursement Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Disbursement Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notes / Remarks
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional cycle remarks or salary batch notes..."
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold transition-colors shadow-xs flex items-center gap-1.5"
            >
              {submitting ? "Saving..." : isEdit ? "Update Period" : "Create Period"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
