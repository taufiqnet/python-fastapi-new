"use client";

import React, { useState, useEffect } from "react";
import { CouponOut, CouponCreateInput, DiscountRuleOut } from "@/types";
import { X, Ticket, CheckCircle, AlertCircle, Loader2, Sparkles, Calendar } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";

interface CouponFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedCoupon: CouponOut) => void;
  couponToEdit?: CouponOut | null;
  discountRules: DiscountRuleOut[];
  businessId: number;
}

export function CouponFormModal({
  isOpen,
  onClose,
  onSuccess,
  couponToEdit,
  discountRules,
  businessId,
}: CouponFormModalProps) {
  const { toast } = useToast();
  const isEditing = Boolean(couponToEdit);

  const [code, setCode] = useState("");
  const [discountRuleId, setDiscountRuleId] = useState("");
  const [maxUses, setMaxUses] = useState<string>("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (couponToEdit) {
      setCode(couponToEdit.code || "");
      setDiscountRuleId(couponToEdit.discount_rule_id || "");
      setMaxUses(couponToEdit.max_uses ? String(couponToEdit.max_uses) : "");
      setValidFrom(couponToEdit.valid_from ? couponToEdit.valid_from.substring(0, 10) : "");
      setValidTo(couponToEdit.valid_to ? couponToEdit.valid_to.substring(0, 10) : "");
      setIsActive(couponToEdit.is_active !== false);
    } else {
      setCode("");
      setDiscountRuleId(discountRules.length > 0 ? discountRules[0].id : "");
      setMaxUses("");
      setValidFrom("");
      setValidTo("");
      setIsActive(true);
    }
    setError(null);
  }, [couponToEdit, discountRules, isOpen]);

  if (!isOpen) return null;

  const generateRandomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let res = "SAVE";
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(res);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Coupon code is required.");
      return;
    }
    if (!discountRuleId) {
      setError("Please select an associated discount rule.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: CouponCreateInput = {
      code: code.trim().toUpperCase(),
      discount_rule_id: discountRuleId,
      max_uses: maxUses ? parseInt(maxUses, 10) : null,
      valid_from: validFrom ? new Date(validFrom).toISOString() : null,
      valid_to: validTo ? new Date(validTo).toISOString() : null,
      is_active: isActive,
      business_id: businessId,
    };

    try {
      let saved: CouponOut;
      if (isEditing && couponToEdit) {
        const res = await apiClient.put<CouponOut>(`/pricing/coupons/${couponToEdit.id}`, payload);
        saved = res.data;
        toast.success("Coupon updated successfully");
      } else {
        const res = await apiClient.post<CouponOut>("/pricing/coupons", payload);
        saved = res.data;
        toast.success("Coupon created successfully");
      }
      onSuccess(saved);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to save coupon. The code may already exist.";
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
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? "Edit Coupon" : "Create New Coupon Voucher"}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing ? `Modifying voucher ${couponToEdit?.code}` : "Issue a promotional coupon code"}
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
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Coupon Code <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={generateRandomCode}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Auto-Generate
              </button>
            </div>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g., SUMMER50, VIPNEW"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono uppercase tracking-wider focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Linked Discount Rule <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={discountRuleId}
              onChange={(e) => setDiscountRuleId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Select Discount Calculation Rule</option>
              {discountRules.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.name} ({rule.discount_type === "percentage" ? `${rule.discount_value}% OFF` : `$${rule.discount_value} OFF`})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Max Redemption Limit (Blank = Unlimited)
            </label>
            <input
              type="number"
              min="1"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="e.g., 100 uses"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valid From
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valid Until
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <input
              type="checkbox"
              id="coupon_is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <label htmlFor="coupon_is_active" className="text-xs font-medium text-slate-700 cursor-pointer">
              Active Coupon (redeemable at POS and online checkout)
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
            className="inline-flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-amber-600/20 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {isEditing ? "Save Coupon" : "Create Coupon"}
          </button>
        </div>
      </div>
    </div>
  );
}
