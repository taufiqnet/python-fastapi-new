"use client";

import React, { useEffect, useState, useMemo, useCallback, startTransition } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { OfferLetterOut, OfferLetterStatus } from "@/types";
import { OfferLetterModal } from "@/components/hr-payroll/offer-letters/modals/offer-letter-modal";
import {
  FileSignature,
  CheckCircle2,
  Clock,
  Ban,
  Plus,
  Search,
  Printer,
  Edit,
  Trash2,
  XCircle,
  Building,
  RotateCcw,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface BusinessItem {
  id: number;
  name_en: string;
}

export default function OfferLettersPage() {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();

  const isSuperuser = Boolean(user?.is_superuser);
  const currentBusinessId = user?.business_id || 1;

  // Data states
  const [letters, setLetters] = useState<OfferLetterOut[]>([]);
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
  const [editingLetter, setEditingLetter] = useState<OfferLetterOut | null>(null);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load Initial Reference Data
  useEffect(() => {
    async function loadBusinesses() {
      try {
        const res = await apiClient.get<BusinessItem[]>("/businesses");
        setBusinesses(res.data || []);
      } catch {
        // Fallback business
        setBusinesses([{ id: currentBusinessId, name_en: "Current Business" }]);
      }
    }
    loadBusinesses();
  }, [currentBusinessId]);

  // Fetch Offer Letters
  const fetchLetters = useCallback(async (isBackground = false) => {
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

      const res = await apiClient.get<OfferLetterOut[]>("/offer-letters", { params });
      setLetters(res.data || []);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to load offer letters.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  }, [selectedBusiness]);

  useEffect(() => {
    fetchLetters(false);
  }, [fetchLetters]);

  // Derived Business Map
  const bizMap = useMemo(() => {
    const map = new Map<number, string>();
    businesses.forEach((b) => map.set(b.id, b.name_en));
    return map;
  }, [businesses]);

  // Stat Counters
  const stats = useMemo(() => {
    const total = letters.length;
    const issued = letters.filter((l) => l.status === "issued").length;
    const draft = letters.filter((l) => l.status === "draft").length;
    const revoked = letters.filter((l) => l.status === "revoked").length;
    return { total, issued, draft, revoked };
  }, [letters]);

  // Filtered & Paginated Records
  const filteredLetters = useMemo(() => {
    return letters.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNo = l.letter_no?.toLowerCase().includes(q);
        const matchName = l.candidate_name?.toLowerCase().includes(q);
        const matchEmail = l.candidate_email?.toLowerCase().includes(q);
        const matchJob = l.job_title?.toLowerCase().includes(q);
        const matchDept = l.department?.toLowerCase().includes(q);
        if (!matchNo && !matchName && !matchEmail && !matchJob && !matchDept) return false;
      }
      return true;
    });
  }, [letters, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredLetters.length / pageSize));
  const paginatedLetters = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLetters.slice(start, start + pageSize);
  }, [filteredLetters, currentPage, pageSize]);

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

  // Delete Action
  const handleDelete = async (letter: OfferLetterOut) => {
    if (!window.confirm(`Are you sure you want to delete offer letter #${letter.letter_no} for ${letter.candidate_name}?`)) {
      return;
    }
    setDeletingId(letter.id);
    try {
      await apiClient.delete(`/offer-letters/${letter.id}`);
      toast.success("Offer Letter Deleted", `Letter #${letter.letter_no} was removed.`);
      fetchLetters(true);
    } catch {
      toast.error("Delete Failed", "Could not delete this offer letter.");
    } finally {
      setDeletingId(null);
    }
  };

  // Status Badge Component
  const renderStatusBadge = (st: OfferLetterStatus) => {
    switch (st) {
      case "issued":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Issued
          </span>
        );
      case "draft":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Draft
          </span>
        );
      case "revoked":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Ban className="w-3 h-3" /> Revoked
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
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Offer Letters</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate and issue official employment offer letters with compensation breakdown
            </p>
          </div>
          {hasPermission("hrm", "offer_letters", "create") && (
            <button
              onClick={() => {
                setEditingLetter(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition flex items-center gap-2 shadow-sm self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> Generate Offer Letter
            </button>
          )}
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Letters</p>
              <p className="text-lg font-bold text-slate-800">{stats.total}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Issued</p>
              <p className="text-lg font-bold text-emerald-600">{stats.issued}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Draft</p>
              <p className="text-lg font-bold text-amber-600">{stats.draft}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Revoked</p>
              <p className="text-lg font-bold text-rose-600">{stats.revoked}</p>
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
                placeholder="Search candidate, letter #, position..."
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
              <option value="issued">Issued</option>
              <option value="draft">Draft</option>
              <option value="revoked">Revoked</option>
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
          {/* Top-rim indeterminate progress bar during background fetch */}
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
                  <th className="py-3 px-4">Letter #</th>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Business</th>
                  <th className="py-3 px-4">Job Title & Dept</th>
                  <th className="py-3 px-4">Offered Salary</th>
                  <th className="py-3 px-4">Joining Date</th>
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
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                        <span>Loading offer letters...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedLetters.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No offer letters found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedLetters.map((letter) => (
                    <tr key={letter.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-indigo-600">
                        {letter.letter_no}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{letter.candidate_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {letter.candidate_email}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {bizMap.get(letter.business_id) || "— Global —"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800">{letter.job_title}</span>
                        {letter.department && (
                          <span className="text-[11px] text-slate-400 block">{letter.department}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        ৳{Number(letter.offered_salary).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{letter.joining_date}</td>
                      <td className="py-3.5 px-4">{renderStatusBadge(letter.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/hr-payroll/offer-letters/${letter.id}`}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="View / Print Document"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Link>
                          {hasPermission("hrm", "offer_letters", "update") && (
                            <button
                              onClick={() => {
                                setEditingLetter(letter);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              title="Edit Offer Letter"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {hasPermission("hrm", "offer_letters", "delete") && (
                            <button
                              onClick={() => handleDelete(letter)}
                              disabled={deletingId === letter.id}
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
              Showing {filteredLetters.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredLetters.length)} of {filteredLetters.length} entries
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

        {/* Offer Letter Create / Edit Modal */}
        <OfferLetterModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => fetchLetters(true)}
          letter={editingLetter}
          businesses={businesses}
          defaultBusinessId={currentBusinessId}
          isSuperuser={isSuperuser}
        />
      </div>
    </DashboardLayout>
  );
}
