"use client";

import React, { useState, useEffect } from "react";
import { SalaryGradeOut, SalaryGradeCreateInput, SalaryGradeUpdateInput } from "@/types";
import { X, Award, DollarSign, Percent, AlertCircle, Layers } from "lucide-react";

interface GradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SalaryGradeCreateInput | SalaryGradeUpdateInput) => Promise<void>;
  editingGrade: SalaryGradeOut | null;
  businessId?: number;
}

export const SENIORITY_LEVEL_OPTIONS = [
  { value: 1, label: "Level 1: Executive & C-Suite Leadership", desc: "CEO, MD, President, Group Director" },
  { value: 2, label: "Level 2: Senior Management / Vice Presidents", desc: "Director, VP, Senior General Manager" },
  { value: 3, label: "Level 3: Mid-Level Management", desc: "Department Manager, Senior Manager" },
  { value: 4, label: "Level 4: Senior Professional & Team Lead", desc: "Assistant Manager, Lead, Senior Engineer" },
  { value: 5, label: "Level 5: Professional & Officer Cadre", desc: "Executive, Officer, Software Engineer" },
  { value: 6, label: "Level 6: Associate & Junior Officer", desc: "Junior Officer, Junior Executive, Associate" },
  { value: 7, label: "Level 7: Operational, Support & Workers", desc: "Factory Operator, Support Assistant, Field Staff" },
  { value: 8, label: "Level 8: Trainee & Apprentices", desc: "Probationary Officer, Apprentice, Trainee" },
];

export function GradeModal({
  isOpen,
  onClose,
  onSave,
  editingGrade,
  businessId = 1,
}: GradeModalProps) {
  const isEditing = Boolean(editingGrade);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [levelRank, setLevelRank] = useState<number>(5);
  const [minGrossSalary, setMinGrossSalary] = useState<string>("");
  const [maxGrossSalary, setMaxGrossSalary] = useState<string>("");
  const [defaultBasicPercent, setDefaultBasicPercent] = useState<string>("50");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingGrade) {
      setName(editingGrade.name || "");
      setCode(editingGrade.code || "");
      setLevelRank(editingGrade.level_rank || 5);
      setMinGrossSalary(editingGrade.min_gross_salary ? String(editingGrade.min_gross_salary) : "");
      setMaxGrossSalary(editingGrade.max_gross_salary ? String(editingGrade.max_gross_salary) : "");
      setDefaultBasicPercent(
        editingGrade.default_basic_percent !== undefined && editingGrade.default_basic_percent !== null
          ? String(editingGrade.default_basic_percent)
          : "50"
      );
      setDescription(editingGrade.description || "");
      setIsActive(editingGrade.is_active ?? true);
    } else {
      setName("");
      setCode("");
      setLevelRank(5);
      setMinGrossSalary("");
      setMaxGrossSalary("");
      setDefaultBasicPercent("50");
      setDescription("");
      setIsActive(true);
    }
    setError(null);
  }, [editingGrade, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Grade name is required.");
      return;
    }
    if (!code.trim()) {
      setError("Grade code is required (e.g. M-4, G-1).");
      return;
    }

    const minNum = minGrossSalary ? parseFloat(minGrossSalary) : null;
    const maxNum = maxGrossSalary ? parseFloat(maxGrossSalary) : null;
    const basicPct = defaultBasicPercent ? parseFloat(defaultBasicPercent) : 50;

    if (minNum !== null && maxNum !== null && minNum > maxNum) {
      setError("Minimum gross salary cannot exceed maximum gross salary.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        level_rank: Number(levelRank),
        min_gross_salary: minNum,
        max_gross_salary: maxNum,
        default_basic_percent: basicPct,
        description: description.trim() || null,
        is_active: isActive,
        business_id: businessId,
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to save salary grade.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-7 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Award className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">
                {isEditing ? "Edit Salary Grade" : "Configure New Salary Grade"}
              </h3>
              <p className="text-xs text-emerald-100 font-medium">
                {isEditing ? `Modifying pay band ${editingGrade?.code}` : "Define compensation band, rank, and salary scale bounds"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-7 overflow-y-auto space-y-5 flex-1 text-slate-800 text-xs">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Code & Name Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                Grade Code <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. M-4 or G-1"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-mono font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                Grade Name / Band Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Senior Professional / Mid-Management"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Seniority Level Rank */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
              Seniority Hierarchy Rank
            </label>
            <div className="relative">
              <select
                value={levelRank}
                onChange={(e) => setLevelRank(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white font-semibold text-slate-800"
              >
                {SENIORITY_LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} — {opt.desc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Salary Scale Section */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Monthly Gross Salary Scale & Allowances (BDT / ৳)
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-600 mb-1 text-[11px]">
                  Min Gross Salary (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={minGrossSalary}
                  onChange={(e) => setMinGrossSalary(e.target.value)}
                  placeholder="e.g. 65000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1 text-[11px]">
                  Max Gross Salary (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={maxGrossSalary}
                  onChange={(e) => setMaxGrossSalary(e.target.value)}
                  placeholder="e.g. 95000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1 text-[11px]">
                  Default Basic %
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="10"
                    max="100"
                    step="1"
                    value={defaultBasicPercent}
                    onChange={(e) => setDefaultBasicPercent(e.target.value)}
                    placeholder="50"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold text-slate-800"
                  />
                  <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              * In Bangladesh, standard corporate basic salary is typically 50% of gross, while RMG wage board mandates ~52% basic.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
              Mandate & Scope Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Applicable for senior engineers, assistant managers, and core department officers."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-medium text-slate-700"
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <div>
              <span className="font-bold text-slate-800">Grade Active Status</span>
              <p className="text-[11px] text-slate-500">
                Active grades are available for assignment in Job Titles and Employee profiles.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              {saving ? "Saving Grade..." : isEditing ? "Update Salary Grade" : "Create Salary Grade"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
