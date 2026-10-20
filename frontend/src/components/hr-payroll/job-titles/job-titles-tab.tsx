"use client";

import React, { useState, useMemo, useEffect } from "react";
import { JobTitleOut, DepartmentOut, EmployeeOut } from "@/types";
import { apiClient } from "@/lib/api-client";
import {
  Briefcase,
  Users,
  Award,
  Layers,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  Upload,
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
} from "lucide-react";
import { JobTitleModal, LEVEL_RANK_DESCRIPTIONS } from "./job-title-modal";
import { JobTitleDetailDrawer } from "./job-title-detail-drawer";
import { JobTitleDeleteDialog } from "./job-title-delete-dialog";
import { JobTitleCareerMatrixView } from "./job-title-career-matrix-view";
import { JobTitleImportModal } from "./job-title-import-modal";

interface JobTitlesTabProps {
  jobTitles: JobTitleOut[];
  departments: DepartmentOut[];
  employees: EmployeeOut[];
  onRefresh: () => Promise<void>;
  businessId?: number;
}

export function JobTitlesTab({
  jobTitles,
  departments,
  employees,
  onRefresh,
  businessId = 1,
}: JobTitlesTabProps) {
  // View mode: Table or Career Matrix
  const [viewMode, setViewMode] = useState<"table" | "matrix">("table");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [seniorityTierFilter, setSeniorityTierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"rank_asc" | "rank_desc" | "name_asc" | "headcount_desc">("rank_asc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals & Drawer states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJobTitle, setEditingJobTitle] = useState<JobTitleOut | null>(null);

  const [selectedJobTitle, setSelectedJobTitle] = useState<JobTitleOut | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [jobTitleToDelete, setJobTitleToDelete] = useState<JobTitleOut | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Department map for fast name lookup
  const deptMap = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [departments]);

  // Compute Metrics
  const metrics = useMemo(() => {
    const total = jobTitles.length;
    const depts = new Set(jobTitles.map((j) => j.department_id).filter(Boolean)).size;
    const executives = jobTitles.filter((j) => (j.level_rank || 5) <= 2).length;
    const managers = jobTitles.filter((j) => {
      const r = j.level_rank || 5;
      return r >= 3 && r <= 4;
    }).length;
    const totalStaff = jobTitles.reduce((acc, j) => acc + (j.employee_count || 0), 0);
    return { total, depts, executives, managers, totalStaff };
  }, [jobTitles]);

  // Filter and Sort
  const filteredJobTitles = useMemo(() => {
    return jobTitles
      .filter((j) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const dName = j.department_id ? deptMap.get(j.department_id) || "" : "company-wide";
          const matches =
            j.name.toLowerCase().includes(q) ||
            (j.short_name && j.short_name.toLowerCase().includes(q)) ||
            dName.toLowerCase().includes(q) ||
            (j.description && j.description.toLowerCase().includes(q));
          if (!matches) return false;
        }

        // Department
        if (departmentFilter !== "all") {
          if (departmentFilter === "company_wide" && j.department_id) return false;
          if (departmentFilter !== "company_wide" && j.department_id !== departmentFilter) return false;
        }

        // Seniority Tier
        const rank = j.level_rank || 5;
        if (seniorityTierFilter === "executive" && rank > 2) return false;
        if (seniorityTierFilter === "management" && (rank < 3 || rank > 4)) return false;
        if (seniorityTierFilter === "professional" && (rank < 5 || rank > 6)) return false;
        if (seniorityTierFilter === "operational" && rank < 7) return false;

        // Status
        if (statusFilter === "active" && !j.is_active) return false;
        if (statusFilter === "inactive" && j.is_active) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "rank_asc") return (a.level_rank || 5) - (b.level_rank || 5);
        if (sortBy === "rank_desc") return (b.level_rank || 5) - (a.level_rank || 5);
        if (sortBy === "name_asc") return a.name.localeCompare(b.name);
        if (sortBy === "headcount_desc") return (b.employee_count || 0) - (a.employee_count || 0);
        return 0;
      });
  }, [jobTitles, searchQuery, departmentFilter, seniorityTierFilter, statusFilter, sortBy, deptMap]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, departmentFilter, seniorityTierFilter, statusFilter, pageSize, sortBy]);

  // Pagination slicing
  const totalFiltered = filteredJobTitles.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalFiltered);

  const paginatedJobTitles = useMemo(() => {
    return filteredJobTitles.slice(startIndex, endIndex);
  }, [filteredJobTitles, startIndex, endIndex]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingJobTitle(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (j: JobTitleOut) => {
    setEditingJobTitle(j);
    setIsModalOpen(true);
  };

  const handleSaveJobTitle = async (payload: any) => {
    if (editingJobTitle) {
      await apiClient.put(`/job-titles/${editingJobTitle.id}`, payload);
    } else {
      await apiClient.post("/job-titles", payload);
    }
    await onRefresh();
  };

  const handleOpenDetail = (j: JobTitleOut) => {
    setSelectedJobTitle(j);
    setIsDrawerOpen(true);
  };

  const handleOpenDelete = (j: JobTitleOut) => {
    setJobTitleToDelete(j);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async (j: JobTitleOut) => {
    await apiClient.delete(`/job-titles/${j.id}`);
    if (selectedJobTitle?.id === j.id) {
      setIsDrawerOpen(false);
      setSelectedJobTitle(null);
    }
    await onRefresh();
  };

  const handleToggleActive = async (j: JobTitleOut) => {
    setActionLoadingId(j.id);
    try {
      await apiClient.put(`/job-titles/${j.id}`, { is_active: !j.is_active });
      await onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update designation status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExportExcel = () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/v1/job-titles/export-excel?business_id=${businessId}`;
    window.open(url, "_blank");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDepartmentFilter("all");
    setSeniorityTierFilter("all");
    setStatusFilter("all");
    setSortBy("rank_asc");
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    departmentFilter !== "all" ||
    seniorityTierFilter !== "all" ||
    statusFilter !== "all" ||
    sortBy !== "rank_asc";

  return (
    <div className="space-y-6">
      {/* ── 1. Top Metrics Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Designations</span>
            <Briefcase className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.total}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Defined positions</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Executive C-Suite</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-700">{metrics.executives}</p>
          <p className="text-[11px] text-purple-600 font-medium mt-0.5">Level 1 & 2 Roles</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Management & Leads</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.managers}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Level 3 & 4 Roles</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Departments Covered</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">{metrics.depts}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Assigned functional units</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Staff Covered</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-indigo-600">{metrics.totalStaff}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Assigned employees</p>
        </div>
      </div>

      {/* ── 2. Action Controls & Filter Toolbar ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by designation, acronym, or department..."
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
                onClick={() => setViewMode("matrix")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "matrix"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                Career Ladder
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

            {/* Create Button */}
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Designation
            </button>
          </div>
        </div>

        {/* Filter Dropdowns row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            Filters:
          </div>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-indigo-600 bg-white"
          >
            <option value="all">All Departments</option>
            <option value="company_wide">Company-Wide Only</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Seniority Tier Filter */}
          <select
            value={seniorityTierFilter}
            onChange={(e) => setSeniorityTierFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-indigo-600 bg-white"
          >
            <option value="all">All Seniority Tiers</option>
            <option value="executive">Executive & C-Suite (L1-2)</option>
            <option value="management">Management & Leads (L3-4)</option>
            <option value="professional">Professional / Senior (L5-6)</option>
            <option value="operational">Operational & Entry (L7-10)</option>
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
              <option value="rank_asc">Seniority (Level 1 → 10)</option>
              <option value="rank_desc">Seniority (Level 10 → 1)</option>
              <option value="name_asc">Title (A → Z)</option>
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

      {/* ── 3. Content View: Table or Career Matrix ── */}
      {viewMode === "matrix" ? (
        <JobTitleCareerMatrixView
          jobTitles={filteredJobTitles}
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
                  <th className="py-3.5 px-4">Designation</th>
                  <th className="py-3.5 px-4">Acronym / Code</th>
                  <th className="py-3.5 px-4">Organogram Level Rank</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4 text-center">Staff Count</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedJobTitles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-700">No designations match your filter criteria.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Try adjusting your search terms or create a new designation.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedJobTitles.map((j) => {
                    const levelInfo = LEVEL_RANK_DESCRIPTIONS[j.level_rank || 5] || LEVEL_RANK_DESCRIPTIONS[5];
                    const departmentName = j.department_id ? deptMap.get(j.department_id) : null;

                    return (
                      <tr
                        key={j.id}
                        onClick={() => handleOpenDetail(j)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        {/* Title & Description */}
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                              <Briefcase className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {j.name}
                              </p>
                              {j.description && (
                                <p className="text-[11px] text-slate-400 truncate max-w-xs font-normal">
                                  {j.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Short Code */}
                        <td className="py-3.5 px-4 font-mono text-xs">
                          {j.short_name ? (
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
                              {j.short_name}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic font-sans">—</span>
                          )}
                        </td>

                        {/* Seniority Level Rank */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${levelInfo.badgeColor}`}>
                            Level {j.level_rank || 5} • {levelInfo.tier}
                          </span>
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-4">
                          {departmentName ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-700 text-[11px]">
                              <Layers className="w-3 h-3 text-slate-400" />
                              {departmentName}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 font-semibold text-indigo-700 text-[11px]">
                              Company-Wide
                            </span>
                          )}
                        </td>

                        {/* Staff Count */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 text-[11px]">
                            <Users className="w-3 h-3 text-indigo-500" />
                            {j.employee_count || 0}
                          </span>
                        </td>

                        {/* Status Toggle */}
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleToggleActive(j)}
                            disabled={actionLoadingId === j.id}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all hover:scale-105"
                            title="Click to toggle status"
                          >
                            {j.is_active ? (
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

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenDetail(j)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="View Personnel Roster"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(j)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Edit Designation"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenDelete(j)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Designation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

          {/* ── 4. Pagination Footer ── */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            {/* Left: Info & Page Size */}
            <div className="flex items-center gap-4">
              <span>
                Showing <span className="font-bold text-slate-900">{totalFiltered === 0 ? 0 : startIndex + 1}</span> to{" "}
                <span className="font-bold text-slate-900">{endIndex}</span> of{" "}
                <span className="font-bold text-slate-900">{totalFiltered}</span> designations
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
      <JobTitleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveJobTitle}
        editingJobTitle={editingJobTitle}
        departments={departments}
        businessId={businessId}
      />

      <JobTitleDetailDrawer
        jobTitle={selectedJobTitle}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        departments={departments}
        employees={employees}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
      />

      <JobTitleDeleteDialog
        jobTitle={jobTitleToDelete}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        employees={employees}
      />

      <JobTitleImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={onRefresh}
        businessId={businessId}
      />
    </div>
  );
}
