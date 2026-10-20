"use client";

import React from "react";
import {
  Calendar,
  Lock,
  Edit2,
  Trash2,
  Cog,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";
import { PayrollPeriodOut } from "@/types";

interface BusinessMap {
  [id: number]: string;
}

interface PeriodTableProps {
  periods: PayrollPeriodOut[];
  businessMap: BusinessMap;
  isSuperuser: boolean;
  onEdit: (period: PayrollPeriodOut) => void;
  onDelete: (period: PayrollPeriodOut) => void;
  onGenerateSalary: (period: PayrollPeriodOut) => void;
  // Non-destructive loading
  initialLoading: boolean;
  isFetching: boolean;
  // Pagination
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
}

export function PeriodTable({
  periods,
  businessMap,
  isSuperuser,
  onEdit,
  onDelete,
  onGenerateSalary,
  initialLoading,
  isFetching,
  currentPage,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
}: PeriodTableProps) {
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  const getStatusBadge = (status: string, isLocked: boolean) => {
    const st = (status || "").toLowerCase();
    if (isLocked || st === "locked") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Lock className="w-3 h-3 text-amber-600" />
          Locked
        </span>
      );
    }
    switch (st) {
      case "draft":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3 h-3 text-slate-500" />
            Draft
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Cog className="w-3 h-3 text-blue-600 animate-spin" />
            Processing
          </span>
        );
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Paid
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 capitalize">
            {st}
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden relative">
      {/* Top Progress Bar */}
      {isFetching && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-100 overflow-hidden z-20">
          <div className="w-full h-full bg-gradient-to-r from-indigo-500 via-teal-500 to-indigo-500 animate-pulse" />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="px-5 py-3">Period Name</th>
              <th className="px-5 py-3">Start Date</th>
              <th className="px-5 py-3">End Date</th>
              <th className="px-5 py-3">Disbursement Date</th>
              <th className="px-5 py-3">Status</th>
              {isSuperuser && <th className="px-5 py-3">Business</th>}
              <th className="px-5 py-3 text-right w-44">Actions</th>
            </tr>
          </thead>

          <tbody
            className={`divide-y divide-slate-100 text-xs transition-opacity duration-200 ${
              isFetching ? "opacity-75" : "opacity-100"
            }`}
          >
            {initialLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-5 py-4">
                    <div className="h-3 bg-slate-100 rounded w-32 mb-1.5" />
                    <div className="h-2.5 bg-slate-100 rounded w-20" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-3 bg-slate-100 rounded w-20" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-3 bg-slate-100 rounded w-20" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-3 bg-slate-100 rounded w-20" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-5 bg-slate-100 rounded-full w-20" />
                  </td>
                  {isSuperuser && (
                    <td className="px-5 py-4">
                      <div className="h-3 bg-slate-100 rounded w-24" />
                    </td>
                  )}
                  <td className="px-5 py-4 text-right">
                    <div className="h-6 bg-slate-100 rounded w-28 ml-auto" />
                  </td>
                </tr>
              ))
            ) : periods.length > 0 ? (
              periods.map((p) => {
                const bizName = businessMap[p.business_id] || `Business #${p.business_id}`;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 leading-tight">
                        {p.name}
                      </div>
                      {p.notes && (
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">
                          {p.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-700 whitespace-nowrap">
                      {p.start_date}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-700 whitespace-nowrap">
                      {p.end_date}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-500 whitespace-nowrap">
                      {p.payment_date || "—"}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {getStatusBadge(p.status, p.is_locked)}
                    </td>
                    {isSuperuser && (
                      <td className="px-5 py-3.5 text-slate-600 truncate max-w-[140px]">
                        {bizName}
                      </td>
                    )}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {!p.is_locked && (
                          <button
                            type="button"
                            onClick={() => onGenerateSalary(p)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                            title="Generate Payslips"
                          >
                            <Cog className="w-3 h-3 text-indigo-600" />
                            Salary
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEdit(p)}
                          className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-slate-500 hover:text-indigo-700 transition-colors flex items-center justify-center shadow-2xs"
                          title="Edit Period"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!p.is_locked && (
                          <button
                            type="button"
                            onClick={() => onDelete(p)}
                            className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-700 transition-colors flex items-center justify-center shadow-2xs"
                            title="Delete Period"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={isSuperuser ? 7 : 6}
                  className="px-6 py-12 text-center text-slate-400"
                >
                  <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
                  <p className="text-sm font-semibold text-slate-600">
                    No payroll periods found
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Create a new payroll period cycle to begin processing employee salaries.
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
              {periods.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
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
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
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
