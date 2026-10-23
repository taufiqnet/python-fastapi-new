"use client";

import React, { useEffect, useState, useMemo, useRef, startTransition } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { User, Role, BusinessProfile } from "@/types";
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Building2,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  CreditCard,
  Wifi,
  ChevronLeft,
  ChevronRight,
  Loader2,
  KeyRound,
} from "lucide-react";
import { useToast } from "@/context/toast-context";
import { DeleteConfirmDialog } from "@/components/administration/delete-confirm-dialog";
import { SubscriptionPlan } from "@/types";

export default function UsersPage() {
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  // Two-tier loading states per UI rule
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("all");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Delete modal state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
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
      const bizParam =
        selectedBusinessId !== "all" ? `?business_id=${selectedBusinessId}` : "";

      const [usersRes, rolesRes, bizRes, plansRes] = await Promise.allSettled([
        apiClient.get<User[]>(`/users/api${bizParam}`),
        apiClient.get<Role[]>("/roles/api"),
        apiClient.get<BusinessProfile[]>("/business/"),
        apiClient.get<SubscriptionPlan[]>("/subscription-plans/api"),
      ]);

      if (usersRes.status === "fulfilled") {
        setUsers(usersRes.value.data || []);
      } else {
        throw new Error("Failed to load users");
      }

      if (rolesRes.status === "fulfilled") {
        setRoles(rolesRes.value.data || []);
      }

      if (bizRes.status === "fulfilled") {
        setBusinesses(bizRes.value.data || []);
      }

      if (plansRes.status === "fulfilled") {
        setPlans(plansRes.value.data || []);
      }
    } catch {
      setError("Failed to load user accounts from backend service.");
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
  }, [selectedBusinessId]);

  // Client-side filtering by search, role, status
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = debouncedSearch.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.toLowerCase().includes(q));

      const matchesRole =
        selectedRoleId === "all" ||
        (u.roles && u.roles.some((r) => String(r.id) === selectedRoleId));

      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "active" && u.is_active) ||
        (selectedStatus === "inactive" && !u.is_active) ||
        (selectedStatus === "superuser" && u.is_superuser);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, debouncedSearch, selectedRoleId, selectedStatus]);

  // Pagination calculation
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Statistics
  const activeCount = useMemo(() => users.filter((u) => u.is_active).length, [users]);
  const superuserCount = useMemo(
    () => users.filter((u) => u.is_superuser).length,
    [users]
  );
  const offlineCount = useMemo(
    () => users.filter((u) => u.can_use_offline_mode).length,
    [users]
  );

  const handleBusinessFilter = (bizId: string) => {
    startTransition(() => {
      setSelectedBusinessId(bizId);
      setCurrentPage(1);
    });
  };

  const handleRoleFilter = (roleId: string) => {
    startTransition(() => {
      setSelectedRoleId(roleId);
      setCurrentPage(1);
    });
  };

  const handleStatusFilter = (status: string) => {
    startTransition(() => {
      setSelectedStatus(status);
      setCurrentPage(1);
    });
  };

  const handleOpenDelete = (user: User) => {
    if (user.is_superuser) {
      toast.error(
        "Protected System Superadmin",
        "System Admin user accounts cannot be deleted."
      );
      return;
    }
    setUserToDelete(user);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    await apiClient.delete(`/users/api/${userToDelete.id}`);
    toast.success(
      "User Deleted",
      `User account "${userToDelete.username}" has been removed.`
    );
    loadData(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                <Users className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  User Management
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage login accounts, business tenant assignments, and individual security access
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
              title="Refresh users"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              href="/administration/users/create"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
            >
              <UserPlus className="w-4 h-4" />
              Create User
            </Link>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Users
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{users.length}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Active Accounts
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{activeCount}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Superadmins
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{superuserCount}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Offline Mode
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{offlineCount}</p>
            </div>
          </div>
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search users by username, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedBusinessId}
              onChange={(e) => handleBusinessFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer transition"
            >
              <option value="all">All Business Scopes</option>
              <option value="0">Global / Unassigned Tenant</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name_en || b.legal_name} (#{b.id})
                </option>
              ))}
            </select>

            <select
              value={selectedRoleId}
              onChange={(e) => handleRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer transition"
            >
              <option value="all">All Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer transition"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="superuser">Superadmin Only</option>
            </select>
          </div>
        </div>

        {/* Data Table Container with in-place non-destructive filtering */}
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
                  <th className="py-3 px-5">User</th>
                  <th className="py-3 px-5">Business Scope</th>
                  <th className="py-3 px-5">Assigned Roles</th>
                  <th className="py-3 px-5 text-center">Custom Perms</th>
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
                          <div className="w-9 h-9 rounded-full bg-slate-200" />
                          <div className="space-y-1">
                            <div className="h-4 bg-slate-200 rounded w-28" />
                            <div className="h-3 bg-slate-200 rounded w-36" />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="h-4 bg-slate-200 rounded w-24" />
                      </td>
                      <td className="py-4 px-5">
                        <div className="h-4 bg-slate-200 rounded w-20" />
                      </td>
                      <td className="py-4 px-5 text-center">
                        <div className="h-4 bg-slate-200 rounded w-16 mx-auto" />
                      </td>
                      <td className="py-4 px-5 text-center">
                        <div className="h-4 bg-slate-200 rounded w-16 mx-auto" />
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="h-4 bg-slate-200 rounded w-12 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-700">No users found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Try adjusting your search query, role, or business filters
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => {
                    const matchedBiz = businesses.find((b) => b.id === user.business_id);
                    const directPermsCount = user.direct_permissions
                      ? user.direct_permissions.length
                      : 0;

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {user.first_name
                                ? user.first_name[0]
                                : user.username[0]?.toUpperCase() || "U"}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-900 truncate">
                                  {user.username}
                                </span>
                                {user.is_superuser && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    Admin
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate">
                                {user.email}
                              </p>
                              {user.phone && (
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {user.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-5">
                          {user.business_id ? (
                            <div className="flex flex-col gap-1 items-start">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Building2 className="w-3 h-3" />
                                {matchedBiz?.name_en || matchedBiz?.legal_name || `Tenant #${user.business_id}`}
                              </span>
                              {matchedBiz?.subscription_plan_id && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                  <CreditCard className="w-2.5 h-2.5" />
                                  {plans.find((p) => p.id === matchedBiz.subscription_plan_id)?.name || "Tier"} Plan
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              Global / Unscoped
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-5">
                          {user.roles && user.roles.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {user.roles.map((r) => {
                                let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
                                let displayName = r.name;
                                if (r.name === "admin") {
                                  badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
                                } else if (r.name === "hr_basic") {
                                  badgeColor = "bg-sky-50 text-sky-700 border-sky-200 font-bold";
                                  displayName = "HR Basic";
                                } else if (r.name === "hr_pro") {
                                  badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold";
                                  displayName = "HR Pro";
                                } else if (r.name === "hr_enterprise") {
                                  badgeColor = "bg-purple-50 text-purple-700 border-purple-200 font-bold";
                                  displayName = "HR Enterprise";
                                } else if (r.name === "hr_payroll") {
                                  badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-200";
                                  displayName = "HR Payroll";
                                } else if (r.name === "ecommerce") {
                                  badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
                                  displayName = "Ecommerce";
                                }

                                return (
                                  <span
                                    key={r.id}
                                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badgeColor}`}
                                  >
                                    {displayName}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">No roles</span>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-center">
                          {directPermsCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              <KeyRound className="w-3 h-3 text-indigo-600" />
                              {directPermsCount}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {user.is_active ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                <XCircle className="w-3 h-3" /> Inactive
                              </span>
                            )}

                            {user.can_use_offline_mode && (
                              <span
                                className="p-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200"
                                title="Offline mode enabled"
                              >
                                <Wifi className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {user.email === "admin@example.com" || user.username === "admin" ? (
                              <span
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200"
                                title="Root Super Admin account is permanently protected"
                              >
                                Protected Root
                              </span>
                            ) : (
                              <>
                                <Link
                                  href={`/administration/users/${user.id}/edit`}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                  title="Edit user"
                                >
                                  <Edit className="w-4 h-4" />
                                </Link>

                                {!user.is_superuser && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDelete(user)}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                    title="Delete user"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </>
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

          {/* Pagination & Count Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>
                Showing {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, totalItems)} of {totalItems} users
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
          title="Delete User Account?"
          description="Are you sure you want to permanently delete this user account? The user will lose access to all tenant workspaces immediately."
          itemIdentifier={
            userToDelete
              ? `User: ${userToDelete.username} (${userToDelete.email})`
              : undefined
          }
          confirmButtonText="Delete User"
        />
      </div>
    </DashboardLayout>
  );
}
