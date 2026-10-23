"use client";

import React, { useState } from "react";
import { DutyAssignBatch, MonthlyRoster } from "@/types";
import { CheckCircle2, Clock, Calendar, AlertCircle, FileCheck, Layers } from "lucide-react";

interface RosterApprovalsTabProps {
  monthlyRosters: MonthlyRoster[];
  dutyBatches: DutyAssignBatch[];
  isFetching: boolean;
  onReviewMonthlyRoster: (rosterId: string) => void;
  onReviewDutyBatch: (batchId: string) => void;
}

export const RosterApprovalsTab: React.FC<RosterApprovalsTabProps> = ({
  monthlyRosters,
  dutyBatches,
  isFetching,
  onReviewMonthlyRoster,
  onReviewDutyBatch,
}) => {
  const [subTab, setSubTab] = useState<"monthly" | "batches">("monthly");

  const pendingMonthly = monthlyRosters.filter((r) => r.status === "submitted");
  const pendingBatches = dutyBatches.filter((b) => b.status === "pending_approval");

  return (
    <div className="space-y-4">
      {/* Subtab Switcher Rim */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setSubTab("monthly")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            subTab === "monthly"
              ? "bg-white text-indigo-600 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Monthly Rosters Pending Review ({pendingMonthly.length})
        </button>
        <button
          onClick={() => setSubTab("batches")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            subTab === "batches"
              ? "bg-white text-indigo-600 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Layers className="w-4 h-4" />
          Direct Duty Batches Pending Review ({pendingBatches.length})
        </button>
      </div>

      {/* Main Table Container */}
      <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Top Rim Indeterminate Progress Bar */}
        {isFetching && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-100 overflow-hidden z-20">
            <div className="w-full h-full bg-indigo-600 animate-pulse" />
          </div>
        )}

        <div className="overflow-x-auto">
          {subTab === "monthly" ? (
            <table
              className={`w-full text-left border-collapse text-xs transition-opacity duration-150 ${
                isFetching ? "opacity-50 pointer-events-none" : "opacity-100"
              }`}
            >
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Total Duties</th>
                  <th className="py-3 px-4">Submitted By</th>
                  <th className="py-3 px-4">Submission Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyRosters.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No monthly roster submissions found.
                    </td>
                  </tr>
                ) : (
                  monthlyRosters.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {r.department_name || "Department"}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {r.year} - {String(r.month).padStart(2, "0")}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                        {r.total_assignments} assignments
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {r.submitted_by_name || "Supervisor"}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : "-"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            r.status === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : r.status === "submitted"
                              ? "bg-amber-100 text-amber-800"
                              : r.status === "rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {r.status === "submitted" && (
                          <button
                            onClick={() => onReviewMonthlyRoster(r.id)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
                          >
                            Review & Decide
                          </button>
                        )}
                        {r.status === "approved" && (
                          <span className="text-emerald-600 font-semibold text-xs flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Approved
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table
              className={`w-full text-left border-collapse text-xs transition-opacity duration-150 ${
                isFetching ? "opacity-50 pointer-events-none" : "opacity-100"
              }`}
            >
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Batch Title</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Date Window</th>
                  <th className="py-3 px-4">Count</th>
                  <th className="py-3 px-4">Submitted By</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dutyBatches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No duty assign batches found.
                    </td>
                  </tr>
                ) : (
                  dutyBatches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">{b.title}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {b.department_name || "Department"}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {b.start_date} to {b.end_date}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                        {b.assigned_count} duties
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {b.submitted_by_name || "Lead"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            b.status === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : b.status === "pending_approval"
                              ? "bg-amber-100 text-amber-800"
                              : b.status === "rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {b.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {b.status === "pending_approval" && (
                          <button
                            onClick={() => onReviewDutyBatch(b.id)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
                          >
                            Review Batch
                          </button>
                        )}
                        {b.status === "approved" && (
                          <span className="text-emerald-600 font-semibold text-xs flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Approved
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
