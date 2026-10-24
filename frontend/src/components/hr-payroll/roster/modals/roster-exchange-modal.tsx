"use client";

import React, { useState } from "react";
import { EmployeeOut, RosterExchangeCreatePayload } from "@/types";
import { X, ArrowLeftRight, AlertCircle } from "lucide-react";
import { SearchableEmployeeCombobox } from "@/components/common/searchable-employee-combobox";

interface RosterExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: EmployeeOut[];
  onSave: (payload: {
    requesting_employee_id: string;
    target_employee_id: string;
    requesting_date: string;
    target_date: string;
    reason: string;
  }) => Promise<void>;
}

export const RosterExchangeModal: React.FC<RosterExchangeModalProps> = ({
  isOpen,
  onClose,
  employees,
  onSave,
}) => {
  const [requestingEmpId, setRequestingEmpId] = useState(employees[0]?.id || "");
  const [targetEmpId, setTargetEmpId] = useState(employees[1]?.id || employees[0]?.id || "");
  const [requestingDate, setRequestingDate] = useState(new Date().toISOString().substring(0, 10));
  const [targetDate, setTargetDate] = useState(new Date().toISOString().substring(0, 10));
  const [reason, setReason] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestingEmpId === targetEmpId) {
      setError("Requesting employee and target partner cannot be the same person.");
      return;
    }
    if (!reason.trim()) {
      setError("Please provide a reason for the shift swap.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        requesting_employee_id: requestingEmpId,
        target_employee_id: targetEmpId,
        requesting_date: requestingDate,
        target_date: targetDate,
        reason: reason.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to submit shift exchange application.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Roster Exchange (Shift Swap)</h3>
              <p className="text-xs text-slate-500">Mutually exchange assigned duties between two staff</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Side by side exchange selection */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-purple-50/40 border border-purple-100 rounded-xl">
            <div>
              <label className="block text-xs font-bold text-purple-900 mb-1">
                Your Shift (Employee A)
              </label>
              <SearchableEmployeeCombobox
                employees={employees}
                value={requestingEmpId}
                onChange={(empId) => setRequestingEmpId(empId)}
                placeholder="Select Employee A..."
                allowClear={false}
              />
              <label className="block text-[11px] font-semibold text-slate-600 mt-2 mb-1">
                Duty Date
              </label>
              <input
                type="date"
                required
                value={requestingDate}
                onChange={(e) => setRequestingDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-xl text-xs text-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-purple-900 mb-1">
                Exchange Partner (Employee B)
              </label>
              <SearchableEmployeeCombobox
                employees={employees}
                value={targetEmpId}
                onChange={(empId) => setTargetEmpId(empId)}
                placeholder="Select Employee B..."
                allowClear={false}
              />
              <label className="block text-[11px] font-semibold text-slate-600 mt-2 mb-1">
                Duty Date
              </label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-xl text-xs text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mutual Agreement Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the mutual reason for this shift swap..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
            <div className="font-semibold text-slate-700">Approval Handshake:</div>
            <div>1. Partner receives notification to review and accept the swap proposal.</div>
            <div>2. Once accepted by peer, Department Supervisor/HR conducts final review.</div>
            <div>3. On approval, duties are swapped atomically in the official roster.</div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl shadow-xs"
            >
              {saving ? "Submitting..." : "Send Exchange Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
