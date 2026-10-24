"use client";

import React, { useEffect, useState, useMemo, startTransition, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import {
  AttendanceRecord,
  AttendanceCreatePayload,
  AttendanceUpdatePayload,
  EmployeeOut,
} from "@/types";

// Subcomponents
import { AttendanceStatCards } from "@/components/hr-payroll/attendance/attendance-stat-cards";
import { AttendanceFilterBar } from "@/components/hr-payroll/attendance/attendance-filter-bar";
import { AttendanceTable } from "@/components/hr-payroll/attendance/attendance-table";

// Modals
import { LogAttendanceModal } from "@/components/hr-payroll/attendance/modals/log-attendance-modal";
import { AttendanceDetailModal } from "@/components/hr-payroll/attendance/modals/attendance-detail-modal";
import { AttendanceExportModal } from "@/components/hr-payroll/attendance/modals/attendance-export-modal";
import { AttendanceImportModal } from "@/components/hr-payroll/attendance/modals/attendance-import-modal";

// Extended Attendance Sub-tabs
import { BiometricDevicesTab } from "@/components/hr-payroll/attendance/devices/biometric-devices-tab";
import { RawAttendanceTab } from "@/components/hr-payroll/attendance/raw-logs/raw-attendance-tab";
import { AttendanceRequestsTab } from "@/components/hr-payroll/attendance/regularizations/attendance-requests-tab";
import { OutdoorDutyTab } from "@/components/hr-payroll/attendance/outdoor/outdoor-duty-tab";
import { OvertimeTab } from "@/components/hr-payroll/attendance/overtime/overtime-tab";
import { AttendanceProcessTab } from "@/components/hr-payroll/attendance/process/attendance-process-tab";
import { MonthlyAttendanceSummaryTab } from "@/components/hr-payroll/attendance/summary/monthly-attendance-summary-tab";

import {
  Clock,
  Plus,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  X,
  CalendarDays,
  Cpu,
  Fingerprint,
  FileCheck2,
  Briefcase,
  Timer,
  ShieldCheck,
  FileSpreadsheet,
} from "lucide-react";

interface BusinessItem {
  id: number;
  name_en: string;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isSuperuser = Boolean(user?.is_superuser);
  const currentBusinessId = user?.business_id || 1;

  // Data States
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeOut[]>([]);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);

  // Dual Loading State Invariant
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [selectedBusiness, setSelectedBusiness] = useState<string | number>(
    isSuperuser ? "" : currentBusinessId
  );
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Multi-Selection State (Superuser)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Tab State
  const [activeTab, setActiveTab] = useState<
    "daily" | "devices" | "raw_logs" | "requests" | "outdoor" | "overtime" | "process" | "summary"
  >("daily");

  // Modals State
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [detailRecord, setDetailRecord] = useState<AttendanceRecord | null>(null);

  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Delete Confirmations State
  const [recordToDelete, setRecordToDelete] = useState<AttendanceRecord | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [isFullWipeModalOpen, setIsFullWipeModalOpen] = useState<boolean>(false);

  // Mappings
  const employeeMap = useMemo(() => {
    const map: Record<string, { id: string; employee_id: string; full_name: string }> = {};
    employees.forEach((e) => {
      map[e.id] = {
        id: e.id,
        employee_id: e.employee_id || "—",
        full_name: e.full_name,
      };
    });
    return map;
  }, [employees]);

  const businessMap = useMemo(() => {
    const map: Record<number, string> = {};
    businesses.forEach((b) => {
      map[b.id] = b.name_en;
    });
    return map;
  }, [businesses]);

  // Fetch Aux Data (Employees & Businesses)
  useEffect(() => {
    const fetchAuxData = async () => {
      try {
        const empRes = await apiClient.get<EmployeeOut[]>("/employees?limit=500");
        setEmployees(empRes.data || []);

        if (isSuperuser) {
          const bizRes = await apiClient.get<BusinessItem[]>("/businesses");
          setBusinesses(bizRes.data || []);
        } else {
          setBusinesses([
            {
              id: currentBusinessId,
              name_en: user?.business?.name_en || (user as any)?.business_profile?.name_en || "My Business",
            },
          ]);
        }
      } catch {
        // non-blocking
      }
    };
    fetchAuxData();
  }, [isSuperuser, currentBusinessId, user]);

  // Fetch Attendance Records (In-Place Non-Destructive Update)
  const fetchRecords = useCallback(
    async (isInitial = false) => {
      if (isInitial) {
        setInitialLoading(true);
      } else {
        setIsFetching(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams();
        const skip = (currentPage - 1) * pageSize;
        params.set("skip", String(skip));
        params.set("limit", String(pageSize));

        if (selectedBusiness) {
          params.set("business_id", String(selectedBusiness));
        } else if (!isSuperuser && currentBusinessId) {
          params.set("business_id", String(currentBusinessId));
        }

        if (selectedEmployee) params.set("employee_id", selectedEmployee);
        if (startDate) params.set("start_date", startDate);
        if (endDate) params.set("end_date", endDate);
        if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);

        const res = await apiClient.get<AttendanceRecord[]>(`/attendance?${params.toString()}`);
        setRecords(res.data || []);
      } catch {
        setError("Failed to load attendance records from server.");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [
      currentPage,
      pageSize,
      selectedBusiness,
      selectedEmployee,
      startDate,
      endDate,
      statusFilter,
      isSuperuser,
      currentBusinessId,
    ]
  );

  useEffect(() => {
    fetchRecords(initialLoading);
  }, [fetchRecords]);

  // Metrics Calculation (Reactive across currently loaded records)
  const {
    totalCount,
    presentCount,
    absentCount,
    leaveCount,
    lateHalfDayCount,
    totalWorkHours,
    totalOvertimeHours,
  } = useMemo(() => {
    let pres = 0;
    let abs = 0;
    let lve = 0;
    let lateHalf = 0;
    let workH = 0;
    let otH = 0;

    records.forEach((r) => {
      const st = (r.status || "").toLowerCase();
      if (st === "present") pres++;
      else if (st === "absent") abs++;
      else if (st === "on_leave") lve++;
      else if (st === "late" || st === "half_day") lateHalf++;

      workH += Number(r.work_hours || 0);
      otH += Number(r.overtime_hours || 0);
    });

    return {
      totalCount: records.length,
      presentCount: pres,
      absentCount: abs,
      leaveCount: lve,
      lateHalfDayCount: lateHalf,
      totalWorkHours: workH,
      totalOvertimeHours: otH,
    };
  }, [records]);

  // Handlers for In-Place Filter Changes with startTransition
  const handleSelectBusiness = (bId: string | number) => {
    startTransition(() => {
      setSelectedBusiness(bId);
      setCurrentPage(1);
    });
  };

  const handleSelectEmployee = (empId: string) => {
    startTransition(() => {
      setSelectedEmployee(empId);
      setCurrentPage(1);
    });
  };

  const handleStartDateChange = (val: string) => {
    startTransition(() => {
      setStartDate(val);
      setCurrentPage(1);
    });
  };

  const handleEndDateChange = (val: string) => {
    startTransition(() => {
      setEndDate(val);
      setCurrentPage(1);
    });
  };

  const handleStatusFilterChange = (val: string) => {
    startTransition(() => {
      setStatusFilter(val);
      setCurrentPage(1);
    });
  };

  const handleResetFilters = () => {
    startTransition(() => {
      setSelectedEmployee("");
      setStartDate("");
      setEndDate("");
      setStatusFilter("all");
      if (isSuperuser) setSelectedBusiness("");
      setCurrentPage(1);
    });
  };

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (records.every((r) => selectedIds.includes(r.id))) {
      setSelectedIds([]);
    } else {
      setSelectedIds(records.map((r) => r.id));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Save (Create or Update)
  const handleSaveAttendance = async (
    payload: AttendanceCreatePayload | AttendanceUpdatePayload,
    id?: string
  ): Promise<boolean> => {
    try {
      if (id) {
        await apiClient.put(`/attendance/${id}`, payload);
        toast.success("Attendance Updated", "Record updated successfully.");
      } else {
        await apiClient.post("/attendance", payload);
        toast.success("Attendance Created", "Record logged successfully.");
      }
      fetchRecords(false);
      return true;
    } catch {
      toast.error("Error", "Could not save attendance log. Please try again.");
      return false;
    }
  };

  // Single Delete
  const handleConfirmSingleDelete = async () => {
    if (!recordToDelete) return;
    try {
      await apiClient.delete(`/attendance/${recordToDelete.id}`);
      toast.success("Record Deleted", "Attendance record has been removed.");
      setRecordToDelete(null);
      fetchRecords(false);
    } catch {
      toast.error("Error", "Failed to delete record.");
    }
  };

  // Bulk Delete Selected
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await apiClient.post<{ deleted_count: number; message: string }>(
        "/attendance/bulk-delete",
        {
          attendance_ids: selectedIds,
          business_id: selectedBusiness ? Number(selectedBusiness) : currentBusinessId,
          delete_all: false,
        }
      );
      toast.success("Bulk Deletion Completed", res.data.message);
      setSelectedIds([]);
      setIsBulkDeleting(false);
      fetchRecords(false);
    } catch {
      toast.error("Error", "Failed to delete selected records.");
    }
  };

  // Admin Full Wipe
  const handleConfirmFullWipe = async () => {
    try {
      const targetBiz = selectedBusiness ? Number(selectedBusiness) : currentBusinessId;
      const res = await apiClient.post<{ deleted_count: number; message: string }>(
        "/attendance/bulk-delete",
        {
          attendance_ids: [],
          business_id: targetBiz,
          delete_all: true,
        }
      );
      toast.success("Full Wipe Completed", res.data.message);
      setSelectedIds([]);
      setIsFullWipeModalOpen(false);
      fetchRecords(false);
    } catch {
      toast.error("Error", "Failed to execute attendance full wipe.");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900 flex items-center gap-1">
                <Clock className="w-3 h-3" /> HR & Payroll
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Attendance & Time Tracking
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Daily logs, biometric device syncing, regularizations, outdoor duties, overtime, and monthly audit registers
            </p>
          </div>

          {activeTab === "daily" && (
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Superuser Bulk Operations */}
              {isSuperuser && selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsBulkDeleting(true)}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 animate-in fade-in"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Selected ({selectedIds.length})
                </button>
              )}

              {isSuperuser && (
                <button
                  type="button"
                  onClick={() => setIsFullWipeModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-rose-900 hover:bg-rose-950 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                  title="System Admin: Wipe Attendance"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Wipe All
                </button>
              )}

              {/* Import Excel */}
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                Import Excel
              </button>

              {/* Export Excel */}
              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export Excel
              </button>

              {/* Log Attendance Button */}
              <button
                type="button"
                onClick={() => {
                  setEditingRecord(null);
                  setIsLogModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Log Attendance
              </button>
            </div>
          )}
        </div>

        {/* Unified Tab Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
          {[
            { key: "daily", label: "Daily Logs", icon: CalendarDays },
            { key: "devices", label: "Biometric Devices & Settings", icon: Cpu },
            { key: "raw_logs", label: "Raw Logs", icon: Fingerprint },
            { key: "requests", label: "Attendance Requests", icon: FileCheck2 },
            { key: "outdoor", label: "Outdoor Duty", icon: Briefcase },
            { key: "overtime", label: "Overtime (OT)", icon: Timer },
            { key: "process", label: "Consolidation & Lock", icon: ShieldCheck },
            { key: "summary", label: "Monthly Summary", icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Daily Logs */}
        {activeTab === "daily" && (
          <div className="space-y-6">
            {/* Metric Summary Cards */}
            <AttendanceStatCards
              totalCount={totalCount}
              presentCount={presentCount}
              absentCount={absentCount}
              leaveCount={leaveCount}
              lateHalfDayCount={lateHalfDayCount}
              totalWorkHours={totalWorkHours}
              totalOvertimeHours={totalOvertimeHours}
            />

            {/* In-Place Non-Destructive Filter Bar */}
            <AttendanceFilterBar
              employees={employees}
              businesses={businesses}
              isSuperuser={isSuperuser}
              selectedEmployee={selectedEmployee}
              onSelectEmployee={handleSelectEmployee}
              selectedBusiness={selectedBusiness}
              onSelectBusiness={handleSelectBusiness}
              startDate={startDate}
              onStartDateChange={handleStartDateChange}
              endDate={endDate}
              onEndDateChange={handleEndDateChange}
              statusFilter={statusFilter}
              onStatusFilterChange={handleStatusFilterChange}
              onResetFilters={handleResetFilters}
              onExportClick={() => setIsExportModalOpen(true)}
              isFetching={isFetching}
            />

            {/* Error Alert */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => fetchRecords(false)}
                  className="font-bold underline text-rose-800"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Master Table with In-Place Non-Destructive Transitions */}
            <AttendanceTable
              records={records}
              employeeMap={employeeMap}
              businessMap={businessMap}
              isSuperuser={isSuperuser}
              selectedIds={selectedIds}
              onToggleSelectAll={handleToggleSelectAll}
              onToggleSelectRow={handleToggleSelectRow}
              onViewDetail={(r) => {
                setDetailRecord(r);
                setIsDetailModalOpen(true);
              }}
              onEdit={(r) => {
                setEditingRecord(r);
                setIsLogModalOpen(true);
              }}
              onDelete={(r) => setRecordToDelete(r)}
              initialLoading={initialLoading}
              isFetching={isFetching}
              currentPage={currentPage}
              pageSize={pageSize}
              totalRecords={records.length}
              onPageChange={(p) =>
                startTransition(() => {
                  setCurrentPage(p);
                })
              }
              onPageSizeChange={(ps) =>
                startTransition(() => {
                  setPageSize(ps);
                  setCurrentPage(1);
                })
              }
            />
          </div>
        )}

        {/* Tab 2: Biometric Devices & Settings */}
        {activeTab === "devices" && (
          <BiometricDevicesTab currentBusinessId={currentBusinessId} />
        )}

        {/* Tab 3: Raw Device Logs */}
        {activeTab === "raw_logs" && (
          <RawAttendanceTab currentBusinessId={currentBusinessId} />
        )}

        {/* Tab 4: Regularization & Requests */}
        {activeTab === "requests" && (
          <AttendanceRequestsTab
            currentBusinessId={currentBusinessId}
            employees={employees}
          />
        )}

        {/* Tab 5: Outdoor Duty & Client Visits */}
        {activeTab === "outdoor" && (
          <OutdoorDutyTab
            currentBusinessId={currentBusinessId}
            employees={employees}
          />
        )}

        {/* Tab 6: Overtime Ledger & Approval */}
        {activeTab === "overtime" && (
          <OvertimeTab
            currentBusinessId={currentBusinessId}
            employees={employees}
          />
        )}

        {/* Tab 7: Attendance Process Engine & Audit Lock */}
        {activeTab === "process" && (
          <AttendanceProcessTab currentBusinessId={currentBusinessId} />
        )}

        {/* Tab 8: Monthly Summary Register */}
        {activeTab === "summary" && (
          <MonthlyAttendanceSummaryTab currentBusinessId={currentBusinessId} />
        )}
      </div>

      {/* Log / Edit Attendance Modal */}
      <LogAttendanceModal
        isOpen={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveAttendance}
        record={editingRecord}
        employees={employees}
        businesses={businesses}
        isSuperuser={isSuperuser}
        currentBusinessId={currentBusinessId}
      />

      {/* Attendance Detail Inspection Modal */}
      <AttendanceDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailRecord(null);
        }}
        record={detailRecord}
        employee={detailRecord ? employeeMap[detailRecord.employee_id] : null}
        businessName={detailRecord ? businessMap[detailRecord.business_id] : undefined}
        onEdit={(r) => {
          setEditingRecord(r);
          setIsLogModalOpen(true);
        }}
      />

      {/* Attendance Export Modal */}
      <AttendanceExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        businesses={businesses}
        isSuperuser={isSuperuser}
        currentBusinessId={currentBusinessId}
        defaultStartDate={startDate}
        defaultEndDate={endDate}
        defaultStatus={statusFilter}
        defaultEmployeeId={selectedEmployee}
      />

      {/* Attendance Import Modal */}
      <AttendanceImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        businesses={businesses}
        isSuperuser={isSuperuser}
        currentBusinessId={currentBusinessId}
        onImportComplete={() => fetchRecords(false)}
      />

      {/* Single Record Delete Dialog */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4 text-xs">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-900">
                Delete Attendance Record?
              </h3>
              <p className="text-slate-500 mt-1">
                Are you sure you want to remove the attendance log for{" "}
                <strong className="text-slate-800">
                  {employeeMap[recordToDelete.employee_id]?.full_name || "Employee"}
                </strong>{" "}
                on <strong className="text-slate-800">{recordToDelete.date}</strong>?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm Dialog */}
      {isBulkDeleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4 text-xs">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-900">
                Bulk Delete Selected Records?
              </h3>
              <p className="text-slate-500 mt-1">
                You have selected{" "}
                <strong className="text-rose-600 font-bold">
                  {selectedIds.length}
                </strong>{" "}
                attendance records. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleting(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs"
              >
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Full Wipe Dialog */}
      {isFullWipeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 text-xs">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-extrabold text-slate-900">
                Confirm Admin Full Wipe
              </h3>
              <p className="text-slate-500 mt-1.5 leading-relaxed">
                This is a restricted superuser function. It will permanently delete{" "}
                <strong className="text-rose-600">ALL attendance records</strong> for the
                selected business profile.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsFullWipeModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmFullWipe}
                className="px-5 py-2 rounded-xl bg-rose-800 hover:bg-rose-900 text-white font-semibold shadow-xs"
              >
                Execute Full Wipe
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
