"use client";

import React, { useState, useMemo, useEffect } from "react";
import { BranchOut, EmployeeOut } from "@/types";
import { apiClient } from "@/lib/api-client";
import {
  Building2,
  Users,
  GitBranch,
  Crown,
  Plus,
  Search,
  Filter,
  Download,
  LayoutGrid,
  CheckCircle2,
  XCircle,
  Eye,
  Edit2,
  Trash2,
  X,
  ArrowUpDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  MapPin,
  List,
} from "lucide-react";
import { BranchModal } from "./branch-modal";
import { BranchDetailDrawer } from "./branch-detail-drawer";
import { BranchDeleteDialog } from "./branch-delete-dialog";
import { BranchCardsView } from "./branch-cards-view";

interface BranchesTabProps {
  branches: BranchOut[];
  employees: EmployeeOut[];
  onRefresh: () => Promise<void>;
  businessId?: number;
}

export function BranchesTab({
  branches,
  employees,
  onRefresh,
  businessId = 1,
}: BranchesTabProps) {
  // View mode: Table View (default as requested) or Cards Grid View
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [headOfficeFilter, setHeadOfficeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"head_office" | "name_asc" | "name_desc" | "code" | "headcount_desc">("head_office");

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals & Drawer states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchOut | null>(null);

  const [selectedBranch, setSelectedBranch] = useState<BranchOut | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [branchToDelete, setBranchToDelete] = useState<BranchOut | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Compute Metrics
  const metrics = useMemo(() => {
    const total = branches.length;
    const hqCount = branches.filter((b) => b.is_head_office).length;
    const regionalCount = branches.filter((b) => b.branch_type === "regional_office").length;
    const outletCount = branches.filter((b) => b.branch_type === "retail_outlet" || b.branch_type === "warehouse_hub").length;
    const totalStaff = branches.reduce((acc, b) => acc + (b.employee_count || 0), 0);
    return { total, hqCount, regionalCount, outletCount, totalStaff };
  }, [branches]);

  // Filter and Sort
  const filteredBranches = useMemo(() => {
    return branches
      .filter((b) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            b.name.toLowerCase().includes(q) ||
            b.code.toLowerCase().includes(q) ||
            (b.city && b.city.toLowerCase().includes(q)) ||
            (b.manager_name && b.manager_name.toLowerCase().includes(q)) ||
            b.branch_type.toLowerCase().includes(q);
          if (!matches) return false;
        }

        // Branch Type
        if (typeFilter !== "all" && b.branch_type !== typeFilter) return false;

        // Head Office
        if (headOfficeFilter === "head_office" && !b.is_head_office) return false;
        if (headOfficeFilter === "non_hq" && b.is_head_office) return false;

        // Status
        if (statusFilter === "active" && !b.is_active) return false;
        if (statusFilter === "inactive" && b.is_active) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "head_office") {
          if (a.is_head_office !== b.is_head_office) return a.is_head_office ? -1 : 1;
          return a.name.localeCompare(b.name);
        }
        if (sortBy === "name_asc") return a.name.localeCompare(b.name);
        if (sortBy === "name_desc") return b.name.localeCompare(a.name);
        if (sortBy === "code") return a.code.localeCompare(b.code);
        if (sortBy === "headcount_desc") return (b.employee_count || 0) - (a.employee_count || 0);
        return 0;
      });
  }, [branches, searchQuery, typeFilter, headOfficeFilter, statusFilter, sortBy]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, headOfficeFilter, statusFilter, pageSize, sortBy]);

  // Pagination slicing
  const totalFiltered = filteredBranches.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalFiltered);

  const paginatedBranches = useMemo(() => {
    return filteredBranches.slice(startIndex, endIndex);
  }, [filteredBranches, startIndex, endIndex]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingBranch(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: BranchOut) => {
    setEditingBranch(b);
    setIsModalOpen(true);
  };

  const handleSaveBranch = async (payload: any) => {
    if (editingBranch) {
      await apiClient.put(`/branches/${editingBranch.id}`, payload);
    } else {
      await apiClient.post("/branches", payload);
    }
    await onRefresh();
  };

  const handleOpenDetail = (b: BranchOut) => {
    setSelectedBranch(b);
    setIsDrawerOpen(true);
  };

  const handleOpenDelete = (b: BranchOut) => {
    setBranchToDelete(b);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async (b: BranchOut) => {
    await apiClient.delete(`/branches/${b.id}`);
    if (selectedBranch?.id === b.id) {
      setIsDrawerOpen(false);
      setSelectedBranch(null);
    }
    await onRefresh();
  };

  const handleToggleActive = async (b: BranchOut) => {
    setActionLoadingId(b.id);
    try {
      await apiClient.put(`/branches/${b.id}`, { is_active: !b.is_active });
      await onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update branch status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExportExcel = () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/v1/branches/export-excel?business_id=${businessId}`;
    window.open(url, "_blank");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setHeadOfficeFilter("all");
    setStatusFilter("all");
    setSortBy("head_office");
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    typeFilter !== "all" ||
    headOfficeFilter !== "all" ||
    statusFilter !== "all" ||
    sortBy !== "head_office";

  return (
    <div className="space-y-6">
      {/* ── 1. Top Metrics Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Branches</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.total}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Corporate locations</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Corporate HQ</span>
            <Crown className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-700">{metrics.hqCount}</p>
          <p className="text-[11px] text-amber-600 font-medium mt-0.5">Primary headquarters</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Regional Offices</span>
            <GitBranch className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.regionalCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Divisional hubs</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Outlets & Hubs</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">{metrics.outletCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Retail & logistics</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Staff</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-indigo-600">{metrics.totalStaff}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Stationed employees</p>
        </div>
      </div>

      {/* ── 2. Action Controls & Filter Toolbar ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by branch name, code, city, or manager..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "table"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Table View
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "cards"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Card View
              </button>
            </div>

            {/* Export */}
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              title="Export to Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Export
            </button>

            {/* Create Branch Button */}
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Branch
            </button>
          </div>
        </div>

        {/* Filter Dropdowns row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            Filters:
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-indigo-600 bg-white"
          >
            <option value="all">All Branch Types</option>
            <option value="headquarters">Headquarters</option>
            <option value="regional_office">Regional Office</option>
            <option value="branch_office">Branch Office</option>
            <option value="retail_outlet">Retail Outlet</option>
            <option value="warehouse_hub">Warehouse Hub</option>
          </select>

          {/* Head Office Filter */}
          <select
            value={headOfficeFilter}
            onChange={(e) => setHeadOfficeFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-indigo-600 bg-white"
          >
            <option value="all">All Headquarters Statuses</option>
            <option value="head_office">Head Office (HQ) Only</option>
            <option value="non_hq">Branch Offices & Outlets Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-indigo-600 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 ml-auto">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-indigo-600 bg-white"
            >
              <option value="head_office">Head Office First</option>
              <option value="name_asc">Name (A → Z)</option>
              <option value="name_desc">Name (Z → A)</option>
              <option value="code">Branch Code</option>
              <option value="headcount_desc">Staff Count (Highest First)</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── 3. Content View: Table or Cards ── */}
      {viewMode === "cards" ? (
        <BranchCardsView
          branches={filteredBranches}
          searchQuery={searchQuery}
          onView={handleOpenDetail}
          onEdit={handleOpenEdit}
          onDelete={handleOpenDelete}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Branch Location</th>
                  <th className="py-3.5 px-4">Code</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Branch Manager</th>
                  <th className="py-3.5 px-4">City / Region</th>
                  <th className="py-3.5 px-4 text-center">Staff Count</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedBranches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-700">No branches match your filter criteria.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Try adjusting your search query or add a new branch.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedBranches.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => handleOpenDetail(b)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Name & Initial Icon */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                            {b.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {b.name}
                              </p>
                              {b.is_head_office && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Crown className="w-3 h-3 text-amber-500" /> Head Office
                                </span>
                              )}
                            </div>
                            {b.address && (
                              <p className="text-[11px] text-slate-400 truncate max-w-xs font-normal">
                                {b.address}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
                          {b.code}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4">
                        <span className="capitalize font-medium text-slate-800 text-[11px]">
                          {b.branch_type.replace("_", " ")}
                        </span>
                      </td>

                      {/* Branch Manager */}
                      <td className="py-3.5 px-4">
                        {b.manager_name ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                              {b.manager_name[0]}
                            </div>
                            <span className="font-medium text-slate-800">{b.manager_name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      {/* City / Location */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium text-[11px]">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{b.city || "Dhaka"}, {b.country || "Bangladesh"}</span>
                        </div>
                      </td>

                      {/* Staff Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 text-[11px]">
                          <Users className="w-3 h-3 text-indigo-500" />
                          {b.employee_count || 0}
                        </span>
                      </td>

                      {/* Active Status Toggle */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleActive(b)}
                          disabled={actionLoadingId === b.id}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all hover:scale-105"
                          title="Click to toggle status"
                        >
                          {b.is_active ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Row Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenDetail(b)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="View Staff Roster"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(b)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit Branch"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(b)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Branch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── 4. Pagination Footer ── */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            {/* Left: Info & Page Size */}
            <div className="flex items-center gap-4">
              <span>
                Showing <span className="font-bold text-slate-900">{totalFiltered === 0 ? 0 : startIndex + 1}</span> to{" "}
                <span className="font-bold text-slate-900">{endIndex}</span> of{" "}
                <span className="font-bold text-slate-900">{totalFiltered}</span> branches
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-md font-semibold text-slate-700 outline-none focus:border-indigo-600"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Right: Navigation Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                title="First Page"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="px-3 py-1 font-semibold text-slate-800">
                Page {safeCurrentPage} of {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                title="Last Page"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Modals & Drawers ── */}
      <BranchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveBranch}
        editingBranch={editingBranch}
        employees={employees}
        businessId={businessId}
      />

      <BranchDetailDrawer
        branch={selectedBranch}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        employees={employees}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
      />

      <BranchDeleteDialog
        branch={branchToDelete}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        employees={employees}
      />
    </div>
  );
}
