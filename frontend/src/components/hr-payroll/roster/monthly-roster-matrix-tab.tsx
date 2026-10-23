"use client";

import React, { useState, useTransition } from "react";
import {
  DepartmentRosterStatus,
  MonthlyRosterMatrix,
  Shift,
} from "@/types";
import {
  Calendar,
  Save,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Info,
  Loader2,
} from "lucide-react";

interface MonthlyRosterMatrixTabProps {
  matrix: MonthlyRosterMatrix | null;
  departments: DepartmentRosterStatus[];
  shifts: Shift[];
  selectedDepartmentId: string;
  selectedYear: number;
  selectedMonth: number;
  isFetching: boolean;
  onDepartmentChange: (deptId: string) => void;
  onYearMonthChange: (year: number, month: number) => void;
  onSaveCells: (cells: Array<{ employee_id: string; date: string; shift_id: string }>) => Promise<void>;
  onSubmitRoster: (rosterId: string) => Promise<void>;
  onOpenReviewModal: (rosterId: string) => void;
}

export const MonthlyRosterMatrixTab: React.FC<MonthlyRosterMatrixTabProps> = ({
  matrix,
  departments,
  shifts,
  selectedDepartmentId,
  selectedYear,
  selectedMonth,
  isFetching,
  onDepartmentChange,
  onYearMonthChange,
  onSaveCells,
  onSubmitRoster,
  onOpenReviewModal,
}) => {
  const [pending, startTransition] = useTransition();
  const [modifiedCells, setModifiedCells] = useState<Record<string, { employee_id: string; date: string; shift_id: string }>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Quick cell picker popover state
  const [activeCell, setActiveCell] = useState<{ empId: string; dateStr: string } | null>(null);

  const daysInMonth = matrix?.days_in_month || 30;
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleDeptSelect = (deptId: string) => {
    startTransition(() => {
      onDepartmentChange(deptId);
    });
  };

  const handleMonthSelect = (month: number) => {
    startTransition(() => {
      onYearMonthChange(selectedYear, month);
    });
  };

  const handleYearSelect = (year: number) => {
    startTransition(() => {
      onYearMonthChange(year, selectedMonth);
    });
  };

  const handleAssignShiftToCell = (empId: string, dateStr: string, shiftId: string) => {
    setModifiedCells((prev) => ({
      ...prev,
      [`${empId}_${dateStr}`]: { employee_id: empId, date: dateStr, shift_id: shiftId },
    }));
    setActiveCell(null);
  };

  const handleSaveChanges = async () => {
    const cellsToSave = Object.values(modifiedCells);
    if (cellsToSave.length === 0) return;

    setSaving(true);
    try {
      await onSaveCells(cellsToSave);
      setModifiedCells({});
    } finally {
      setSaving(false);
    }
  };

  const currentRoster = matrix?.monthly_roster;
  const isApproved = currentRoster?.status === "approved";

  // Check whether department is general
  const currentDept = departments.find((d) => d.id === selectedDepartmentId);
  const isGeneralDept = currentDept ? !currentDept.is_roster_enabled : false;

  return (
    <div className="space-y-4">
      {/* Filter / Controls Rim */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Department Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Department
            </label>
            <select
              value={selectedDepartmentId}
              onChange={(e) => handleDeptSelect(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.is_roster_enabled ? "(Roster)" : "(General / Standard)"}
                </option>
              ))}
            </select>
          </div>

          {/* Month Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthSelect(parseInt(e.target.value))}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
            >
              {[
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
              ].map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Year Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => handleYearSelect(parseInt(e.target.value))}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Roster Status Pill */}
          {currentRoster && (
            <div className="pt-4">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  currentRoster.status === "approved"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : currentRoster.status === "submitted"
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : currentRoster.status === "rejected"
                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {currentRoster.status}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 sm:pt-0">
          {Object.keys(modifiedCells).length > 0 && (
            <button
              onClick={handleSaveChanges}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : `Save Changes (${Object.keys(modifiedCells).length})`}
            </button>
          )}

          {currentRoster && currentRoster.status === "draft" && (
            <button
              onClick={async () => {
                setSubmitting(true);
                try {
                  await onSubmitRoster(currentRoster.id);
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={submitting}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-4 h-4" />
              {submitting ? "Submitting..." : "Submit Roster"}
            </button>
          )}

          {currentRoster && currentRoster.status === "submitted" && (
            <button
              onClick={() => onOpenReviewModal(currentRoster.id)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Review & Approve
            </button>
          )}
        </div>
      </div>

      {/* General Department Notice */}
      {isGeneralDept && (
        <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex items-start gap-3">
          <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <div className="text-xs text-sky-900 space-y-1">
            <div className="font-bold">General Department (Standard Fixed Hours)</div>
            <p className="text-sky-800">
              This department operates on standard fixed business hours (09:00 - 18:00 / 8h daily). Duty roster setup is not required. Attendance logs automatically calculate work hours and overtime without roster dependencies. To enable multi-shift scheduling for this department, toggle Roster in the Shift Setup tab.
            </p>
          </div>
        </div>
      )}

      {/* Statutory BLA 2006 Rest-Day Violations Alert */}
      {matrix?.rest_day_violations && matrix.rest_day_violations.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-2">
              <span>Statutory Compliance Warning: Bangladesh Labour Act (BLA 2006 Sec 103)</span>
              <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md font-mono text-[10px]">
                {matrix.rest_day_violations.length} Violation(s)
              </span>
            </div>
            <p className="text-amber-800">
              Adult workers are statutory entitled to at least 1 mandatory 24-hour rest day (`OFF`) every 7 consecutive days. The following employees have consecutive working days without a scheduled rest day:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {matrix.rest_day_violations.map((v, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 border border-amber-300 rounded-lg text-amber-900 font-medium"
                >
                  <strong>{v.employee_name}</strong>: {v.consecutive_work_days} consecutive days ({v.start_date} to {v.end_date})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Roster Matrix Container with In-Place Non-Destructive Filtering */}
      <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Top Rim Indeterminate Progress Bar during background re-fetching */}
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
            {/* Header Row */}
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 min-w-[200px] sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                  Staff Member
                </th>
                {daysArray.map((day) => {
                  const dayDate = new Date(selectedYear, selectedMonth - 1, day);
                  const isWeekend = dayDate.getDay() === 5 || dayDate.getDay() === 6; // Fri or Sat in BD
                  const dayOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][dayDate.getDay()];
                  return (
                    <th
                      key={day}
                      className={`py-2 px-1 text-center min-w-[38px] border-r border-slate-100 ${
                        isWeekend ? "bg-slate-100/70 text-slate-700 font-black" : ""
                      }`}
                    >
                      <div>{day}</div>
                      <div className="text-[9px] font-normal text-slate-400">{dayOfWeek}</div>
                    </th>
                  );
                })}
                <th className="py-3 px-3 text-center min-w-[65px] bg-slate-50 border-l border-slate-200">
                  Shifts
                </th>
                <th className="py-3 px-3 text-center min-w-[65px] bg-slate-50">Off</th>
                <th className="py-3 px-3 text-center min-w-[70px] bg-slate-50">Hours</th>
              </tr>
            </thead>

            {/* Matrix Rows */}
            <tbody className="divide-y divide-slate-100">
              {!matrix?.rows || matrix.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={daysInMonth + 4}
                    className="py-12 text-center text-slate-400 text-xs"
                  >
                    No staff members enrolled in this department.
                  </td>
                </tr>
              ) : (
                matrix.rows.map((row) => (
                  <tr key={row.employee_id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Sticky Employee Label */}
                    <td className="py-2.5 px-4 sticky left-0 bg-white z-10 border-r border-slate-200 font-medium">
                      <div className="font-bold text-slate-800 text-xs truncate max-w-[180px]">
                        {row.employee_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {row.employee_code || "EMP"} {row.job_title && `• ${row.job_title}`}
                      </div>
                    </td>

                    {/* Day Cells */}
                    {daysArray.map((day) => {
                      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(
                        day
                      ).padStart(2, "0")}`;
                      const duty = row.duties[dateStr];
                      const modified = modifiedCells[`${row.employee_id}_${dateStr}`];
                      const activeShiftId = modified ? modified.shift_id : duty?.shift_id;
                      const activeShift = shifts.find((s) => s.id === activeShiftId);

                      return (
                        <td
                          key={day}
                          onClick={() => {
                            if (!isApproved) {
                              setActiveCell({ empId: row.employee_id, dateStr });
                            }
                          }}
                          className={`py-1 px-0.5 text-center border-r border-slate-100 relative group cursor-pointer ${
                            modified ? "bg-amber-50/50" : ""
                          }`}
                        >
                          {activeShift ? (
                            <span
                              style={{
                                backgroundColor: `${activeShift.color_code}15`,
                                color: activeShift.color_code,
                                borderColor: `${activeShift.color_code}40`,
                              }}
                              className="inline-block w-8 py-1 rounded-md text-[10px] font-black border uppercase tracking-wider"
                              title={`${activeShift.name} (${activeShift.start_time || "OFF"} - ${
                                activeShift.end_time || "OFF"
                              })`}
                            >
                              {activeShift.code}
                            </span>
                          ) : (
                            <span className="inline-block w-8 py-1 rounded-md text-[10px] text-slate-300 border border-dashed border-slate-200 group-hover:border-indigo-400 group-hover:text-indigo-600 transition-colors">
                              -
                            </span>
                          )}

                          {/* Quick Popover Picker on Click */}
                          {activeCell?.empId === row.employee_id && activeCell.dateStr === dateStr && (
                            <div className="absolute top-full left-0 z-30 bg-white rounded-xl shadow-xl border border-slate-200 p-2 min-w-[150px] space-y-1 text-left animate-in fade-in duration-100">
                              <div className="text-[10px] font-bold text-slate-500 uppercase px-1">
                                Assign Shift ({day}/{selectedMonth})
                              </div>
                              <div className="max-h-40 overflow-y-auto divide-y divide-slate-100">
                                {shifts.map((s) => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAssignShiftToCell(row.employee_id, dateStr, s.id);
                                    }}
                                    className="w-full text-left px-2 py-1.5 text-xs hover:bg-slate-50 rounded-lg flex items-center justify-between transition-colors"
                                  >
                                    <span className="font-semibold text-slate-700">{s.code}</span>
                                    <span
                                      style={{ backgroundColor: s.color_code }}
                                      className="w-2.5 h-2.5 rounded-full"
                                    />
                                  </button>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveCell(null);
                                }}
                                className="w-full text-center text-[11px] text-slate-400 hover:text-slate-600 pt-1"
                              >
                                Close
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Row Summary */}
                    <td className="py-2 px-3 text-center font-bold text-slate-700 bg-slate-50/50 border-l border-slate-200">
                      {row.total_shifts}
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-amber-700 bg-slate-50/50">
                      {row.total_off_days}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-indigo-700 bg-slate-50/50">
                      {row.total_work_hours}h
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Daily Operational Coverage Footer */}
            {matrix?.rows && matrix.rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/80 border-t-2 border-slate-200 text-[10px] font-bold text-slate-600">
                  <td className="py-2 px-4 sticky left-0 bg-slate-100 z-10 border-r border-slate-200 uppercase tracking-wider">
                    Staff Coverage
                  </td>
                  {daysArray.map((day) => {
                    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(
                      day
                    ).padStart(2, "0")}`;
                    const counts = matrix.daily_shift_counts[dateStr] || {};
                    const totalActive = Object.entries(counts)
                      .filter(([code]) => code !== "OFF")
                      .reduce((sum, [, c]) => sum + c, 0);

                    return (
                      <td
                        key={day}
                        className="py-1.5 px-0.5 text-center border-r border-slate-200 font-mono text-[10px]"
                        title={Object.entries(counts)
                          .map(([code, c]) => `${code}: ${c}`)
                          .join(", ")}
                      >
                        <span className="font-bold text-slate-800">{totalActive}</span>
                      </td>
                    );
                  })}
                  <td colSpan={3} className="bg-slate-100 border-l border-slate-200" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
