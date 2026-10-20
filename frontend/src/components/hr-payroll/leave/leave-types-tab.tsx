"use client";

import React, { useState, useMemo } from "react";
import { apiClient } from "@/lib/api-client";
import { LeaveTypeOut } from "@/types";
import { LeaveStatCards, StatItem } from "./leave-stat-cards";
import {
  Search,
  Plus,
  FileSpreadsheet,
  Upload,
  BookOpen,
  CheckCircle2,
  XCircle,
  FileText,
  Edit2,
  Trash2,
  DollarSign,
  ShieldAlert,
} from "lucide-react";

interface LeaveTypesTabProps {
  leaveTypes: LeaveTypeOut[];
  onRefresh: () => void;
  onOpenCreateType: () => void;
  onEditType: (type: LeaveTypeOut) => void;
  onOpenExport: () => void;
}

export function LeaveTypesTab({
  leaveTypes,
  onRefresh,
  onOpenCreateType,
  onEditType,
  onOpenExport,
}: LeaveTypesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Stats
  const stats: StatItem[] = useMemo(() => {
    const total = leaveTypes.length;
    const active = leaveTypes.filter((t) => t.is_active).length;
    const paid = leaveTypes.filter((t) => t.is_paid).length;
    const reqDoc = leaveTypes.filter((t) => t.requires_document).length;

    return [
      {
        label: "Total Policies",
        value: total,
        icon: BookOpen,
        color: "indigo",
        subtext: "Defined company leave types",
      },
      {
        label: "Active Policies",
        value: active,
        icon: CheckCircle2,
        color: "emerald",
        subtext: "Available for staff requests",
      },
      {
        label: "Paid Leaves",
        value: paid,
        icon: DollarSign,
        color: "teal",
        subtext: "Full wage entitlement",
      },
      {
        label: "Doc Required",
        value: reqDoc,
        icon: ShieldAlert,
        color: "amber",
        subtext: "Mandatory medical/proof certificate",
      },
    ];
  }, [leaveTypes]);

  // Filtered
  const filteredTypes = useMemo(() => {
    return leaveTypes.filter((t) => {
      if (statusFilter === "active" && !t.is_active) return false;
      if (statusFilter === "inactive" && t.is_active) return false;
      if (statusFilter === "paid" && !t.is_paid) return false;
      if (statusFilter === "unpaid" && t.is_paid) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [leaveTypes, statusFilter, searchQuery]);

  const handleDeleteType = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this leave policy? Applications or allocations bound to this policy might restrict deletion."
      )
    )
      return;

    setDeletingId(id);
    try {
      await apiClient.delete(`/leave-types/${id}`);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete leave policy.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full space-y-5">
      {/* Stats */}
      <LeaveStatCards stats={stats} />

      {/* Control Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: "all", label: "All Policies" },
              { id: "active", label: "Active" },
              { id: "inactive", label: "Inactive" },
              { id: "paid", label: "Paid" },
              { id: "unpaid", label: "Unpaid" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setStatusFilter(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === p.id
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenExport}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              <span>Export</span>
            </button>

            <button
              onClick={onOpenCreateType}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New Policy</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search policy name, short code, or rules..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Policy & Code</th>
                <th className="py-3 px-4">Max Quota / Year</th>
                <th className="py-3 px-4">Compensation</th>
                <th className="py-3 px-4">Carry Forward</th>
                <th className="py-3 px-4">Applicable Staff</th>
                <th className="py-3 px-4">Doc Required</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTypes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No leave policies found.</p>
                    <p className="text-[11px] mt-0.5">Click &quot;New Policy&quot; to configure leave types.</p>
                  </td>
                </tr>
              ) : (
                filteredTypes.map((lt) => (
                  <tr key={lt.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Policy & Code */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center font-mono font-bold text-indigo-700 text-xs shrink-0">
                          {lt.code}
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 block">{lt.name}</span>
                          {lt.description && (
                            <span className="text-[11px] text-slate-400 line-clamp-1 max-w-xs" title={lt.description}>
                              {lt.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Max Days */}
                    <td className="py-3.5 px-4">
                      {lt.max_days_per_year === 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Unlimited
                        </span>
                      ) : (
                        <span className="font-bold text-slate-800">{lt.max_days_per_year} Days</span>
                      )}
                    </td>

                    {/* Compensation */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          lt.is_paid
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {lt.is_paid ? "Full Wages (Paid)" : "Unpaid"}
                      </span>
                    </td>

                    {/* Carry Forward */}
                    <td className="py-3.5 px-4">
                      <span className="text-slate-600 font-semibold">
                        {lt.carry_forward ? "Yes (Allowed)" : "No (Lapses)"}
                      </span>
                    </td>

                    {/* Applicable Gender */}
                    <td className="py-3.5 px-4">
                      <span className="capitalize text-slate-700 font-medium">
                        {lt.applicable_gender === "all" ? "All Genders" : `${lt.applicable_gender} Only`}
                      </span>
                    </td>

                    {/* Doc Required */}
                    <td className="py-3.5 px-4">
                      {lt.requires_document ? (
                        <span className="text-amber-700 font-bold text-[11px]">Mandatory</span>
                      ) : (
                        <span className="text-slate-400">Optional</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          lt.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {lt.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onEditType(lt)}
                          title="Edit Policy"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === lt.id}
                          onClick={() => handleDeleteType(lt.id)}
                          title="Delete Policy"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
