"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Clock,
  User,
  Calendar,
  AlertCircle,
  FileText,
  Building2,
  CheckCircle2,
  Calculator,
} from "lucide-react";
import { AttendanceRecord, AttendanceCreatePayload, AttendanceUpdatePayload } from "@/types";

interface EmployeeOption {
  id: string;
  employee_id: string;
  full_name: string;
  business_id?: number;
}

interface BusinessOption {
  id: number;
  name_en: string;
}

interface LogAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: AttendanceCreatePayload | AttendanceUpdatePayload, id?: string) => Promise<boolean>;
  record?: AttendanceRecord | null;
  employees: EmployeeOption[];
  businesses: BusinessOption[];
  isSuperuser: boolean;
  currentBusinessId: number;
}

export function LogAttendanceModal({
  isOpen,
  onClose,
  onSave,
  record,
  employees,
  businesses,
  isSuperuser,
  currentBusinessId,
}: LogAttendanceModalProps) {
  const isEdit = Boolean(record);

  const [businessId, setBusinessId] = useState<number>(currentBusinessId || 1);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [status, setStatus] = useState<string>("present");
  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");
  const [workHours, setWorkHours] = useState<number>(8.0);
  const [overtimeHours, setOvertimeHours] = useState<number>(0.0);
  const [source, setSource] = useState<string>("manual");
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset form values
  useEffect(() => {
    if (record) {
      setBusinessId(record.business_id || currentBusinessId || 1);
      setEmployeeId(record.employee_id);
      setDate(record.date);
      setStatus(typeof record.status === "string" ? record.status : (record.status as any).value || "present");
      setCheckIn(record.check_in || "");
      setCheckOut(record.check_out || "");
      setWorkHours(Number(record.work_hours || 0));
      setOvertimeHours(Number(record.overtime_hours || 0));
      setSource(typeof record.source === "string" ? record.source : (record.source as any).value || "manual");
      setNote(record.note || "");
    } else {
      setBusinessId(currentBusinessId || 1);
      setEmployeeId(employees[0]?.id || "");
      setDate(new Date().toISOString().split("T")[0]);
      setStatus("present");
      setCheckIn("09:00");
      setCheckOut("18:00");
      setWorkHours(8.0);
      setOvertimeHours(0.0);
      setSource("manual");
      setNote("");
    }
    setError(null);
  }, [record, isOpen, currentBusinessId, employees]);

  // Auto-calculate work hours and overtime from check-in & check-out times
  const calculateHours = (cin = checkIn, cout = checkOut) => {
    if (!cin || !cout) return;
    try {
      const [hIn, mIn] = cin.split(":").map(Number);
      const [hOut, mOut] = cout.split(":").map(Number);
      const inMins = hIn * 60 + mIn;
      let outMins = hOut * 60 + mOut;
      if (outMins < inMins) outMins += 24 * 60; // crossed midnight

      const diffMins = outMins - inMins;
      // Deduct standard 1-hour unpaid lunch break if shift > 5 hours
      const effectiveHours = diffMins > 300 ? (diffMins - 60) / 60 : diffMins / 60;
      const roundedWork = Math.max(0, Math.round(effectiveHours * 100) / 100);

      // Overtime is any excess over 8.0 standard statutory hours
      const ot = roundedWork > 8.0 ? Math.round((roundedWork - 8.0) * 100) / 100 : 0.0;

      setWorkHours(roundedWork);
      setOvertimeHours(ot);
    } catch {
      // ignore parse issues
    }
  };

  const handleCheckInChange = (val: string) => {
    setCheckIn(val);
    calculateHours(val, checkOut);
  };

  const handleCheckOutChange = (val: string) => {
    setCheckOut(val);
    calculateHours(checkIn, val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      setError("Please select an employee.");
      return;
    }
    if (!date) {
      setError("Attendance date is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload: AttendanceCreatePayload = {
      business_id: Number(businessId),
      employee_id: employeeId,
      date,
      status,
      check_in: checkIn || null,
      check_out: checkOut || null,
      work_hours: Number(workHours) || 0,
      overtime_hours: Number(overtimeHours) || 0,
      source,
      note: note.trim() || null,
    };

    const success = await onSave(payload, record?.id);
    setSubmitting(false);
    if (success) {
      onClose();
    } else {
      setError("Failed to save attendance record. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {isEdit ? "Edit Attendance Record" : "Log Daily Attendance"}
              </h2>
              <p className="text-xs text-slate-500">
                {isEdit ? "Update employee attendance log and punch times" : "Record daily employee check-in, check-out, and status"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Business Select (Superuser) */}
          {isSuperuser && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Business Profile <span className="text-rose-500">*</span>
              </label>
              <select
                value={businessId}
                onChange={(e) => setBusinessId(Number(e.target.value))}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                required
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name_en} (ID: {b.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Employee Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Employee <span className="text-rose-500">*</span>
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              required
            >
              <option value="">— Select Employee —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name} ({e.employee_id})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Attendance Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Attendance Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>

            {/* Attendance Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                required
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half_day">Half Day</option>
                <option value="on_leave">On Leave</option>
                <option value="holiday">Holiday</option>
                <option value="weekend">Weekend</option>
              </select>
            </div>
          </div>

          {/* Punch Times & Auto-calculation */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                Punch Times & Duration
              </span>
              <button
                type="button"
                onClick={() => calculateHours(checkIn, checkOut)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                title="Recalculate Hours"
              >
                <Calculator className="w-3 h-3" />
                Recalculate
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Check-in Time
                </label>
                <input
                  type="time"
                  value={checkIn}
                  onChange={(e) => handleCheckInChange(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Check-out Time
                </label>
                <input
                  type="time"
                  value={checkOut}
                  onChange={(e) => handleCheckOutChange(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Work Hours
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={workHours}
                  onChange={(e) => setWorkHours(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-indigo-500 font-mono"
                  placeholder="8.00"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Overtime Hours
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={overtimeHours}
                  onChange={(e) => setOvertimeHours(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-indigo-500 font-mono"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Attendance Source
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            >
              <option value="manual">Manual Entry</option>
              <option value="web">Web Portal</option>
              <option value="biometric">Biometric Device</option>
              <option value="mobile">Mobile App</option>
              <option value="excel">Excel Import</option>
            </select>
          </div>

          {/* Remarks / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Note / Remarks
            </label>
            <textarea
              rows={2}
              maxLength={255}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional exception notes, late explanations, or punch remarks..."
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5"
            >
              {submitting ? "Saving..." : isEdit ? "Update Record" : "Save Attendance"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
