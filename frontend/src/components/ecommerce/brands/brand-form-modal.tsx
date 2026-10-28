"use client";

import React, { useState, useEffect } from "react";
import { BrandOut, BrandCreateInput } from "@/types";
import { X, Award, Link, Image as ImageIcon, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";

interface BrandFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedBrand: BrandOut) => void;
  brandToEdit?: BrandOut | null;
  businessId: number;
}

export function BrandFormModal({
  isOpen,
  onClose,
  onSuccess,
  brandToEdit,
  businessId,
}: BrandFormModalProps) {
  const { toast } = useToast();
  const isEditing = Boolean(brandToEdit);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (brandToEdit) {
      setName(brandToEdit.name || "");
      setSlug(brandToEdit.slug || "");
      setLogoUrl(brandToEdit.logo_url || "");
      setWebsiteUrl(brandToEdit.website_url || "");
      setDescription(brandToEdit.description || "");
      setIsActive(brandToEdit.is_active !== false);
    } else {
      setName("");
      setSlug("");
      setLogoUrl("");
      setWebsiteUrl("");
      setDescription("");
      setIsActive(true);
    }
    setError(null);
  }, [brandToEdit, isOpen]);

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
    if (!name.trim()) {
      setError("Brand name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: BrandCreateInput = {
      name: name.trim(),
      slug: slug.trim() || name.trim().toLowerCase().replace(/\s+/g, "-"),
      logo_url: logoUrl.trim() || null,
      website_url: websiteUrl.trim() || null,
      description: description.trim() || null,
      is_active: isActive,
      business_id: businessId,
    };

    try {
      let saved: BrandOut;
      if (isEditing && brandToEdit) {
        const res = await apiClient.put<BrandOut>(`/brands/${brandToEdit.id}`, payload);
        saved = res.data;
        toast.success("Brand updated successfully");
      } else {
        const res = await apiClient.post<BrandOut>("/brands/", payload);
        saved = res.data;
        toast.success("Brand created successfully");
      }
      onSuccess(saved);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to save brand. Please check the inputs.";
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
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? "Edit Brand" : "Create New Brand"}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing ? `Modifying ${brandToEdit?.name}` : "Define brand identity and logo"}
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
              Brand Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Apple, Samsung, Sony"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g., apple, samsung"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Logo Image URL
            </label>
            <div className="flex gap-3 items-center">
              <div className="relative flex-1">
                <ImageIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              {logoUrl ? (
                <div className="w-10 h-10 rounded-xl border border-slate-200 p-1 flex items-center justify-center bg-white shrink-0 overflow-hidden">
                  <img
                    src={logoUrl}
                    alt="Logo Preview"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-300 shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Official Website URL
            </label>
            <div className="relative">
              <Link className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://www.brand.com"
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description about the manufacturer or brand..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <input
              type="checkbox"
              id="brand_is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <label htmlFor="brand_is_active" className="text-xs font-medium text-slate-700 cursor-pointer">
              Active Brand (visible across catalog filters and product listings)
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
            className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {isEditing ? "Save Changes" : "Create Brand"}
          </button>
        </div>
      </div>
    </div>
  );
}
