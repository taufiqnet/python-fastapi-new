"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import { MonthlyAttendanceSummary, MonthlyAttendanceSummaryItem } from "@/types";
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  Search,
  Users,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

interface MonthlyAttendanceSummaryTabProps {
  currentBusinessId: number;
}

export function MonthlyAttendanceSummaryTab({
  currentBusinessId,
}: MonthlyAttendanceSummaryTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [searchEmp, setSearchEmp] = useState<string>("");

  const [summaryData, setSummaryData] = useState<MonthlyAttendanceSummary | null>(null);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const fetchSummary = useCallback(
    async (isInitial = false) => {
      if (isInitial) setInitialLoading(true);
      else setIsFetching(true);

      try {
        const res = await apiClient.get<MonthlyAttendanceSummary>(
          `/attendance/monthly-summary?business_id=${currentBusinessId}&year=${selectedYear}&month=${selectedMonth}`
        );
        setSummaryData(res.data);
      } catch (err: any) {
        toast.error("Error", err.response?.data?.detail || "Failed to load monthly attendance summary.");
      } finally {
        if (isInitial) setInitialLoading(false);
        else setIsFetching(false);
      }
    },
    [currentBusinessId, selectedYear, selectedMonth, toast]
  );

  useEffect(() => {
    fetchSummary(true);
  }, [fetchSummary]);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const response = await apiClient.get(
        `/attendance/monthly-summary/export-excel?business_id=${currentBusinessId}&year=${selectedYear}&month=${selectedMonth}`,
        {
          responseType: "blob",
        }
      );

      // Create download link
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Attendance_Register_${selectedYear}_${String(selectedMonth).padStart(2, "0")}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(
        "Download Complete",
        `Monthly attendance register for ${selectedYear}-${String(selectedMonth).padStart(2, "0")} downloaded.`
      );
    } catch (err: any) {
      toast.error("Export Failed", "Could not generate Excel register.");
    } finally {
      setIsExporting(false);
    }
  };

  const items = summaryData?.items || [];
  const filteredItems = items.filter((item) => {
    if (!searchEmp.trim()) return true;
    const q = searchEmp.toLowerCase();
    const name = item.employee_name.toLowerCase();
    const code = item.employee_code.toLowerCase();
    const dept = (item.department_name || "").toLowerCase();
    return name.includes(q) || code.includes(q) || dept.includes(q);
  });

  // Calculate high-level KPIs
  const totalEmployees = items.length;
  const totalOtHours = items.reduce((acc, curr) => acc + curr.overtime_hours, 0);
  const totalLateCount = items.reduce((acc, curr) => acc + curr.late_days, 0);
  const avgPresentRate =
    items.length > 0
      ? (
          (items.reduce((acc, curr) => acc + curr.present_days, 0) /
            (items.reduce((acc, curr) => acc + curr.total_days, 0) || 1)) *
          100
        ).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Monthly Attendance Register & Summary
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Consolidated employee attendance register with present, late, half-day, outdoor duty, and overtime totals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchSummary()}
            disabled={isFetching}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-emerald-600" : ""}`} />
          </button>
          <button
            onClick={handleExportExcel}
            disabled={isExporting || items.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-all shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Generating Excel..." : "Export Excel Register"}
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Active Employees</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">{totalEmployees}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Avg Present Rate</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {avgPresentRate}%
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Overtime</div>
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono">
              {totalOtHours.toFixed(1)} hrs
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Late Incidents</div>
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono">
              {totalLateCount}
            </div>
          </div>
        </div>
      </div>

      {/* Filter / Period Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => {
              const y = Number(e.target.value);
              startTransition(() => {
                setSelectedYear(y);
              });
            }}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Month:</span>
          <select
            value={selectedMonth}
            onChange={(e) => {
              const m = Number(e.target.value);
              startTransition(() => {
                setSelectedMonth(m);
              });
            }}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee name, code or department..."
            value={searchEmp}
            onChange={(e) => setSearchEmp(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* In-Place Register Table */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {(isFetching || isPending) && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-100 dark:bg-emerald-950 overflow-hidden z-20">
            <div className="h-full bg-emerald-600 animate-pulse w-full" />
          </div>
        )}

        {initialLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
            <p className="text-sm font-medium">Compiling monthly attendance register...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <FileSpreadsheet className="w-12 h-12 stroke-[1.5] mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
              No register entries found
            </p>
            <p className="text-sm mt-1">
              No attendance records have been consolidated for {selectedYear}-
              {String(selectedMonth).padStart(2, "0")}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-4 py-4 text-center">Days In Month</th>
                  <th className="px-4 py-4 text-center text-emerald-600 dark:text-emerald-400">Present</th>
                  <th className="px-4 py-4 text-center text-amber-600 dark:text-amber-400">Late</th>
                  <th className="px-4 py-4 text-center">Half Day</th>
                  <th className="px-4 py-4 text-center text-rose-600 dark:text-rose-400">Absent</th>
                  <th className="px-4 py-4 text-center text-blue-600 dark:text-blue-400">Leave</th>
                  <th className="px-4 py-4 text-center text-sky-600 dark:text-sky-400">OD</th>
                  <th className="px-4 py-4 text-center">Work Hrs</th>
                  <th className="px-4 py-4 text-center text-indigo-600 dark:text-indigo-400">OT Hrs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
                {filteredItems.map((item) => (
                  <tr
                    key={item.employee_id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors font-sans"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {item.employee_name}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-[11px]">
                          {item.employee_code}
                        </span>
                        {item.department_name && (
                          <span className="truncate max-w-[130px]">{item.department_name}</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                      {item.total_days}
                    </td>

                    <td className="px-4 py-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {item.present_days}
                    </td>

                    <td className="px-4 py-4 text-center font-mono font-semibold text-amber-600 dark:text-amber-400">
                      {item.late_days}
                    </td>

                    <td className="px-4 py-4 text-center font-mono text-slate-600 dark:text-slate-400">
                      {item.half_days}
                    </td>

                    <td className="px-4 py-4 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                      {item.absent_days}
                    </td>

                    <td className="px-4 py-4 text-center font-mono text-blue-600 dark:text-blue-400">
                      {item.leave_days}
                    </td>

                    <td className="px-4 py-4 text-center font-mono text-sky-600 dark:text-sky-400">
                      {item.outdoor_duty_days}
                    </td>

                    <td className="px-4 py-4 text-center font-mono font-semibold text-slate-900 dark:text-white">
                      {item.total_work_hours.toFixed(1)}h
                    </td>

                    <td className="px-4 py-4 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {item.overtime_hours > 0 ? `${item.overtime_hours.toFixed(1)}h` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
