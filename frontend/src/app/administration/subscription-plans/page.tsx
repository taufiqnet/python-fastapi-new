"use client";

import React, { useEffect, useState, useMemo, useRef, startTransition } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { SubscriptionPlan, TenantPlanStatus } from "@/types";
import {
  CreditCard,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Layers,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/context/toast-context";
import { DeleteConfirmDialog } from "@/components/administration/delete-confirm-dialog";

export default function SubscriptionPlansPage() {
  const { toast } = useToast();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [tenantStatus, setTenantStatus] = useState<TenantPlanStatus | null>(null);

  // Two-tier loading states per UI rule
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Delete modal state
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Debounce search input
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
      const [plansRes, tenantRes] = await Promise.allSettled([
        apiClient.get<SubscriptionPlan[]>("/subscription-plans/api"),
        apiClient.get<TenantPlanStatus>("/subscription-plans/api/tenant/current"),
      ]);

      if (plansRes.status === "fulfilled") {
        setPlans(plansRes.value.data || []);
      } else {
        throw new Error("Failed to load subscription plans");
      }

      if (tenantRes.status === "fulfilled") {
        setTenantStatus(tenantRes.value.data || null);
      }
    } catch {
      setError("Failed to load subscription plans from backend service.");
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

  const handleStatusFilterChange = (val: "all" | "active" | "inactive") => {
    startTransition(() => {
      setStatusFilter(val);
      setCurrentPage(1);
    });
  };

  const handleRefresh = () => {
    loadData(false);
  };

  const handleDeleteClick = (plan: SubscriptionPlan) => {
    setPlanToDelete(plan);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!planToDelete) return;
    try {
      await apiClient.delete(`/subscription-plans/api/${planToDelete.id}`);
      setPlans((prev) => prev.filter((p) => p.id !== planToDelete.id));
      toast.success(
        "Plan Deleted",
        `Plan "${planToDelete.name}" was successfully removed.`
      );
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to delete subscription plan.";
      toast.error("Error", errorMsg);
    } finally {
      setIsDeleteOpen(false);
      setPlanToDelete(null);
    }
  };

  // Filtered plans
  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const matchesSearch =
        debouncedSearch === "" ||
        plan.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (plan.description &&
          plan.description.toLowerCase().includes(debouncedSearch.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && plan.is_active) ||
        (statusFilter === "inactive" && !plan.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [plans, debouncedSearch, statusFilter]);

  const totalPages = Math.ceil(filteredPlans.length / pageSize) || 1;
  const paginatedPlans = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPlans.slice(start, start + pageSize);
  }, [filteredPlans, currentPage, pageSize]);

  const activePlansCount = useMemo(() => plans.filter((p) => p.is_active).length, [plans]);
  const totalPermissionsAssigned = useMemo(
    () => plans.reduce((acc, p) => acc + (p.permission_ids?.length || 0), 0),
    [plans]
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <CreditCard className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Subscription Plans
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure plan tiers and permission packages for business tenant assignment.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/60 shadow-sm transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-indigo-500" : ""}`} />
              <span>Refresh</span>
            </button>

            <Link
              href="/administration/subscription-plans/create"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>New Plan</span>
            </Link>
          </div>
        </div>

        {/* Domestic Software Pure RBAC Banner */}
        <div className="rounded-2xl p-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20 text-emerald-900 dark:text-emerald-100 flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Domestic Software: Pure RBAC Strategy Active</span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                  Subscription Paywalls Bypassed
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                All feature access is strictly governed by User Roles & Permissions. Plans here define administrative packaging for tenants without blocking internal staff.
              </p>
            </div>
          </div>
          {tenantStatus && (
            <div className="hidden lg:flex flex-col items-end shrink-0 text-xs">
              <span className="text-gray-500 dark:text-gray-400">Assigned Business Plan</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {tenantStatus.plan_name}
              </span>
            </div>
          )}
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Plans</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                {plans.length}
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Active Plans</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                {activePlansCount}
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Permissions Assigned</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                {totalPermissionsAssigned}
              </h3>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-gray-800/80 p-3 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search plans by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 text-gray-900 dark:text-white placeholder-gray-400 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStatusFilterChange("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors ${
                statusFilter === "all"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleStatusFilterChange("active")}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors ${
                statusFilter === "active"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Active Only
            </button>
            <button
              onClick={() => handleStatusFilterChange("inactive")}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors ${
                statusFilter === "inactive"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Inactive
            </button>
          </div>
        </div>

        {/* Table Container with In-Place Non-Destructive Filtering */}
        <div className="relative rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 overflow-hidden shadow-xs">
          {/* Top-rim indeterminate progress bar during background fetch */}
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-100 dark:bg-indigo-950 overflow-hidden z-20">
              <div className="w-full h-full bg-indigo-600 origin-left animate-indeterminate" />
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className={`w-full text-left text-sm transition-opacity duration-200 ${isFetching ? "opacity-75" : "opacity-100"}`}>
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700/80 bg-gray-50/75 dark:bg-gray-900/40 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Plan Name</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5">Permissions</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {initialLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                      <div className="inline-flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                        <span>Loading subscription plans...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedPlans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <div className="max-w-xs mx-auto space-y-2">
                        <p className="font-semibold text-gray-700 dark:text-gray-300">No subscription plans found</p>
                        <p className="text-xs text-gray-400">
                          {debouncedSearch
                            ? `No plans matching "${debouncedSearch}".`
                            : "Create your first plan to package features for tenants."}
                        </p>
                        <Link
                          href="/administration/subscription-plans/create"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs mt-2"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Create Plan</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedPlans.map((plan) => (
                    <tr
                      key={plan.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-700/20 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase">
                            {plan.name.slice(0, 2)}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {plan.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 max-w-sm truncate">
                        {plan.description || "—"}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                          <Sparkles className="w-3 h-3" />
                          {plan.permission_ids?.length || 0} features
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {plan.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                            <XCircle className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/administration/subscription-plans/${plan.id}/edit`}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 rounded-lg transition-colors"
                            title="Edit Plan"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(plan)}
                            className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 rounded-lg transition-colors"
                            title="Delete Plan"
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

          {/* Pagination */}
          {!initialLoading && filteredPlans.length > 0 && (
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-200 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-900/20 text-xs text-gray-500 dark:text-gray-400">
              <span>
                Showing {Math.min((currentPage - 1) * pageSize + 1, filteredPlans.length)} to{" "}
                {Math.min(currentPage * pageSize, filteredPlans.length)} of {filteredPlans.length} plans
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                >
                  Previous
                </button>
                <span className="px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Subscription Plan"
        description={`Are you sure you want to delete "${planToDelete?.name}"? Businesses assigned to this plan should be reassigned.`}
      />
    </DashboardLayout>
  );
}
