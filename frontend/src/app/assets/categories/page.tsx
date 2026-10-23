"use client";

import React, { useEffect, useState, useMemo, useRef, startTransition } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { AssetCategory } from "@/types";
import { useToast } from "@/context/toast-context";
import {
  Tag,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Edit,
  X,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  List,
  LayoutGrid,
  Filter,
  AlertTriangle,
} from "lucide-react";

export default function AssetCategoriesPage() {
  const { toast } = useToast();

  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const isInitialMount = useRef(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [depreciationFilter, setDepreciationFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Pagination State (Default 10 items per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modal states for Create/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AssetCategory | null>(null);

  // Modal state for Delete confirmation
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<AssetCategory | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formLifeMonths, setFormLifeMonths] = useState("36");
  const [formDepreciation, setFormDepreciation] = useState("straight_line");
  const [formDescription, setFormDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadData = async (isBackground = false) => {
    if (isBackground) setIsFetching(true);
    else setInitialLoading(true);

    try {
      const res = await apiClient.get<AssetCategory[]>("/assets/categories");
      setCategories(res.data || []);
    } catch (err: any) {
      toast.error("Error Loading Categories", err.message || "Failed to load asset categories.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadData(false);
    }
  }, []);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      // Search filter
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase().trim();
        const matchesName = cat.name.toLowerCase().includes(q);
        const matchesCode = cat.code.toLowerCase().includes(q);
        const matchesDesc = cat.description ? cat.description.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesCode && !matchesDesc) return false;
      }
      // Status filter
      if (statusFilter === "active" && !cat.is_active) return false;
      if (statusFilter === "inactive" && cat.is_active) return false;

      // Depreciation filter
      if (depreciationFilter !== "all") {
        if (cat.depreciation_method !== depreciationFilter) return false;
      }

      return true;
    });
  }, [categories, debouncedSearch, statusFilter, depreciationFilter]);

  // Pagination Calculations
  const totalFiltered = filteredCategories.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalFiltered);
  const paginatedCategories = useMemo(() => {
    return filteredCategories.slice(startIndex, endIndex);
  }, [filteredCategories, startIndex, endIndex]);

  // Metrics KPI calculations
  const metrics = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.is_active).length;
    const inactive = total - active;
    const withLife = categories.filter((c) => c.useful_life_months);
    const avgLife =
      withLife.length > 0
        ? Math.round(withLife.reduce((acc, c) => acc + (c.useful_life_months || 0), 0) / withLife.length)
        : 36;
    return { total, active, inactive, avgLife };
  }, [categories]);

  const handleStatusFilterChange = (status: string) => {
    startTransition(() => {
      setStatusFilter(status);
      setCurrentPage(1);
    });
  };

  const handleDepreciationFilterChange = (dep: string) => {
    startTransition(() => {
      setDepreciationFilter(dep);
      setCurrentPage(1);
    });
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    startTransition(() => {
      setSearchQuery("");
      setDebouncedSearch("");
      setStatusFilter("all");
      setDepreciationFilter("all");
      setCurrentPage(1);
    });
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" || statusFilter !== "all" || depreciationFilter !== "all";

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormName("");
    setFormCode("");
    setFormLifeMonths("36");
    setFormDepreciation("straight_line");
    setFormDescription("");
    setIsModalOpen(true);
  };

  const openEditModal = (cat: AssetCategory) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormCode(cat.code);
    setFormLifeMonths(String(cat.useful_life_months || 36));
    setFormDepreciation(cat.depreciation_method || "straight_line");
    setFormDescription(cat.description || "");
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      toast.error("Validation Error", "Category name and code prefix are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await apiClient.put(`/assets/categories/${editingCategory.id}`, {
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          useful_life_months: formLifeMonths ? parseInt(formLifeMonths) : 36,
          depreciation_method: formDepreciation,
          description: formDescription.trim() || null,
        });
        toast.success("Category Updated", `Category '${formName}' saved successfully.`);
      } else {
        await apiClient.post("/assets/categories", {
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          useful_life_months: formLifeMonths ? parseInt(formLifeMonths) : 36,
          depreciation_method: formDepreciation,
          description: formDescription.trim() || null,
        });
        toast.success("Category Created", `Category '${formName}' (${formCode.trim().toUpperCase()}) added.`);
      }
      setIsModalOpen(false);
      loadData(true);
    } catch (err: any) {
      toast.error("Save Failed", err.response?.data?.detail || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/assets/categories/${categoryToDelete.id}`);
      toast.success("Category Deleted", `Category '${categoryToDelete.name}' has been removed.`);
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
      loadData(true);
    } catch (err: any) {
      toast.error("Delete Failed", err.response?.data?.detail || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDepreciation = (method?: string | null) => {
    switch (method) {
      case "straight_line":
        return "Straight Line (SLM)";
      case "wdv":
        return "Written Down Value (WDV)";
      case "none":
        return "None (Non-depreciable)";
      default:
        return method ? method.replace("_", " ") : "Straight Line";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-12">
        {/* Top Header & Page Navigation Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
              <Link href="/assets" className="hover:underline flex items-center gap-1 text-slate-500">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Asset Management</span>
              </Link>
              <span>•</span>
              <span>Catalog Setup</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Tag className="w-7 h-7 text-indigo-600" />
              Asset Categories Directory
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage equipment classifications, code prefixes, useful life cycles, and depreciation policies.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isFetching || initialLoading}
              className="p-2 sm:p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
              title="Refresh Categories"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching || initialLoading ? "animate-spin" : ""}`} />
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/25 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </div>
        </div>

        {/* Metrics KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Categories</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{metrics.total}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Active Categories</p>
              <p className="text-xl font-bold text-emerald-700 mt-0.5">{metrics.active}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Inactive Categories</p>
              <p className="text-xl font-bold text-amber-700 mt-0.5">{metrics.inactive}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Avg Useful Life</p>
              <p className="text-xl font-bold text-purple-700 mt-0.5">
                {metrics.avgLife} <span className="text-xs font-normal text-slate-500">months</span>
              </p>
            </div>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search categories by name, code prefix, or description..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    handleSearchChange("");
                    setDebouncedSearch("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown Filters & Controls */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>

              <select
                value={depreciationFilter}
                onChange={(e) => handleDepreciationFilterChange(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Depreciation</option>
                <option value="straight_line">Straight Line (SLM)</option>
                <option value="wdv">Written Down (WDV)</option>
                <option value="none">Non-depreciable</option>
              </select>

              {/* View Switcher */}
              <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === "table"
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                  title="Table View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === "grid"
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                  title="Card Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition"
                  title="Reset Filters"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Data Container with In-Place Non-Destructive Filtering */}
        {viewMode === "table" ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden relative">
            {/* Top-rim indeterminate progress bar during background fetching */}
            {isFetching && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-100 overflow-hidden z-20">
                <div className="h-full bg-indigo-600 animate-[indeterminate_1.5s_infinite_linear] origin-left w-1/3" />
              </div>
            )}

            <div className={`overflow-x-auto transition-opacity duration-150 ${isFetching ? "opacity-60" : "opacity-100"}`}>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Category Name</th>
                    <th className="py-3.5 px-4">Code Prefix</th>
                    <th className="py-3.5 px-4">Useful Life Cycle</th>
                    <th className="py-3.5 px-4">Depreciation Policy</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {initialLoading ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400 font-medium">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                          <span>Loading asset categories...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedCategories.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400 font-medium">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Tag className="w-8 h-8 text-slate-300" />
                          <span className="font-semibold text-slate-600 text-sm">No asset categories found</span>
                          <span className="text-xs text-slate-400">
                            {hasActiveFilters ? "Try clearing your filters or search keywords." : "Click 'Add Category' to get started."}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedCategories.map((cat) => {
                      const life = cat.useful_life_months || 36;
                      const years = (life / 12).toFixed(1);
                      return (
                        <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors group">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-bold">
                                <Tag className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition text-sm">
                                  {cat.name}
                                </span>
                                {cat.description && (
                                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 max-w-sm">
                                    {cat.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-mono text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {cat.code}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">
                              {life} <span className="text-slate-400 font-normal">Months</span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              ≈ {years} {parseFloat(years) === 1 ? "Year" : "Years"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-slate-700 font-medium">
                              {formatDepreciation(cat.depreciation_method)}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                cat.is_active
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${cat.is_active ? "bg-emerald-600" : "bg-slate-400"}`}
                              />
                              {cat.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>

                          <td className="py-3.5 px-5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(cat)}
                                title="Edit Category"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCategoryToDelete(cat);
                                  setIsDeleteModalOpen(true);
                                }}
                                title="Delete Category"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
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
          </div>
        ) : (
          /* Card Grid View */
          <div className="relative">
            {isFetching && (
              <div className="absolute -top-3 left-0 right-0 h-1 bg-indigo-100 overflow-hidden z-20 rounded-full">
                <div className="h-full bg-indigo-600 animate-[indeterminate_1.5s_infinite_linear] origin-left w-1/3" />
              </div>
            )}
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-150 ${isFetching ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
              {initialLoading ? (
                <div className="col-span-full p-16 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                  <p className="text-xs">Loading asset categories...</p>
                </div>
              ) : paginatedCategories.length === 0 ? (
                <div className="col-span-full p-16 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                  <Tag className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-600">No categories found</p>
                </div>
              ) : (
                paginatedCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-indigo-200 hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {cat.code}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            cat.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {cat.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 mt-2.5 group-hover:text-indigo-600 transition">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {cat.description || "No description provided."}
                      </p>

                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Useful Life:</span>
                          <span className="font-semibold text-slate-800">{cat.useful_life_months || 36} months</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Depreciation:</span>
                          <span className="font-medium text-slate-700">{formatDepreciation(cat.depreciation_method)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition"
                        title="Edit Category"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setCategoryToDelete(cat);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Pagination Navigation Bar */}
        {totalFiltered > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                Showing <strong className="text-slate-900">{startIndex + 1}</strong> to{" "}
                <strong className="text-slate-900">{endIndex}</strong> of{" "}
                <strong className="text-slate-900">{totalFiltered}</strong> categories
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Page Navigation Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Numbered Page Buttons with Ellipses */}
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    if (totalPages <= 5) return true;
                    if (page === 1 || page === totalPages) return true;
                    return Math.abs(page - safeCurrentPage) <= 1;
                  })
                  .map((page, idx, arr) => {
                    const prev = arr[idx - 1];
                    return (
                      <React.Fragment key={page}>
                        {prev && page - prev > 1 && (
                          <span className="px-1 text-slate-300">...</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                            safeCurrentPage === page
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                type="button"
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Modal: Create/Edit Category */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase">
                <Tag className="w-4 h-4" />
                <span>Category Configuration</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                {editingCategory ? "Edit Asset Category" : "Add Asset Category"}
              </h2>

              <form onSubmit={handleSaveCategory} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name *</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Laptops"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Code Prefix *</label>
                    <input
                      type="text"
                      required
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      placeholder="e.g. LAP, SIM, VEH"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Useful Life (Months)</label>
                    <input
                      type="number"
                      min="1"
                      value={formLifeMonths}
                      onChange={(e) => setFormLifeMonths(e.target.value)}
                      placeholder="36"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Depreciation Policy</label>
                    <select
                      value={formDepreciation}
                      onChange={(e) => setFormDepreciation(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="straight_line">Straight Line (SLM)</option>
                      <option value="wdv">Written Down (WDV)</option>
                      <option value="none">None (Non-depreciable)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Short description of items in this category..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs disabled:opacity-50 transition"
                  >
                    {isSubmitting ? "Saving..." : "Save Category"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Delete Confirmation */}
        {isDeleteModalOpen && categoryToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h2 className="text-base font-bold text-slate-900">Delete Asset Category?</h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Are you sure you want to permanently delete category{" "}
                <strong className="text-slate-800">'{categoryToDelete.name}'</strong> ({categoryToDelete.code})?
                This action cannot be undone if no assets exist under this category.
              </p>

              <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setCategoryToDelete(null);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={confirmDeleteCategory}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs disabled:opacity-50 transition"
                >
                  {isSubmitting ? "Deleting..." : "Delete Category"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
