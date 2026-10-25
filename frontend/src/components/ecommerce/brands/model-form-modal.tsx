"use client";

import React, { useState, useEffect } from "react";
import { ProductModelOut, ProductModelCreateInput, BrandOut } from "@/types";
import { X, Cpu, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";

interface ModelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedModel: ProductModelOut) => void;
  modelToEdit?: ProductModelOut | null;
  brands: BrandOut[];
  defaultBrandId?: string;
  businessId: number;
}

export function ModelFormModal({
  isOpen,
  onClose,
  onSuccess,
  modelToEdit,
  brands,
  defaultBrandId,
  businessId,
}: ModelFormModalProps) {
  const { toast } = useToast();
  const isEditing = Boolean(modelToEdit);

  const [brandId, setBrandId] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (modelToEdit) {
      setBrandId(modelToEdit.brand_id || defaultBrandId || "");
      setName(modelToEdit.name || "");
      setSlug(modelToEdit.slug || "");
      setDescription(modelToEdit.description || "");
      setIsActive(modelToEdit.is_active !== false);
    } else {
      setBrandId(defaultBrandId || (brands.length > 0 ? brands[0].id : ""));
      setName("");
      setSlug("");
      setDescription("");
      setIsActive(true);
    }
    setError(null);
  }, [modelToEdit, defaultBrandId, brands, isOpen]);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandId) {
      setError("Please select a brand.");
      return;
    }
    if (!name.trim()) {
      setError("Model name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: ProductModelCreateInput = {
      name: name.trim(),
      slug: slug.trim() || name.trim().toLowerCase().replace(/\s+/g, "-"),
      brand_id: brandId,
      description: description.trim() || null,
      is_active: isActive,
      business_id: businessId,
    };

    try {
      let saved: ProductModelOut;
      if (isEditing && modelToEdit) {
        const res = await apiClient.put<ProductModelOut>(`/brands/models/${modelToEdit.id}`, payload);
        saved = res.data;
        toast.success("Model updated successfully");
      } else {
        const res = await apiClient.post<ProductModelOut>(`/brands/${brandId}/models`, payload);
        saved = res.data;
        toast.success("Model created successfully");
      }
      onSuccess(saved);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to save product model. Please check the inputs.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? "Edit Product Model" : "Create New Product Model"}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing ? `Modifying ${modelToEdit?.name}` : "Associate model specification under a brand"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Brand <span className="text-rose-500">*</span>
            </label>
            <select
              required
              disabled={isEditing}
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60"
            >
              <option value="">Select Brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Model Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., iPhone 15 Pro, Galaxy S24 Ultra"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g., iphone-15-pro"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Hardware generation, release year, or form factor notes..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <input
              type="checkbox"
              id="model_is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <label htmlFor="model_is_active" className="text-xs font-medium text-slate-700 cursor-pointer">
              Active Model (available when categorizing product variants)
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-violet-600/20 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {isEditing ? "Save Model" : "Create Model"}
          </button>
        </div>
      </div>
    </div>
  );
}
