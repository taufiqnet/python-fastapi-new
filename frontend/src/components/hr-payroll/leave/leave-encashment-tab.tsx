"use client";

import React, { useState, useMemo } from "react";
import { apiClient } from "@/lib/api-client";
import {
  LeaveEncashmentOut,
  LeaveTypeOut,
  EmployeeOut,
  LeaveAllocationOut,
} from "@/types";
import { LeaveStatCards, StatItem } from "./leave-stat-cards";
import {
  Search,
  Plus,
  Coins,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  Trash2,
  UserCheck,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";

interface LeaveEncashmentTabProps {
  encashments: LeaveEncashmentOut[];
  leaveTypes: LeaveTypeOut[];
  employees: EmployeeOut[];
  allocations: LeaveAllocationOut[];
  onRefresh: () => void;
  onOpenCreateModal: () => void;
  onReviewEncashment: (encashment: LeaveEncashmentOut) => void;
}

export function LeaveEncashmentTab({
  encashments,
  leaveTypes,
  employees,
  allocations,
  onRefresh,
  onOpenCreateModal,
  onReviewEncashment,
}: LeaveEncashmentTabProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionError, setActionError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const ltMap = useMemo(() => new Map(leaveTypes.map((t) => [t.id, t])), [leaveTypes]);

  // Filtered Encashments
  const filteredEncashments = useMemo(() => {
    return encashments.filter((enc) => {
      if (Number(enc.year) !== Number(selectedYear)) return false;
      if (statusFilter !== "all" && enc.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const emp = empMap.get(enc.employee_id);
        const nameMatch = emp?.full_name?.toLowerCase().includes(q);
        const idMatch = emp?.employee_id?.toLowerCase().includes(q);
        if (!nameMatch && !idMatch) return false;
      }
      return true;
    });
  }, [encashments, selectedYear, statusFilter, searchQuery, empMap]);

  // KPI stats
  const stats: StatItem[] = useMemo(() => {
    const yearEnc = encashments.filter((e) => Number(e.year) === Number(selectedYear));
    const totalRequests = yearEnc.length;
    const totalDays = yearEnc
      .filter((e) => ["approved", "paid"].includes(e.status))
      .reduce((sum, e) => sum + Number(e.encashable_days || 0), 0);
    const totalAmount = yearEnc
      .filter((e) => ["approved", "paid"].includes(e.status))
      .reduce((sum, e) => sum + Number(e.total_amount || 0), 0);
    const pendingCount = yearEnc.filter((e) => e.status === "pending").length;

    return [
      {
        label: "Total Encashment Requests",
        value: totalRequests,
        icon: Coins,
        color: "indigo",
        subtext: `Year ${selectedYear} submitted claims`,
      },
      {
        label: "Pending Manager Review",
        value: pendingCount,
        icon: Clock,
        color: "amber",
        subtext: pendingCount > 0 ? "Awaiting quota validation" : "All requests reviewed",
      },
      {
        label: "Approved Encashed Days",
        value: `${totalDays} Days`,
        icon: CheckCircle2,
        color: "teal",
        subtext: "Deducted from annual quotas",
      },
      {
        label: "Total Settlement Payout",
        value: `৳${totalAmount.toLocaleString()}`,
        icon: CreditCard,
        color: "emerald",
        subtext: "BLA 2006 § 117 wage payout",
      },
    ];
  }, [encashments, selectedYear]);

  const handleDisburse = async (enc: LeaveEncashmentOut) => {
    const ref = window.prompt("Enter payment reference / bank voucher number (optional):", "BANK-TRANSFER");
    if (ref === null) return;

    setProcessingId(enc.id);
    setActionError(null);

    try {
      const today = new Date().toISOString().split("T")[0];
      await apiClient.post(`/leave-encashments/${enc.id}/disburse`, {
        payment_date: today,
        payment_reference: ref.trim() || null,
      });
      onRefresh();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to disburse encashment.";
      setActionError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this leave encashment record?")) return;

    setProcessingId(id);
    setActionError(null);

    try {
      await apiClient.delete(`/leave-encashments/${id}`);
      onRefresh();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to delete encashment.";
      setActionError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setProcessingId(null);
    }
  };

  const statusBadges: Record<string, { bg: string; text: string; border: string }> = {
    pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    approved: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
    paid: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    rejected: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
    cancelled: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" },
  };

  return (
    <div className="w-full space-y-5">
      {/* Stats */}
      <LeaveStatCards stats={stats} />

      {actionError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-700 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Control Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Year Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Year:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {[currentYear - 1, currentYear, currentYear + 1].map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedYear === yr
                      ? "bg-white text-emerald-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenCreateModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>New Encashment Claim</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "All Claims" },
              { id: "pending", label: "Pending" },
              { id: "approved", label: "Approved" },
              { id: "paid", label: "Paid / Disbursed" },
              { id: "rejected", label: "Rejected" },
            ].map((pill) => {
              const active = statusFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => setStatusFilter(pill.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    active
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff name or ID..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>
        </div>
      </div>

      {/* Encashment Claims Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Policy & Year</th>
                <th className="py-3 px-4">Encashed Days</th>
                <th className="py-3 px-4">Daily Rate</th>
                <th className="py-3 px-4">Total Amount (৳)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reviewed / Paid</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredEncashments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Coins className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">
                      No leave encashment claims found for Year {selectedYear}.
                    </p>
                    <p className="text-[11px] mt-0.5">
                      Click &quot;New Encashment Claim&quot; to calculate and disburse unavailed annual leave wages.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredEncashments.map((enc) => {
                  const emp = empMap.get(enc.employee_id);
                  const lt = ltMap.get(enc.leave_type_id);
                  const reviewer = enc.reviewed_by_id ? empMap.get(enc.reviewed_by_id) : null;
                  const badge = statusBadges[enc.status] || statusBadges.pending;

                  return (
                    <tr key={enc.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Employee */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                            {emp?.full_name ? emp.full_name.charAt(0) : "E"}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate">
                              {emp?.full_name || "Employee"}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate">
                              {emp?.employee_id || "No ID"} • {emp?.department_name || "General"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Policy & Year */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {lt?.code || "AL"}
                          </span>
                          <span className="font-semibold text-slate-800">{enc.year}</span>
                        </div>
                      </td>

                      {/* Encashed Days */}
                      <td className="py-3.5 px-4 font-black text-slate-800">
                        {enc.encashable_days} Day(s)
                      </td>

                      {/* Daily Rate */}
                      <td className="py-3.5 px-4 font-semibold text-slate-600">
                        ৳{enc.daily_rate}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 font-black text-emerald-700">
                        ৳{Number(enc.total_amount).toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {enc.status}
                        </span>
                      </td>

                      {/* Reviewed / Paid Info */}
                      <td className="py-3.5 px-4">
                        {enc.status === "paid" ? (
                          <div className="text-[10px] text-slate-600">
                            <p className="font-bold text-emerald-700">Paid on {enc.payment_date || "N/A"}</p>
                            <p className="text-slate-400">Ref: {enc.payment_reference || "Direct"}</p>
                          </div>
                        ) : reviewer ? (
                          <div className="text-[10px] text-slate-500">
                            <p>By: {reviewer.full_name}</p>
                            {enc.review_note && <p className="italic text-slate-400 truncate max-w-[120px]">{enc.review_note}</p>}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Pending review</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {enc.status === "pending" && (
                            <button
                              type="button"
                              onClick={() => onReviewEncashment(enc)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Review</span>
                            </button>
                          )}

                          {enc.status === "approved" && (
                            <button
                              type="button"
                              disabled={processingId === enc.id}
                              onClick={() => handleDisburse(enc)}
                              className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-50"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Disburse</span>
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={processingId === enc.id}
                            onClick={() => handleDelete(enc.id)}
                            title="Delete Record"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
