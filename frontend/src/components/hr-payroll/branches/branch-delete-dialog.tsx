"use client";

import React, { useState, useMemo } from "react";
import { BranchOut, EmployeeOut } from "@/types";
import { AlertTriangle, X, Trash2, Users, Crown, AlertCircle } from "lucide-react";

interface BranchDeleteDialogProps {
  branch: BranchOut | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (branch: BranchOut) => Promise<void>;
  employees: EmployeeOut[];
}

export function BranchDeleteDialog({
  branch,
  isOpen,
  onClose,
  onConfirm,
  employees,
}: BranchDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Impact analysis
  const assignedStaffCount = useMemo(() => {
    if (!branch) return 0;
    return employees.filter((e) => e.branch_id === branch.id).length;
  }, [branch, employees]);

  if (!isOpen || !branch) return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm(branch);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Failed to delete branch.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Delete Branch</h3>
              <p className="text-xs text-slate-500">Confirm deletion of company location.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
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

        {/* Content */}
        <div className="pt-4 space-y-4">
          <p className="text-xs text-slate-700 leading-relaxed">
            Are you sure you want to delete <span className="font-bold text-slate-900">{branch.name}</span>
            {branch.code ? ` (${branch.code})` : ""}?
          </p>

          <div className="space-y-2.5">
            {branch.is_head_office && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-3">
                <Crown className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-amber-950">Corporate Head Office Warning</p>
                  <p className="text-amber-800 mt-0.5 leading-relaxed">
                    This branch is currently marked as the Corporate Head Office. Deleting it will leave the company without a designated primary headquarters.
                  </p>
                </div>
              </div>
            )}

            {assignedStaffCount > 0 ? (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <Users className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-slate-800">{assignedStaffCount} Employees Stationed Here</p>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    These employees will remain in the company, but their branch location will be set to unassigned.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                No employees are stationed at this branch. Safe to delete.
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-5 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition-colors shadow-xs disabled:opacity-60 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{deleting ? "Deleting..." : "Delete Branch"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
