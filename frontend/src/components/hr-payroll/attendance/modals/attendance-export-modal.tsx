"use client";

import React, { useState } from "react";
import {
  X,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Building2,
  Calendar,
  Filter,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface BusinessOption {
  id: number;
  name_en: string;
}

interface AttendanceExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: BusinessOption[];
  isSuperuser: boolean;
  currentBusinessId: number;
  defaultStartDate?: string;
  defaultEndDate?: string;
  defaultStatus?: string;
  defaultEmployeeId?: string;
}

export function AttendanceExportModal({
  isOpen,
  onClose,
  businesses,
  isSuperuser,
  currentBusinessId,
  defaultStartDate = "",
  defaultEndDate = "",
  defaultStatus = "all",
  defaultEmployeeId = "",
}: AttendanceExportModalProps) {
  const [format, setFormat] = useState<"detailed" | "monthly_register">("detailed");
  const [businessId, setBusinessId] = useState<number>(currentBusinessId || 1);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [exporting, setExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 3 + i);

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setExporting(true);
    setError(null);

    try {
      let endpoint = "";
      let filename = "attendance_export.xlsx";

      if (format === "detailed") {
        const params = new URLSearchParams();
        if (businessId) params.set("business_id", String(businessId));
        if (defaultEmployeeId) params.set("employee_id", defaultEmployeeId);
        if (defaultStartDate) params.set("start_date", defaultStartDate);
        if (defaultEndDate) params.set("end_date", defaultEndDate);
        if (defaultStatus && defaultStatus !== "all") params.set("status", defaultStatus);

        endpoint = `/attendance/export-excel?${params.toString()}`;
        filename = `attendance_detailed_export_${new Date().toISOString().split("T")[0]}.xlsx`;
      } else {
        const params = new URLSearchParams();
        if (businessId) params.set("business_id", String(businessId));
        params.set("year", String(year));
        params.set("month", String(month));

        endpoint = `/attendance/export-register-excel?${params.toString()}`;
        filename = `monthly_attendance_register_${year}_${String(month).padStart(2, "0")}.xlsx`;
      }

      const res = await apiClient.get(endpoint, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      onClose();
    } catch {
      setError("Failed to download attendance excel file. Please verify permissions or try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Export Attendance Records
              </h2>
              <p className="text-xs text-slate-500">
                Download verified attendance excel reports
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleDownload} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Format Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Export Format <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat("detailed")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  format === "detailed"
                    ? "border-teal-500 bg-teal-50/50 ring-1 ring-teal-500 font-bold text-teal-900"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="font-bold text-slate-900">Detailed Attendance</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Raw log timestamps & current filters
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat("monthly_register")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  format === "monthly_register"
                    ? "border-teal-500 bg-teal-50/50 ring-1 ring-teal-500 font-bold text-teal-900"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="font-bold text-slate-900">Monthly Register</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Statutory 31-day matrix by month
                </div>
              </button>
            </div>
          </div>

          {/* Business Select */}
          {isSuperuser && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Business Profile <span className="text-rose-500">*</span>
              </label>
              <select
                value={businessId}
                onChange={(e) => setBusinessId(Number(e.target.value))}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                required
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name_en}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Monthly Register Selectors */}
          {format === "monthly_register" ? (
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Month
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-teal-500"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-teal-500"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 space-y-1">
              <div>
                <strong>Date Range:</strong> {defaultStartDate || "Any"} to{" "}
                {defaultEndDate || "Any"}
              </div>
              <div>
                <strong>Status Filter:</strong>{" "}
                {defaultStatus === "all" ? "All Statuses" : defaultStatus}
              </div>
              <div>Export will include all matching attendance log rows.</div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={exporting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={exporting}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? "Generating Excel..." : "Download Excel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
