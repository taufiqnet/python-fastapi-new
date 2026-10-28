"use client";

import React from "react";
import { X, Tags, Calendar, Layers, Sliders, CheckCircle2, XCircle, Edit, Trash2 } from "lucide-react";
import { CategoryOut } from "@/types";
import { formatDate } from "@/lib/utils";

interface CategoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: CategoryOut | null;
  parentCategoryName?: string;
  onEdit: (cat: CategoryOut) => void;
  onDelete: (cat: CategoryOut) => void;
}

export function CategoryDetailModal({
  isOpen,
  onClose,
  category,
  parentCategoryName,
  onEdit,
  onDelete,
}: CategoryDetailModalProps) {
  if (!isOpen || !category) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Tags className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{category.name}</h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    category.is_active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {category.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {category.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">/{category.slug}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Overview Info Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Hierarchy Tier</span>
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                {parentCategoryName ? `Subcategory of ${parentCategoryName}` : "Root Level Category"}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Created Date</span>
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {formatDate(category.created_at)}
              </p>
            </div>
          </div>

          {/* Description */}
          {category.description && (
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Description
              </span>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                {category.description}
              </p>
            </div>
          )}

          {/* Attribute Templates */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                Custom Attributes Template ({category.attribute_templates?.length || 0})
              </span>
            </div>

            {!category.attribute_templates || category.attribute_templates.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl text-center">
                No custom specification attributes mapped to this category.
              </p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {category.attribute_templates.map((attr, i) => (
                  <div key={i} className="p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800">{attr.attribute_name}</span>
                      <span className="ml-2 font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        {attr.attribute_type}
                      </span>
                    </div>
                    <div>
                      {attr.is_required ? (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                          Required
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400">Optional</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete(category);
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Category
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(category);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition active:scale-95"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit Category
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
