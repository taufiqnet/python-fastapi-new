"use client";

import React, { useEffect, useState, useMemo, useCallback, startTransition } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import {
  AppointmentLetterOut,
  AppointmentStatus,
  DepartmentOut,
  JobTitleOut,
} from "@/types";
import { AppointmentLetterModal } from "@/components/hr-payroll/appointments/modals/appointment-letter-modal";
import {
  MailOpen,
  UserCheck,
  Send,
  FileText,
  Plus,
  Search,
  Printer,
  Edit,
  Trash2,
  UserPlus,
  RotateCcw,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface BusinessItem {
  id: number;
  name_en: string;
}

export default function AppointmentLettersPage() {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();

  const isSuperuser = Boolean(user?.is_superuser);
  const currentBusinessId = user?.business_id || 1;

  // Data states
  const [appointments, setAppointments] = useState<AppointmentLetterOut[]>([]);
  const [departments, setDepartments] = useState<DepartmentOut[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitleOut[]>([]);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);

  // Dual loading states invariant
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBusiness, setSelectedBusiness] = useState<string | number>(
    isSuperuser ? "" : currentBusinessId
  );

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentLetterOut | null>(null);

  // Action loading states
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load Reference Data
  useEffect(() => {
    async function loadRefs() {
      try {
        const [bRes, dRes, jRes] = await Promise.allSettled([
          apiClient.get<BusinessItem[]>("/businesses"),
          apiClient.get<DepartmentOut[]>("/departments?limit=500"),
          apiClient.get<JobTitleOut[]>("/job-titles?limit=500"),
        ]);
        if (bRes.status === "fulfilled") setBusinesses(bRes.value.data || []);
        if (dRes.status === "fulfilled") setDepartments(dRes.value.data || []);
        if (jRes.status === "fulfilled") setJobTitles(jRes.value.data || []);
      } catch {
        // Fallback
      }
    }
    loadRefs();
  }, []);

  // Fetch Appointment Letters
  const fetchAppointments = useCallback(async (isBackground = false) => {
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

      const res = await apiClient.get<AppointmentLetterOut[]>("/appointment-letters", { params });
      setAppointments(res.data || []);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to load appointment letters.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  }, [selectedBusiness]);

  useEffect(() => {
    fetchAppointments(false);
  }, [fetchAppointments]);

  // Derived Business Map
  const bizMap = useMemo(() => {
    const map = new Map<number, string>();
    businesses.forEach((b) => map.set(b.id, b.name_en));
    return map;
  }, [businesses]);

  // Stat Counters
  const stats = useMemo(() => {
    const total = appointments.length;
    const accepted = appointments.filter((a) => a.status === "accepted").length;
    const sent = appointments.filter((a) => a.status === "sent").length;
    const draft = appointments.filter((a) => a.status === "draft").length;
    return { total, accepted, sent, draft };
  }, [appointments]);

  // Filtered & Paginated Records
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = a.candidate_name?.toLowerCase().includes(q);
        const matchEmail = a.candidate_email?.toLowerCase().includes(q);
        const matchJob = a.job_title?.name?.toLowerCase().includes(q);
        const matchDept = a.department?.name?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchJob && !matchDept) return false;
      }
      return true;
    });
  }, [appointments, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / pageSize));
  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAppointments.slice(start, start + pageSize);
  }, [filteredAppointments, currentPage, pageSize]);

  // In-place Filter Handlers
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
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
    setStatusFilter("all");
    if (isSuperuser) setSelectedBusiness("");
    startTransition(() => {
      setCurrentPage(1);
    });
  };

  // Convert to Employee Action
  const handleConvertToEmployee = async (appt: AppointmentLetterOut) => {
    if (
      !window.confirm(
        `Convert ${appt.candidate_name} into a permanent employee? This will automatically initialize an employee profile and link their records.`
      )
    ) {
      return;
    }

    setConvertingId(appt.id);
    try {
      const res = await apiClient.post(`/appointment-letters/${appt.id}/convert-to-employee`);
      toast.success(
        "Candidate Onboarded",
        `Created employee record ${res.data?.employee_id || ""} for ${appt.candidate_name}`
      );
      fetchAppointments(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      toast.error("Conversion Failed", axiosErr.response?.data?.detail || "Could not convert appointment to employee.");
    } finally {
      setConvertingId(null);
    }
  };

  // Delete Action
  const handleDelete = async (appt: AppointmentLetterOut) => {
    if (!window.confirm(`Are you sure you want to delete the appointment letter for ${appt.candidate_name}?`)) {
      return;
    }
    setDeletingId(appt.id);
    try {
      await apiClient.delete(`/appointment-letters/${appt.id}`);
      toast.success("Appointment Letter Deleted", `Letter for ${appt.candidate_name} removed.`);
      fetchAppointments(true);
    } catch {
      toast.error("Delete Failed", "Could not delete appointment letter.");
    } finally {
      setDeletingId(null);
    }
  };

  // Status Badge Component
  const renderStatusBadge = (st: AppointmentStatus) => {
    switch (st) {
      case "accepted":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <UserCheck className="w-3 h-3" /> Accepted
          </span>
        );
      case "sent":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Send className="w-3 h-3" /> Sent
          </span>
        );
      case "draft":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <FileText className="w-3 h-3" /> Draft
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Appointment Letters</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Issue contractual appointment letters and onboard accepted candidates into employee directory
            </p>
          </div>
          {hasPermission("hrm", "appointment_letters", "create") && (
            <button
              onClick={() => {
                setEditingAppointment(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition flex items-center gap-2 shadow-sm self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> Create Appointment Letter
            </button>
          )}
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <MailOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Appointments</p>
              <p className="text-lg font-bold text-slate-800">{stats.total}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Accepted / Hired</p>
              <p className="text-lg font-bold text-emerald-600">{stats.accepted}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Pending / Sent</p>
              <p className="text-lg font-bold text-sky-600">{stats.sent}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Draft</p>
              <p className="text-lg font-bold text-amber-600">{stats.draft}</p>
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
                placeholder="Search candidate, role, department..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-xs rounded-xl border border-slate-200 p-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="accepted">Accepted</option>
              <option value="sent">Sent</option>
              <option value="draft">Draft</option>
            </select>

            {/* Business Selector (Superadmin) */}
            {isSuperuser && (
              <select
                value={selectedBusiness}
                onChange={(e) => handleBusinessChange(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 p-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[200px]"
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
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Business</th>
                  <th className="py-3 px-4">Role & Dept</th>
                  <th className="py-3 px-4">Joining Date</th>
                  <th className="py-3 px-4">Offered Gross</th>
                  <th className="py-3 px-4">Status</th>
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
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                        <span>Loading appointment letters...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No appointment letters found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedAppointments.map((appt) => (
                    <tr key={appt.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{appt.candidate_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {appt.candidate_email}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {bizMap.get(appt.business_id) || "— Global —"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800">
                          {appt.job_title?.name || "N/A"}
                        </span>
                        {appt.department?.name && (
                          <span className="text-[11px] text-slate-400 block">{appt.department.name}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{appt.offered_joining_date}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        ৳{Number(appt.offered_gross_salary).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">{renderStatusBadge(appt.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/hr-payroll/appointment-letters/${appt.id}`}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="View / Print Document"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Link>

                          {/* Convert to Employee Button */}
                          {appt.status !== "accepted" && hasPermission("hrm", "appointment_letters", "create") && (
                            <button
                              onClick={() => handleConvertToEmployee(appt)}
                              disabled={convertingId === appt.id}
                              className="p-1.5 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-40"
                              title="Convert to Employee"
                            >
                              {convertingId === appt.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <UserPlus className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {hasPermission("hrm", "appointment_letters", "update") && (
                            <button
                              onClick={() => {
                                setEditingAppointment(appt);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              title="Edit Appointment Letter"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {hasPermission("hrm", "appointment_letters", "delete") && (
                            <button
                              onClick={() => handleDelete(appt)}
                              disabled={deletingId === appt.id}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-40"
                              title="Delete Letter"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Persistent Pagination Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
            <div>
              Showing {filteredAppointments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredAppointments.length)} of {filteredAppointments.length} entries
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
        <AppointmentLetterModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => fetchAppointments(true)}
          appointment={editingAppointment}
          departments={departments}
          jobTitles={jobTitles}
          businesses={businesses}
          defaultBusinessId={currentBusinessId}
          isSuperuser={isSuperuser}
        />
      </div>
    </DashboardLayout>
  );
}
