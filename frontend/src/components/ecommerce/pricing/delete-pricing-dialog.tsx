"use client";

import React, { useState } from "react";
import { CouponOut, DiscountRuleOut } from "@/types";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";

interface DeletePricingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: CouponOut | DiscountRuleOut | null;
  type: "coupon" | "rule";
}

export function DeletePricingDialog({
  isOpen,
  onClose,
  onSuccess,
  item,
  type,
}: DeletePricingDialogProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      if (type === "coupon") {
        await apiClient.delete(`/pricing/coupons/${item.id}`);
        toast.success(`Coupon "${(item as CouponOut).code}" deleted.`);
      } else {
        await apiClient.delete(`/pricing/discount-rules/${item.id}`);
        toast.success(`Discount rule "${item.name}" deleted.`);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        `Failed to delete ${type}. It may be currently in use.`;
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center gap-3 text-rose-600 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Delete {type === "coupon" ? "Coupon Code" : "Discount Rule"}
            </h3>
            <p className="text-xs text-slate-500">Irreversible action</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Are you sure you want to delete{" "}
          <strong className="text-slate-900 font-semibold">
            {type === "coupon" ? (item as CouponOut).code : item.name}
          </strong>
          ? Customers will no longer be able to redeem this promotion.
        </p>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-rose-600/20 disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
}
