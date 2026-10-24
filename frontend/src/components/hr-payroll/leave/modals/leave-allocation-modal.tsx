"use client";

import React, { useState, useEffect, useMemo } from "react";
import { apiClient } from "@/lib/api-client";
import { LeaveAllocationOut, LeaveTypeOut, EmployeeOut } from "@/types";
import { X, AlertCircle, CheckCircle2, Search, Sparkles } from "lucide-react";
import { SearchableEmployeeCombobox } from "@/components/common/searchable-employee-combobox";

interface LeaveAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  allocationToEdit?: LeaveAllocationOut | null;
  existingAllocations?: LeaveAllocationOut[];
  leaveTypes: LeaveTypeOut[];
  employees: EmployeeOut[];
  businessId?: number | null;
}

export function LeaveAllocationModal({
  isOpen,
  onClose,
  onSuccess,
  allocationToEdit,
  existingAllocations = [],
  leaveTypes,
  employees,
  businessId,
}: LeaveAllocationModalProps) {
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    employee_id: "",
    leave_type_id: "",
    year: currentYear,
    allocated_days: 10,
    carried_forward: 0,
    used_days: 0,
  });

  const [empSearch, setEmpSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findExisting = (empId: string, typeId: string, yearVal: number) => {
    if (!existingAllocations || !empId || !typeId) return null;
    return (
      existingAllocations.find(
        (a) =>
          a.employee_id === empId &&
          a.leave_type_id === typeId &&
          Number(a.year) === Number(yearVal)
      ) || null
    );
  };

  const matchedExisting = useMemo(() => {
    if (allocationToEdit) return allocationToEdit;
    if (!formData.employee_id || !formData.leave_type_id) return null;
    return findExisting(formData.employee_id, formData.leave_type_id, formData.year);
  }, [allocationToEdit, existingAllocations, formData.employee_id, formData.leave_type_id, formData.year]);

  useEffect(() => {
    if (allocationToEdit) {
      setFormData({
        employee_id: allocationToEdit.employee_id,
        leave_type_id: allocationToEdit.leave_type_id,
        year: allocationToEdit.year,
        allocated_days: Number(allocationToEdit.allocated_days),
        carried_forward: Number(allocationToEdit.carried_forward || 0),
        used_days: Number(allocationToEdit.used_days || 0),
      });
    } else {
      const defaultEmp = employees[0]?.id || "";
      const defaultType = leaveTypes[0];
      const defaultTypeId = defaultType?.id || "";
      const existing = findExisting(defaultEmp, defaultTypeId, currentYear);

      setFormData({
        employee_id: defaultEmp,
        leave_type_id: defaultTypeId,
        year: currentYear,
        allocated_days: existing
          ? Number(existing.allocated_days)
          : defaultType?.max_days_per_year || 10,
        carried_forward: existing ? Number(existing.carried_forward || 0) : 0,
        used_days: existing ? Number(existing.used_days || 0) : 0,
      });
    }
    setEmpSearch("");
    setError(null);
  }, [allocationToEdit, isOpen, leaveTypes, employees, currentYear]);

  if (!isOpen) return null;

  const filteredEmployees = employees.filter((emp) => {
    if (!empSearch.trim()) return true;
    const q = empSearch.toLowerCase();
    const name = emp.full_name?.toLowerCase() || "";
    const code = emp.employee_id?.toLowerCase() || "";
    const dept = (emp.department_name || emp.department?.name || "").toLowerCase();
    return name.includes(q) || code.includes(q) || dept.includes(q);
  });

  const handleEmployeeChange = (empId: string) => {
    const existing = findExisting(empId, formData.leave_type_id, formData.year);
    if (existing) {
      setFormData((prev) => ({
        ...prev,
        employee_id: empId,
        allocated_days: Number(existing.allocated_days),
        carried_forward: Number(existing.carried_forward || 0),
        used_days: Number(existing.used_days || 0),
      }));
    } else {
      const selectedType = leaveTypes.find((t) => t.id === formData.leave_type_id);
      setFormData((prev) => ({
        ...prev,
        employee_id: empId,
        allocated_days: selectedType && selectedType.max_days_per_year > 0 ? selectedType.max_days_per_year : 10,
        carried_forward: 0,
        used_days: 0,
      }));
    }
  };

  const handleLeaveTypeChange = (typeId: string) => {
    const existing = findExisting(formData.employee_id, typeId, formData.year);
    if (existing) {
      setFormData((prev) => ({
        ...prev,
        leave_type_id: typeId,
        allocated_days: Number(existing.allocated_days),
        carried_forward: Number(existing.carried_forward || 0),
        used_days: Number(existing.used_days || 0),
      }));
    } else {
      const selected = leaveTypes.find((t) => t.id === typeId);
      setFormData((prev) => ({
        ...prev,
        leave_type_id: typeId,
        allocated_days: selected && selected.max_days_per_year > 0 ? selected.max_days_per_year : 10,
        carried_forward: 0,
        used_days: 0,
      }));
    }
  };

  const handleYearChange = (yr: number) => {
    const existing = findExisting(formData.employee_id, formData.leave_type_id, yr);
    if (existing) {
      setFormData((prev) => ({
        ...prev,
        year: yr,
        allocated_days: Number(existing.allocated_days),
        carried_forward: Number(existing.carried_forward || 0),
        used_days: Number(existing.used_days || 0),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        year: yr,
      }));
    }
  };

  const remainingPreview =
    Number(formData.allocated_days || 0) +
    Number(formData.carried_forward || 0) -
    Number(formData.used_days || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id) {
      setError("Please select an employee.");
      return;
    }
    if (!formData.leave_type_id) {
      setError("Please select a leave policy / type.");
      return;
    }
    if (isNaN(Number(formData.allocated_days)) || Number(formData.allocated_days) < 0) {
      setError("Please specify a valid allocated days quota (0 or greater).");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      employee_id: formData.employee_id,
      leave_type_id: formData.leave_type_id,
      year: Number(formData.year),
      allocated_days: Number(formData.allocated_days),
      carried_forward: Number(formData.carried_forward || 0),
      used_days: Number(formData.used_days || 0),
      business_id: businessId || 1,
    };

    try {
      const targetId = allocationToEdit?.id || matchedExisting?.id;
      if (targetId) {
        await apiClient.put(`/leave-allocations/${targetId}`, {
          allocated_days: payload.allocated_days,
          carried_forward: payload.carried_forward,
          used_days: payload.used_days,
        });
      } else {
        await apiClient.post("/leave-allocations", payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to save leave allocation.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div>
            <h2 className="text-base font-bold">
              {allocationToEdit
                ? "Adjust Leave Allocation"
                : matchedExisting
                ? "Update Leave Quota"
                : "Assign Leave Quota"}
            </h2>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              Assign or update annual leave balance for an employee.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Allocation Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {matchedExisting && !allocationToEdit && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">Existing Quota Detected: </span>
                  <span>
                    Currently {matchedExisting.allocated_days}d allocated ({matchedExisting.used_days || 0}d used). Saving will update this quota.
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full shrink-0">
                Update Mode
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select Employee <span className="text-rose-500">*</span>
            </label>

            <SearchableEmployeeCombobox
              employees={employees}
              value={formData.employee_id}
              onChange={(empId) => handleEmployeeChange(empId)}
              disabled={!!allocationToEdit}
              placeholder="Search & select employee..."
              allowClear={false}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Leave Policy / Type <span className="text-rose-500">*</span>
              </label>
              <select
                required
                disabled={!!allocationToEdit}
                value={formData.leave_type_id}
                onChange={(e) => handleLeaveTypeChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white disabled:bg-slate-50 transition-colors"
              >
                <option value="">-- Choose Leave Type --</option>
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({type.code}) - {type.max_days_per_year}d
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Calendar Year <span className="text-rose-500">*</span>
              </label>
              <select
                required
                disabled={!!allocationToEdit}
                value={formData.year}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white disabled:bg-slate-50 transition-colors"
              >
                {[currentYear - 1, currentYear, currentYear + 1].map((yr) => (
                  <option key={yr} value={yr}>
                    Year {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Allocated Days <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={formData.allocated_days}
                onChange={(e) => setFormData({ ...formData, allocated_days: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Carried Forward
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.carried_forward}
                onChange={(e) => setFormData({ ...formData, carried_forward: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Used Days
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.used_days}
                onChange={(e) => setFormData({ ...formData, used_days: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              />
            </div>
          </div>

          {/* Balance Preview Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-700">Calculated Remaining Quota:</span>
              <p className="text-[11px] text-slate-400">
                Formula: ({formData.allocated_days} allocated + {formData.carried_forward} carried) - {formData.used_days} used
              </p>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                remainingPreview > 0
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : remainingPreview === 0
                  ? "bg-slate-100 text-slate-600 border-slate-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {remainingPreview} Days Remaining
            </div>
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
              <span>
                {loading
                  ? "Saving..."
                  : allocationToEdit || matchedExisting
                  ? "Update Quota"
                  : "Assign Quota"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
