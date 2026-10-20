"use client";

import React from "react";
import {
  X,
  Clock,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Timer,
  CalendarOff,
  Building,
  Edit2,
  FileText,
  Shield,
  Layers,
} from "lucide-react";
import { AttendanceRecord } from "@/types";

interface EmployeeOption {
  id: string;
  employee_id: string;
  full_name: string;
}

interface AttendanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  employee?: EmployeeOption | null;
  businessName?: string;
  onEdit?: (record: AttendanceRecord) => void;
}

export function AttendanceDetailModal({
  isOpen,
  onClose,
  record,
  employee,
  businessName,
  onEdit,
}: AttendanceDetailModalProps) {
  if (!isOpen || !record) return null;

  const st = (record.status || "").toLowerCase();
  const empName = employee ? employee.full_name : record.employee_name || "Unknown";
  const empCode = employee ? employee.employee_id : record.employee_code || "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Attendance Details
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {record.date} • {empCode}
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Employee Header Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm shrink-0">
              {empName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-sm truncate">{empName}</p>
              <p className="font-mono text-slate-500 text-[11px]">ID: {empCode}</p>
            </div>
          </div>

          {/* Grid Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-slate-100 bg-white">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Status
              </span>
              <span className="font-bold text-slate-800 capitalize text-sm">
                {st.replace("_", " ")}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 bg-white">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Source
              </span>
              <span className="font-bold text-slate-800 uppercase text-sm">
                {record.source}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 bg-white">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Check-in
              </span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                {record.check_in || "Not Logged"}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 bg-white">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Check-out
              </span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                {record.check_out || "Not Logged"}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 bg-white">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Work Hours
              </span>
              <span className="font-bold text-slate-900 text-sm">
                {Number(record.work_hours || 0).toFixed(2)} hrs
              </span>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 bg-white">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Overtime Hours
              </span>
              <span className="font-bold text-amber-700 text-sm">
                +{Number(record.overtime_hours || 0).toFixed(2)} hrs
              </span>
            </div>
          </div>

          {/* Business & Tenant */}
          {businessName && (
            <div className="flex items-center gap-2 text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
              <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Tenant Profile: <strong className="text-slate-800">{businessName}</strong>
              </span>
            </div>
          )}

          {/* Notes */}
          {record.note && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Remarks / Exception Notes
              </span>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 italic">
                "{record.note}"
              </div>
            </div>
          )}

          {/* Audit Metadata */}
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 space-y-0.5 font-mono">
            <div>Record ID: {record.id}</div>
            {record.created_at && <div>Created: {new Date(record.created_at).toLocaleString()}</div>}
            {record.updated_at && <div>Updated: {new Date(record.updated_at).toLocaleString()}</div>}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(record);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Record
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
