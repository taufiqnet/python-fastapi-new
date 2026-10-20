"use client";

import React, { useState, useEffect } from "react";
import {
  Cog,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Layers,
  Building2,
  DollarSign,
  Download,
  Users,
  FileSpreadsheet,
  Lock,
  ShieldCheck,
  Zap,
  CalendarOff,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import {
  PayrollPeriodOut,
  PayrollSettingsOut,
  PayrollRecordOut,
  EmployeeOut,
} from "@/types";

interface BusinessOption {
  id: number;
  name_en: string;
}

interface PayrollProcessTabProps {
  periods: PayrollPeriodOut[];
  businesses: BusinessOption[];
  isSuperuser: boolean;
  currentBusinessId: number;
  onRefreshPeriods: () => void;
}

export function PayrollProcessTab({
  periods,
  businesses,
  isSuperuser,
  currentBusinessId,
  onRefreshPeriods,
}: PayrollProcessTabProps) {
  const { toast } = useToast();

  const [selectedBusiness, setSelectedBusiness] = useState<number>(currentBusinessId || 1);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [settings, setSettings] = useState<PayrollSettingsOut | null>(null);
  const [employees, setEmployees] = useState<EmployeeOut[]>([]);
  const [generatedRecords, setGeneratedRecords] = useState<PayrollRecordOut[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastRunStats, setLastRunStats] = useState<{
    count: number;
    gross: number;
    deduction: number;
    net: number;
  } | null>(null);

  // Pick initial period (latest draft or processing period)
  useEffect(() => {
    if (periods.length > 0 && !selectedPeriodId) {
      const active = periods.find((p) => !p.is_locked) || periods[0];
      setSelectedPeriodId(active.id);
    }
  }, [periods, selectedPeriodId]);

  // Fetch Settings & Employees for selected business
  useEffect(() => {
    const fetchAux = async () => {
      setLoadingInitial(true);
      try {
        const [settingsRes, empRes] = await Promise.allSettled([
          apiClient.get<PayrollSettingsOut>(`/payroll/settings?business_id=${selectedBusiness}`),
          apiClient.get<EmployeeOut[]>(`/employees?business_id=${selectedBusiness}&limit=500`),
        ]);

        if (settingsRes.status === "fulfilled") {
          setSettings(settingsRes.value.data);
        }
        if (empRes.status === "fulfilled") {
          setEmployees(empRes.value.data || []);
        }
      } catch {
        // non-blocking
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchAux();
  }, [selectedBusiness]);

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  // Fetch existing records for this period if any
  useEffect(() => {
    if (!selectedPeriodId) return;
    const fetchExistingRecords = async () => {
      try {
        const res = await apiClient.get<PayrollRecordOut[]>(
          `/payroll/records?period_id=${selectedPeriodId}&limit=500`
        );
        const data = res.data || [];
        setGeneratedRecords(data);
        if (data.length > 0) {
          const gross = data.reduce((acc, r) => acc + Number(r.gross_salary || 0), 0);
          const ded = data.reduce((acc, r) => acc + Number(r.total_deduction || 0), 0);
          const net = data.reduce((acc, r) => acc + Number(r.net_salary || 0), 0);
          setLastRunStats({ count: data.length, gross, deduction: ded, net });
        } else {
          setLastRunStats(null);
        }
      } catch {
        // non-blocking
      }
    };
    fetchExistingRecords();
  }, [selectedPeriodId]);

  // Execute Salary Run
  const handleExecuteRun = async () => {
    if (!selectedPeriodId || !selectedPeriod) return;
    setIsProcessing(true);

    try {
      const res = await apiClient.post<PayrollRecordOut[]>(
        `/payroll/periods/${selectedPeriodId}/generate`
      );
      const data = res.data || [];
      setGeneratedRecords(data);

      const gross = data.reduce((acc, r) => acc + Number(r.gross_salary || 0), 0);
      const ded = data.reduce((acc, r) => acc + Number(r.total_deduction || 0), 0);
      const net = data.reduce((acc, r) => acc + Number(r.net_salary || 0), 0);

      setLastRunStats({ count: data.length, gross, deduction: ded, net });
      toast.success(
        "Payroll Process Complete",
        `Calculated payslips for ${data.length} employees.`
      );
      onRefreshPeriods();
    } catch {
      toast.error("Execution Failed", "Failed to run salary calculation for this period.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportRegister = async () => {
    try {
      const res = await apiClient.get(
        `/payroll/records/export-excel?period_id=${selectedPeriodId}`,
        { responseType: "blob" }
      );
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `payroll_run_${selectedPeriod?.name || "period"}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Error", "Failed to download payroll run excel sheet.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Cycle Selection */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100 flex items-center gap-1.5 w-fit mb-1">
              <Cog className="w-3.5 h-3.5" />
              Automated Salary Engine
            </span>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              Payroll Processing & Execution
            </h2>
            <p className="text-xs text-slate-500">
              Evaluate attendance, leaves, overtime, and statutory deductions to compute bulk employee payslips
            </p>
          </div>

          {/* Business Select (Superuser) */}
          {isSuperuser && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Business:</span>
              <select
                value={selectedBusiness}
                onChange={(e) => setSelectedBusiness(Number(e.target.value))}
                className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name_en}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Cycle Dropdown & Status */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-slate-100 items-center">
          <div className="md:col-span-6">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Target Payroll Period
            </label>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.start_date} ~ {p.end_date}) — {p.status.toUpperCase()}
                  {p.is_locked ? " [LOCKED]" : ""}
                </option>
              ))}
              {periods.length === 0 && (
                <option value="">No payroll periods created</option>
              )}
            </select>
          </div>

          {selectedPeriod && (
            <div className="md:col-span-6 flex flex-wrap items-center gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Cycle Window
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {selectedPeriod.start_date} to {selectedPeriod.end_date}
                </span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Cycle Status
                </span>
                <span
                  className={`capitalize font-bold ${
                    selectedPeriod.is_locked
                      ? "text-amber-700"
                      : "text-indigo-600"
                  }`}
                >
                  {selectedPeriod.status}
                </span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Disbursement Date
                </span>
                <span className="font-mono text-slate-700">
                  {selectedPeriod.payment_date || "Not Scheduled"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pre-Run Rules & Preflight Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Rules Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Configured Payroll Rules
          </span>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Attendance Logs
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  settings?.include_attendance
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {settings?.include_attendance ? "INCLUDED" : "BYPASS"}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <CalendarOff className="w-3.5 h-3.5 text-slate-400" /> Approved Leaves
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  settings?.include_leave
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {settings?.include_leave ? "INCLUDED" : "BYPASS"}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Company Holidays
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  settings?.include_holidays
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {settings?.include_holidays ? "INCLUDED" : "BYPASS"}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-slate-400" /> Overtime Hours
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  settings?.include_overtime
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {settings?.include_overtime ? "INCLUDED" : "BYPASS"}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-slate-400" /> Absent Days
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  settings?.deduct_absent_days
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {settings?.deduct_absent_days ? "DEDUCTED" : "EXCUSED"}
              </span>
            </div>
          </div>
        </div>

        {/* Employee Pool Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-600" />
            Eligible Workforce Pool
          </span>
          <div className="space-y-1">
            <div className="text-2xl font-extrabold text-slate-900">
              {employees.length}
            </div>
            <p className="text-xs text-slate-500">
              Active employees eligible for monthly salary generation in this business.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            Standard Daily Shift Duration:{" "}
            <strong className="text-slate-800">
              {settings?.standard_hours_per_day || 8.0} hrs/day
            </strong>
          </div>
        </div>

        {/* Run Execution Action Card */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/60 border border-indigo-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
              <Cog className="w-4 h-4 text-indigo-600" />
              Ready to Process
            </span>
            <p className="text-xs text-indigo-800 mt-1">
              Click below to initiate the calculation pipeline for{" "}
              <strong>{selectedPeriod?.name || "the selected period"}</strong>.
            </p>
          </div>

          <button
            type="button"
            disabled={!selectedPeriodId || selectedPeriod?.is_locked || isProcessing}
            onClick={handleExecuteRun}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Cog className="w-4 h-4 animate-spin" />
                Processing Salaries...
              </>
            ) : selectedPeriod?.is_locked ? (
              <>
                <Lock className="w-4 h-4" />
                Period is Locked
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                Execute Salary Run
              </>
            )}
          </button>
        </div>
      </div>

      {/* Post-Run Financial Snapshot */}
      {lastRunStats && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Payroll Run Financial Summary
              </h3>
              <p className="text-xs text-slate-500">
                Aggregated financial snapshot for {selectedPeriod?.name}
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportRegister}
              className="px-3.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download Payroll Sheet
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Total Payslips
              </span>
              <span className="text-xl font-extrabold text-slate-900 mt-1 block">
                {lastRunStats.count}
              </span>
            </div>

            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              <span className="text-[10px] uppercase font-bold text-blue-500 block">
                Total Gross Payroll
              </span>
              <span className="text-xl font-extrabold text-blue-950 mt-1 block font-mono">
                {lastRunStats.gross.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
              <span className="text-[10px] uppercase font-bold text-rose-500 block">
                Total Deductions
              </span>
              <span className="text-xl font-extrabold text-rose-950 mt-1 block font-mono">
                {lastRunStats.deduction.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block">
                Net Disbursement
              </span>
              <span className="text-xl font-extrabold text-emerald-950 mt-1 block font-mono">
                {lastRunStats.net.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Payslip Items Table Preview */}
      {generatedRecords.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">
              Payslip Breakdown ({generatedRecords.length} employees)
            </span>
            <span className="text-[11px] text-slate-400">
              Showing generated records for {selectedPeriod?.name}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Days (Work/Pres)</th>
                  <th className="px-4 py-3">Basic Salary</th>
                  <th className="px-4 py-3">Gross Salary</th>
                  <th className="px-4 py-3">Deductions</th>
                  <th className="px-4 py-3">Net Salary</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {generatedRecords.slice(0, 10).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">
                        {r.employee_name || "Employee"}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {r.employee_code || r.employee_id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {r.present_days} / {r.working_days}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-800">
                      {Number(r.basic_salary).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-blue-900">
                      {Number(r.gross_salary).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-mono text-rose-700">
                      -{Number(r.total_deduction).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-mono font-extrabold text-emerald-700">
                      {Number(r.net_salary).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.is_paid
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {r.is_paid ? "PAID" : "PENDING"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {generatedRecords.length > 10 && (
            <div className="p-3 text-center text-slate-400 text-xs border-t border-slate-100 bg-slate-50/50">
              ...and {generatedRecords.length - 10} more employee payslips
            </div>
          )}
        </div>
      )}
    </div>
  );
}
