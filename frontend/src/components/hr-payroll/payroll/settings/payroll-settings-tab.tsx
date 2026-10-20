"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Building2,
  Download,
  Save,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Clock,
  Calendar,
  Layers,
  ShieldCheck,
  Zap,
  CalendarOff,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import { PayrollSettingsOut, PayrollSettingsUpdatePayload } from "@/types";

interface BusinessOption {
  id: number;
  name_en: string;
}

interface PayrollSettingsTabProps {
  businesses: BusinessOption[];
  isSuperuser: boolean;
  currentBusinessId: number;
}

export function PayrollSettingsTab({
  businesses,
  isSuperuser,
  currentBusinessId,
}: PayrollSettingsTabProps) {
  const { toast } = useToast();

  const [selectedBusiness, setSelectedBusiness] = useState<number>(currentBusinessId || 1);
  const [settings, setSettings] = useState<PayrollSettingsOut | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form States
  const [includeAttendance, setIncludeAttendance] = useState<boolean>(true);
  const [includeLeave, setIncludeLeave] = useState<boolean>(true);
  const [includeHolidays, setIncludeHolidays] = useState<boolean>(true);
  const [includeOvertime, setIncludeOvertime] = useState<boolean>(true);
  const [deductAbsentDays, setDeductAbsentDays] = useState<boolean>(true);
  const [standardHours, setStandardHours] = useState<number>(8.0);

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  // Fetch Settings for selected business
  const fetchSettings = async (bizId: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<PayrollSettingsOut>(
        `/payroll/settings?business_id=${bizId}`
      );
      const data = res.data;
      setSettings(data);
      setIncludeAttendance(data.include_attendance);
      setIncludeLeave(data.include_leave);
      setIncludeHolidays(data.include_holidays);
      setIncludeOvertime(data.include_overtime);
      setDeductAbsentDays(data.deduct_absent_days);
      setStandardHours(data.standard_hours_per_day);
    } catch {
      setError("Failed to load payroll settings for this business profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings(selectedBusiness);
  }, [selectedBusiness]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload: PayrollSettingsUpdatePayload = {
      include_attendance: includeAttendance,
      include_leave: includeLeave,
      include_holidays: includeHolidays,
      include_overtime: includeOvertime,
      deduct_absent_days: deductAbsentDays,
      standard_hours_per_day: Number(standardHours) || 8.0,
    };

    try {
      const res = await apiClient.put<PayrollSettingsOut>(
        `/payroll/settings?business_id=${selectedBusiness}`,
        payload
      );
      setSettings(res.data);
      toast.success(
        "Settings Saved",
        "Payroll calculation rules have been updated successfully."
      );
    } catch {
      toast.error("Error", "Could not update payroll settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadExcel = async () => {
    setExporting(true);
    try {
      const res = await apiClient.get(
        `/payroll/settings/export-excel?business_id=${selectedBusiness}`,
        { responseType: "blob" }
      );
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `payroll_settings_business_${selectedBusiness}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setIsExportModalOpen(false);
    } catch {
      toast.error("Error", "Failed to download payroll settings export.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Business Selector & Export */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-slate-400" />
            Select Business Profile:
          </label>
          {isSuperuser ? (
            <select
              value={selectedBusiness}
              onChange={(e) => setSelectedBusiness(Number(e.target.value))}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none min-w-[220px]"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name_en}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
              {businesses[0]?.name_en || "My Business"}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsExportModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto shadow-2xs"
        >
          <Download className="w-3.5 h-3.5" />
          Export Excel
        </button>
      </div>

      {/* Main Settings Form Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs max-w-3xl">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              Payroll Generation Rules
            </h3>
            <p className="text-xs text-slate-500">
              Configure which factors to evaluate when generating bulk payslips
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="space-y-4 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center py-2">
                  <div className="space-y-1">
                    <div className="h-3.5 bg-slate-100 rounded w-48" />
                    <div className="h-2.5 bg-slate-100 rounded w-72" />
                  </div>
                  <div className="w-5 h-5 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-5 divide-y divide-slate-100">
              {/* Consider Attendance */}
              <div className="flex items-start justify-between pt-1">
                <div className="pr-4">
                  <label
                    htmlFor="include_attendance"
                    className="text-xs font-bold text-slate-800 block cursor-pointer flex items-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    Consider Attendance Records
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Use daily punch logs and check-in records to compute present days during the payroll period.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="include_attendance"
                  checked={includeAttendance}
                  onChange={(e) => setIncludeAttendance(e.target.checked)}
                  className="w-4 h-4 mt-1 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
              </div>

              {/* Consider Leave */}
              <div className="flex items-start justify-between pt-4">
                <div className="pr-4">
                  <label
                    htmlFor="include_leave"
                    className="text-xs font-bold text-slate-800 block cursor-pointer flex items-center gap-1.5"
                  >
                    <CalendarOff className="w-3.5 h-3.5 text-teal-600" />
                    Consider Approved Leave
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Include approved leave days in the attendance summary and automatically calculate unpaid leave deductions.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="include_leave"
                  checked={includeLeave}
                  onChange={(e) => setIncludeLeave(e.target.checked)}
                  className="w-4 h-4 mt-1 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
              </div>

              {/* Consider Holidays */}
              <div className="flex items-start justify-between pt-4">
                <div className="pr-4">
                  <label
                    htmlFor="include_holidays"
                    className="text-xs font-bold text-slate-800 block cursor-pointer flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    Consider Company Holidays
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Factor in scheduled company and national holidays when computing eligible working days and presence.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="include_holidays"
                  checked={includeHolidays}
                  onChange={(e) => setIncludeHolidays(e.target.checked)}
                  className="w-4 h-4 mt-1 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
              </div>

              {/* Consider Overtime */}
              <div className="flex items-start justify-between pt-4">
                <div className="pr-4">
                  <label
                    htmlFor="include_overtime"
                    className="text-xs font-bold text-slate-800 block cursor-pointer flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    Consider Overtime Hours
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Sum logged overtime hours and add statutory overtime compensation directly to employee gross salary.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="include_overtime"
                  checked={includeOvertime}
                  onChange={(e) => setIncludeOvertime(e.target.checked)}
                  className="w-4 h-4 mt-1 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
              </div>

              {/* Deduct Absent Days */}
              <div className="flex items-start justify-between pt-4">
                <div className="pr-4">
                  <label
                    htmlFor="deduct_absent_days"
                    className="text-xs font-bold text-slate-800 block cursor-pointer flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                    Deduct Unexcused Absent Days
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Automatically deduct basic salary portion for unexcused employee absent days per Bangladesh Labour Act.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="deduct_absent_days"
                  checked={deductAbsentDays}
                  onChange={(e) => setDeductAbsentDays(e.target.checked)}
                  className="w-4 h-4 mt-1 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
              </div>

              {/* Standard Hours Per Day */}
              <div className="pt-4 space-y-1.5">
                <label
                  htmlFor="standard_hours"
                  className="block text-xs font-bold text-slate-800"
                >
                  Standard Work Hours per Day
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="24"
                    id="standard_hours"
                    value={standardHours}
                    onChange={(e) => setStandardHours(parseFloat(e.target.value) || 8.0)}
                    className="w-36 text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono font-bold text-slate-800"
                  />
                  <span className="text-xs text-slate-500">hours/day</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Default daily shift duration used for overtime threshold calculation (Standard: 8.0 hrs).
                </p>
              </div>
            </div>
          )}

          {/* Save Action */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={loading || saving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving Rules..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Export Payroll Settings
                </h3>
                <p className="text-slate-500 text-[11px]">
                  Download rules spreadsheet for this business
                </p>
              </div>
            </div>
            <p className="text-slate-600">
              Download the active calculation parameters and standard shift definitions for business profile:{" "}
              <strong className="text-slate-800">
                {businesses.find((b) => b.id === selectedBusiness)?.name_en || "Selected Business"}
              </strong>
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDownloadExcel}
                disabled={exporting}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                {exporting ? "Downloading..." : "Download Excel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
