"use client";

import React, { useState, useMemo } from "react";
import { JobTitleOut, EmployeeOut } from "@/types";
import { AlertTriangle, X, Trash2, Users, AlertCircle } from "lucide-react";

interface JobTitleDeleteDialogProps {
  jobTitle: JobTitleOut | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (jobTitle: JobTitleOut) => Promise<void>;
  employees: EmployeeOut[];
}

export function JobTitleDeleteDialog({
  jobTitle,
  isOpen,
  onClose,
  onConfirm,
  employees,
}: JobTitleDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Impact analysis: How many employees hold this designation
  const assignedStaffCount = useMemo(() => {
    if (!jobTitle) return 0;
    return employees.filter((e) => e.job_title_id === jobTitle.id).length;
  }, [jobTitle, employees]);

  if (!isOpen || !jobTitle) return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm(jobTitle);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Failed to delete designation.");
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
              <h3 className="font-bold text-slate-900 text-base">Delete Designation</h3>
              <p className="text-xs text-slate-500">Remove career designation from organization.</p>
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
            Are you sure you want to delete <span className="font-bold text-slate-900">{jobTitle.name}</span>
            {jobTitle.short_name ? ` (${jobTitle.short_name})` : ""}?
          </p>

          {assignedStaffCount > 0 ? (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <Users className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-amber-900">{assignedStaffCount} Employees Currently Hold This Title</p>
                <p className="text-amber-700 mt-1 leading-relaxed">
                  These employees will remain in the company, but their designation will be cleared (set to unassigned).
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              No employees are currently assigned this designation. It is safe to remove.
            </div>
          )}
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
            <span>{deleting ? "Deleting..." : "Delete Designation"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
