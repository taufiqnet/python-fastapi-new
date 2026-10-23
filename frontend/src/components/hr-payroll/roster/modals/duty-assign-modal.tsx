"use client";

import React, { useState } from "react";
import { DepartmentRosterStatus, Shift, EmployeeOut, DutyAssignBatchCreatePayload } from "@/types";
import { X, Calendar, UserCheck, AlertCircle } from "lucide-react";

interface DutyAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: DepartmentRosterStatus[];
  shifts: Shift[];
  employees: EmployeeOut[];
  onSave: (payload: DutyAssignBatchCreatePayload) => Promise<void>;
}

export const DutyAssignModal: React.FC<DutyAssignModalProps> = ({
  isOpen,
  onClose,
  departments,
  shifts,
  employees,
  onSave,
}) => {
  const [selectedDeptId, setSelectedDeptId] = useState(departments[0]?.id || "");
  const [selectedShiftId, setSelectedShiftId] = useState(shifts[0]?.id || "");
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().substring(0, 10));
  const [title, setTitle] = useState("Direct Duty Allocation Batch");
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const deptEmployees = employees.filter(
    (e) => !selectedDeptId || e.department_id === selectedDeptId
  );

  const toggleEmp = (id: string) => {
    setSelectedEmpIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedEmpIds(deptEmployees.map((e) => e.id));
  };

  const deselectAll = () => {
    setSelectedEmpIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeptId || !selectedShiftId || selectedEmpIds.length === 0) {
      setError("Please select department, shift, and at least one employee.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Generate assignments for date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const assignments: Array<{ employee_id: string; date: string; shift_id: string; notes?: string }> = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().substring(0, 10);
        for (const empId of selectedEmpIds) {
          assignments.push({
            employee_id: empId,
            date: dateStr,
            shift_id: selectedShiftId,
            notes: notes.trim() || undefined,
          });
        }
      }

      await onSave({
        department_id: selectedDeptId,
        title: title.trim(),
        start_date: startDate,
        end_date: endDate,
        assignments,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to submit duty assign batch.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Direct Duty Assign</h3>
              <p className="text-xs text-slate-500">Allocate shifts to staff with supervisory approval</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={selectedDeptId}
                onChange={(e) => {
                  setSelectedDeptId(e.target.value);
                  setSelectedEmpIds([]);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {!d.is_roster_enabled && "(General)"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Shift</label>
              <select
                value={selectedShiftId}
                onChange={(e) => setSelectedShiftId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
              >
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Select Employees */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Select Staff ({selectedEmpIds.length} of {deptEmployees.length} selected)
              </label>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-slate-500 hover:text-slate-700"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="border border-slate-200 rounded-xl max-h-40 overflow-y-auto divide-y divide-slate-100 bg-slate-50">
              {deptEmployees.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No active employees found in selected department
                </div>
              ) : (
                deptEmployees.map((emp) => (
                  <label
                    key={emp.id}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmpIds.includes(emp.id)}
                      onChange={() => toggleEmp(emp.id)}
                      className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500"
                    />
                    <div className="flex-1 text-xs">
                      <span className="font-semibold text-slate-800">{emp.full_name}</span>
                      <span className="text-slate-400 ml-1.5 font-mono text-[11px]">
                        ({emp.employee_id})
                      </span>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Instructions</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Assigned for special seasonal shifts"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs flex items-center gap-1.5"
            >
              {saving ? "Submitting..." : "Submit Batch for Approval"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
