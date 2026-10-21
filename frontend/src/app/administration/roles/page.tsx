"use client";

import React, { useEffect, useState, useMemo, useRef, startTransition } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { Role, BusinessProfile, Permission } from "@/types";
import {
  ShieldCheck,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Building2,
  KeyRound,
  Layers,
  Globe,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/context/toast-context";
import { DeleteConfirmDialog } from "@/components/administration/delete-confirm-dialog";

export default function RolesPage() {
  const { toast } = useToast();

  const [roles, setRoles] = useState<Role[]>([]);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  // Two-tier loading states per UI rule
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Delete modal state
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
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

      const [rolesRes, bizRes, permsRes] = await Promise.allSettled([
        apiClient.get<Role[]>(`/roles/api${bizParam}`),
        apiClient.get<BusinessProfile[]>("/business/"),
        apiClient.get<Permission[]>("/permissions/api"),
      ]);

      if (rolesRes.status === "fulfilled") {
        setRoles(rolesRes.value.data || []);
      } else {
        throw new Error("Failed to load roles");
      }

      if (bizRes.status === "fulfilled") {
        setBusinesses(bizRes.value.data || []);
      }

      if (permsRes.status === "fulfilled") {
        setPermissions(permsRes.value.data || []);
      }
    } catch {
      setError("Failed to load roles and permissions from backend service.");
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

  // Client-side filtering by search keyword
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const matchesSearch =
        debouncedSearch.trim() === "" ||
        r.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (r.description &&
          r.description.toLowerCase().includes(debouncedSearch.toLowerCase()));
      return matchesSearch;
    });
  }, [roles, debouncedSearch]);

  // Pagination calculation
  const totalItems = filteredRoles.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedRoles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRoles.slice(start, start + pageSize);
  }, [filteredRoles, currentPage, pageSize]);

  // Statistics
  const globalRolesCount = useMemo(
    () => roles.filter((r) => !r.business_id).length,
    [roles]
  );
  const tenantRolesCount = useMemo(
    () => roles.filter((r) => !!r.business_id).length,
    [roles]
  );

  const handleBusinessFilter = (bizId: string) => {
    startTransition(() => {
      setSelectedBusinessId(bizId);
      setCurrentPage(1);
    });
  };

  const handleOpenDelete = (role: Role) => {
    if (role.id === 1 || role.name === "admin") {
      toast.error(
        "Protected System Role",
        "The core System Admin role cannot be removed."
      );
      return;
    }
    setRoleToDelete(role);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;
    await apiClient.delete(`/roles/api/${roleToDelete.id}`);
    toast.success("Role Deleted", `Role "${roleToDelete.name}" has been removed.`);
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
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Roles & Permissions
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define custom access roles and manage granular feature permissions across tenants
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
              title="Refresh roles"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              href="/administration/roles/create"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              Create Role
            </Link>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Roles
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{roles.length}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Global Roles
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{globalRolesCount}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Tenant Roles
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{tenantRolesCount}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                System Perms
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{permissions.length}</p>
            </div>
          </div>
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search roles by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedBusinessId}
              onChange={(e) => handleBusinessFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer transition"
            >
              <option value="all">All Business Scopes</option>
              <option value="0">Global Roles Only (No Tenant)</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name_en || b.legal_name} (#{b.id})
                </option>
              ))}
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
                  <th className="py-3 px-5">Role Name</th>
                  <th className="py-3 px-5">Scope / Business</th>
                  <th className="py-3 px-5 text-center">Assigned Permissions</th>
                  <th className="py-3 px-5">Description</th>
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
                        <div className="h-4 bg-slate-200 rounded w-28" />
                      </td>
                      <td className="py-4 px-5">
                        <div className="h-4 bg-slate-200 rounded w-24" />
                      </td>
                      <td className="py-4 px-5 text-center">
                        <div className="h-4 bg-slate-200 rounded w-16 mx-auto" />
                      </td>
                      <td className="py-4 px-5">
                        <div className="h-4 bg-slate-200 rounded w-48" />
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="h-4 bg-slate-200 rounded w-12 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : paginatedRoles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-700">No roles found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Try adjusting your search query or business scope filter
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedRoles.map((role) => {
                    const isGlobal = !role.business_id;
                    const matchedBiz = businesses.find((b) => b.id === role.business_id);
                    const permsCount = role.permissions ? role.permissions.length : 0;
                    const isCoreAdmin = role.id === 1 || role.name === "admin";

                    return (
                      <tr
                        key={role.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-3.5 px-5 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{role.name}</span>
                            {isCoreAdmin && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                System
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-5">
                          {isGlobal ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Globe className="w-3 h-3" /> Global Scope
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Building2 className="w-3 h-3" />
                              {matchedBiz?.name_en || matchedBiz?.legal_name || `Tenant #${role.business_id}`}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
                            <KeyRound className="w-3 h-3 text-indigo-600" />
                            {permsCount} perms
                          </span>
                        </td>

                        <td className="py-3.5 px-5 text-slate-500 max-w-xs truncate">
                          {role.description || "—"}
                        </td>

                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/administration/roles/${role.id}/edit`}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Edit role"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>

                            {!isCoreAdmin && (
                              <button
                                type="button"
                                onClick={() => handleOpenDelete(role)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Delete role"
                              >
                                <Trash2 className="w-4 h-4" />
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

          {/* Pagination & Count Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>
                Showing {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, totalItems)} of {totalItems} roles
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
          title="Delete Role?"
          description="Are you sure you want to delete this role? Any users assigned to this role will lose its inherited permissions."
          itemIdentifier={roleToDelete ? `Role: ${roleToDelete.name}` : undefined}
          confirmButtonText="Delete Role"
        />
      </div>
    </DashboardLayout>
  );
}
