"use client";

import React from "react";
import {
  Eye,
  Edit2,
  Trash2,
  Clock,
  Calendar,
  Layers,
  Building,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Timer,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { AttendanceRecord } from "@/types";

interface EmployeeMap {
  [id: string]: {
    id: string;
    employee_id: string;
    full_name: string;
  };
}

interface BusinessMap {
  [id: number]: string;
}

interface AttendanceTableProps {
  records: AttendanceRecord[];
  employeeMap: EmployeeMap;
  businessMap: BusinessMap;
  isSuperuser: boolean;
  selectedIds: string[];
  onToggleSelectAll: () => void;
  onToggleSelectRow: (id: string) => void;
  onViewDetail: (record: AttendanceRecord) => void;
  onEdit: (record: AttendanceRecord) => void;
  onDelete: (record: AttendanceRecord) => void;
  // In-place non-destructive loading invariants
  initialLoading: boolean;
  isFetching: boolean;
  // Pagination
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
}

export function AttendanceTable({
  records,
  employeeMap,
  businessMap,
  isSuperuser,
  selectedIds,
  onToggleSelectAll,
  onToggleSelectRow,
  onViewDetail,
  onEdit,
  onDelete,
  initialLoading,
  isFetching,
  currentPage,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
}: AttendanceTableProps) {
  const allSelected =
    records.length > 0 && records.every((r) => selectedIds.includes(r.id));
  const someSelected =
    records.some((r) => selectedIds.includes(r.id)) && !allSelected;

  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  const getStatusBadge = (status: string) => {
    const st = (status || "").toLowerCase();
    switch (st) {
      case "present":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Present
          </span>
        );
      case "absent":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Absent
          </span>
        );
      case "late":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            Late
          </span>
        );
      case "half_day":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <Timer className="w-3 h-3 text-orange-600" />
            Half Day
          </span>
        );
      case "on_leave":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CalendarOff className="w-3 h-3 text-blue-600" />
            On Leave
          </span>
        );
      case "holiday":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Holiday
          </span>
        );
      case "weekend":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Weekend
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 capitalize">
            {st.replace("_", " ")}
          </span>
        );
    }
  };

  const getSourceBadge = (source: string) => {
    const s = (source || "manual").toLowerCase();
    const colors: Record<string, string> = {
      web: "bg-indigo-50 text-indigo-700 border-indigo-200",
      biometric: "bg-teal-50 text-teal-700 border-teal-200",
      mobile: "bg-sky-50 text-sky-700 border-sky-200",
      excel: "bg-emerald-50 text-emerald-700 border-emerald-200",
      manual: "bg-slate-100 text-slate-600 border-slate-200",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${
          colors[s] || colors.manual
        }`}
      >
        {s}
      </span>
    );
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden relative">
      {/* Top-Rim Indeterminate Progress Bar for In-Place Filtering */}
      {isFetching && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-100 overflow-hidden z-20">
          <div className="w-full h-full bg-gradient-to-r from-indigo-500 via-teal-500 to-indigo-500 animate-pulse" />
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {isSuperuser && (
                <th className="px-4 py-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={onToggleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
              )}
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Check In / Out</th>
              <th className="px-4 py-3">Work / OT Hours</th>
              <th className="px-4 py-3">Source</th>
              {isSuperuser && <th className="px-4 py-3">Business</th>}
              <th className="px-4 py-3 text-right w-28">Actions</th>
            </tr>
          </thead>

          <tbody
            className={`divide-y divide-slate-100 text-xs transition-opacity duration-200 ${
              isFetching ? "opacity-75" : "opacity-100"
            }`}
          >
            {initialLoading ? (
              // Initial skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {isSuperuser && (
                    <td className="px-4 py-4 text-center">
                      <div className="w-4 h-4 bg-slate-100 rounded mx-auto" />
                    </td>
                  )}
                  <td className="px-4 py-4">
                    <div className="h-3 bg-slate-100 rounded w-28 mb-1.5" />
                    <div className="h-2.5 bg-slate-100 rounded w-16" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-3 bg-slate-100 rounded w-20" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-5 bg-slate-100 rounded-full w-20" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-3 bg-slate-100 rounded w-32" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-3 bg-slate-100 rounded w-24" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-4 bg-slate-100 rounded w-14" />
                  </td>
                  {isSuperuser && (
                    <td className="px-4 py-4">
                      <div className="h-3 bg-slate-100 rounded w-24" />
                    </td>
                  )}
                  <td className="px-4 py-4 text-right">
                    <div className="h-6 bg-slate-100 rounded w-16 ml-auto" />
                  </td>
                </tr>
              ))
            ) : records.length > 0 ? (
              records.map((r) => {
                const emp = employeeMap[r.employee_id];
                const empName = emp ? emp.full_name : r.employee_name || "Unknown";
                const empCode = emp ? emp.employee_id : r.employee_code || "—";
                const bizName = businessMap[r.business_id] || `Business #${r.business_id}`;
                const isRowSelected = selectedIds.includes(r.id);

                return (
                  <tr
                    key={r.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isRowSelected ? "bg-indigo-50/30" : ""
                    }`}
                  >
                    {isSuperuser && (
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isRowSelected}
                          onChange={() => onToggleSelectRow(r.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 leading-tight">
                        {empName}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                        {empCode}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-700 whitespace-nowrap">
                      {r.date}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {getStatusBadge(r.status)}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-600 whitespace-nowrap">
                      {r.check_in || "—"} / {r.check_out || "—"}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-bold text-slate-900">
                        {Number(r.work_hours || 0).toFixed(1)}
                      </span>{" "}
                      <span className="text-slate-500 text-[11px]">hrs</span>
                      {Number(r.overtime_hours || 0) > 0 && (
                        <span className="ml-1.5 text-amber-700 font-bold text-[11px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          +{Number(r.overtime_hours).toFixed(1)} OT
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {getSourceBadge(r.source)}
                    </td>
                    {isSuperuser && (
                      <td className="px-4 py-3.5 text-slate-600 truncate max-w-[140px]">
                        {bizName}
                      </td>
                    )}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onViewDetail(r)}
                          className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-200 text-slate-500 hover:text-emerald-700 transition-colors flex items-center justify-center shadow-2xs"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit(r)}
                          className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-slate-500 hover:text-indigo-700 transition-colors flex items-center justify-center shadow-2xs"
                          title="Edit Record"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(r)}
                          className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-700 transition-colors flex items-center justify-center shadow-2xs"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={isSuperuser ? 9 : 8}
                  className="px-6 py-12 text-center text-slate-400"
                >
                  <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
                  <p className="text-sm font-semibold text-slate-600">
                    No attendance records found
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Try adjusting your filters, date range, or log a new attendance record.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50/50">
        <div className="flex items-center gap-3 text-slate-500">
          <span>
            Showing{" "}
            <strong className="text-slate-800">
              {records.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </strong>{" "}
            to{" "}
            <strong className="text-slate-800">
              {Math.min(currentPage * pageSize, totalRecords)}
            </strong>{" "}
            of <strong className="text-slate-800">{totalRecords}</strong> entries
          </span>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-[11px] text-slate-400">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white outline-none"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage <= 1 || isFetching}
            onClick={() => onPageChange(currentPage - 1)}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 font-semibold text-slate-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages || isFetching}
            onClick={() => onPageChange(currentPage + 1)}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-2xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
