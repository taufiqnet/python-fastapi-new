"use client";

import React, { useState } from "react";
import { RosterExchangeApplication } from "@/types";
import { Plus, ArrowLeftRight, CheckCircle2, XCircle, Clock, Users } from "lucide-react";

interface RosterExchangesTabProps {
  exchangeRequests: RosterExchangeApplication[];
  isFetching: boolean;
  onOpenCreateModal: () => void;
  onPeerReview: (reqId: string, action: "accept" | "reject", note?: string) => Promise<void>;
  onManagerReview: (reqId: string, action: "approve" | "reject", note?: string) => Promise<void>;
}

export const RosterExchangesTab: React.FC<RosterExchangesTabProps> = ({
  exchangeRequests,
  isFetching,
  onOpenCreateModal,
  onPeerReview,
  onManagerReview,
}) => {
  const [selectedReq, setSelectedReq] = useState<{
    req: RosterExchangeApplication;
    stage: "peer" | "manager";
    action: "approve" | "reject" | "accept";
  } | null>(null);

  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleOpenAction = (
    req: RosterExchangeApplication,
    stage: "peer" | "manager",
    action: "approve" | "reject" | "accept"
  ) => {
    setSelectedReq({ req, stage, action });
    setNote("");
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    setSaving(true);
    try {
      if (selectedReq.stage === "peer") {
        await onPeerReview(
          selectedReq.req.id,
          selectedReq.action === "reject" ? "reject" : "accept",
          note.trim() || undefined
        );
      } else {
        await onManagerReview(
          selectedReq.req.id,
          selectedReq.action === "reject" ? "reject" : "approve",
          note.trim() || undefined
        );
      }
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
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Roster Exchange (Shift Swap)</h3>
            <p className="text-xs text-slate-500">
              Mutual shift swap requests between colleagues with two-tier peer and manager approval
            </p>
          </div>
        </div>
        <button
          onClick={onOpenCreateModal}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Propose Shift Swap
        </button>
      </div>

      {/* Table */}
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
                <th className="py-3 px-4">Requesting Staff</th>
                <th className="py-3 px-4">Exchange Partner</th>
                <th className="py-3 px-4">Dates & Shifts to Swap</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reviews / Remarks</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {exchangeRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No shift exchange applications found.
                  </td>
                </tr>
              ) : (
                exchangeRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {r.requesting_employee_name || "Employee A"}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {r.target_employee_name || "Employee B"}
                    </td>
                    <td className="py-3 px-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-600">
                          {r.requesting_date}:
                        </span>
                        {r.requesting_shift && (
                          <span
                            style={{
                              backgroundColor: `${r.requesting_shift.color_code}15`,
                              color: r.requesting_shift.color_code,
                              borderColor: `${r.requesting_shift.color_code}40`,
                            }}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold border"
                          >
                            {r.requesting_shift.code}
                          </span>
                        )}
                        <span className="text-slate-400 font-bold">⇄</span>
                        <span className="font-mono text-[11px] text-slate-600">
                          {r.target_date}:
                        </span>
                        {r.target_shift && (
                          <span
                            style={{
                              backgroundColor: `${r.target_shift.color_code}15`,
                              color: r.target_shift.color_code,
                              borderColor: `${r.target_shift.color_code}40`,
                            }}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold border"
                          >
                            {r.target_shift.code}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-[180px] truncate" title={r.reason}>
                      {r.reason}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          r.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.status === "pending_peer_approval"
                            ? "bg-amber-100 text-amber-800"
                            : r.status === "pending_manager_approval"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {r.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] space-y-0.5">
                      {r.peer_note && (
                        <div>
                          <strong>Peer:</strong> {r.peer_note}
                        </div>
                      )}
                      {r.review_note && (
                        <div>
                          <strong>Manager:</strong> {r.review_note}
                        </div>
                      )}
                      {!r.peer_note && !r.review_note && <div>-</div>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {/* Peer Stage */}
                      {r.status === "pending_peer_approval" && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenAction(r, "peer", "accept")}
                            className="px-2.5 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-bold transition-colors"
                          >
                            Peer Accept
                          </button>
                          <button
                            onClick={() => handleOpenAction(r, "peer", "reject")}
                            className="px-2.5 py-1 bg-rose-50 text-rose-800 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      )}

                      {/* Manager Stage */}
                      {r.status === "pending_manager_approval" && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenAction(r, "manager", "approve")}
                            className="px-2.5 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-bold transition-colors shadow-xs"
                          >
                            Approve Swap
                          </button>
                          <button
                            onClick={() => handleOpenAction(r, "manager", "reject")}
                            className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {r.status === "approved" && (
                        <span className="text-emerald-600 font-semibold text-xs flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Swapped
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Dialog */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">
              {selectedReq.stage === "peer"
                ? selectedReq.action === "accept"
                  ? "Accept Shift Swap"
                  : "Decline Shift Swap"
                : selectedReq.action === "approve"
                ? "Manager Approve Shift Swap"
                : "Manager Reject Shift Swap"}
            </h3>
            <p className="text-xs text-slate-500">
              Swap duties between {selectedReq.req.requesting_employee_name} and{" "}
              {selectedReq.req.target_employee_name}.
            </p>

            <form onSubmit={handleConfirmAction} className="space-y-3">
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
                    selectedReq.action === "reject"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {saving ? "Processing..." : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
