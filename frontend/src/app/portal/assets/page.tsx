"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { AssetAssignment } from "@/types";
import { useToast } from "@/context/toast-context";
import {
  Laptop,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Tag,
  ShieldCheck,
  Calendar,
  RefreshCw,
  X,
  FileCheck2,
} from "lucide-react";

export default function PortalMyAssetsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<AssetAssignment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dispute modal
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [selectedAssetForDispute, setSelectedAssetForDispute] = useState<AssetAssignment | null>(null);
  const [disputeNotes, setDisputeNotes] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<AssetAssignment[]>("/assets/portal/my-assets");
      setAssets(res.data || []);
    } catch (err: any) {
      toast.error("Error Loading Assets", err.message || "Failed to load assigned company assets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAcknowledge = async (assignment: AssetAssignment) => {
    setIsSubmitting(true);
    try {
      await apiClient.post(`/assets/allocations/${assignment.id}/acknowledge`, {
        status: "active",
        notes: "Acknowledged receipt in good order via Employee Portal.",
      });
      toast.success(
        "Custody Acknowledged",
        `You have confirmed receipt of ${assignment.asset_name || assignment.asset_tag}.`
      );
      loadData();
    } catch (err: any) {
      toast.error("Action Failed", err.response?.data?.detail || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForDispute || !disputeNotes.trim()) return;
    setIsSubmitting(true);
    try {
      await apiClient.post(`/assets/allocations/${selectedAssetForDispute.id}/acknowledge`, {
        status: "disputed",
        notes: disputeNotes,
      });
      toast.success(
        "Condition Disputed",
        "Your handover condition dispute has been reported to Admin."
      );
      setIsDisputeModalOpen(false);
      setSelectedAssetForDispute(null);
      setDisputeNotes("");
      loadData();
    } catch (err: any) {
      toast.error("Dispute Failed", err.response?.data?.detail || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase">
            <Laptop className="w-4 h-4" />
            <span>Company Custody Assets</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">My Assigned Hardware & Equipment</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Laptops, cellular SIM cards, mobile devices, and official gear currently assigned to your care
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Assets Grid */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
          <p className="text-xs">Loading your assigned assets...</p>
        </div>
      ) : assets.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
          <Laptop className="w-10 h-10 text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-600">No company assets assigned</p>
          <p className="text-xs text-slate-400 mt-0.5">
            When IT or Administration allocates hardware or gear to you, it will appear here for acknowledgment.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assets.map((item) => {
            const isPendingAck = item.status === "pending_acknowledgement";
            const isActive = item.status === "active";
            const isDisputed = item.status === "disputed";

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-indigo-600 px-2 py-0.5 rounded-md bg-indigo-50">
                      {item.asset_tag}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : isPendingAck
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : isDisputed
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isActive && <CheckCircle2 className="w-3 h-3" />}
                      {isPendingAck && <Clock className="w-3 h-3" />}
                      {isDisputed && <AlertTriangle className="w-3 h-3" />}
                      <span>{item.status.replace("_", " ")}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-2.5">{item.asset_name || "Company Asset"}</h3>

                  <div className="mt-3.5 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Assigned Date:</span>
                      <span className="font-medium text-slate-800">{item.assigned_date}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Handover Condition:</span>
                      <span className="font-medium text-slate-800 capitalize">{item.issue_condition}</span>
                    </div>
                    {item.issue_notes && (
                      <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100">
                        <strong className="text-slate-700">Notes:</strong> {item.issue_notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Acknowledgment Bar */}
                {isPendingAck && (
                  <div className="mt-5 pt-3.5 border-t border-amber-100 bg-amber-50/50 -mx-5 -mb-5 p-4 rounded-b-2xl">
                    <div className="text-[11px] text-amber-800 font-medium mb-2.5">
                      Please verify that you have received this equipment and confirm its physical condition.
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedAssetForDispute(item);
                          setIsDisputeModalOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                      >
                        Report Issue
                      </button>
                      <button
                        onClick={() => handleAcknowledge(item)}
                        disabled={isSubmitting}
                        className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>Confirm Receipt</span>
                      </button>
                    </div>
                  </div>
                )}

                {isActive && item.acknowledged_at && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-emerald-600 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Custody Confirmed</span>
                    </span>
                    <span className="text-slate-400">{item.acknowledged_at.slice(0, 10)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Report Issue / Dispute */}
      {isDisputeModalOpen && selectedAssetForDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative">
            <button
              onClick={() => setIsDisputeModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-rose-600 font-semibold text-xs tracking-wider uppercase">
              <AlertTriangle className="w-4 h-4" />
              <span>Custody Condition Dispute</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">Report Equipment Discrepancy</h2>
            <p className="text-xs text-slate-500">
              Disputing handover of <strong>{selectedAssetForDispute.asset_name}</strong> ({selectedAssetForDispute.asset_tag}).
            </p>

            <form onSubmit={handleDisputeSubmit} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase">Describe Discrepancy *</label>
                <textarea
                  required
                  rows={4}
                  value={disputeNotes}
                  onChange={(e) => setDisputeNotes(e.target.value)}
                  placeholder="e.g. Broken screen, charger not provided, severe scratch on casing, missing SIM tray..."
                  className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDisputeModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                >
                  {isSubmitting ? "Submitting..." : "Submit Dispute"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
