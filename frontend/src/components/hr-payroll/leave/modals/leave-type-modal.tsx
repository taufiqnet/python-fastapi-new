"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { LeaveTypeOut, GenderApplicabilityEnum } from "@/types";
import { X, Sparkles, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";

interface LeaveTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leaveTypeToEdit?: LeaveTypeOut | null;
  businessId?: number | null;
}

const BLA_PRESETS = [
  {
    name: "Casual Leave",
    code: "CL",
    max_days: 10,
    is_paid: true,
    requires_doc: false,
    gender: "all" as GenderApplicabilityEnum,
    carry_forward: false,
    desc: "Bangladesh Labour Act 2006 statutory casual leave with full wages (10 days/year). Non-cumulative.",
  },
  {
    name: "Sick Leave",
    code: "SL",
    max_days: 14,
    is_paid: true,
    requires_doc: true,
    gender: "all" as GenderApplicabilityEnum,
    carry_forward: false,
    desc: "BLA 2006 statutory sick leave with full wages (14 days/year). Requires registered medical certificate.",
  },
  {
    name: "Annual / Earned Leave",
    code: "EL",
    max_days: 18,
    is_paid: true,
    requires_doc: false,
    gender: "all" as GenderApplicabilityEnum,
    carry_forward: true,
    desc: "BLA 2006 earned holiday: 1 day per 18 working days (approx 18-20 days). Cumulative/carry-forward allowed.",
  },
  {
    name: "Maternity Leave",
    code: "ML",
    max_days: 112,
    is_paid: true,
    requires_doc: true,
    gender: "female" as GenderApplicabilityEnum,
    carry_forward: false,
    desc: "BLA 2006 statutory maternity benefit (16 weeks / 112 days). Applicable to female employees.",
  },
  {
    name: "Paternity Leave",
    code: "PL",
    max_days: 5,
    is_paid: true,
    requires_doc: false,
    gender: "male" as GenderApplicabilityEnum,
    carry_forward: false,
    desc: "Discretionary company paternity leave for newborn care (5 working days).",
  },
  {
    name: "Leave Without Pay",
    code: "LWP",
    max_days: 0,
    is_paid: false,
    requires_doc: false,
    gender: "all" as GenderApplicabilityEnum,
    carry_forward: false,
    desc: "Unpaid authorized absence with unlimited/discretionary quota.",
  },
];

export function LeaveTypeModal({
  isOpen,
  onClose,
  onSuccess,
  leaveTypeToEdit,
  businessId,
}: LeaveTypeModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    max_days_per_year: 10,
    is_paid: true,
    requires_document: false,
    applicable_gender: "all" as GenderApplicabilityEnum,
    carry_forward: false,
    is_active: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (leaveTypeToEdit) {
      setFormData({
        name: leaveTypeToEdit.name,
        code: leaveTypeToEdit.code,
        description: leaveTypeToEdit.description || "",
        max_days_per_year: leaveTypeToEdit.max_days_per_year,
        is_paid: leaveTypeToEdit.is_paid,
        requires_document: leaveTypeToEdit.requires_document,
        applicable_gender: leaveTypeToEdit.applicable_gender,
        carry_forward: leaveTypeToEdit.carry_forward,
        is_active: leaveTypeToEdit.is_active,
      });
    } else {
      setFormData({
        name: "",
        code: "",
        description: "",
        max_days_per_year: 10,
        is_paid: true,
        requires_document: false,
        applicable_gender: "all",
        carry_forward: false,
        is_active: true,
      });
    }
    setError(null);
  }, [leaveTypeToEdit, isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: (typeof BLA_PRESETS)[0]) => {
    setFormData((prev) => ({
      ...prev,
      name: preset.name,
      code: preset.code,
      max_days_per_year: preset.max_days,
      is_paid: preset.is_paid,
      requires_document: preset.requires_doc,
      applicable_gender: preset.gender,
      carry_forward: preset.carry_forward,
      description: preset.desc,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      ...formData,
      max_days_per_year: Number(formData.max_days_per_year),
      business_id: businessId || 1,
    };

    try {
      if (leaveTypeToEdit) {
        await apiClient.put(`/leave-types/${leaveTypeToEdit.id}`, payload);
      } else {
        await apiClient.post("/leave-types", payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to save leave policy.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div>
            <h2 className="text-base font-bold">
              {leaveTypeToEdit ? "Edit Leave Policy" : "Create Leave Policy"}
            </h2>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              Define statutory entitlement rules, quota limits, and compensation terms.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to Save Policy</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Quick Presets (Only when creating new) */}
          {!leaveTypeToEdit && (
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Bangladesh Labour Act 2006 Quick Presets</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {BLA_PRESETS.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 rounded-lg transition-all shadow-2xs"
                  >
                    {p.name} ({p.code})
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Leave Policy Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Casual Leave"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Short Code (Payslip / Badge) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={10}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. CL, SL, EL"
                className="w-full px-3 py-2 text-xs font-mono font-bold uppercase border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Max Days Per Year <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                max={365}
                required
                value={formData.max_days_per_year}
                onChange={(e) => setFormData({ ...formData, max_days_per_year: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              />
              <p className="text-[10px] text-slate-400 mt-1">Set 0 for unlimited / unmetered days.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Applicable Gender
              </label>
              <select
                value={formData.applicable_gender}
                onChange={(e) =>
                  setFormData({ ...formData, applicable_gender: e.target.value as GenderApplicabilityEnum })
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white transition-colors"
              >
                <option value="all">All Genders (Standard)</option>
                <option value="female">Female Only (e.g. Maternity)</option>
                <option value="male">Male Only (e.g. Paternity)</option>
              </select>
            </div>
          </div>

          {/* Policy Flags Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer bg-slate-50/50">
              <input
                type="checkbox"
                checked={formData.is_paid}
                onChange={(e) => setFormData({ ...formData, is_paid: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-800">Paid Leave</span>
                <p className="text-[11px] text-slate-500">Employee receives full salary during absence.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer bg-slate-50/50">
              <input
                type="checkbox"
                checked={formData.carry_forward}
                onChange={(e) => setFormData({ ...formData, carry_forward: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-800">Allow Carry-Forward</span>
                <p className="text-[11px] text-slate-500">Unused balance rolls over to the next year.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer bg-slate-50/50">
              <input
                type="checkbox"
                checked={formData.requires_document}
                onChange={(e) => setFormData({ ...formData, requires_document: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-800">Requires Document</span>
                <p className="text-[11px] text-slate-500">Applicant must attach certificate/proof.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer bg-slate-50/50">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-800">Active Policy</span>
                <p className="text-[11px] text-slate-500">Available for staff to select and apply.</p>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Policy Description & Guidelines
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide policy terms, notice period requirements, or statutory notes..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5 disabled:opacity-60"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{loading ? "Saving..." : leaveTypeToEdit ? "Update Policy" : "Create Policy"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
