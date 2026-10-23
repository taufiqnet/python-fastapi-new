"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { AssetCategory } from "@/types";
import { useToast } from "@/context/toast-context";
import {
  Laptop,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  Edit,
  X,
  ArrowLeft,
} from "lucide-react";

export default function AssetCategoriesPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AssetCategory | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formLifeMonths, setFormLifeMonths] = useState("36");
  const [formDepreciation, setFormDepreciation] = useState("straight_line");
  const [formDescription, setFormDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    loadData(false);
  }, []);

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
    if (!formName || !formCode) {
      toast.error("Validation Error", "Name and code are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await apiClient.put(`/assets/categories/${editingCategory.id}`, {
          name: formName,
          code: formCode.toUpperCase(),
          useful_life_months: formLifeMonths ? parseInt(formLifeMonths) : 36,
          depreciation_method: formDepreciation,
          description: formDescription || null,
        });
        toast.success("Category Updated", `Category ${formName} saved successfully.`);
      } else {
        await apiClient.post("/assets/categories", {
          name: formName,
          code: formCode.toUpperCase(),
          useful_life_months: formLifeMonths ? parseInt(formLifeMonths) : 36,
          depreciation_method: formDepreciation,
          description: formDescription || null,
        });
        toast.success("Category Created", `Category ${formName} (${formCode.toUpperCase()}) added.`);
      }
      setIsModalOpen(false);
      loadData(true);
    } catch (err: any) {
      toast.error("Save Failed", err.response?.data?.detail || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat: AssetCategory) => {
    if (!confirm(`Are you sure you want to delete category '${cat.name}'?`)) return;
    try {
      await apiClient.delete(`/assets/categories/${cat.id}`);
      toast.success("Category Deleted", `Category ${cat.name} removed.`);
      loadData(true);
    } catch (err: any) {
      toast.error("Delete Failed", err.response?.data?.detail || err.message);
    }
  };

  const filteredCategories = categories.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <Link
              href="/assets"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Asset Catalog</span>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Asset Categories Configuration
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Define equipment types (Laptops, SIMs, Mobiles, Vehicles), code prefixes, and useful life cycles
            </p>
          </div>

          <div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search category name or code..."
              className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button
              onClick={() => loadData(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
              <span>Refresh</span>
            </button>
            <span className="font-semibold text-slate-700">{filteredCategories.length}</span> categories
          </div>
        </div>

        {/* Grid of Categories */}
        <div className="relative">
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-100 overflow-hidden z-10 rounded-full">
              <div className="h-full bg-indigo-600 animate-pulse w-full" />
            </div>
          )}

          {initialLoading ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <p className="text-xs">Loading categories...</p>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
              <Tag className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No categories found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-indigo-200 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-indigo-50 text-indigo-700">
                        {cat.code}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          cat.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {cat.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mt-2.5">{cat.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {cat.description || "No description provided."}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Useful Life:</span>
                      <span className="font-semibold text-slate-800">{cat.useful_life_months || 36} months</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditModal(cat)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
                      title="Edit Category"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Create/Edit Category */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase">
                <Tag className="w-4 h-4" />
                <span>Category Configuration</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                {editingCategory ? "Edit Asset Category" : "Add Asset Category"}
              </h2>

              <form onSubmit={handleSaveCategory} className="space-y-3.5 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase">Category Name *</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Laptops"
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase">Code Prefix *</label>
                    <input
                      type="text"
                      required
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      placeholder="e.g. LAP, SIM, VEH"
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase">Useful Life (Months)</label>
                    <input
                      type="number"
                      value={formLifeMonths}
                      onChange={(e) => setFormLifeMonths(e.target.value)}
                      placeholder="36"
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase">Depreciation Model</label>
                    <select
                      value={formDepreciation}
                      onChange={(e) => setFormDepreciation(e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="straight_line">Straight Line (SLM)</option>
                      <option value="wdv">Written Down Value (WDV)</option>
                      <option value="none">None (Non-depreciable)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Description</label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Short description of items in this category..."
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                  >
                    {isSubmitting ? "Saving..." : "Save Category"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
