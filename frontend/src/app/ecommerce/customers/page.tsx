"use client";

import React, { useEffect, useState, useMemo, useRef, startTransition } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { CustomerOut } from "@/types";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  Eye,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Award,
  DollarSign,
  Phone,
  Coins,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { CustomerFormModal } from "@/components/ecommerce/customers/customer-form-modal";
import { CustomerDetailDrawer } from "@/components/ecommerce/customers/customer-detail-drawer";
import { DeleteCustomerDialog } from "@/components/ecommerce/customers/delete-customer-dialog";

export default function CustomersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const businessId = user?.business_id || 1;

  // Data State
  const [customers, setCustomers] = useState<CustomerOut[]>([]);

  // Two-tier Loading per ui_in_place_filtering.md
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals & Drawer State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<CustomerOut | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOut | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerOut | null>(null);

  const loadData = async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    } else {
      setIsFetching(true);
    }
    setError(null);

    try {
      const res = await apiClient.get<CustomerOut[]>(
        `/customers/?business_id=${businessId}&limit=300`
      );
      setCustomers(res.data || []);
    } catch {
      setError("Failed to fetch customer directory from backend.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadData(true);
    }
  }, []);

  // Filter Handlers with React startTransition
  const handleSearchChange = (query: string) => {
    startTransition(() => {
      setSearchQuery(query);
      setCurrentPage(1);
    });
  };

  const handleStatusChange = (status: string) => {
    startTransition(() => {
      setStatusFilter(status);
      setCurrentPage(1);
    });
  };

  const handleTierChange = (tier: string) => {
    startTransition(() => {
      setTierFilter(tier);
      setCurrentPage(1);
    });
  };

  const clearFilters = () => {
    startTransition(() => {
      setSearchQuery("");
      setStatusFilter("all");
      setTierFilter("all");
      setCurrentPage(1);
    });
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.is_active).length;
    const totalCredit = customers.reduce((sum, c) => sum + Number(c.store_credit || 0), 0);
    const vipCount = customers.filter(
      (c) => c.membership_tier?.toLowerCase() === "vip" || c.membership_tier?.toLowerCase() === "gold"
    ).length;
    return { total, active, totalCredit, vipCount };
  }, [customers]);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.full_name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && c.is_active) ||
        (statusFilter === "inactive" && !c.is_active);

      const matchesTier =
        tierFilter === "all" ||
        (c.membership_tier && c.membership_tier.toLowerCase() === tierFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesTier;
    });
  }, [customers, searchQuery, statusFilter, tierFilter]);

  // Pagination Calculations
  const totalFiltered = filteredCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalFiltered);

  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice(startIndex, endIndex);
  }, [filteredCustomers, startIndex, endIndex]);

  const getTierColor = (tier?: string) => {
    switch (tier?.toLowerCase()) {
      case "vip":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "gold":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "silver":
        return "bg-slate-200 text-slate-800 border-slate-300";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" || statusFilter !== "all" || tierFilter !== "all";

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
              <span>Sales & POS</span>
              <span>•</span>
              <span>CRM & Loyalty Directory</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Users className="w-7 h-7 text-indigo-600" />
              Customer Accounts
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Maintain customer profiles, phone lookups, loyalty reward balances, and store credit.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => loadData(false)}
              disabled={isFetching}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
              title="Refresh Customers"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            </button>

            <a
              href={`/api/v1/customers/template-excel?business_id=${businessId}`}
              download
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Excel Export
            </a>

            <button
              type="button"
              onClick={() => {
                setCustomerToEdit(null);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition shadow-md shadow-indigo-600/25 active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              Add Customer
            </button>
          </div>
        </div>

        {/* Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Customers</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{metrics.total}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Active Accounts</p>
              <p className="text-xl font-bold text-emerald-700 mt-0.5">{metrics.active}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Store Credit Pool</p>
              <p className="text-xl font-bold text-amber-700 mt-0.5">
                {formatCurrency(metrics.totalCredit)}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">VIP & Gold Tier</p>
              <p className="text-xl font-bold text-purple-700 mt-0.5">{metrics.vipCount}</p>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search customers by name, phone number, or email..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Tier Filter */}
            <div className="flex items-center gap-2">
              <select
                value={tierFilter}
                onChange={(e) => handleTierChange(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Tiers</option>
                <option value="Regular">Regular</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
          </div>

          {/* Status Tabs Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Status:
              </span>
              {[
                { id: "all", label: "All Customers" },
                { id: "active", label: "Active" },
                { id: "inactive", label: "Inactive" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleStatusChange(tab.id)}
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
                Showing <strong className="text-slate-800">{filteredCustomers.length}</strong> of{" "}
                {customers.length} accounts
                {isFetching && <Loader2 className="w-3 h-3 text-indigo-600 animate-spin" />}
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

        {/* Data Container with Top-Rim Line - Never Unmounts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden relative">
          {/* Top-rim indeterminate progress bar */}
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-100 overflow-hidden z-20">
              <div className="w-full h-full bg-indigo-600 origin-left animate-indeterminate" />
            </div>
          )}

          {initialLoading && customers.length === 0 ? (
            <div className="p-16 text-center">
              <div className="flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-sm font-semibold text-slate-800">Loading customer profiles...</p>
                <p className="text-xs text-slate-400">Fetching accounts from database</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Membership</th>
                    <th className="py-3 px-4">Loyalty</th>
                    <th className="py-3 px-4">Store Credit</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-slate-100 text-xs ${isFetching ? "opacity-50 transition-opacity" : ""}`}>
                  {paginatedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No customer profiles match the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/75 transition-colors group">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {c.first_name.charAt(0)}
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCustomer(c);
                                  setIsDrawerOpen(true);
                                }}
                                className="font-bold text-slate-900 group-hover:text-indigo-600 hover:underline transition text-left"
                              >
                                {c.full_name}
                              </button>
                              {c.email && (
                                <p className="text-[11px] text-slate-400 truncate max-w-xs">{c.email}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{c.phone}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getTierColor(
                              c.membership_tier
                            )}`}
                          >
                            <Award className="w-3 h-3" />
                            {c.membership_tier || "Regular"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-indigo-600">
                          {c.loyalty_points || 0} pts
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700">
                          {formatCurrency(Number(c.store_credit || 0))}
                        </td>
                        <td className="py-3 px-4">
                          {c.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <XCircle className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(c);
                                setIsDrawerOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="View Customer Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCustomerToEdit(c);
                                setIsFormOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title="Edit Customer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCustomerToDelete(c);
                                setIsDeleteOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Customer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50/50">
            <div className="flex items-center gap-2 text-slate-500">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const newSize = Number(e.target.value);
                  startTransition(() => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  });
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>per page</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">
                Page <strong className="text-slate-800">{safeCurrentPage}</strong> of{" "}
                <strong className="text-slate-800">{totalPages}</strong>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => startTransition(() => setCurrentPage(1))}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => startTransition(() => setCurrentPage((p) => Math.max(1, p - 1)))}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    startTransition(() => setCurrentPage((p) => Math.min(totalPages, p + 1)))
                  }
                  disabled={safeCurrentPage >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => startTransition(() => setCurrentPage(totalPages))}
                  disabled={safeCurrentPage >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modals & Drawer */}
        <CustomerFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setCustomerToEdit(null);
          }}
          onSuccess={() => loadData(false)}
          customerToEdit={customerToEdit}
          businessId={businessId}
        />

        <CustomerDetailDrawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedCustomer(null);
          }}
          customer={selectedCustomer}
          onEdit={(cust) => {
            setIsDrawerOpen(false);
            setCustomerToEdit(cust);
            setIsFormOpen(true);
          }}
        />

        <DeleteCustomerDialog
          isOpen={isDeleteOpen}
          onClose={() => {
            setIsDeleteOpen(false);
            setCustomerToDelete(null);
          }}
          onSuccess={() => loadData(false)}
          customer={customerToDelete}
        />
      </div>
    </DashboardLayout>
  );
}
