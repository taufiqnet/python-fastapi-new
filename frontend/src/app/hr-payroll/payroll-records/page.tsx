"use client";

import React, { useEffect, useState, useMemo, useCallback, startTransition } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import {
  PayrollRecordOut,
  PayrollPeriodOut,
  EmployeeOut,
} from "@/types";
import { PayrollRecordModal } from "@/components/hr-payroll/payroll-records/modals/payroll-record-modal";
import {
  Receipt,
  Coins,
  MinusCircle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Printer,
  Edit,
  Trash2,
  FileSpreadsheet,
  RotateCcw,
  Loader2,
  AlertTriangle,
  Eye,
} from "lucide-react";

interface BusinessItem {
  id: number;
  name_en: string;
}

export default function PayrollRecordsPage() {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();

  const isSuperuser = Boolean(user?.is_superuser);
  const currentBusinessId = user?.business_id || 1;

  // Data states
  const [records, setRecords] = useState<PayrollRecordOut[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriodOut[]>([]);
  const [employees, setEmployees] = useState<EmployeeOut[]>([]);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);

  // Dual loading states invariant
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBusiness, setSelectedBusiness] = useState<string | number>(
    isSuperuser ? "" : currentBusinessId
  );

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<PayrollRecordOut | null>(null);

  // Action states
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load Reference Data
  useEffect(() => {
    async function loadRefs() {
      try {
        const [bRes, pRes, eRes] = await Promise.allSettled([
          apiClient.get<BusinessItem[]>("/businesses"),
          apiClient.get<PayrollPeriodOut[]>("/payroll/periods?limit=500"),
          apiClient.get<EmployeeOut[]>("/employees?limit=500"),
        ]);
        if (bRes.status === "fulfilled") setBusinesses(bRes.value.data || []);
        if (pRes.status === "fulfilled") setPeriods(pRes.value.data || []);
        if (eRes.status === "fulfilled") setEmployees(eRes.value.data || []);
      } catch {
        // Fallback
      }
    }
    loadRefs();
  }, []);

  // Fetch Payroll Records
  const fetchRecords = useCallback(async (isBackground = false) => {
    if (isBackground) {
      setIsFetching(true);
    } else {
      setInitialLoading(true);
    }
    setError(null);

    try {
      const params: Record<string, string | number> = {
        skip: 0,
        limit: 500,
      };
      if (selectedBusiness) {
        params.business_id = Number(selectedBusiness);
      }
      if (periodFilter !== "all") {
        params.period_id = periodFilter;
      }
      if (statusFilter !== "all") {
        params.is_paid = statusFilter === "paid" ? 1 : 0;
      }

      const res = await apiClient.get<PayrollRecordOut[]>("/payroll/records", { params });
      setRecords(res.data || []);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to load payroll records.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  }, [selectedBusiness, periodFilter, statusFilter]);

  useEffect(() => {
    fetchRecords(false);
  }, [fetchRecords]);

  // Derived Lookup Maps
  const bizMap = useMemo(() => {
    const map = new Map<number, string>();
    businesses.forEach((b) => map.set(b.id, b.name_en));
    return map;
  }, [businesses]);

  const periodMap = useMemo(() => {
    const map = new Map<string, string>();
    periods.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [periods]);

  const empMap = useMemo(() => {
    const map = new Map<string, EmployeeOut>();
    employees.forEach((e) => map.set(e.id, e));
    return map;
  }, [employees]);

  // Financial Stat Summaries
  const stats = useMemo(() => {
    const totalCount = records.length;
    const gross = records.reduce((acc, r) => acc + Number(r.gross_salary || 0), 0);
    const deductions = records.reduce((acc, r) => acc + Number(r.total_deduction || 0), 0);
    const net = records.reduce((acc, r) => acc + Number(r.net_salary || 0), 0);
    const paidCount = records.filter((r) => r.is_paid).length;
    return { totalCount, gross, deductions, net, paidCount };
  }, [records]);

  // Filtered & Paginated Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const emp = empMap.get(r.employee_id);
        const matchName = emp?.full_name?.toLowerCase().includes(q) || r.employee_name?.toLowerCase().includes(q);
        const matchCode = emp?.employee_id?.toLowerCase().includes(q) || r.employee_code?.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [records, searchQuery, empMap]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // In-place Filter Handlers
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    startTransition(() => {
      setCurrentPage(1);
    });
  };

  const handlePeriodChange = (val: string) => {
    setPeriodFilter(val);
    startTransition(() => {
      setCurrentPage(1);
    });
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    startTransition(() => {
      setCurrentPage(1);
    });
  };

  const handleBusinessChange = (val: string) => {
    setSelectedBusiness(val);
    startTransition(() => {
      setCurrentPage(1);
    });
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setPeriodFilter("all");
    setStatusFilter("all");
    if (isSuperuser) setSelectedBusiness("");
    startTransition(() => {
      setCurrentPage(1);
    });
  };

  // Excel Export
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const params: Record<string, string | number> = {};
      if (selectedBusiness) params.business_id = Number(selectedBusiness);

      const res = await apiClient.get("/payroll/records/export-excel", {
        params,
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `payroll_records_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Excel Exported", "Payroll records sheet downloaded successfully.");
    } catch {
      toast.error("Export Failed", "Could not export payroll records to Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  // Delete Action
  const handleDelete = async (r: PayrollRecordOut) => {
    const empName = empMap.get(r.employee_id)?.full_name || "Employee";
    if (!window.confirm(`Are you sure you want to delete payslip for ${empName}?`)) {
      return;
    }
    setDeletingId(r.id);
    try {
      await apiClient.delete(`/payroll/records/${r.id}`);
      toast.success("Payslip Deleted", `Removed payroll record for ${empName}`);
      fetchRecords(true);
    } catch {
      toast.error("Delete Failed", "Could not delete this payroll record.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Payroll Payslips</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Individual employee payslip snapshots, earnings, statutory deductions, and payment status
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              Export Excel
            </button>
            {hasPermission("hrm", "payroll_records", "create") && (
              <button
                onClick={() => {
                  setEditingRecord(null);
                  setIsModalOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Generate Payslip
              </button>
            )}
          </div>
        </div>

        {/* Financial Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Payslips</p>
              <p className="text-lg font-bold text-slate-800">
                {stats.totalCount}{" "}
                <span className="text-[11px] font-normal text-slate-400">({stats.paidCount} Paid)</span>
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Gross Payroll</p>
              <p className="text-lg font-bold text-blue-600">
                ৳{stats.gross.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <MinusCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Deductions</p>
              <p className="text-lg font-bold text-rose-600">
                ৳{stats.deductions.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Net Payable</p>
              <p className="text-lg font-bold text-emerald-600">
                ৳{stats.net.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search employee name or ID..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Period Filter */}
            <select
              value={periodFilter}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="text-xs rounded-xl border border-slate-200 p-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[180px]"
            >
              <option value="all">All Payroll Periods</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-xs rounded-xl border border-slate-200 p-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>

            {/* Business Selector (Superadmin) */}
            {isSuperuser && (
              <select
                value={selectedBusiness}
                onChange={(e) => handleBusinessChange(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 p-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[180px]"
              >
                <option value="">All Businesses</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name_en}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            onClick={handleClearFilters}
            className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" /> Clear
          </button>
        </div>

        {/* In-Place Table Card with Top-Rim Progress Bar Invariant */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden relative">
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500 animate-pulse z-10" />
          )}

          {error && (
            <div className="p-4 border-b border-red-100 bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Business</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Gross Salary</th>
                  <th className="py-3 px-4">Deductions</th>
                  <th className="py-3 px-4">Net Salary</th>
                  <th className="py-3 px-4">Payment Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y divide-slate-100 transition-opacity duration-150 ${
                  isFetching ? "opacity-60" : "opacity-100"
                }`}
              >
                {initialLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                        <span>Loading payroll payslip records...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No payroll records found for this criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((r) => {
                    const emp = empMap.get(r.employee_id);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-indigo-600">
                          {emp?.employee_id || r.employee_code || "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">
                            {emp?.full_name || r.employee_name || "Employee"}
                          </div>
                          <div className="text-[10px] text-slate-400 capitalize">
                            {r.payment_method?.replace("_", " ") || "Bank Transfer"}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {bizMap.get(r.business_id) || "— Global —"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {periodMap.get(r.period_id) || "Period"}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          ৳{Number(r.gross_salary).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-rose-600">
                          ৳{Number(r.total_deduction).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-600">
                          ৳{Number(r.net_salary).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4">
                          {r.is_paid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/hr-payroll/payroll-records/${r.id}`}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              title="View / Print Payslip"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>

                            {hasPermission("hrm", "payroll_records", "update") && (
                              <button
                                onClick={() => {
                                  setEditingRecord(r);
                                  setIsModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                title="Edit Payslip"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {hasPermission("hrm", "payroll_records", "delete") && (
                              <button
                                onClick={() => handleDelete(r)}
                                disabled={deletingId === r.id}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-40"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Persistent Pagination Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
            <div>
              Showing {filteredRecords.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length} entries
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <span className="font-semibold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Modal */}
        <PayrollRecordModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => fetchRecords(true)}
          record={editingRecord}
          employees={employees}
          periods={periods}
          businesses={businesses}
          defaultBusinessId={currentBusinessId}
          isSuperuser={isSuperuser}
        />
      </div>
    </DashboardLayout>
  );
}
