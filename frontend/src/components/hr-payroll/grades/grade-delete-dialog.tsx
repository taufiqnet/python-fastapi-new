"use client";

import React, { useState } from "react";
import { SalaryGradeOut, JobTitleOut, EmployeeOut } from "@/types";
import { AlertTriangle, Loader2 } from "lucide-react";

interface GradeDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  grade: SalaryGradeOut | null;
  jobTitles: JobTitleOut[];
  employees: EmployeeOut[];
  onConfirm: (grade: SalaryGradeOut) => Promise<void>;
}

export function GradeDeleteDialog({
  isOpen,
  onClose,
  grade,
  jobTitles,
  employees,
  onConfirm,
}: GradeDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !grade) return null;

  const assignedTitles = jobTitles.filter((jt) => jt.salary_grade_id === grade.id);
  const assignedEmps = employees.filter((e) => e.salary_grade_id === grade.id);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm(grade);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to delete salary grade.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 text-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Delete Salary Grade?</h3>
        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
          Are you sure you want to delete{" "}
          <span className="font-bold text-slate-800 font-mono">[{grade.code}] {grade.name}</span>?
          This action cannot be undone.
        </p>

        {error && (
          <div className="mt-3.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Impact Analysis */}
        <div className="mt-4 p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-1.5 text-xs text-amber-900">
          <span className="font-bold text-[11px] uppercase tracking-wider block text-amber-950">
            Impact Analysis
          </span>
          <p className="text-[11px]">
            • <strong>{assignedTitles.length}</strong> Job Title(s) are currently mapped to this grade.
          </p>
          <p className="text-[11px]">
            • <strong>{assignedEmps.length}</strong> Employee(s) are currently assigned to this grade.
          </p>
          <p className="text-[10px] text-amber-800 italic pt-1 border-t border-amber-200/60">
            Deleting this grade will safely unlink these positions and employees without deleting the personnel.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-600/20 transition-all flex items-center gap-2"
          >
            {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {deleting ? "Deleting..." : "Confirm Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
