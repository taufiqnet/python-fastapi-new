"use client";

import React, { useState, useEffect } from "react";
import { DiscountRuleOut, DiscountRuleCreateInput } from "@/types";
import { X, Percent, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";

interface DiscountRuleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedRule: DiscountRuleOut) => void;
  ruleToEdit?: DiscountRuleOut | null;
  businessId: number;
}

export function DiscountRuleFormModal({
  isOpen,
  onClose,
  onSuccess,
  ruleToEdit,
  businessId,
}: DiscountRuleFormModalProps) {
  const { toast } = useToast();
  const isEditing = Boolean(ruleToEdit);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed" | "buy_x_get_y">("percentage");
  const [discountValue, setDiscountValue] = useState<string>("10");
  const [buyXQty, setBuyXQty] = useState<string>("");
  const [getYQty, setGetYQty] = useState<string>("");
  const [minOrderAmount, setMinOrderAmount] = useState<string>("0");
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ruleToEdit) {
      setName(ruleToEdit.name || "");
      setCode(ruleToEdit.code || "");
      setDiscountType(
        (ruleToEdit.discount_type as "percentage" | "fixed" | "buy_x_get_y") || "percentage"
      );
      setDiscountValue(String(ruleToEdit.discount_value || 0));
      setBuyXQty(ruleToEdit.buy_x_qty ? String(ruleToEdit.buy_x_qty) : "");
      setGetYQty(ruleToEdit.get_y_qty ? String(ruleToEdit.get_y_qty) : "");
      setMinOrderAmount(String(ruleToEdit.min_order_amount || 0));
      setIsActive(ruleToEdit.is_active !== false);
    } else {
      setName("");
      setCode("");
      setDiscountType("percentage");
      setDiscountValue("10");
      setBuyXQty("");
      setGetYQty("");
      setMinOrderAmount("0");
      setIsActive(true);
    }
    setError(null);
  }, [ruleToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Rule name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: DiscountRuleCreateInput = {
      name: name.trim(),
      code: code.trim() || null,
      discount_type: discountType,
      discount_value: parseFloat(discountValue) || 0,
      buy_x_qty: buyXQty ? parseInt(buyXQty, 10) : null,
      get_y_qty: getYQty ? parseInt(getYQty, 10) : null,
      min_order_amount: parseFloat(minOrderAmount) || 0,
      is_active: isActive,
      business_id: businessId,
    };

    try {
      let saved: DiscountRuleOut;
      if (isEditing && ruleToEdit) {
        const res = await apiClient.put<DiscountRuleOut>(
          `/pricing/discount-rules/${ruleToEdit.id}`,
          payload
        );
        saved = res.data;
        toast.success("Discount rule updated successfully");
      } else {
        const res = await apiClient.post<DiscountRuleOut>("/pricing/discount-rules", payload);
        saved = res.data;
        toast.success("Discount rule created successfully");
      }
      onSuccess(saved);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to save discount rule. Please check input parameters.";
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
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? "Edit Discount Rule" : "Create Discount Rule"}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing ? `Modifying ${ruleToEdit?.name}` : "Configure cart deduction calculation"}
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
              Rule Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Summer Clearance 15% OFF"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Discount Mechanism
              </label>
              <select
                value={discountType}
                onChange={(e) =>
                  setDiscountType(e.target.value as "percentage" | "fixed" | "buy_x_get_y")
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Currency Amount ($)</option>
                <option value="buy_x_get_y">Buy X Get Y Free</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {discountType === "percentage"
                  ? "Percentage (%)"
                  : discountType === "fixed"
                  ? "Deduction Value ($)"
                  : "Unit Discount ($)"}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="e.g., 15"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {discountType === "buy_x_get_y" && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Buy Quantity (X)</label>
                <input
                  type="number"
                  min="1"
                  value={buyXQty}
                  onChange={(e) => setBuyXQty(e.target.value)}
                  placeholder="e.g., 2"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Free Quantity (Y)</label>
                <input
                  type="number"
                  min="1"
                  value={getYQty}
                  onChange={(e) => setGetYQty(e.target.value)}
                  placeholder="e.g., 1"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Minimum Cart Subtotal ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={minOrderAmount}
              onChange={(e) => setMinOrderAmount(e.target.value)}
              placeholder="0.00 for no minimum threshold"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <input
              type="checkbox"
              id="rule_is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <label htmlFor="rule_is_active" className="text-xs font-medium text-slate-700 cursor-pointer">
              Active Rule (can be attached to coupons or automated campaigns)
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
            {isEditing ? "Save Rule" : "Create Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}
