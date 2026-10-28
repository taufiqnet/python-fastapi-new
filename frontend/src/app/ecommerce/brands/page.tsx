"use client";

import React, { useEffect, useState, useMemo, useRef, startTransition } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { BrandOut, ProductModelOut } from "@/types";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import {
  Award,
  Cpu,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  ExternalLink,
  Layers,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { BrandFormModal } from "@/components/ecommerce/brands/brand-form-modal";
import { ModelFormModal } from "@/components/ecommerce/brands/model-form-modal";
import { DeleteBrandDialog } from "@/components/ecommerce/brands/delete-brand-dialog";

export default function BrandsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const businessId = user?.business_id || 1;

  // Tabs: "brands" | "models"
  const [activeTab, setActiveTab] = useState<"brands" | "models">("brands");

  // Data states
  const [brands, setBrands] = useState<BrandOut[]>([]);
  const [models, setModels] = useState<ProductModelOut[]>([]);

  // Loading states (Two-tier per ui_in_place_filtering.md)
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals state
  const [isBrandFormOpen, setIsBrandFormOpen] = useState(false);
  const [brandToEdit, setBrandToEdit] = useState<BrandOut | null>(null);

  const [isModelFormOpen, setIsModelFormOpen] = useState(false);
  const [modelToEdit, setModelToEdit] = useState<ProductModelOut | null>(null);
  const [defaultBrandForModel, setDefaultBrandForModel] = useState<string>("");

  const [deleteItem, setDeleteItem] = useState<BrandOut | ProductModelOut | null>(null);
  const [deleteType, setDeleteType] = useState<"brand" | "model">("brand");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Load Data
  const loadData = async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    } else {
      setIsFetching(true);
    }
    setError(null);

    try {
      const brandsRes = await apiClient.get<BrandOut[]>("/brands/?limit=200");
      const fetchedBrands = brandsRes.data || [];
      setBrands(fetchedBrands);

      // Collect all models across brands
      const allModels: ProductModelOut[] = [];
      fetchedBrands.forEach((b) => {
        if (b.models && b.models.length > 0) {
          b.models.forEach((m) => {
            allModels.push({
              ...m,
              brand_id: b.id,
              brand_name: b.name,
            });
          });
        }
      });
      setModels(allModels);
    } catch {
      setError("Failed to fetch brands and models from backend.");
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
  const handleTabSwitch = (tab: "brands" | "models") => {
    startTransition(() => {
      setActiveTab(tab);
      setSearchQuery("");
      setStatusFilter("all");
      setBrandFilter("all");
      setCurrentPage(1);
    });
  };

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

  const handleBrandFilterChange = (bId: string) => {
    startTransition(() => {
      setBrandFilter(bId);
      setCurrentPage(1);
    });
  };

  const clearFilters = () => {
    startTransition(() => {
      setSearchQuery("");
      setStatusFilter("all");
      setBrandFilter("all");
      setCurrentPage(1);
    });
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalBrands = brands.length;
    const activeBrands = brands.filter((b) => b.is_active !== false).length;
    const totalModels = models.length;
    const activeModels = models.filter((m) => m.is_active !== false).length;
    return { totalBrands, activeBrands, totalModels, activeModels };
  }, [brands, models]);

  // Filtered Brands
  const filteredBrands = useMemo(() => {
    return brands.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q) ||
        (b.description && b.description.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && b.is_active !== false) ||
        (statusFilter === "inactive" && b.is_active === false);

      return matchesSearch && matchesStatus;
    });
  }, [brands, searchQuery, statusFilter]);

  // Filtered Models
  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.slug && m.slug.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && m.is_active !== false) ||
        (statusFilter === "inactive" && m.is_active === false);

      const matchesBrand = brandFilter === "all" || m.brand_id === brandFilter;

      return matchesSearch && matchesStatus && matchesBrand;
    });
  }, [models, searchQuery, statusFilter, brandFilter]);

  // Pagination for Active Tab
  const currentList = activeTab === "brands" ? filteredBrands : filteredModels;
  const totalItems = currentList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedBrands = useMemo(() => {
    return filteredBrands.slice(startIndex, endIndex);
  }, [filteredBrands, startIndex, endIndex]);

  const paginatedModels = useMemo(() => {
    return filteredModels.slice(startIndex, endIndex);
  }, [filteredModels, startIndex, endIndex]);

  // Handlers for Brand Modals
  const handleOpenCreateBrand = () => {
    setBrandToEdit(null);
    setIsBrandFormOpen(true);
  };

  const handleOpenEditBrand = (brand: BrandOut) => {
    setBrandToEdit(brand);
    setIsBrandFormOpen(true);
  };

  const handleOpenDeleteBrand = (brand: BrandOut) => {
    setDeleteItem(brand);
    setDeleteType("brand");
    setIsDeleteOpen(true);
  };

  // Handlers for Model Modals
  const handleOpenCreateModel = (preselectedBrandId?: string) => {
    setModelToEdit(null);
    setDefaultBrandForModel(preselectedBrandId || "");
    setIsModelFormOpen(true);
  };

  const handleOpenEditModel = (model: ProductModelOut) => {
    setModelToEdit(model);
    setDefaultBrandForModel(model.brand_id || "");
    setIsModelFormOpen(true);
  };

  const handleOpenDeleteModel = (model: ProductModelOut) => {
    setDeleteItem(model);
    setDeleteType("model");
    setIsDeleteOpen(true);
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" || statusFilter !== "all" || (activeTab === "models" && brandFilter !== "all");

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full pb-12">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
              <span>Catalog & Store</span>
              <span>•</span>
              <span>Manufacturers & Models</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Award className="w-7 h-7 text-indigo-600" />
              Brands & Models
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage product manufacturers, hardware models, logos, and specifications.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => loadData(false)}
              disabled={isFetching}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            </button>

            <a
              href={`/api/v1/brands/template-excel`}
              download
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Excel Template
            </a>

            {activeTab === "brands" ? (
              <button
                type="button"
                onClick={handleOpenCreateBrand}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition shadow-md shadow-indigo-600/25 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Add Brand
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenCreateModel()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl text-xs transition shadow-md shadow-violet-600/25 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Add Model
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 gap-8">
          <button
            type="button"
            onClick={() => handleTabSwitch("brands")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === "brands"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Award className="w-4 h-4" />
            Brands ({metrics.totalBrands})
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch("models")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === "models"
                ? "border-violet-600 text-violet-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Cpu className="w-4 h-4" />
            Product Models ({metrics.totalModels})
          </button>
        </div>

        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Brands</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{metrics.totalBrands}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Active Brands</p>
              <p className="text-xl font-bold text-emerald-700 mt-0.5">{metrics.activeBrands}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Models</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{metrics.totalModels}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Active Models</p>
              <p className="text-xl font-bold text-purple-700 mt-0.5">{metrics.activeModels}</p>
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
                placeholder={
                  activeTab === "brands"
                    ? "Search brands by name, slug, or keywords..."
                    : "Search models by name, slug, or specification..."
                }
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

            {/* Brand Filter (Models Tab only) */}
            {activeTab === "models" && (
              <select
                value={brandFilter}
                onChange={(e) => handleBrandFilterChange(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="all">All Brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Status Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Status:
              </span>
              {[
                { id: "all", label: "All Statuses" },
                { id: "active", label: "Active" },
                { id: "inactive", label: "Inactive" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleStatusChange(tab.id)}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    statusFilter === tab.id
                      ? activeTab === "brands"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-violet-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                Showing <strong className="text-slate-800">{totalItems}</strong> items
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

        {/* Data Container with Top-Rim Progress Line - Never Unmounts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden relative">
          {/* Top-rim indeterminate progress bar during background fetching */}
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-100 overflow-hidden z-20">
              <div className="w-full h-full bg-indigo-600 origin-left animate-indeterminate" />
            </div>
          )}

          {initialLoading && brands.length === 0 ? (
            <div className="p-16 text-center">
              <div className="flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-sm font-semibold text-slate-800">Loading catalog brands...</p>
                <p className="text-xs text-slate-400">Fetching manufacturers from FastAPI backend</p>
              </div>
            </div>
          ) : activeTab === "brands" ? (
            /* Brands Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Brand & Logo</th>
                    <th className="py-3 px-4">Slug</th>
                    <th className="py-3 px-4">Models</th>
                    <th className="py-3 px-4">Website</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-slate-100 text-xs ${isFetching ? "opacity-50 transition-opacity" : ""}`}>
                  {paginatedBrands.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No brands found matching the active criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedBrands.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/75 transition-colors group">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden">
                              {b.logo_url ? (
                                <img
                                  src={b.logo_url}
                                  alt={b.name}
                                  className="max-h-full max-w-full object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <Award className="w-4 h-4 text-indigo-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition">
                                {b.name}
                              </p>
                              {b.description && (
                                <p className="text-[11px] text-slate-400 truncate max-w-xs">
                                  {b.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                          /{b.slug}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => {
                              handleTabSwitch("models");
                              handleBrandFilterChange(b.id);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-[11px] hover:bg-indigo-100 transition"
                          >
                            <Cpu className="w-3 h-3" />
                            {b.models?.length || 0} Models
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          {b.website_url ? (
                            <a
                              href={b.website_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition text-[11px]"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Visit
                            </a>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {b.is_active !== false ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <XCircle className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {b.created_at ? formatDate(b.created_at) : "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenCreateModel(b.id)}
                              className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition"
                              title="Add Model for this Brand"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditBrand(b)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Edit Brand"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDeleteBrand(b)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Brand"
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
          ) : (
            /* Models Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Model Name</th>
                    <th className="py-3 px-4">Brand</th>
                    <th className="py-3 px-4">Slug</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-slate-100 text-xs ${isFetching ? "opacity-50 transition-opacity" : ""}`}>
                  {paginatedModels.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No product models found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedModels.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/75 transition-colors group">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                              <Cpu className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 group-hover:text-violet-600 transition">
                                {m.name}
                              </p>
                              {m.description && (
                                <p className="text-[11px] text-slate-400 truncate max-w-xs">
                                  {m.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium text-[11px]">
                            <Award className="w-3 h-3 text-indigo-600" />
                            {m.brand_name || "Unknown Brand"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                          /{m.slug || "—"}
                        </td>
                        <td className="py-3 px-4">
                          {m.is_active !== false ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <XCircle className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {m.created_at ? formatDate(m.created_at) : "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModel(m)}
                              className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition"
                              title="Edit Model"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDeleteModel(m)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Model"
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

        {/* Modals */}
        <BrandFormModal
          isOpen={isBrandFormOpen}
          onClose={() => setIsBrandFormOpen(false)}
          onSuccess={() => loadData(false)}
          brandToEdit={brandToEdit}
          businessId={businessId}
        />

        <ModelFormModal
          isOpen={isModelFormOpen}
          onClose={() => setIsModelFormOpen(false)}
          onSuccess={() => loadData(false)}
          modelToEdit={modelToEdit}
          brands={brands}
          defaultBrandId={defaultBrandForModel}
          businessId={businessId}
        />

        <DeleteBrandDialog
          isOpen={isDeleteOpen}
          onClose={() => {
            setIsDeleteOpen(false);
            setDeleteItem(null);
          }}
          onSuccess={() => loadData(false)}
          item={deleteItem}
          type={deleteType}
        />
      </div>
    </DashboardLayout>
  );
}
