"use client";

import React, { useEffect, useState, useMemo, useRef, startTransition } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { BusinessProfile } from "@/types";
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Globe,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Mail,
  Phone,
} from "lucide-react";
import { useToast } from "@/context/toast-context";
import { DeleteConfirmDialog } from "@/components/administration/delete-confirm-dialog";

export default function BusinessesPage() {
  const { toast } = useToast();

  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Delete modal state
  const [businessToDelete, setBusinessToDelete] = useState<BusinessProfile | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setDebouncedSearch(searchQuery);
        setCurrentPage(1);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadData = async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    } else {
      setIsFetching(true);
    }
    setError(null);

    try {
      const res = await apiClient.get<BusinessProfile[]>("/business/");
      setBusinesses(res.data || []);
    } catch {
      setError("Failed to load business profiles from backend service.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadData(true);
    } else {
      loadData(false);
    }
  }, []);

  // Filtering
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
      const q = debouncedSearch.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        b.name_en.toLowerCase().includes(q) ||
        (b.legal_name && b.legal_name.toLowerCase().includes(q)) ||
        (b.email && b.email.toLowerCase().includes(q)) ||
        (b.city && b.city.toLowerCase().includes(q)) ||
        (b.country && b.country.toLowerCase().includes(q)) ||
        (b.cr_number && b.cr_number.toLowerCase().includes(q)) ||
        (b.vat_number && b.vat_number.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && b.is_active) ||
        (statusFilter === "inactive" && !b.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [businesses, debouncedSearch, statusFilter]);

  // Pagination calculation
  const totalItems = filteredBusinesses.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedBusinesses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBusinesses.slice(start, start + pageSize);
  }, [filteredBusinesses, currentPage, pageSize]);

  // Statistics
  const activeCount = useMemo(
    () => businesses.filter((b) => b.is_active).length,
    [businesses]
  );
  const inactiveCount = useMemo(
    () => businesses.filter((b) => !b.is_active).length,
    [businesses]
  );
  const countriesCount = useMemo(() => {
    const set = new Set(businesses.map((b) => b.country).filter(Boolean));
    return set.size;
  }, [businesses]);

  const handleStatusFilter = (status: string) => {
    startTransition(() => {
      setStatusFilter(status);
      setCurrentPage(1);
    });
  };

  const handleOpenDelete = (business: BusinessProfile) => {
    setBusinessToDelete(business);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!businessToDelete) return;
    await apiClient.delete(`/business/${businessToDelete.id}`);
    toast.success(
      "Business Profile Deleted",
      `Business "${businessToDelete.name_en}" has been removed.`
    );
    loadData(false);
  };

  const formatLogoUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return `${apiBase}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                <Building2 className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Tenant Businesses
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Platform-wide directory of multi-tenant businesses, compliance, and accounts
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(false)}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition"
              title="Refresh businesses"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              href="/administration/businesses/create"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              Create Business Profile
            </Link>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Businesses
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {businesses.length}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Active Tenants
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{activeCount}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Inactive Tenants
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {inactiveCount}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Countries
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {countriesCount}
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company name, CR/VAT, email, city, country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer transition"
            >
              <option value="all">All Operational Statuses</option>
              <option value="active">Active Tenants Only</option>
              <option value="inactive">Inactive Tenants Only</option>
            </select>
          </div>
        </div>

        {/* Data Table Container adhering to ui_in_place_filtering.md */}
        <div className="relative bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Top-rim indeterminate progress bar during background fetch */}
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-100 overflow-hidden z-20">
              <div className="w-full h-full bg-indigo-600 animate-pulse" />
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-5">Company Profile</th>
                  <th className="py-3 px-5">Registration &amp; Tax</th>
                  <th className="py-3 px-5">Location</th>
                  <th className="py-3 px-5">Contact Details</th>
                  <th className="py-3 px-5 text-center">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>

              {/* Row dimming during isFetching */}
              <tbody
                className={`divide-y divide-slate-100 text-xs transition-opacity duration-150 ${
                  isFetching ? "opacity-50 pointer-events-none" : "opacity-100"
                }`}
              >
                {initialLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-200" />
                          <div className="space-y-1">
                            <div className="h-4 bg-slate-200 rounded w-28" />
                            <div className="h-3 bg-slate-200 rounded w-20" />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="h-4 bg-slate-200 rounded w-24" />
                      </td>
                      <td className="py-4 px-5">
                        <div className="h-4 bg-slate-200 rounded w-20" />
                      </td>
                      <td className="py-4 px-5">
                        <div className="h-4 bg-slate-200 rounded w-28" />
                      </td>
                      <td className="py-4 px-5 text-center">
                        <div className="h-4 bg-slate-200 rounded w-16 mx-auto" />
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="h-4 bg-slate-200 rounded w-12 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : paginatedBusinesses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-700">
                        No businesses found
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Try adjusting your search query or status filter
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedBusinesses.map((biz) => {
                    const logoUrl = formatLogoUrl(biz.logo);

                    return (
                      <tr
                        key={biz.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                              {logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={logoUrl}
                                  alt={biz.name_en}
                                  className="w-full h-full object-contain p-1"
                                />
                              ) : (
                                <Building2 className="w-5 h-5 text-indigo-600" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-900 truncate">
                                  {biz.name_en}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  #{biz.id}
                                </span>
                              </div>
                              {biz.legal_name && (
                                <p className="text-[11px] text-slate-500 truncate">
                                  {biz.legal_name}
                                </p>
                              )}
                              {biz.currency_code && (
                                <span className="inline-block mt-0.5 text-[10px] font-mono text-indigo-600">
                                  {biz.currency_code} ({biz.currency_symbol})
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-5 text-slate-600">
                          {biz.cr_number ? (
                            <div>
                              <span className="text-[10px] font-semibold text-slate-400 block">CR:</span>
                              <span className="font-mono text-slate-800">{biz.cr_number}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">No CR</span>
                          )}
                          {biz.vat_number && (
                            <div className="mt-1">
                              <span className="text-[10px] font-semibold text-slate-400 block">VAT / BIN:</span>
                              <span className="font-mono text-slate-800">{biz.vat_number}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-slate-600">
                          <div className="flex items-center gap-1 text-slate-700 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>{biz.city || "Dhaka"}, {biz.country || "Bangladesh"}</span>
                          </div>
                          {biz.street && (
                            <p className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                              {biz.street}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-slate-600">
                          {biz.email && (
                            <div className="flex items-center gap-1 truncate max-w-xs text-slate-700">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{biz.email}</span>
                            </div>
                          )}
                          {biz.phone && (
                            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{biz.phone}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-center">
                          {biz.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <XCircle className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/administration/businesses/${biz.id}/edit`}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Edit business profile"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleOpenDelete(biz)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete business profile"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination & Count Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>
                Showing {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, totalItems)} of {totalItems} businesses
              </span>
              {isFetching && (
                <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    startTransition(() => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    });
                  }}
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs cursor-pointer focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1 || initialLoading}
                  className="p-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-semibold text-slate-800">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages || initialLoading}
                  className="p-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmDialog
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Business Profile?"
          description="Are you sure you want to permanently delete this tenant business profile? All linked users, employees, and records may be affected."
          itemIdentifier={
            businessToDelete
              ? `Tenant #${businessToDelete.id}: ${businessToDelete.name_en}`
              : undefined
          }
          confirmButtonText="Delete Business"
        />
      </div>
    </DashboardLayout>
  );
}
