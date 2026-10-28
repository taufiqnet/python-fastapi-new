"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Loader2, Tags, Sliders, CheckCircle2 } from "lucide-react";
import { CategoryOut, CategoryAttributeTemplateOut } from "@/types";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: CategoryOut | null;
  parentCategories: CategoryOut[];
  businessId: number;
  onSaved: () => void;
}

export function CategoryFormModal({
  isOpen,
  onClose,
  categoryToEdit,
  parentCategories,
  businessId,
  onSaved,
}: CategoryFormModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"general" | "attributes">("general");
  const [loading, setLoading] = useState(false);

  // General Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Attribute Templates State
  const [attributeTemplates, setAttributeTemplates] = useState<CategoryAttributeTemplateOut[]>([]);

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setSlug(categoryToEdit.slug);
      setParentId(categoryToEdit.parent_id || "");
      setIcon(categoryToEdit.icon || "");
      setDescription(categoryToEdit.description || "");
      setIsActive(categoryToEdit.is_active ?? true);
      setAttributeTemplates(categoryToEdit.attribute_templates || []);
    } else {
      setName("");
      setSlug("");
      setParentId("");
      setIcon("");
      setDescription("");
      setIsActive(true);
      setAttributeTemplates([]);
    }
    setActiveTab("general");
  }, [categoryToEdit, isOpen]);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!categoryToEdit) {
      setSlug(
        val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
      );
    }
  };

  const handleAddAttribute = () => {
    setAttributeTemplates((prev) => [
      ...prev,
      {
        attribute_name: "",
        attribute_type: "text",
        is_required: false,
        options: "",
      },
    ]);
  };

  const handleRemoveAttribute = (index: number) => {
    setAttributeTemplates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateAttribute = (
    index: number,
    field: keyof CategoryAttributeTemplateOut,
    value: unknown
  ) => {
    setAttributeTemplates((prev) =>
      prev.map((attr, i) => (i === index ? { ...attr, [field]: value } : attr))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Validation error", "Category name is required.");
      return;
    }

    setLoading(true);
    try {
      // Process attribute templates options into arrays if comma-separated
      const formattedAttrs = attributeTemplates
        .filter((a) => a.attribute_name.trim() !== "")
        .map((a) => ({
          attribute_name: a.attribute_name.trim(),
          attribute_type: a.attribute_type,
          is_required: Boolean(a.is_required),
          options:
            typeof a.options === "string"
              ? a.options.split(",").map((s) => s.trim()).filter(Boolean)
              : a.options || null,
        }));

      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        icon: icon.trim() || null,
        description: description.trim() || null,
        is_active: isActive,
        parent_id: parentId ? parentId : null,
        business_id: businessId,
        attribute_templates: formattedAttrs,
      };

      if (categoryToEdit) {
        await apiClient.put(`/categories/${categoryToEdit.id}`, payload);
        toast.success("Category updated", `"${name}" was saved successfully.`);
      } else {
        await apiClient.post("/categories/", payload);
        toast.success("Category created", `"${name}" was created successfully.`);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to save category.";
      toast.error("Operation failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {categoryToEdit ? "Edit Category" : "Create New Category"}
            </h3>
            <p className="text-xs text-slate-400">
              {categoryToEdit
                ? "Update category hierarchy, slug, and specification templates"
                : "Add a new product category or subcategory to your store catalog"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Headers */}
        <div className="border-b border-slate-200 bg-slate-50/30 px-6 flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "general"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Tags className="w-3.5 h-3.5" />
            General Information
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("attributes")}
            className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "attributes"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Attribute Templates ({attributeTemplates.length})
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {activeTab === "general" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Category Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Smartphones, Men's Footwear"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    URL Slug <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. smartphones, mens-footwear"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Parent Category (Hierarchy)
                  </label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  >
                    <option value="">— None (Root Category) —</option>
                    {parentCategories
                      .filter((c) => !categoryToEdit || c.id !== categoryToEdit.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Icon Tag / Class
                  </label>
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="e.g. Package, ShoppingBag, Laptop"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description of this category for navigation and SEO..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Active Status (Visible in store and product catalog)
                  </span>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Specification Attributes
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Attributes defined here will be assigned to products under this category
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddAttribute}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Field
                </button>
              </div>

              {attributeTemplates.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs font-medium text-slate-500">
                    No custom specification attributes defined yet.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddAttribute}
                    className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
                  >
                    + Add your first attribute template
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {attributeTemplates.map((attr, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500">
                          Field #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttribute(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500">
                            Attribute Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. RAM, Screen Size"
                            value={attr.attribute_name}
                            onChange={(e) =>
                              handleUpdateAttribute(idx, "attribute_name", e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500">
                            Type
                          </label>
                          <select
                            value={attr.attribute_type}
                            onChange={(e) =>
                              handleUpdateAttribute(idx, "attribute_type", e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          >
                            <option value="text">Text Input</option>
                            <option value="select">Dropdown / Select</option>
                            <option value="number">Numeric</option>
                            <option value="boolean">Yes / No Switch</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500">
                            Options (comma separated)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 8GB, 16GB, 32GB"
                            value={
                              Array.isArray(attr.options)
                                ? attr.options.join(", ")
                                : typeof attr.options === "string"
                                ? attr.options
                                : ""
                            }
                            onChange={(e) =>
                              handleUpdateAttribute(idx, "options", e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={attr.is_required}
                          onChange={(e) =>
                            handleUpdateAttribute(idx, "is_required", e.target.checked)
                          }
                          className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                        <span className="text-[11px] font-medium">Required field when editing products</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {categoryToEdit ? "Update Category" : "Save Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
