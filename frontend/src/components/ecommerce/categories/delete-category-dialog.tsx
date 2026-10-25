"use client";

import React, { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { CategoryOut } from "@/types";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";

interface DeleteCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category: CategoryOut | null;
  onDeleted: () => void;
}

export function DeleteCategoryDialog({
  isOpen,
  onClose,
  category,
  onDeleted,
}: DeleteCategoryDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!isOpen || !category) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      await apiClient.delete(`/categories/${category.id}`);
      toast.success("Category deleted", `"${category.name}" was permanently removed.`);
      onDeleted();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to delete category.";
      toast.error("Delete failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Delete Category</h3>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Are you sure you want to delete{" "}
            <strong className="text-slate-900 font-semibold">&quot;{category.name}&quot;</strong>?
            Any associated products may lose their category categorization. This action cannot be undone.
          </p>

          <div className="mt-6 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white flex items-center gap-2 shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Delete Category
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
