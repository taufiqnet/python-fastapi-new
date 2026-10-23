"use client";

import React, { useState } from "react";
import { RosterChangeApplication } from "@/types";
import { Plus, RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";

interface RosterChangesTabProps {
  changeRequests: RosterChangeApplication[];
  isFetching: boolean;
  onOpenCreateModal: () => void;
  onReviewRequest: (reqId: string, action: "approve" | "reject", note?: string) => Promise<void>;
}

export const RosterChangesTab: React.FC<RosterChangesTabProps> = ({
  changeRequests,
  isFetching,
  onOpenCreateModal,
  onReviewRequest,
}) => {
  const [selectedReq, setSelectedReq] = useState<RosterChangeApplication | null>(null);
  const [action, setAction] = useState<"approve" | "reject">("approve");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleOpenReview = (req: RosterChangeApplication, act: "approve" | "reject") => {
    setSelectedReq(req);
    setAction(act);
    setNote("");
  };

  const handleConfirmReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    setSaving(true);
    try {
      await onReviewRequest(selectedReq.id, action, note.trim() || undefined);
      setSelectedReq(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Roster Change Applications</h3>
            <p className="text-xs text-slate-500">
              Single-day shift change requests submitted by employees or supervisors
            </p>
          </div>
        </div>
        <button
          onClick={onOpenCreateModal}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Apply Shift Change
        </button>
      </div>

      {/* Requests Table */}
      <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Top Rim Indeterminate Progress Bar */}
        {isFetching && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-100 overflow-hidden z-20">
            <div className="w-full h-full bg-indigo-600 animate-pulse" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table
            className={`w-full text-left border-collapse text-xs transition-opacity duration-150 ${
              isFetching ? "opacity-50 pointer-events-none" : "opacity-100"
            }`}
          >
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Duty Date</th>
                <th className="py-3 px-4">Current Shift</th>
                <th className="py-3 px-4">Requested Shift</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reviewer Note</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {changeRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No shift change applications found.
                  </td>
                </tr>
              ) : (
                changeRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{r.employee_name || "Employee"}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {r.employee_code || "EMP"}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">{r.date}</td>
                    <td className="py-3 px-4">
                      {r.current_shift ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {r.current_shift.code} • {r.current_shift.name}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {r.requested_shift ? (
                        <span
                          style={{
                            backgroundColor: `${r.requested_shift.color_code}15`,
                            color: r.requested_shift.color_code,
                            borderColor: `${r.requested_shift.color_code}40`,
                          }}
                          className="px-2 py-0.5 rounded-md text-[11px] font-bold border"
                        >
                          {r.requested_shift.code} • {r.requested_shift.name}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate" title={r.reason}>
                      {r.reason}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          r.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {r.review_note || "-"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {r.status === "pending" && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenReview(r, "approve")}
                            className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors"
                            title="Approve Change"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenReview(r, "reject")}
                            className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors"
                            title="Reject Change"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Dialog */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">
              {action === "approve" ? "Approve Shift Change" : "Reject Shift Change"}
            </h3>
            <p className="text-xs text-slate-500">
              {selectedReq.employee_name} on {selectedReq.date} to{" "}
              <strong>{selectedReq.requested_shift?.code}</strong>.
            </p>

            <form onSubmit={handleConfirmReview} className="space-y-3">
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional review remark..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReq(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg ${
                    action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {saving ? "Processing..." : action === "approve" ? "Approve" : "Reject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
