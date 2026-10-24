"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import { DocumentCategory, DocumentConfidentiality } from "@/types";
import {
  FolderTree,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Lock,
} from "lucide-react";

interface CategoriesTabProps {
  currentBusinessId: number;
}

export function CategoriesTab({ currentBusinessId }: CategoriesTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [confidentialityFilter, setConfidentialityFilter] = useState<string>("all");

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<DocumentCategory | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    code: "",
    description: "",
    is_mandatory: false,
    has_expiry: false,
    confidentiality_level: "internal" as DocumentConfidentiality,
    allowed_extensions: "pdf,png,jpg,jpeg",
    max_file_size_mb: 10,
  });

  const fetchCategories = useCallback(
    async (showBackgroundFetching: boolean = true) => {
      if (showBackgroundFetching) setIsFetching(true);
      try {
        const res = await apiClient.get<DocumentCategory[]>(
          `/documents/categories?business_id=${currentBusinessId}`
        );
        setCategories(res.data || []);
      } catch (err: any) {
        console.error("Failed to load categories:", err);
        toast.error("Error", err.message || "Could not fetch document categories");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [currentBusinessId, toast]
  );

  useEffect(() => {
    fetchCategories(false);
  }, [fetchCategories]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: "",
      code: "",
      description: "",
      is_mandatory: false,
      has_expiry: false,
      confidentiality_level: "internal",
      allowed_extensions: "pdf,png,jpg,jpeg",
      max_file_size_mb: 10,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cat: DocumentCategory) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      code: cat.code,
      description: cat.description || "",
      is_mandatory: cat.is_mandatory,
      has_expiry: cat.has_expiry,
      confidentiality_level: cat.confidentiality_level,
      allowed_extensions: cat.allowed_extensions || "pdf,png,jpg,jpeg",
      max_file_size_mb: cat.max_file_size_mb || 10,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name || !categoryForm.code) {
      toast.error("Missing Fields", "Please specify category name and unique code.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        business_id: currentBusinessId,
        name: categoryForm.name,
        code: categoryForm.code,
        description: categoryForm.description,
        is_mandatory: categoryForm.is_mandatory,
        has_expiry: categoryForm.has_expiry,
        confidentiality_level: categoryForm.confidentiality_level,
        allowed_extensions: categoryForm.allowed_extensions,
        max_file_size_mb: categoryForm.max_file_size_mb,
      };

      if (editingCategory) {
        await apiClient.put(
          `/documents/categories/${editingCategory.id}?business_id=${currentBusinessId}`,
          payload
        );
        toast.success("Category Updated", `Saved changes to ${categoryForm.name}.`);
      } else {
        await apiClient.post(
          `/documents/categories?business_id=${currentBusinessId}`,
          payload
        );
        toast.success("Category Created", `Created category ${categoryForm.name}.`);
      }
      setIsModalOpen(false);
      fetchCategories(true);
    } catch (err: any) {
      toast.error("Save Failed", err.message || "Failed to save document category");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCategories = categories.filter((cat) => {
    if (confidentialityFilter !== "all" && cat.confidentiality_level !== confidentialityFilter) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        cat.name.toLowerCase().includes(q) ||
        cat.code.toLowerCase().includes(q) ||
        (cat.description && cat.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={confidentialityFilter}
            onChange={(e) => setConfidentialityFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Confidentiality Levels</option>
            <option value="public">Public</option>
            <option value="internal">Internal (Standard)</option>
            <option value="confidential">Confidential (HR)</option>
            <option value="strictly_confidential">Strictly Confidential (Executive)</option>
          </select>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all rounded-lg shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Category
          </button>

          <button
            onClick={() => fetchCategories(true)}
            className="p-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
            title="Refresh categories"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Categories Table with In-Place Non-Destructive Filtering */}
      <div className="relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {(isPending || isFetching) && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-100 overflow-hidden z-10">
            <div className="w-full h-full bg-blue-600 origin-left animate-indeterminate"></div>
          </div>
        )}

        <div
          className={`overflow-x-auto transition-opacity duration-200 ${
            isPending || isFetching ? "opacity-60" : "opacity-100"
          }`}
        >
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3">Category Name & Code</th>
                <th className="px-4 py-3">Statutory Mandatory</th>
                <th className="px-4 py-3">Has Expiration</th>
                <th className="px-4 py-3">Confidentiality</th>
                <th className="px-4 py-3">Allowed File Types</th>
                <th className="px-4 py-3">Max Size</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FolderTree className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                      No Document Categories Configured
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Configure your organization’s e-Dossier and statutory filing categories.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => (
                  <tr
                    key={cat.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-white">{cat.name}</p>
                        <p className="text-[11px] font-mono text-slate-400">{cat.code}</p>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {cat.is_mandatory ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                          <CheckCircle2 className="w-3 h-3 text-rose-600" />
                          Mandatory
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Optional</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {cat.has_expiry ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                          <Clock className="w-3 h-3" />
                          Tracked
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No Expiry</span>
                      )}
                    </td>

                    <td className="px-4 py-3 capitalize">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          cat.confidentiality_level === "strictly_confidential"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                            : cat.confidentiality_level === "confidential"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <Lock className="w-3 h-3" />
                        {cat.confidentiality_level.replace("_", " ")}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {cat.allowed_extensions || "any"}
                    </td>

                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {cat.max_file_size_mb} MB
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded transition"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-scaleUp">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingCategory ? `Edit Category: ${editingCategory.name}` : "New Document Category"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure classification, validation, and retention rules
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    placeholder="e.g. Educational Certificates"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unique Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryForm.code}
                    onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })}
                    placeholder="e.g. EDU_CERT"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, description: e.target.value })
                  }
                  placeholder="e.g. Academic transcripts, diplomas, and degree verification records"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confidentiality Level *
                  </label>
                  <select
                    value={categoryForm.confidentiality_level}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        confidentiality_level: e.target
                          .value as DocumentConfidentiality,
                      })
                    }
                    className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="public">Public</option>
                    <option value="internal">Internal (Standard)</option>
                    <option value="confidential">Confidential (HR)</option>
                    <option value="strictly_confidential">Strictly Confidential (Executive)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max File Size (MB) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={categoryForm.max_file_size_mb}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        max_file_size_mb: parseInt(e.target.value) || 10,
                      })
                    }
                    className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Allowed Extensions (comma-separated)
                </label>
                <input
                  type="text"
                  value={categoryForm.allowed_extensions}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, allowed_extensions: e.target.value })
                  }
                  placeholder="pdf,png,jpg,jpeg,docx"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="cat_statutory"
                    checked={categoryForm.is_mandatory}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        is_mandatory: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600"
                  />
                  <label
                    htmlFor="cat_statutory"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Statutory Mandatory (Calculates towards Dossier Completeness %)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="cat_expiry"
                    checked={categoryForm.has_expiry}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, has_expiry: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600"
                  />
                  <label
                    htmlFor="cat_expiry"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Track Document Expiry Date & Trigger Automatic Alerts
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
