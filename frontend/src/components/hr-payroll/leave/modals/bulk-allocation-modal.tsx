"use client";

import React, { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { LeaveTypeOut, EmployeeOut, LeaveAllocationOut } from "@/types";
import { X, Layers, AlertCircle, CheckCircle2, Users, Loader2 } from "lucide-react";

interface BulkAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leaveTypes: LeaveTypeOut[];
  employees: EmployeeOut[];
  existingAllocations: LeaveAllocationOut[];
  businessId?: number | null;
}

export function BulkAllocationModal({
  isOpen,
  onClose,
  onSuccess,
  leaveTypes,
  employees,
  existingAllocations,
  businessId,
}: BulkAllocationModalProps) {
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState<number>(currentYear);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<string>(
    leaveTypes[0]?.id || ""
  );
  const [targetGroup, setTargetGroup] = useState<"all" | string>("all");
  const [customDays, setCustomDays] = useState<number>(
    leaveTypes[0]?.max_days_per_year || 10
  );

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [resultSummary, setResultSummary] = useState<{ created: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLeaveTypeChange = (typeId: string) => {
    setSelectedLeaveTypeId(typeId);
    const lt = leaveTypes.find((t) => t.id === typeId);
    if (lt && lt.max_days_per_year > 0) {
      setCustomDays(lt.max_days_per_year);
    }
  };

  // Determine eligible employees
  const targetEmployees = employees.filter((emp) => {
    if (!emp.is_active) return false;
    if (targetGroup === "all") return true;
    return emp.department_id === targetGroup;
  });

  const selectedLeaveType = leaveTypes.find((t) => t.id === selectedLeaveTypeId);

  const handleExecuteBulk = async () => {
    if (!selectedLeaveTypeId) {
      setError("Please select a leave policy.");
      return;
    }

    setLoading(true);
    setError(null);
    setResultSummary(null);

    let createdCount = 0;
    let skippedCount = 0;
    const total = targetEmployees.length;

    setProgress({ current: 0, total });

    for (let i = 0; i < total; i++) {
      const emp = targetEmployees[i];

      // Check gender applicability
      if (
        selectedLeaveType &&
        selectedLeaveType.applicable_gender !== "all" &&
        emp.gender &&
        emp.gender.toLowerCase() !== selectedLeaveType.applicable_gender.toLowerCase()
      ) {
        skippedCount++;
        setProgress({ current: i + 1, total });
        continue;
      }

      // Check if allocation already exists
      const alreadyHas = existingAllocations.some(
        (a) =>
          a.employee_id === emp.id &&
          a.leave_type_id === selectedLeaveTypeId &&
          Number(a.year) === Number(year)
      );

      if (alreadyHas) {
        skippedCount++;
        setProgress({ current: i + 1, total });
        continue;
      }

      try {
        await apiClient.post("/leave-allocations", {
          employee_id: emp.id,
          leave_type_id: selectedLeaveTypeId,
          year: Number(year),
          allocated_days: Number(customDays),
          carried_forward: 0,
          used_days: 0,
          business_id: businessId || 1,
        });
        createdCount++;
      } catch {
        skippedCount++;
      }

      setProgress({ current: i + 1, total });
    }

    setLoading(false);
    setResultSummary({ created: createdCount, skipped: skippedCount });
    onSuccess();
  };

  // Unique departments for filter
  const departments = Array.from(
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


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Bulk Annual Leave Allocation</h2>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Mass-assign standard leave quotas across all active staff.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {resultSummary ? (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-900">Bulk Allocation Completed!</h3>
                <p className="text-xs text-emerald-700 mt-1">
                  Successfully created <strong>{resultSummary.created}</strong> new employee leave allocations for Year {year}.
                </p>
                {resultSummary.skipped > 0 && (
                  <p className="text-[11px] text-emerald-600/80 mt-0.5">
                    ({resultSummary.skipped} employees skipped because they already had quotas or gender restrictions).
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
              >
                Close & Return
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Target Year
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    disabled={loading}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                  >
                    {[currentYear, currentYear + 1].map((yr) => (
                      <option key={yr} value={yr}>
                        Year {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Target Group
                  </label>
                  <select
                    value={targetGroup}
                    onChange={(e) => setTargetGroup(e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                  >
                    <option value="all">All Active Staff ({employees.filter((e) => e.is_active).length})</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        Dept: {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Leave Policy to Grant
                </label>
                <select
                  value={selectedLeaveTypeId}
                  onChange={(e) => handleLeaveTypeChange(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                >
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code}) - {t.max_days_per_year} Days
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Days Quota to Allocate
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="365"
                  value={customDays}
                  onChange={(e) => setCustomDays(Number(e.target.value))}
                  disabled={loading}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              {/* Scope Info Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Eligible Employees in Scope:</span>
                </div>
                <span className="font-bold text-slate-800">{targetEmployees.length} active staff</span>
              </div>

              {/* Progress indicator during execution */}
              {loading && progress && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Allocating quotas...</span>
                    <span>
                      {progress.current} / {progress.total}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-150"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBulk}
                  disabled={loading || targetEmployees.length === 0}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-3.5 h-3.5" />
                      <span>Execute Bulk Allocation</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
