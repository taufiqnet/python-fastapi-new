"use client";

import React, { useState, useEffect } from "react";
import { JobTitleOut, DepartmentOut } from "@/types";
import { X, Briefcase, Award, Layers, Check, AlertCircle } from "lucide-react";

interface JobTitleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  editingJobTitle: JobTitleOut | null;
  departments: DepartmentOut[];
  initialDepartmentId?: string | null;
  businessId?: number;
}

export const LEVEL_RANK_DESCRIPTIONS: Record<number, { label: string; tier: string; badgeColor: string }> = {
  1: { label: "Level 1: C-Suite & Executive Leadership", tier: "Executive", badgeColor: "bg-purple-100 text-purple-800 border-purple-200" },
  2: { label: "Level 2: Vice President & General Director", tier: "Executive", badgeColor: "bg-purple-50 text-purple-700 border-purple-200" },
  3: { label: "Level 3: Department Manager & Head of Unit", tier: "Management", badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  4: { label: "Level 4: Team Lead & Principal Specialist", tier: "Management", badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  5: { label: "Level 5: Senior Professional & Senior Officer", tier: "Professional", badgeColor: "bg-sky-100 text-sky-800 border-sky-200" },
  6: { label: "Level 6: Mid-Level Professional & Officer", tier: "Professional", badgeColor: "bg-sky-50 text-sky-700 border-sky-200" },
  7: { label: "Level 7: Junior Officer & Associate", tier: "Operational", badgeColor: "bg-slate-100 text-slate-800 border-slate-200" },
  8: { label: "Level 8: Assistant & Support Staff", tier: "Operational", badgeColor: "bg-slate-100 text-slate-700 border-slate-200" },
  9: { label: "Level 9: Trainee & Apprentice", tier: "Entry / Trainee", badgeColor: "bg-amber-100 text-amber-800 border-amber-200" },
  10: { label: "Level 10: Intern & Student Fellow", tier: "Entry / Trainee", badgeColor: "bg-amber-50 text-amber-700 border-amber-200" },
};

export function JobTitleModal({
  isOpen,
  onClose,
  onSave,
  editingJobTitle,
  departments,
  initialDepartmentId,
  businessId = 1,
}: JobTitleModalProps) {
  const isEditing = Boolean(editingJobTitle);

  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [levelRank, setLevelRank] = useState<number>(5);
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingJobTitle) {
      setName(editingJobTitle.name || "");
      setShortName(editingJobTitle.short_name || "");
      setDepartmentId(editingJobTitle.department_id || "");
      setLevelRank(editingJobTitle.level_rank || 5);
      setDescription(editingJobTitle.description || "");
      setIsActive(editingJobTitle.is_active);
    } else {
      setName("");
      setShortName("");
      setDepartmentId(initialDepartmentId || "");
      setLevelRank(5);
      setDescription("");
      setIsActive(true);
    }
    setError(null);
  }, [editingJobTitle, initialDepartmentId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Designation name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        short_name: shortName.trim().toUpperCase() || null,
        department_id: departmentId || null,
        level_rank: Number(levelRank),
        description: description.trim() || null,
        is_active: isActive,
        business_id: businessId,
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((d: any) => d.msg).join(", "));
      } else {
        setError(err.message || "Failed to save designation.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentLevelInfo = LEVEL_RANK_DESCRIPTIONS[levelRank] || LEVEL_RANK_DESCRIPTIONS[5];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isEditing ? `Edit: ${editingJobTitle?.name}` : "Create Job Designation"}
              </h3>
              <p className="text-xs text-slate-500">
                Define functional title, career hierarchy seniority, and department alignment.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Designation Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Designation Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          {/* Short Name / Acronym */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Short Code / Acronym
              </label>
              <input
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value.toUpperCase())}
                placeholder="e.g. SR-SWE"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>

            {/* Department Alignment */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Department
              </label>
              <div className="relative">
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all appearance-none bg-white"
                >
                  <option value="">-- Company-Wide (Cross-Functional) --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.code ? `(${d.code})` : ""}
                    </option>
                  ))}
                </select>
                <Layers className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Organogram Seniority Level Rank */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Seniority Level Rank (1 = Highest / Executive)
              </label>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${currentLevelInfo.badgeColor}`}>
                {currentLevelInfo.tier}
              </span>
            </div>
            <select
              value={levelRank}
              onChange={(e) => setLevelRank(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
            >
              {Object.entries(LEVEL_RANK_DESCRIPTIONS).map(([lvl, info]) => (
                <option key={lvl} value={lvl}>
                  {info.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Determines reporting tier elevation in visual organograms and chain-of-command trees.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Role Scope & Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary of responsibilities, technical requirements, or career milestone expectations..."
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          {/* Active Switch */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-800 select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              Active Designation (Available for Employee assignment)
            </label>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-60 flex items-center gap-1.5"
            >
              {saving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isEditing ? "Update Designation" : "Create Designation"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
