"use client";

import React, { useState } from "react";
import { X, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface RosterReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  onConfirm: (action: "approve" | "reject", note?: string) => Promise<void>;
}

export const RosterReviewModal: React.FC<RosterReviewModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  onConfirm,
}) => {
  const [action, setAction] = useState<"approve" | "reject">("approve");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (action === "reject" && !note.trim()) {
      setError("Please provide a reason when rejecting.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onConfirm(action, note.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to process review action.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800">{title}</h3>
            <p className="text-xs text-slate-500">{description}</p>
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

          {/* Action Choice */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAction("approve")}
              className={`p-3.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                action === "approve"
                  ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 text-emerald-900"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <CheckCircle2
                className={`w-5 h-5 ${
                  action === "approve" ? "text-emerald-600" : "text-slate-400"
                }`}
              />
              <div>
                <div className="text-xs font-bold">Approve</div>
                <div className="text-[11px] text-slate-500">Lock into official roster</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAction("reject")}
              className={`p-3.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                action === "reject"
                  ? "bg-rose-50 border-rose-300 ring-2 ring-rose-500/20 text-rose-900"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <XCircle
                className={`w-5 h-5 ${
                  action === "reject" ? "text-rose-600" : "text-slate-400"
                }`}
              />
              <div>
                <div className="text-xs font-bold">Reject</div>
                <div className="text-[11px] text-slate-500">Return with feedback</div>
              </div>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Review Remarks / Feedback {action === "reject" && <span className="text-rose-500">*</span>}
            </label>
            <textarea
              rows={3}
              required={action === "reject"}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                action === "approve"
                  ? "Optional note or remarks for the department..."
                  : "State the reasons for rejection or required adjustments..."
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
            />
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
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors ${
                action === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {saving ? "Processing..." : action === "approve" ? "Confirm Approval" : "Reject Submission"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
