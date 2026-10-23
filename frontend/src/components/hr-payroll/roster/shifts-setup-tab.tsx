"use client";

import React, { useState } from "react";
import { DepartmentRosterStatus, Shift } from "@/types";
import { Plus, Edit2, Trash2, Clock, CheckCircle2, ShieldCheck, Building2, ToggleLeft, ToggleRight, Sparkles } from "lucide-react";

interface ShiftsSetupTabProps {
  shifts: Shift[];
  departments: DepartmentRosterStatus[];
  isFetching: boolean;
  onOpenCreateShiftModal: () => void;
  onOpenEditShiftModal: (shift: Shift) => void;
  onDeleteShift: (shiftId: string) => Promise<void>;
  onToggleDepartmentRoster: (deptId: string, enabled: boolean) => Promise<void>;
}

export const ShiftsSetupTab: React.FC<ShiftsSetupTabProps> = ({
  shifts,
  departments,
  isFetching,
  onOpenCreateShiftModal,
  onOpenEditShiftModal,
  onDeleteShift,
  onToggleDepartmentRoster,
}) => {
  const [togglingDeptId, setTogglingDeptId] = useState<string | null>(null);

  const handleToggle = async (deptId: string, currentStatus: boolean) => {
    setTogglingDeptId(deptId);
    try {
      await onToggleDepartmentRoster(deptId, !currentStatus);
    } finally {
      setTogglingDeptId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: Department Roster Policy Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Department Roster Enrollment & Policy
              </h3>
              <p className="text-xs text-slate-500">
                Departments marked &ldquo;General&rdquo; run on standard office hours without duty rosters or extra overhead.
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    dept.is_roster_enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                  }`}
                />
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span>{dept.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {dept.code || "DEPT"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      • {dept.employee_count} employees
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {dept.is_roster_enabled ? (
                      <span className="text-emerald-700 font-medium">
                        Roster Enabled: Staff participate in multi-shift scheduling & monthly matrix planning.
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        General Department: Fixed standard hours (09:00 - 18:00). Zero roster dependency.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggle(dept.id, dept.is_roster_enabled)}
                disabled={togglingDeptId === dept.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  dept.is_roster_enabled
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {dept.is_roster_enabled ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Roster Enabled</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>Set to General</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: Shift Definitions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Shift Definitions & Timings</h3>
              <p className="text-xs text-slate-500">
                Configured working shifts, start/end windows, grace tolerances, and statutory rest days
              </p>
            </div>
          </div>
          <button
            onClick={onOpenCreateShiftModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Shift
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Code & Name</th>
                <th className="py-3 px-4">Timing Window</th>
                <th className="py-3 px-4">Daily Work Hours</th>
                <th className="py-3 px-4">Grace In / Out</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shifts.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          backgroundColor: `${s.color_code}15`,
                          color: s.color_code,
                          borderColor: `${s.color_code}40`,
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-black border uppercase"
                      >
                        {s.code}
                      </span>
                      <span className="font-bold text-slate-800">{s.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                    {s.is_off_day ? (
                      <span className="text-slate-400 italic font-sans">No working hours</span>
                    ) : (
                      `${s.start_time?.substring(0, 5) || "08:00"} - ${
                        s.end_time?.substring(0, 5) || "16:30"
                      }`
                    )}
                  </td>
                  <td className="py-3 px-4 font-bold text-indigo-700 font-mono">
                    {s.is_off_day ? "0.0h" : `${s.work_hours}h`}
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                    {s.is_off_day ? "-" : `+${s.grace_in_minutes}m in / +${s.grace_out_minutes}m out`}
                  </td>
                  <td className="py-3 px-4">
                    {s.is_off_day ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Rest Day (OFF)
                      </span>
                    ) : s.is_night_shift ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        Night Shift
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        Regular Shift
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        s.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {s.is_active ? "Active" : "Archived"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onOpenEditShiftModal(s)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Shift"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteShift(s.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Shift"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
