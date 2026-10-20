"use client";

import React, { useState, useMemo } from "react";
import { DepartmentOut, EmployeeOut } from "@/types";
import { AlertTriangle, X, Trash2, Users, Layers, AlertCircle } from "lucide-react";

interface DepartmentDeleteDialogProps {
  department: DepartmentOut | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (department: DepartmentOut) => Promise<void>;
  departments: DepartmentOut[];
  employees: EmployeeOut[];
}

export function DepartmentDeleteDialog({
  department,
  isOpen,
  onClose,
  onConfirm,
  departments,
  employees,
}: DepartmentDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Impact analysis
  const assignedStaffCount = useMemo(() => {
    if (!department) return 0;
    return employees.filter((e) => e.department_id === department.id).length;
  }, [department, employees]);

  const childDepartments = useMemo(() => {
    if (!department) return [];
    return departments.filter((d) => d.parent_department_id === department.id);
  }, [department, departments]);

  if (!isOpen || !department) return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm(department);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Failed to delete department.");
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
              <h3 className="font-bold text-slate-900 text-base">Delete Department</h3>
              <p className="text-xs text-slate-500">Confirm permanent deletion of organizational unit.</p>
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
            Are you sure you want to delete <span className="font-bold text-slate-900">{department.name}</span>
            {department.code ? ` (${department.code})` : ""}? This action cannot be reversed.
          </p>

          {/* Impact Analysis Cards */}
          <div className="space-y-2.5">
            {assignedStaffCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <Users className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-amber-900">{assignedStaffCount} Employees Affected</p>
                  <p className="text-amber-700 mt-0.5 leading-relaxed">
                    These employees will remain in the company, but their department assignment will be unlinked (set to unassigned).
                  </p>
                </div>
              </div>
            )}

            {childDepartments.length > 0 && (
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-start gap-3">
                <Layers className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-indigo-900">{childDepartments.length} Sub-departments Will Be Promoted</p>
                  <p className="text-indigo-700 mt-0.5 leading-relaxed">
                    Child sub-departments (such as {childDepartments[0].name}) will become top-level divisions.
                  </p>
                </div>
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
            <span>{deleting ? "Deleting..." : "Delete Department"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
