"use client";

import React, { useState } from "react";
import { X, Download, FileSpreadsheet, CheckCircle2 } from "lucide-react";

interface LeaveExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId?: number | null;
  defaultScope?: "applications" | "allocations" | "types";
}

export function LeaveExportModal({
  isOpen,
  onClose,
  businessId,
  defaultScope = "applications",
}: LeaveExportModalProps) {
  const [scope, setScope] = useState<"applications" | "allocations" | "types">(defaultScope);

  if (!isOpen) return null;

  const handleDownload = () => {
    const bizId = businessId || 1;
    let url = "";
    if (scope === "applications") {
      url = `http://127.0.0.1:8000/leave/applications/export-excel?business_id=${bizId}`;
    } else if (scope === "allocations") {
      url = `http://127.0.0.1:8000/leave/allocations/export-excel?business_id=${bizId}`;
    } else {
      url = `http://127.0.0.1:8000/leave/types/export-excel?business_id=${bizId}`;
    }

    window.open(url, "_blank");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Export Leave Records</h2>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Download structured Excel reports.
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
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Select Dataset to Export
            </label>
            <div className="space-y-2">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  scope === "applications"
                    ? "border-teal-500 bg-teal-50/40 text-teal-900"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="export_scope"
                  checked={scope === "applications"}
                  onChange={() => setScope("applications")}
                  className="mt-0.5 text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <span className="text-xs font-bold">Leave Requests / Applications</span>
                  <p className="text-[11px] text-slate-500">
                    Comprehensive log of all applied, approved, and rejected leave requests with date spans.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  scope === "allocations"
                    ? "border-teal-500 bg-teal-50/40 text-teal-900"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="export_scope"
                  checked={scope === "allocations"}
                  onChange={() => setScope("allocations")}
                  className="mt-0.5 text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <span className="text-xs font-bold">Leave Balances & Allocations</span>
                  <p className="text-[11px] text-slate-500">
                    Annual quotas, carried forward days, used days, and remaining balances per staff member.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  scope === "types"
                    ? "border-teal-500 bg-teal-50/40 text-teal-900"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="export_scope"
                  checked={scope === "types"}
                  onChange={() => setScope("types")}
                  className="mt-0.5 text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <span className="text-xs font-bold">Leave Policies / Types</span>
                  <p className="text-[11px] text-slate-500">
                    Company-wide policy definitions, codes, compensation types, and statutory limits.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Excel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
