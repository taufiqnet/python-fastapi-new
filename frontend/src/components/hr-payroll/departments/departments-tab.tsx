"use client";

import React, { useState, useMemo, useEffect } from "react";
import { DepartmentOut, EmployeeOut, BranchOut } from "@/types";
import { apiClient } from "@/lib/api-client";
import {
  Building2,
  Users,
  Layers,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  Upload,
  LayoutGrid,
  FolderTree,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Edit2,
  Trash2,
  X,
  ArrowUpDown,
  RefreshCw,
  GitBranch,
} from "lucide-react";
import { DepartmentModal } from "./department-modal";
import { DepartmentDetailDrawer } from "./department-detail-drawer";
import { DepartmentDeleteDialog } from "./department-delete-dialog";
import { DepartmentTreeView } from "./department-tree-view";
import { DepartmentImportModal } from "./department-import-modal";

interface DepartmentsTabProps {
  departments: DepartmentOut[];
  employees: EmployeeOut[];
  branches: BranchOut[];
  onRefresh: () => Promise<void>;
  businessId?: number;
}

export function DepartmentsTab({
  departments,
  employees,
  branches,
  onRefresh,
  businessId = 1,
}: DepartmentsTabProps) {
  // View mode: Table or Interactive Tree
  const [viewMode, setViewMode] = useState<"table" | "tree">("table");

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [hierarchyFilter, setHierarchyFilter] = useState<"all" | "top_level" | "sub_department">("all");
  const [headFilter, setHeadFilter] = useState<"all" | "assigned" | "unassigned">("all");
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "code" | "headcount_desc">("name_asc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals & Drawers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentOut | null>(null);
  const [initialParentId, setInitialParentId] = useState<string | null>(null);

  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentOut | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [departmentToDelete, setDepartmentToDelete] = useState<DepartmentOut | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Compute Metrics
  const metrics = useMemo(() => {
    const total = departments.length;
    const topLevel = departments.filter((d) => !d.parent_department_id).length;
    const subDepts = total - topLevel;
    const withHead = departments.filter((d) => Boolean(d.head_employee_id)).length;
    const headCoverage = total > 0 ? Math.round((withHead / total) * 100) : 0;
    const totalStaff = departments.reduce((acc, d) => acc + (d.employee_count || 0), 0);
    return { total, topLevel, subDepts, withHead, headCoverage, totalStaff };
  }, [departments]);

  // Filter and Sort departments
  const filteredDepartments = useMemo(() => {
    return departments
      .filter((d) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            d.name.toLowerCase().includes(q) ||
            (d.code && d.code.toLowerCase().includes(q)) ||
            (d.slug && d.slug.toLowerCase().includes(q)) ||
            (d.head_employee_name && d.head_employee_name.toLowerCase().includes(q)) ||
            (d.parent_department_name && d.parent_department_name.toLowerCase().includes(q));
          if (!matches) return false;
        }

        // Status
        if (statusFilter === "active" && !d.is_active) return false;
        if (statusFilter === "inactive" && d.is_active) return false;

        // Hierarchy
        if (hierarchyFilter === "top_level" && d.parent_department_id) return false;
        if (hierarchyFilter === "sub_department" && !d.parent_department_id) return false;

        // Head
        if (headFilter === "assigned" && !d.head_employee_id) return false;
        if (headFilter === "unassigned" && d.head_employee_id) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name_asc") return a.name.localeCompare(b.name);
        if (sortBy === "name_desc") return b.name.localeCompare(a.name);
        if (sortBy === "code") return (a.code || "").localeCompare(b.code || "");
        if (sortBy === "headcount_desc") return (b.employee_count || 0) - (a.employee_count || 0);
        return 0;
      });
  }, [departments, searchQuery, statusFilter, hierarchyFilter, headFilter, sortBy]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, hierarchyFilter, headFilter, pageSize, sortBy]);

  // Pagination slicing
  const totalFiltered = filteredDepartments.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalFiltered);

  const paginatedDepartments = useMemo(() => {
    return filteredDepartments.slice(startIndex, endIndex);
  }, [filteredDepartments, startIndex, endIndex]);

  // CRUD Handlers
  const handleOpenCreate = (parentId?: string | null) => {
    setEditingDepartment(null);
    setInitialParentId(parentId || null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (d: DepartmentOut) => {
    setEditingDepartment(d);
    setInitialParentId(d.parent_department_id || null);
    setIsModalOpen(true);
  };

  const handleSaveDepartment = async (payload: any) => {
    if (editingDepartment) {
      await apiClient.put(`/departments/${editingDepartment.id}`, payload);
    } else {
      await apiClient.post("/departments", payload);
    }
    await onRefresh();
  };

  const handleOpenDetail = (d: DepartmentOut) => {
    setSelectedDepartment(d);
    setIsDrawerOpen(true);
  };

  const handleOpenDelete = (d: DepartmentOut) => {
    setDepartmentToDelete(d);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async (d: DepartmentOut) => {
    await apiClient.delete(`/departments/${d.id}`);
    if (selectedDepartment?.id === d.id) {
      setIsDrawerOpen(false);
      setSelectedDepartment(null);
    }
    await onRefresh();
  };

  const handleToggleActive = async (d: DepartmentOut) => {
    setActionLoadingId(d.id);
    try {
      await apiClient.put(`/departments/${d.id}`, { is_active: !d.is_active });
      await onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update department status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExportExcel = () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/v1/departments/export-excel?business_id=${businessId}`;
    window.open(url, "_blank");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setHierarchyFilter("all");
    setHeadFilter("all");
    setSortBy("name_asc");
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    statusFilter !== "all" ||
    hierarchyFilter !== "all" ||
    headFilter !== "all" ||
    sortBy !== "name_asc";

  return (
    <div className="space-y-6">
      {/* ── 1. Top Metrics Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Departments</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.total}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Corporate divisions</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Top-Level Pillars</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.topLevel}</p>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Primary executive pillars</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Sub-Departments</span>
            <GitBranch className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.subDepts}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Specialized sub-units</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">HOD Coverage</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-purple-700">{metrics.headCoverage}%</p>
            <span className="text-xs text-slate-500 font-medium">({metrics.withHead}/{metrics.total})</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Heads assigned</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Staff Assigned</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-indigo-600">{metrics.totalStaff}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Covered employees</p>
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
              placeholder="Search by name, code, slug, or head of department..."
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
                <LayoutGrid className="w-3.5 h-3.5" />
                Table View
              </button>
              <button
                onClick={() => setViewMode("tree")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "tree"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FolderTree className="w-3.5 h-3.5" />
                Hierarchy Tree
              </button>
            </div>

            {/* Import / Export */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              title="Import Excel"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              Import
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              title="Export to Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Export
            </button>

            {/* Create Department Button */}
            <button
              onClick={() => handleOpenCreate()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Department
            </button>
          </div>
        </div>

        {/* Filter Dropdowns row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            Filters:
          </div>

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

          {/* Hierarchy Filter */}
          <select
            value={hierarchyFilter}
            onChange={(e) => setHierarchyFilter(e.target.value as any)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-indigo-600 bg-white"
          >
            <option value="all">All Hierarchy Levels</option>
            <option value="top_level">Top-Level Pillars Only</option>
            <option value="sub_department">Sub-Departments Only</option>
          </select>

          {/* Head Assigned Filter */}
          <select
            value={headFilter}
            onChange={(e) => setHeadFilter(e.target.value as any)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-indigo-600 bg-white"
          >
            <option value="all">All Leadership States</option>
            <option value="assigned">HOD Assigned</option>
            <option value="unassigned">HOD Missing / Pending</option>
          </select>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 ml-auto">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-indigo-600 bg-white"
            >
              <option value="name_asc">Name (A → Z)</option>
              <option value="name_desc">Name (Z → A)</option>
              <option value="code">Code</option>
              <option value="headcount_desc">Headcount (Highest First)</option>
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

      {/* ── 3. Content View: Table or Tree ── */}
      {viewMode === "tree" ? (
        <DepartmentTreeView
          departments={filteredDepartments}
          searchQuery={searchQuery}
          onView={handleOpenDetail}
          onEdit={handleOpenEdit}
          onAddSubDepartment={(p) => handleOpenCreate(p.id)}
          onDelete={handleOpenDelete}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Code / Slug</th>
                  <th className="py-3.5 px-4">Parent Pillar</th>
                  <th className="py-3.5 px-4">Head of Department</th>
                  <th className="py-3.5 px-4 text-center">Staff Count</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedDepartments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-700">No departments match your filter criteria.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Try adjusting your search terms or create a new department.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedDepartments.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => handleOpenDetail(d)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                            {d.name[0]}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {d.name}
                            </p>
                            {d.description && (
                              <p className="text-[11px] text-slate-400 truncate max-w-xs font-normal">
                                {d.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Code / Slug */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 font-mono text-xs">
                          {d.code ? (
                            <span className="inline-block px-1.5 py-0.2 rounded bg-slate-100 font-bold text-slate-700">
                              {d.code}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic font-sans">—</span>
                          )}
                          <p className="text-[10px] text-slate-400 font-normal">{d.slug}</p>
                        </div>
                      </td>

                      {/* Parent Department */}
                      <td className="py-3.5 px-4">
                        {d.parent_department_name ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-700 text-[11px]">
                            <Layers className="w-3 h-3 text-slate-400" />
                            {d.parent_department_name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 font-semibold text-indigo-700 text-[11px]">
                            Top-Level Pillar
                          </span>
                        )}
                      </td>

                      {/* Head of Department */}
                      <td className="py-3.5 px-4">
                        {d.head_employee_name ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                              {d.head_employee_name[0]}
                            </div>
                            <span className="font-medium text-slate-800">{d.head_employee_name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No Head Assigned</span>
                        )}
                      </td>

                      {/* Headcount */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 text-[11px]">
                          <Users className="w-3 h-3 text-indigo-500" />
                          {d.employee_count || 0}
                        </span>
                      </td>

                      {/* Active Status */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleActive(d)}
                          disabled={actionLoadingId === d.id}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all hover:scale-105"
                          title="Click to toggle status"
                        >
                          {d.is_active ? (
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
                            onClick={() => handleOpenDetail(d)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="View Roster & Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenCreate(d.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Add Sub-department under this"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(d)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit Department"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(d)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Department"
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
                <span className="font-bold text-slate-900">{totalFiltered}</span> departments
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
      <DepartmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveDepartment}
        editingDepartment={editingDepartment}
        departments={departments}
        employees={employees}
        initialParentId={initialParentId}
        businessId={businessId}
      />

      <DepartmentDetailDrawer
        department={selectedDepartment}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        departments={departments}
        employees={employees}
        onEdit={handleOpenEdit}
        onAddSubDepartment={(p) => handleOpenCreate(p.id)}
        onDelete={handleOpenDelete}
        onSelectDepartment={(d) => setSelectedDepartment(d)}
      />

      <DepartmentDeleteDialog
        department={departmentToDelete}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        departments={departments}
        employees={employees}
      />

      <DepartmentImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={onRefresh}
        businessId={businessId}
      />
    </div>
  );
}
