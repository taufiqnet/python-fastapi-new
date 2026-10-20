"use client";

import React, { useEffect, useState, useMemo, useRef, startTransition } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { EmployeeOut, DepartmentOut, JobTitleOut } from "@/types";
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Sparkles,
  LayoutGrid,
  List,
  Filter,
  Building,
  Briefcase,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Mail,
  Phone,
  Download,
  UploadCloud,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/context/toast-context";
import { DeleteEmployeeDialog } from "@/components/hr-payroll/delete-employee-dialog";
import { OrgChartView } from "@/components/hr-payroll/employees/org-chart-view";
import { EmployeeImportModal } from "@/components/hr-payroll/employees/employee-import-modal";
import { SearchableDepartmentCombobox } from "@/components/hr-payroll/searchable-department-combobox";
import { Network, Droplet } from "lucide-react";

export default function EmployeesPage() {
  const { toast } = useToast();

  const [employees, setEmployees] = useState<EmployeeOut[]>([]);
  const [totalFiltered, setTotalFiltered] = useState<number>(0);
  const [totalSystemEmployees, setTotalSystemEmployees] = useState<number>(0);
  const [activeSystemEmployees, setActiveSystemEmployees] = useState<number>(0);
  const [departments, setDepartments] = useState<DepartmentOut[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitleOut[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedEmploymentType, setSelectedEmploymentType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid" | "orgchart">("table");

  // Pagination State (Default 10 items per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Delete Dialog State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<EmployeeOut | null>(null);

  // Import & Export State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const response = await apiClient.get("/employees/export-excel", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `employees_master_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(
        "Export Completed",
        "Employee master directory downloaded successfully."
      );
    } catch {
      toast.error(
        "Export Failed",
        "Unable to generate employee Excel export."
      );
    } finally {
      setIsExporting(false);
    }
  };

  // 300ms Debounce for Search Query to avoid overwhelming database at high concurrency
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load static/lookup data and global counts
  const loadLookups = async () => {
    try {
      const [deptRes, titleRes, countRes, activeCountRes] = await Promise.allSettled([
        apiClient.get<DepartmentOut[]>("/departments?is_active=true&limit=300"),
        apiClient.get<JobTitleOut[]>("/job-titles"),
        apiClient.get<{ total: number }>("/employees/count"),
        apiClient.get<{ total: number }>("/employees/count?status=active"),
      ]);

      if (deptRes.status === "fulfilled") {
        const rawDepts = deptRes.value.data || [];
        setDepartments(rawDepts.filter((d) => d.is_active !== false));
      }
      if (titleRes.status === "fulfilled") {
        setJobTitles(titleRes.value.data || []);
      }
      if (countRes.status === "fulfilled") {
        setTotalSystemEmployees(countRes.value.data?.total || 0);
      }
      if (activeCountRes.status === "fulfilled") {
        setActiveSystemEmployees(activeCountRes.value.data?.total || 0);
      }
    } catch {
      // ignore lookup errors
    }
  };

  useEffect(() => {
    loadLookups();
  }, []);

  // Server-Side Search & Paginated Fetch
  const fetchEmployees = async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    } else {
      setIsFetching(true);
    }
    setError(null);
    try {
      const skip = (currentPage - 1) * pageSize;
      const limit = pageSize;
      const queryParams = new URLSearchParams();
      queryParams.set("skip", String(skip));
      queryParams.set("limit", String(limit));

      const countParams = new URLSearchParams();

      if (debouncedSearch.trim()) {
        queryParams.set("search", debouncedSearch.trim());
        countParams.set("search", debouncedSearch.trim());
      }
      if (selectedDepartment && selectedDepartment !== "all") {
        queryParams.set("department_id", selectedDepartment);
        countParams.set("department_id", selectedDepartment);
      }
      if (statusFilter && statusFilter !== "all") {
        queryParams.set("status", statusFilter);
        countParams.set("status", statusFilter);
      }

      const [empRes, countRes] = await Promise.allSettled([
        apiClient.get<EmployeeOut[]>(`/employees?${queryParams.toString()}`),
        apiClient.get<{ total: number }>(`/employees/count?${countParams.toString()}`),
      ]);

      if (empRes.status === "fulfilled") {
        setEmployees(empRes.value.data || []);
      } else {
        setError("Failed to fetch employees from backend API.");
      }

      if (countRes.status === "fulfilled") {
        setTotalFiltered(countRes.value.data?.total ?? 0);
      }
    } catch {
      setError("Unable to connect to FastAPI REST server.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchEmployees(true);
    } else {
      fetchEmployees(false);
    }
  }, [currentPage, pageSize, debouncedSearch, selectedDepartment, statusFilter]);

  const loadData = () => {
    fetchEmployees(false);
    loadLookups();
  };

  const handleDepartmentSelect = (deptId: string) => {
    startTransition(() => {
      setSelectedDepartment(deptId);
      setCurrentPage(1);
    });
  };

  const handleStatusFilterChange = (status: string) => {
    startTransition(() => {
      setStatusFilter(status);
      setCurrentPage(1);
    });
  };

  const handleEmploymentTypeChange = (empType: string) => {
    startTransition(() => {
      setSelectedEmploymentType(empType);
      setCurrentPage(1);
    });
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    startTransition(() => {
      setSearchQuery("");
      setDebouncedSearch("");
      setStatusFilter("all");
      setSelectedDepartment("all");
      setSelectedEmploymentType("all");
      setCurrentPage(1);
    });
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    statusFilter !== "all" ||
    selectedDepartment !== "all" ||
    selectedEmploymentType !== "all";

  // Helper map for department & designation lookup
  const deptMap = useMemo(() => {
    const m = new Map<string, string>();
    departments.forEach((d) => m.set(d.id, d.name));
    return m;
  }, [departments]);

  const titleMap = useMemo(() => {
    const m = new Map<string, string>();
    jobTitles.forEach((j) => m.set(j.id, j.name));
    return m;
  }, [jobTitles]);

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full pb-12">
        {/* Top Header & Page Navigation Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
              <span>HR & Payroll Suite</span>
              <span>•</span>
              <span>Staff Management</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Users className="w-7 h-7 text-indigo-600" />
              Employee Directory
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage organization personnel, department assignments, and employment profiles.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-end">
            {/* Export Excel Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting || initialLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition-colors shadow-xs disabled:opacity-60"
              title="Export complete employee roster to Excel"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
              ) : (
                <Download className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            {/* Import Excel Button */}
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition-colors shadow-xs"
              title="Bulk import employees via Excel template"
            >
              <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Import Excel</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              disabled={isFetching || initialLoading}
              className="p-2 sm:p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
              title="Refresh Roster"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching || initialLoading ? "animate-spin" : ""}`} />
            </button>

            {/* Dedicated Page Link for Employee Add */}
            <Link
              href="/hr-payroll/employees/create"
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/25 active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Employee</span>
            </Link>
          </div>
        </div>

        {/* Metrics KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Staff</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{metrics.total}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Active Staff</p>
              <p className="text-xl font-bold text-emerald-700 mt-0.5">{metrics.active}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">On Leave / Inactive</p>
              <p className="text-xl font-bold text-amber-700 mt-0.5">{metrics.inactive}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Departments</p>
              <p className="text-xl font-bold text-purple-700 mt-0.5">{metrics.deptCount}</p>
            </div>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name, employee ID, corporate email, or team..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    handleSearchChange("");
                    setDebouncedSearch("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              <SearchableDepartmentCombobox
                departments={departments}
                selectedDepartmentId={selectedDepartment}
                onSelect={handleDepartmentSelect}
                employeeCountsByDept={employeeCountsByDept}
                totalAllEmployees={metrics.total}
              />

              <select
                value={selectedEmploymentType}
                onChange={(e) => handleEmploymentTypeChange(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Types</option>
                <option value="full_time">Full-Time</option>
                <option value="part_time">Part-Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>

              {/* View Switcher */}
              <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === "table"
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                  title="Table View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === "grid"
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                  title="Card Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("orgchart")}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === "orgchart"
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                  title="Organizational Chart (Org Chart)"
                >
                  <Network className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Status Tabs & Active Filters Counter */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Status:
              </span>
              {[
                { id: "all", label: "All Personnel" },
                { id: "active", label: "Active" },
                { id: "inactive", label: "Inactive / Leave" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleStatusFilterChange(tab.id)}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    statusFilter === tab.id
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                {isFetching && <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin shrink-0" />}
                Showing <strong className="text-slate-800">{filteredEmployees.length}</strong> of{" "}
                {totalFiltered || employees.length} employees
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-rose-600 hover:underline font-medium"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Data Presentation */}
        {initialLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
            <div className="flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm font-semibold text-slate-800">Loading company personnel...</p>
              <p className="text-xs text-slate-400">Fetching records from FastAPI HR module</p>
            </div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs relative overflow-hidden">
            {isFetching && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-100 overflow-hidden z-20">
                <div className="w-full h-full bg-indigo-600 animate-pulse" />
              </div>
            )}
            <div className={`flex flex-col items-center justify-center gap-3 max-w-sm mx-auto transition-opacity duration-150 ${isFetching ? "opacity-50" : "opacity-100"}`}>
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                {isFetching ? (
                  <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin" />
                ) : (
                  <Users className="w-7 h-7" />
                )}
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {isFetching ? "Updating records..." : "No employee records found"}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {hasActiveFilters
                  ? "No staff members match the selected search or department criteria."
                  : "Start building your company workforce by onboarding your first employee."}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
                >
                  Clear All Filters
                </button>
              ) : (
                <Link
                  href="/hr-payroll/employees/create"
                  className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 shadow-sm transition"
                >
                  <UserPlus className="w-4 h-4" />
                  Onboard First Employee
                </Link>
              )}
            </div>
          </div>
        ) : viewMode === "orgchart" ? (
          /* Organizational Chart View */
          <OrgChartView departments={departments} />
        ) : viewMode === "table" ? (
          /* Table View */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden relative">
            {/* Slim indeterminate progress bar on in-place re-fetch */}
            {isFetching && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-100 overflow-hidden z-20">
                <div className="w-full h-full bg-indigo-600 animate-pulse" />
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-5">Employee</th>
                    <th className="py-3.5 px-4">Department & Role</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Employment</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-slate-100 transition-opacity duration-150 ${isFetching ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
                  {paginatedEmployees.map((e) => {
                    const initials = `${e.first_name[0] || ""}${e.last_name?.[0] || ""}`.toUpperCase();
                    const dName = e.department_id ? deptMap.get(e.department_id) || "Unassigned" : "Unassigned";
                    const jName = e.job_title_id ? titleMap.get(e.job_title_id) || "Staff" : "Staff";

                    return (
                      <tr key={e.id} className="hover:bg-slate-50/70 transition-colors group">
                        {/* Name & Avatar */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-700 font-bold flex items-center justify-center shrink-0 border border-indigo-100">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <Link
                                  href={`/hr-payroll/employees/${e.id}`}
                                  className="font-bold text-slate-900 group-hover:text-indigo-600 transition truncate block hover:underline"
                                >
                                  {e.full_name || `${e.first_name} ${e.last_name || ""}`}
                                </Link>
                                {e.bangla_name && (
                                  <span className="text-[11px] font-semibold text-slate-400 font-bengali truncate">
                                    ({e.bangla_name})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[11px] text-slate-400">
                                  {e.employee_id}
                                </span>
                                {e.blood_group && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
                                    <Droplet className="w-2.5 h-2.5 fill-rose-600" /> {e.blood_group}
                                  </span>
                                )}
                                {e.salary_grade_name && (
                                  <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                                    {e.salary_grade_name}
                                  </span>
                                )}
                                {e.is_department_head && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded font-semibold border border-amber-200">
                                    <Sparkles className="w-2.5 h-2.5" /> Head
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Department & Role */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800">{jName}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                            <span>{dName}</span>
                            {e.branch_name && (
                              <>
                                <span>•</span>
                                <span className="text-indigo-600 font-medium">{e.branch_name}</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4 text-slate-600">
                          <p className="truncate max-w-xs">{e.work_email}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{e.phone || "-"}</p>
                        </td>

                        {/* Employment Type */}
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium capitalize text-[11px]">
                            {e.employment_type?.replace("_", " ") || "Full Time"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                              e.is_active
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {e.is_active ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {e.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* Actions (Dedicated Pages) */}
                        <td className="py-3.5 px-5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Link
                              href={`/hr-payroll/employees/${e.id}`}
                              title="View Profile Page"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/hr-payroll/employees/${e.id}/edit`}
                              title="Edit Employee Page"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setEmployeeToDelete(e);
                                setIsDeleteOpen(true);
                              }}
                              title="Delete Employee"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Card Grid View */
          <div className="relative">
            {isFetching && (
              <div className="absolute -top-3 left-0 right-0 h-0.5 bg-indigo-100 overflow-hidden z-20 rounded-full">
                <div className="w-full h-full bg-indigo-600 animate-pulse" />
              </div>
            )}
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 transition-opacity duration-150 ${isFetching ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
            {paginatedEmployees.map((e) => {
              const initials = `${e.first_name[0] || ""}${e.last_name?.[0] || ""}`.toUpperCase();
              const dName = e.department_id ? deptMap.get(e.department_id) || "Unassigned" : "Unassigned";
              const jName = e.job_title_id ? titleMap.get(e.job_title_id) || "Staff" : "Staff";

              return (
                <div
                  key={e.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group"
                >
                  <div className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-bold text-base flex items-center justify-center shadow-md shadow-indigo-600/20">
                        {initials}
                      </div>

                      <div className="flex items-center gap-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            e.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {e.is_active ? "Active" : "Inactive"}
                        </span>
                        {e.is_department_head && (
                          <div className="bg-amber-500 text-white p-1 rounded-full shadow-xs" title="Department Head">
                            <Sparkles className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <Link
                        href={`/hr-payroll/employees/${e.id}`}
                        className="font-bold text-slate-900 group-hover:text-indigo-600 transition line-clamp-1 hover:underline text-base"
                      >
                        {e.full_name || `${e.first_name} ${e.last_name || ""}`}
                      </Link>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{jName}</p>
                      <p className="text-[11px] text-slate-400">{dName}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{e.work_email}</span>
                      </div>
                      {e.phone && (
                        <div className="flex items-center gap-2 truncate">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{e.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                    <Link
                      href={`/hr-payroll/employees/${e.id}`}
                      className="text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Profile
                    </Link>

                    <div className="flex items-center gap-1">
                      <Link
                        href={`/hr-payroll/employees/${e.id}/edit`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white transition"
                        title="Edit Page"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setEmployeeToDelete(e);
                          setIsDeleteOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition"
                        title="Delete Employee"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}

        {/* Pagination Navigation Bar */}
        {filteredEmployees.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                Showing <strong className="text-slate-900">{startIndex + 1}</strong> to{" "}
                <strong className="text-slate-900">{endIndex}</strong> of{" "}
                <strong className="text-slate-900">{totalFiltered}</strong> employees
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Page Navigation Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Numbered Page Buttons with Ellipses */}
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    if (totalPages <= 5) return true;
                    if (page === 1 || page === totalPages) return true;
                    return Math.abs(page - safeCurrentPage) <= 1;
                  })
                  .map((page, idx, arr) => {
                    const prev = arr[idx - 1];
                    return (
                      <React.Fragment key={page}>
                        {prev && page - prev > 1 && (
                          <span className="px-1 text-slate-300">...</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 rounded-lg font-semibold transition ${
                            safeCurrentPage === page
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                type="button"
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirm Dialog */}
        <DeleteEmployeeDialog
          isOpen={isDeleteOpen}
          onClose={() => {
            setIsDeleteOpen(false);
            setEmployeeToDelete(null);
          }}
          onSuccess={loadData}
          employee={employeeToDelete}
        />

        {/* Bulk Import Excel Modal */}
        <EmployeeImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => {
            setIsImportModalOpen(false);
            loadData();
          }}
        />
      </div>
    </DashboardLayout>
  );
}
