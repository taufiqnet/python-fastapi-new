"use client";

import React, { useState, useMemo } from "react";
import { apiClient } from "@/lib/api-client";
import { LeaveAllocationOut, LeaveTypeOut, EmployeeOut } from "@/types";
import { LeaveStatCards, StatItem } from "./leave-stat-cards";
import {
  Search,
  Filter,
  Plus,
  Layers,
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  PieChart,
  Edit2,
  Trash2,
  Clock,
  Sparkles,
  Award,
} from "lucide-react";

interface LeaveAllocationsTabProps {
  allocations: LeaveAllocationOut[];
  leaveTypes: LeaveTypeOut[];
  employees: EmployeeOut[];
  onRefresh: () => void;
  onOpenNewAllocation: () => void;
  onOpenBulkAllocation: () => void;
  onOpenExport: () => void;
  onEditAllocation: (allocation: LeaveAllocationOut) => void;
}

export function LeaveAllocationsTab({
  allocations,
  leaveTypes,
  employees,
  onRefresh,
  onOpenNewAllocation,
  onOpenBulkAllocation,
  onOpenExport,
  onEditAllocation,
}: LeaveAllocationsTabProps) {
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("all");
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const ltMap = useMemo(() => new Map(leaveTypes.map((t) => [t.id, t])), [leaveTypes]);

  // Unique departments
  const departments = useMemo(() => {
    return Array.from(
      new Set(
        employees
          .filter((e) => e.department_id)
          .map((e) =>
            JSON.stringify({
              id: e.department_id,
              name: e.department_name || e.department?.name || "Department",
            })
          )
      )
    ).map((str) => JSON.parse(str));
  }, [employees]);


  // Filter allocations for selected year & filters
  const filteredAllocations = useMemo(() => {
    return allocations.filter((a) => {
      if (Number(a.year) !== Number(selectedYear)) return false;
      if (selectedLeaveTypeId !== "all" && a.leave_type_id !== selectedLeaveTypeId) return false;

      const emp = empMap.get(a.employee_id);
      if (selectedDeptId !== "all" && emp?.department_id !== selectedDeptId) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = emp?.full_name?.toLowerCase() || "";
        const code = emp?.employee_id?.toLowerCase() || "";
        const ltName = ltMap.get(a.leave_type_id)?.name?.toLowerCase() || "";
        return name.includes(q) || code.includes(q) || ltName.includes(q);
      }

      return true;
    });
  }, [allocations, selectedYear, selectedLeaveTypeId, selectedDeptId, searchQuery, empMap, ltMap]);

  // Statistics for the selected year
  const stats: StatItem[] = useMemo(() => {
    const yearAllocations = allocations.filter((a) => Number(a.year) === Number(selectedYear));
    const totalCount = yearAllocations.length;
    const totalAllocated = yearAllocations.reduce(
      (acc, a) => acc + Number(a.allocated_days) + Number(a.carried_forward || 0),
      0
    );
    const totalUsed = yearAllocations.reduce((acc, a) => acc + Number(a.used_days || 0), 0);
    const totalRemaining = yearAllocations.reduce((acc, a) => acc + Number(a.remaining_days || 0), 0);

    return [
      {
        label: `Total Allocations (${selectedYear})`,
        value: totalCount,
        icon: Award,
        color: "indigo",
        subtext: "Assigned staff balances",
      },
      {
        label: "Total Allocated Days",
        value: totalAllocated.toFixed(1),
        icon: Calendar,
        color: "teal",
        subtext: "Including carry forward",
      },
      {
        label: "Total Used Days",
        value: totalUsed.toFixed(1),
        icon: Clock,
        color: "amber",
        subtext: "Deducted via approved leaves",
      },
      {
        label: "Total Remaining Days",
        value: totalRemaining.toFixed(1),
        icon: CheckCircle2,
        color: "emerald",
        subtext: "Active staff balance quota",
      },
    ];
  }, [allocations, selectedYear]);

  // Delete Allocation
  const handleDeleteAllocation = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this employee leave allocation record?")) return;

    setDeletingId(id);
    try {
      await apiClient.delete(`/leave-allocations/${id}`);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete allocation.");
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
          {/* Year Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Calendar Year:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {[currentYear - 1, currentYear, currentYear + 1].map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedYear === yr
                      ? "bg-white text-indigo-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenExport}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              <span>Export</span>
            </button>

            <button
              onClick={onOpenBulkAllocation}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Bulk Annual Allocation</span>
            </button>

            <button
              onClick={onOpenNewAllocation}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Quota</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff name or ID..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedLeaveTypeId}
              onChange={(e) => setSelectedLeaveTypeId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
            >
              <option value="all">All Leave Policies</option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Allocations Table with Usage Progress */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Leave Policy</th>
                <th className="py-3 px-4">Entitled</th>
                <th className="py-3 px-4">Used</th>
                <th className="py-3 px-4">Remaining</th>
                <th className="py-3 px-4 min-w-[140px]">Usage Meter</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredAllocations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <PieChart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">
                      No leave allocations found for Year {selectedYear}.
                    </p>
                    <p className="text-[11px] mt-0.5">
                      Click &quot;Assign Quota&quot; or &quot;Bulk Annual Allocation&quot; to initialize staff balances.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAllocations.map((alloc) => {
                  const emp = empMap.get(alloc.employee_id);
                  const lt = ltMap.get(alloc.leave_type_id);
                  const totalEntitled =
                    Number(alloc.allocated_days) + Number(alloc.carried_forward || 0);
                  const used = Number(alloc.used_days || 0);
                  const remaining = Number(alloc.remaining_days || 0);
                  const percentage = totalEntitled > 0 ? Math.min(100, (used / totalEntitled) * 100) : 0;

                  return (
                    <tr key={alloc.id} className="hover:bg-slate-50/50 transition-colors">
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
                              {emp?.employee_id || "No ID"} • {emp?.department_name || emp?.department?.name || "General"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Policy */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {lt?.code || "LT"}
                          </span>
                          <span className="font-semibold text-slate-800">{lt?.name || "Policy"}</span>
                        </div>
                      </td>

                      {/* Total Entitled */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-bold text-slate-900">{totalEntitled}d</span>
                          {Number(alloc.carried_forward) > 0 && (
                            <span className="text-[10px] text-teal-600 block">
                              (+{alloc.carried_forward}d carried)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Used */}
                      <td className="py-3.5 px-4 font-bold text-slate-700">{used}d</td>

                      {/* Remaining */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            remaining > 0
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : remaining === 0
                              ? "bg-slate-100 text-slate-600 border-slate-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {remaining} Days
                        </span>
                      </td>

                      {/* Usage Meter */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                percentage >= 80
                                  ? "bg-rose-500"
                                  : percentage >= 50
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {percentage.toFixed(0)}% consumed
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onEditAllocation(alloc)}
                            title="Edit Allocation"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === alloc.id}
                            onClick={() => handleDeleteAllocation(alloc.id)}
                            title="Delete Allocation"
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
