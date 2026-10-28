"use client";

import React, { useEffect, useState, useMemo, useRef, startTransition } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { CategoryOut } from "@/types";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import {
  Tags,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Layers,
  ChevronRight,
  ChevronDown,
  FolderTree,
  List,
  Filter,
  X,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CategoryFormModal } from "@/components/ecommerce/categories/category-form-modal";
import { CategoryDetailModal } from "@/components/ecommerce/categories/category-detail-modal";
import { CategoryImportModal } from "@/components/ecommerce/categories/category-import-modal";
import { DeleteCategoryDialog } from "@/components/ecommerce/categories/delete-category-dialog";

export default function CategoriesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const businessId = user?.business_id || 1;

  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<"all" | "root" | "sub">("all");
  const [viewMode, setViewMode] = useState<"table" | "tree">("table");

  // Expanded Nodes in Tree View
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<CategoryOut | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryOut | null>(null);

  const [isImportOpen, setIsImportOpen] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryOut | null>(null);

  const loadData = async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    } else {
      setIsFetching(true);
    }
    setError(null);
    try {
      const res = await apiClient.get<CategoryOut[]>("/categories/?limit=300");
      setCategories(res.data || []);
    } catch {
      setError("Failed to fetch product categories from backend server.");
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

  // Handlers with React startTransition (single render turn batching)
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

  const handleLevelChange = (level: "all" | "root" | "sub") => {
    startTransition(() => {
      setLevelFilter(level);
      setCurrentPage(1);
    });
  };

  const handlePageSizeChange = (newSize: number) => {
    startTransition(() => {
      setPageSize(newSize);
      setCurrentPage(1);
    });
  };

  const clearFilters = () => {
    startTransition(() => {
      setSearchQuery("");
      setStatusFilter("all");
      setLevelFilter("all");
      setCurrentPage(1);
    });
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" || statusFilter !== "all" || levelFilter !== "all";

  // Category Lookup Map
  const categoryMap = useMemo(() => {
    const map = new Map<string, CategoryOut>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Metrics
  const metrics = useMemo(() => {
    const total = categories.length;
    const roots = categories.filter((c) => !c.parent_id).length;
    const subs = categories.filter((c) => !!c.parent_id).length;
    const active = categories.filter((c) => c.is_active).length;
    return { total, roots, subs, active };
  }, [categories]);

  // Filtered Categories
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && c.is_active) ||
        (statusFilter === "inactive" && !c.is_active);

      const matchesLevel =
        levelFilter === "all" ||
        (levelFilter === "root" && !c.parent_id) ||
        (levelFilter === "sub" && !!c.parent_id);

      return matchesSearch && matchesStatus && matchesLevel;
    });
  }, [categories, searchQuery, statusFilter, levelFilter]);

  // Pagination Calculations
  const totalFiltered = filteredCategories.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalFiltered);

  const paginatedCategories = useMemo(() => {
    return filteredCategories.slice(startIndex, endIndex);
  }, [filteredCategories, startIndex, endIndex]);

  // Tree View Builder
  const rootCategories = useMemo(() => {
    return categories.filter((c) => !c.parent_id);
  }, [categories]);

  const getSubcategories = (parentId: string) => {
    return categories.filter((c) => c.parent_id === parentId);
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Modal Handlers
  const handleOpenCreate = () => {
    setCategoryToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (cat: CategoryOut) => {
    setCategoryToEdit(cat);
    setIsFormOpen(true);
  };

  const handleOpenDetail = (cat: CategoryOut) => {
    setSelectedCategory(cat);
    setIsDetailOpen(true);
  };

  const handleOpenDelete = (cat: CategoryOut) => {
    setCategoryToDelete(cat);
    setIsDeleteOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full pb-12">
        {/* Top Header & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
              <span>Catalog & Store</span>
              <span>•</span>
              <span>Hierarchy & Attributes</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Tags className="w-7 h-7 text-indigo-600" />
              Category Management
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Organize products into hierarchical categories, subcategories, and specification attribute templates.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => loadData(false)}
              disabled={isFetching}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
              title="Refresh Categories"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Import Excel
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition shadow-md shadow-indigo-600/25 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Create Category
            </button>
          </div>
        </div>

        {/* Metrics KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Tags className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Categories</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{metrics.total}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <FolderTree className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Root Categories</p>
              <p className="text-xl font-bold text-purple-700 mt-0.5">{metrics.roots}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Subcategories</p>
              <p className="text-xl font-bold text-amber-700 mt-0.5">{metrics.subs}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Active Status</p>
              <p className="text-xl font-bold text-emerald-700 mt-0.5">{metrics.active}</p>
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
                placeholder="Search categories by name, slug, or keywords..."
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

            {/* Controls */}
            <div className="flex items-center gap-2">
              <select
                value={levelFilter}
                onChange={(e) => handleLevelChange(e.target.value as "all" | "root" | "sub")}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Tiers</option>
                <option value="root">Root Categories Only</option>
                <option value="sub">Subcategories Only</option>
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
                  onClick={() => setViewMode("tree")}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === "tree"
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                  title="Hierarchical Tree View"
                >
                  <FolderTree className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Status Tabs & Active Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Status:
              </span>
              {[
                { id: "all", label: "All Categories" },
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
                Showing <strong className="text-slate-800">{filteredCategories.length}</strong> of{" "}
                {categories.length} categories
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

        {/* Data Container - Never Unmounts on Filter/Page Transitions */}
        {initialLoading && categories.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
            <div className="flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm font-semibold text-slate-800">Loading category hierarchy...</p>
              <p className="text-xs text-slate-400">Fetching categories from FastAPI backend</p>
            </div>
          </div>
        ) : viewMode === "table" ? (
          /* Table View */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden relative">
            {/* Top-rim indeterminate progress bar during background fetch */}
            {isFetching && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-100 overflow-hidden z-20">
                <div className="w-full h-full bg-indigo-600 animate-pulse" />
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-5">Category Name</th>
                    <th className="py-3.5 px-4">Slug</th>
                    <th className="py-3.5 px-4">Hierarchy Tier</th>
                    <th className="py-3.5 px-4">Attributes</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y divide-slate-100 transition-opacity duration-150 ${
                    isFetching ? "opacity-50 pointer-events-none" : "opacity-100"
                  }`}
                >
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                            <Tags className="w-7 h-7" />
                          </div>
                          <h3 className="text-base font-bold text-slate-800">No categories found</h3>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {hasActiveFilters
                              ? "Try adjusting your search query, status, or tier filters."
                              : "No categories have been created yet. Click the button below to add your first category."}
                          </p>
                          {hasActiveFilters ? (
                            <button
                              type="button"
                              onClick={clearFilters}
                              className="mt-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
                            >
                              Clear All Filters
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleOpenCreate}
                              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 shadow-sm transition"
                            >
                              <Plus className="w-4 h-4" />
                              Create First Category
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedCategories.map((c) => {
                      const parentName = c.parent_id ? categoryMap.get(c.parent_id)?.name : null;
                      const attrCount = c.attribute_templates?.length || 0;
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors group">
                          {/* Name & Icon */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                                <Tags className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <span
                                  onClick={() => handleOpenDetail(c)}
                                  className="font-bold text-slate-900 group-hover:text-indigo-600 transition truncate block cursor-pointer"
                                >
                                  {c.name}
                                </span>
                                {c.description && (
                                  <span className="text-[11px] text-slate-400 line-clamp-1">
                                    {c.description}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Slug */}
                          <td className="py-3.5 px-4 font-mono text-slate-500">/{c.slug}</td>

                          {/* Tier */}
                          <td className="py-3.5 px-4">
                            {parentName ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                <Layers className="w-3 h-3 text-slate-500" />
                                {parentName}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                                Root Level
                              </span>
                            )}
                          </td>

                          {/* Attribute templates */}
                          <td className="py-3.5 px-4">
                            {attrCount > 0 ? (
                              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                                {attrCount} attribute{attrCount > 1 ? "s" : ""}
                              </span>
                            ) : (
                              <span className="text-slate-300 italic">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold capitalize text-[11px] ${
                                c.is_active
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              {c.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {c.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenDetail(c)}
                                title="View Details"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(c)}
                                title="Edit Category"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDelete(c)}
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

            {/* Pagination Controls */}
            {filteredCategories.length > 0 && (
              <div className="border-t border-slate-100 px-5 py-3.5 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    Showing <strong className="text-slate-900">{startIndex + 1}</strong> to{" "}
                    <strong className="text-slate-900">{endIndex}</strong> of{" "}
                    <strong className="text-slate-900">{totalFiltered}</strong> items
                    {isFetching && <Loader2 className="w-3 h-3 text-indigo-600 animate-spin shrink-0" />}
                  </span>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <div className="flex items-center gap-1.5">
                    <span>Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safeCurrentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={safeCurrentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-3 font-semibold text-slate-800">
                    Page {safeCurrentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Hierarchical Tree View */
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3 relative overflow-hidden">
            {isFetching && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-100 overflow-hidden z-20">
                <div className="w-full h-full bg-indigo-600 animate-pulse" />
              </div>
            )}

            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-indigo-600" />
                Category Tree Directory ({rootCategories.length} Root Nodes)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allOpen: Record<string, boolean> = {};
                    categories.forEach((c) => (allOpen[c.id] = true));
                    setExpandedNodes(allOpen);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedNodes({})}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                >
                  Collapse All
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {rootCategories.map((root) => {
                const subs = getSubcategories(root.id);
                const isExpanded = Boolean(expandedNodes[root.id]);
                return (
                  <div key={root.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="p-3 bg-slate-50/70 hover:bg-slate-100/70 flex items-center justify-between transition">
                      <div className="flex items-center gap-2">
                        {subs.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => toggleNode(root.id)}
                            className="p-1 text-slate-400 hover:text-slate-700"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <div className="w-6" />
                        )}
                        <span className="font-bold text-slate-900 text-xs">{root.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">/{root.slug}</span>
                        {subs.length > 0 && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.2 rounded-full">
                            {subs.length} sub{subs.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(root)}
                          className="p-1 text-slate-400 hover:text-indigo-600"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(root)}
                          className="p-1 text-slate-400 hover:text-indigo-600"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Subcategories list */}
                    {isExpanded && subs.length > 0 && (
                      <div className="pl-9 pr-3 py-2 space-y-1 bg-white border-t border-slate-100">
                        {subs.map((sub) => (
                          <div
                            key={sub.id}
                            className="p-2 rounded-lg hover:bg-slate-50 flex items-center justify-between text-xs transition"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                              <span className="font-semibold text-slate-800">{sub.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">/{sub.slug}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenDetail(sub)}
                                className="p-1 text-slate-400 hover:text-indigo-600"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(sub)}
                                className="p-1 text-slate-400 hover:text-indigo-600"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Form Modal */}
        <CategoryFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          categoryToEdit={categoryToEdit}
          parentCategories={categories}
          businessId={businessId}
          onSaved={() => loadData(false)}
        />

        {/* Detail Modal */}
        <CategoryDetailModal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          category={selectedCategory}
          parentCategoryName={
            selectedCategory?.parent_id ? categoryMap.get(selectedCategory.parent_id)?.name : undefined
          }
          onEdit={(cat) => handleOpenEdit(cat)}
          onDelete={(cat) => handleOpenDelete(cat)}
        />

        {/* Excel Import Modal */}
        <CategoryImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          businessId={businessId}
          onSuccess={() => loadData(false)}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteCategoryDialog
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          category={categoryToDelete}
          onDeleted={() => loadData(false)}
        />
      </div>
    </DashboardLayout>
  );
}
