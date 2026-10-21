"use client";

import React, { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { DiagnosticSampleOut } from "@/types";
import { X, TestTube2, CheckCircle2, AlertCircle, Loader2, User } from "lucide-react";

interface SampleCollectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sample: DiagnosticSampleOut | null;
}

export function SampleCollectModal({
  isOpen,
  onClose,
  onSuccess,
  sample,
}: SampleCollectModalProps) {
  const [collectedByName, setCollectedByName] = useState("Technician");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !sample) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectedByName.trim()) {
      setError("Collector name is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiClient.post(`/healthcare/samples/${sample.id}/collect`, {
        collected_by_name: collectedByName.trim(),
        notes: notes.trim() || null,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to record sample collection.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <TestTube2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Phlebotomy Sample Collection</h3>
              <p className="text-xs text-amber-100 mt-0.5">Barcode: {sample.barcode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-amber-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-xl text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Specimen Type:</span>
              <span className="font-bold text-amber-900">{sample.sample_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Status:</span>
              <span className="capitalize font-bold text-slate-800">{sample.status}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Phlebotomist / Collector Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                required
                placeholder="e.g. Md. Rafiqul Islam (Lab Tech)"
                value={collectedByName}
                onChange={(e) => setCollectedByName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Collection Notes (Vial volume, Site, etc.)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Left cubital fossa, 4ml blood collected in EDTA vial"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
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
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm shadow-amber-600/20 flex items-center gap-2 transition-all"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Mark Sample Collected
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SampleCollectModal;
