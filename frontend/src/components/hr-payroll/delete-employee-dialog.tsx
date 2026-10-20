"use client";

import React, { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { EmployeeOut } from "@/types";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";

interface DeleteEmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employee: EmployeeOut | null;
}

export function DeleteEmployeeDialog({
  isOpen,
  onClose,
  onSuccess,
  employee,
}: DeleteEmployeeDialogProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !employee) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/employees/${employee.id}`);
      toast.success(
        "Employee Deleted",
        `${employee.full_name || employee.first_name} has been removed from records.`
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      let msg = "Failed to delete employee.";
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        msg = axErr.response?.data?.detail || msg;
      }
      toast.error("Delete Failed", msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 leading-snug">
            Delete Employee Record?
          </h3>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-800">
              {employee.full_name || `${employee.first_name} ${employee.last_name || ""}`}
            </span>{" "}
            (ID: {employee.employee_id})? This action will remove their payroll, attendance, and job association.
          </p>

          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600">
            Email: {employee.work_email}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-md shadow-rose-600/25 transition disabled:opacity-50"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete Employee
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
