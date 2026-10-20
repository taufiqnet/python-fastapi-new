"use client";

import React, { useState } from "react";
import { X, FileSpreadsheet, Download, AlertCircle, Building2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface BusinessOption {
  id: number;
  name_en: string;
}

interface PeriodExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: BusinessOption[];
  isSuperuser: boolean;
  currentBusinessId: number;
}

export function PeriodExportModal({
  isOpen,
  onClose,
  businesses,
  isSuperuser,
  currentBusinessId,
}: PeriodExportModalProps) {
  const [businessId, setBusinessId] = useState<number>(currentBusinessId || 1);
  const [exporting, setExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setExporting(true);
    setError(null);

    try {
      const biz = businessId || currentBusinessId || 1;
      const res = await apiClient.get(`/payroll/periods/export-excel?business_id=${biz}`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `payroll_periods_business_${biz}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      onClose();
    } catch {
      setError("Failed to download payroll periods excel report.");
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
                Export Payroll Periods
              </h2>
              <p className="text-xs text-slate-500">
                Download verified payroll cycle reports in Excel
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

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500">
            Export will download all payroll period definitions, dates, status, and lock indicators for the selected business profile.
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={exporting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={exporting}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? "Downloading..." : "Download Excel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
