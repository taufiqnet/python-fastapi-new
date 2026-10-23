"use client";

import React, { useState, useTransition } from "react";
import { DepartmentRosterStatus, DutyAssignment, Shift } from "@/types";
import { Plus, Search, Calendar, UserCheck, Filter, Loader2 } from "lucide-react";

interface DutyAssignTabProps {
  assignments: DutyAssignment[];
  departments: DepartmentRosterStatus[];
  shifts: Shift[];
  isFetching: boolean;
  selectedDepartmentId: string;
  startDate: string;
  endDate: string;
  searchQuery: string;
  onFilterChange: (deptId: string, start: string, end: string, search: string) => void;
  onOpenAssignModal: () => void;
}

export const DutyAssignTab: React.FC<DutyAssignTabProps> = ({
  assignments,
  departments,
  shifts,
  isFetching,
  selectedDepartmentId,
  startDate,
  endDate,
  searchQuery,
  onFilterChange,
  onOpenAssignModal,
}) => {
  const [pending, startTransition] = useTransition();

  const handleDeptSelect = (deptId: string) => {
    startTransition(() => {
      onFilterChange(deptId, startDate, endDate, searchQuery);
    });
  };

  const handleDateChange = (start: string, end: string) => {
    startTransition(() => {
      onFilterChange(selectedDepartmentId, start, end, searchQuery);
    });
  };

  const handleSearchChange = (q: string) => {
    startTransition(() => {
      onFilterChange(selectedDepartmentId, startDate, endDate, q);
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Action Rim */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Department Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Department
            </label>
            <select
              value={selectedDepartmentId}
              onChange={(e) => handleDeptSelect(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.is_roster_enabled ? "(Roster)" : "(General)"}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleDateChange(e.target.value, endDate)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleDateChange(startDate, e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Search Staff
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Name or ID..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 w-44"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 pt-2 sm:pt-0">
          <button
            onClick={onOpenAssignModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Direct Duty Assign
          </button>
        </div>
      </div>

      {/* Table Container with In-Place Non-Destructive Filtering */}
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
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Assigned Shift</th>
                <th className="py-3 px-4">Shift Timings</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No duty assignments found matching the criteria.
                  </td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                      {a.date}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{a.employee_name || "Employee"}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {a.employee_code || "EMP"}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{a.department_name || "-"}</td>
                    <td className="py-3 px-4">
                      {a.shift ? (
                        <span
                          style={{
                            backgroundColor: `${a.shift.color_code}15`,
                            color: a.shift.color_code,
                            borderColor: `${a.shift.color_code}40`,
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border"
                        >
                          {a.shift.code} • {a.shift.name}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {a.shift?.start_time && a.shift?.end_time
                        ? `${a.shift.start_time.substring(0, 5)} - ${a.shift.end_time.substring(0, 5)} (${a.shift.work_hours}h)`
                        : a.shift?.is_off_day
                        ? "Rest Day (OFF)"
                        : "-"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize text-[11px] font-medium text-slate-600">
                        {a.source.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          a.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : a.status === "draft"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-[200px] truncate">
                      {a.notes || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Count Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            {isFetching && <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin shrink-0" />}
            <span>Showing {assignments.length} duty assignment records</span>
          </div>
        </div>
      </div>
    </div>
  );
};
