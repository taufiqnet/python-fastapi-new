"use client";

import React, { useState, useMemo } from "react";
import { SalaryGradeOut, JobTitleOut, EmployeeOut, SalaryGradeCreateInput, SalaryGradeUpdateInput } from "@/types";
import {
  Award,
  Plus,
  Download,
  Search,
  Filter,
  DollarSign,
  Briefcase,
  Users,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  List,
  Sparkles,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldAlert,
  HelpCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import { GradeModal } from "./grade-modal";
import { GradeDetailDrawer } from "./grade-detail-drawer";
import { GradeDeleteDialog } from "./grade-delete-dialog";
import { GradeCardsView } from "./grade-cards-view";

interface GradesTabProps {
  salaryGrades: SalaryGradeOut[];
  jobTitles: JobTitleOut[];
  employees: EmployeeOut[];
  onRefresh: () => Promise<void>;
  businessId?: number;
}

export function GradesTab({
  salaryGrades,
  jobTitles,
  employees,
  onRefresh,
  businessId = 1,
}: GradesTabProps) {
  const { toast } = useToast();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRankTier, setSelectedRankTier] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("rank_asc");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals & Drawers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<SalaryGradeOut | null>(null);

  const [selectedGrade, setSelectedGrade] = useState<SalaryGradeOut | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [gradeToDelete, setGradeToDelete] = useState<SalaryGradeOut | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState(false);

  // Top KPI Metrics
  const totalGrades = salaryGrades.length;
  const execGrades = salaryGrades.filter((g) => g.level_rank <= 2).length;
  const midGrades = salaryGrades.filter((g) => g.level_rank >= 3 && g.level_rank <= 5).length;
  const workerGrades = salaryGrades.filter((g) => g.level_rank >= 6).length;
  const totalAssignedStaff = employees.filter((e) => e.salary_grade_id).length;

  // Filter & Sort Logic
  const filteredGrades = useMemo(() => {
    return salaryGrades
      .filter((grade) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          grade.name.toLowerCase().includes(q) ||
          grade.code.toLowerCase().includes(q) ||
          (grade.description && grade.description.toLowerCase().includes(q));

        let matchesRank = true;
        if (selectedRankTier === "exec") matchesRank = grade.level_rank <= 2;
        else if (selectedRankTier === "mid") matchesRank = grade.level_rank >= 3 && grade.level_rank <= 5;
        else if (selectedRankTier === "worker") matchesRank = grade.level_rank >= 6;

        let matchesStatus = true;
        if (selectedStatus === "active") matchesStatus = grade.is_active;
        else if (selectedStatus === "inactive") matchesStatus = !grade.is_active;

        return matchesSearch && matchesRank && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "rank_asc") return a.level_rank - b.level_rank;
        if (sortBy === "rank_desc") return b.level_rank - a.level_rank;
        if (sortBy === "code_asc") return a.code.localeCompare(b.code);
        if (sortBy === "name_asc") return a.name.localeCompare(b.name);
        if (sortBy === "salary_desc") return (b.max_gross_salary || 0) - (a.max_gross_salary || 0);
        return 0;
      });
  }, [salaryGrades, searchQuery, selectedRankTier, selectedStatus, sortBy]);

  // Paginated Slices
  const totalPages = Math.ceil(filteredGrades.length / pageSize) || 1;
  const paginatedGrades = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredGrades.slice(start, start + pageSize);
  }, [filteredGrades, currentPage, pageSize]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingGrade(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (grade: SalaryGradeOut) => {
    setEditingGrade(grade);
    setIsModalOpen(true);
  };

  const handleSaveGrade = async (data: SalaryGradeCreateInput | SalaryGradeUpdateInput) => {
    try {
      if (editingGrade) {
        await apiClient.put(`/salary-grades/${editingGrade.id}`, data);
        toast.success("Updated", `Salary grade ${data.code} updated successfully.`);
      } else {
        await apiClient.post("/salary-grades", data);
        toast.success("Created", `Salary grade ${data.code} created successfully.`);
      }
      await onRefresh();
    } catch (err: any) {
      throw err;
    }
  };

  const handleOpenDetail = (grade: SalaryGradeOut) => {
    setSelectedGrade(grade);
    setIsDrawerOpen(true);
  };

  const handleOpenDelete = (grade: SalaryGradeOut) => {
    setGradeToDelete(grade);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async (grade: SalaryGradeOut) => {
    await apiClient.delete(`/salary-grades/${grade.id}`);
    toast.success("Deleted", `Salary grade ${grade.code} deleted.`);
    await onRefresh();
  };

  const handleToggleActive = async (grade: SalaryGradeOut) => {
    try {
      await apiClient.put(`/salary-grades/${grade.id}`, { is_active: !grade.is_active });
      toast.info(
        "Status Changed",
        `Grade ${grade.code} is now ${!grade.is_active ? "Active" : "Inactive"}.`
      );
      await onRefresh();
    } catch (err: any) {
      toast.error(
        "Update Failed",
        err?.response?.data?.detail || "Could not change status."
      );
    }
  };

  const handleLoadPreset = async (presetKey: string) => {
    setLoadingPreset(true);
    try {
      const res = await apiClient.post<{ created_count: number; skipped_count: number }>(
        `/salary-grades/presets/${presetKey}?business_id=${businessId}`
      );
      toast.success(
        "Presets Loaded",
        `Created ${res.data.created_count} grades (${res.data.skipped_count} skipped).`
      );
      setIsPresetModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      toast.error(
        "Preset Error",
        err?.response?.data?.detail || "Failed to load presets."
      );
    } finally {
      setLoadingPreset(false);
    }
  };

  const handleExportExcel = () => {
    window.location.href = `/salary-grades/export-excel?business_id=${businessId}`;
  };

  return (
    <div className="space-y-6">
      {/* Informative Guidance Banner */}
      <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200/80 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900">Optional Salary Grades & Pay Scales (Bangladesh Context)</h4>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                Optional System
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Standardize compensation bands, monthly gross salary ranges, and statutory allowance splits across positions.
              Grades are fully optional and integrate with Job Designations and Employee rosters.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsPresetModalOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-emerald-200 text-emerald-800 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Load BD Presets
          </button>
        </div>
      </div>

      {/* Top KPI Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Grades</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight">{totalGrades}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">Bands Defined</span>
        </div>

        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Executive Tiers</span>
            <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md">L1-2</span>
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight">{execGrades}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">C-Suite & Directors</span>
        </div>

        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Mid & Officers</span>
            <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md">L3-5</span>
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight">{midGrades}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">Managers & Engineers</span>
        </div>

        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Workers & Support</span>
            <span className="text-[10px] font-mono font-bold bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-md">L6+</span>
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight">{workerGrades}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">Operations & Trainees</span>
        </div>

        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Staff Covered</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-700 tracking-tight">{totalAssignedStaff}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">Stationed Personnel</span>
        </div>
      </div>

      {/* Toolbar: Search, Multi-Filter, Actions & View Mode */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by grade code, title, mandate..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Seniority Tier */}
          <select
            value={selectedRankTier}
            onChange={(e) => {
              setSelectedRankTier(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none"
          >
            <option value="all">All Seniority Ranks</option>
            <option value="exec">Executive (L1-2)</option>
            <option value="mid">Mid & Officer (L3-5)</option>
            <option value="worker">Worker & Support (L6+)</option>
          </select>

          {/* Active Status */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none"
          >
            <option value="rank_asc">Sort: Rank 1 → 10</option>
            <option value="rank_desc">Sort: Rank 10 → 1</option>
            <option value="code_asc">Sort: Code (A → Z)</option>
            <option value="name_asc">Sort: Title (A → Z)</option>
            <option value="salary_desc">Sort: Highest Max Gross</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "table" ? "bg-white text-emerald-700 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-700"
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "grid" ? "bg-white text-emerald-700 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-700"
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl flex items-center gap-1.5 transition-colors"
            title="Export Salary Grades Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" /> Export
          </button>

          {/* New Grade Button */}
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Grade
          </button>
        </div>
      </div>

      {/* Main Content: Table or Cards View */}
      {viewMode === "grid" ? (
        <GradeCardsView
          grades={paginatedGrades}
          jobTitles={jobTitles}
          employees={employees}
          onView={handleOpenDetail}
          onEdit={handleOpenEdit}
          onDelete={handleOpenDelete}
          onToggleActive={handleToggleActive}
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Grade Code & Rank</th>
                  <th className="py-3.5 px-4">Grade Title / Mandate</th>
                  <th className="py-3.5 px-4">Gross Salary Bracket (৳)</th>
                  <th className="py-3.5 px-4">Basic Ratio</th>
                  <th className="py-3.5 px-4">Mapped Positions</th>
                  <th className="py-3.5 px-4">Staff Count</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {paginatedGrades.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Award className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="font-bold text-slate-600 text-sm">No salary grades found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Adjust your filters, add a custom grade, or load standard Bangladesh templates.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedGrades.map((grade) => {
                    const mappedTitles = jobTitles.filter((jt) => jt.salary_grade_id === grade.id).length;
                    const mappedEmps = employees.filter((e) => e.salary_grade_id === grade.id).length;
                    const minGross = grade.min_gross_salary ? Number(grade.min_gross_salary) : null;
                    const maxGross = grade.max_gross_salary ? Number(grade.max_gross_salary) : null;

                    return (
                      <tr key={grade.id} className="hover:bg-slate-50/70 transition-colors group">
                        {/* Code & Rank */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-950 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl text-xs">
                              {grade.code}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold shrink-0">
                              Rank {grade.level_rank}
                            </span>
                          </div>
                        </td>

                        {/* Title & Description */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <span className="font-bold text-slate-900 block truncate">{grade.name}</span>
                          {grade.description && (
                            <span className="text-[11px] text-slate-400 truncate block mt-0.5">
                              {grade.description}
                            </span>
                          )}
                        </td>

                        {/* Salary Bracket */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 font-mono text-xs">
                            {minGross !== null ? `৳${minGross.toLocaleString()}` : "Open"}
                            {" — "}
                            {maxGross !== null ? `৳${maxGross.toLocaleString()}` : "Open"}
                          </div>
                        </td>

                        {/* Basic Ratio */}
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                            {grade.default_basic_percent || 50}%
                          </span>
                        </td>

                        {/* Mapped Titles */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            <Briefcase className="w-3 h-3 text-slate-400" />
                            {mappedTitles} Titles
                          </span>
                        </td>

                        {/* Staff Count */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-[11px]">
                            <Users className="w-3 h-3 text-emerald-600" />
                            {mappedEmps} Staff
                          </span>
                        </td>

                        {/* Status Toggle Switch */}
                        <td className="py-3.5 px-4">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={grade.is_active}
                              onChange={() => handleToggleActive(grade)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                          </label>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenDetail(grade)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                              title="View Grade Details & Assigned Personnel"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(grade)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                              title="Edit Salary Grade"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDelete(grade)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Salary Grade"
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

          {/* Table Pagination Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span>
                Showing <strong>{filteredGrades.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{" "}
                <strong>{Math.min(currentPage * pageSize, filteredGrades.length)}</strong> of{" "}
                <strong>{filteredGrades.length}</strong> grades
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none text-slate-700"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none text-slate-700"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 text-slate-800 font-bold">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none text-slate-700"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none text-slate-700"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preset Templates Selector Modal */}
      {isPresetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full p-6 text-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Load Bangladesh Standard Grade Presets</h3>
                  <p className="text-xs text-slate-500">
                    Instantly seed verified salary bands and statutory wage tiers.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPresetModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                ✕
              </button>
            </div>

            <div className="py-5 space-y-3">
              {/* Option 1: Corporate BD */}
              <div
                onClick={() => !loadingPreset && handleLoadPreset("corporate_bd")}
                className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/40 cursor-pointer transition-all flex items-start justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">Bangladesh Corporate & IT Banding (7-Tier)</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Popular
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Standard corporate hierarchy from M-1 (C-Suite) to M-7 (Support). Gross range ৳20,000 - ৳450,000 with 50% basic ratio.
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3">
                  Select →
                </span>
              </div>

              {/* Option 2: RMG BD */}
              <div
                onClick={() => !loadingPreset && handleLoadPreset("rmg_bd")}
                className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/40 cursor-pointer transition-all flex items-start justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">RMG Minimum Wage Gazette (5-Tier)</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                      BLA Statutory
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Bangladesh Gazette Grades G-1 (Pattern Master) to G-5 (Junior Helper). Starting at ৳12,500 minimum statutory wage.
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3">
                  Select →
                </span>
              </div>

              {/* Option 3: Banking BD */}
              <div
                onClick={() => !loadingPreset && handleLoadPreset("banking_bd")}
                className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/40 cursor-pointer transition-all flex items-start justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">Commercial Banking & Financial Cadre (8-Tier)</span>
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                      Financial
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Formal cadres from Probationary Officer (PROB) to SEVP. Standardized for private commercial banks and NBFIs.
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3">
                  Select →
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
              <span className="italic">* Existing codes will not be overwritten.</span>
              <button
                onClick={() => setIsPresetModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grade Modal */}
      <GradeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveGrade}
        editingGrade={editingGrade}
        businessId={businessId}
      />

      {/* Detail Drawer */}
      <GradeDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        grade={selectedGrade}
        jobTitles={jobTitles}
        employees={employees}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
      />

      {/* Delete Dialog */}
      <GradeDeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        grade={gradeToDelete}
        jobTitles={jobTitles}
        employees={employees}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
