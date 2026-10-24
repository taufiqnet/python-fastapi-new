"use client";

import React, { useState } from "react";
import { X, Loader2, AlertCircle, CheckCircle2, Boxes, ArrowRightLeft, ShieldAlert } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";

export interface InventoryAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  inventoryItemId?: string;
  sku?: string;
  productTitle?: string;
  currentStock?: number;
  warehouseName?: string;
}

export function InventoryAdjustmentModal({
  isOpen,
  onClose,
  onSuccess,
  inventoryItemId = "inv-item-default",
  sku = "SKU-PROD-001",
  productTitle = "Selected Inventory Product",
  currentStock = 100,
  warehouseName = "Central Fulfillment Hub",
}: InventoryAdjustmentModalProps) {
  const { toast } = useToast();
  const [delta, setDelta] = useState<number | string>("");
  const [reason, setReason] = useState<string>("count_correction");
  const [batchNumber, setBatchNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numDelta = Number(delta);

    if (!delta || isNaN(numDelta) || numDelta === 0) {
      setError("Please specify a non-zero quantity adjustment (positive for surplus, negative for shrinkage).");
      return;
    }

    if (!reason) {
      setError("Please select an adjustment reason for audit traceability.");
      return;
    }

    if (numDelta < 0 && Math.abs(numDelta) > currentStock) {
      setError(`Cannot deduct ${Math.abs(numDelta)} units. Current on-hand stock is only ${currentStock} units.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiClient.post("/inventory/adjustments", {
        inventory_item_id: inventoryItemId,
        delta: numDelta,
        reason,
        batch_number: batchNumber.trim() || null,
        notes: notes.trim() || null,
      });

      toast.success(
        "Stock Adjusted Successfully",
        `Inventory for ${sku} updated by ${numDelta > 0 ? `+${numDelta}` : numDelta} units.`
      );

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to submit stock adjustment. Please check inputs.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const resultingStock = typeof delta === "number" || (typeof delta === "string" && delta.trim() !== "")
    ? currentStock + Number(delta || 0)
    : currentStock;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Physical Stock Adjustment</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {sku} • {warehouseName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product / Context Summary */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-3 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 font-medium">Item:</span>{" "}
            <strong className="text-slate-800">{productTitle}</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Current Stock:</span>
            <span className="px-2 py-0.5 rounded-full font-bold bg-slate-200/70 text-slate-800">
              {currentStock} units
            </span>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Adjustment Delta <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                placeholder="e.g. +10 or -5"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Resulting on-hand: <strong className={resultingStock < 0 ? "text-rose-600" : "text-emerald-700"}>{resultingStock}</strong>
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Audit Reason <span className="text-rose-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800"
              >
                <option value="count_correction">Count Correction (Audit Discrepancy)</option>
                <option value="damage">Damaged Goods Write-off</option>
                <option value="theft">Inventory Shrinkage / Theft</option>
                <option value="expiry">Expired Stock Removal</option>
                <option value="receipt">Manual Goods Receipt (Surplus)</option>
                <option value="return">Customer Return to Stock</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Lot / Batch Number (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. LOT-2026-OCT-09A"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Audit Notes & Discrepancy Justification
            </label>
            <textarea
              rows={2}
              placeholder="Provide context for internal warehouse auditors..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm shadow-slate-900/20 flex items-center gap-2 transition-all"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Post Stock Adjustment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InventoryAdjustmentModal;
