"use client";

import React, { useState, useMemo } from "react";
import { LeaveApplicationOut, LeaveTypeOut, EmployeeOut } from "@/types";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Briefcase,
} from "lucide-react";

interface LeaveCalendarTabProps {
  applications: LeaveApplicationOut[];
  leaveTypes: LeaveTypeOut[];
  employees: EmployeeOut[];
}

export function LeaveCalendarTab({
  applications,
  leaveTypes,
  employees,
}: LeaveCalendarTabProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const ltMap = useMemo(() => new Map(leaveTypes.map((t) => [t.id, t])), [leaveTypes]);

  // Approved applications only
  const approvedApps = useMemo(() => {
    return applications.filter((a) => a.status === "approved");
  }, [applications]);

  // Navigate months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Month metadata
  const monthName = currentDate.toLocaleString("default", { month: "long" });
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Who is on leave today
  const todayIso = new Date().toISOString().split("T")[0];
  const onLeaveToday = useMemo(() => {
    return approvedApps.filter(
      (a) => a.start_date <= todayIso && a.end_date >= todayIso
    );
  }, [approvedApps, todayIso]);

  // Map of date string YYYY-MM-DD -> list of applications
  const dateAppsMap = useMemo(() => {
    const map = new Map<string, LeaveApplicationOut[]>();
    approvedApps.forEach((app) => {
      // iterate from app.start_date to app.end_date
      let cur = new Date(app.start_date);
      const end = new Date(app.end_date);
      while (cur <= end) {
        const dStr = cur.toISOString().split("T")[0];
        const existing = map.get(dStr) || [];
        existing.push(app);
        map.set(dStr, existing);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [approvedApps]);

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="w-full space-y-5">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              On Leave Today
            </span>
            <div className="text-xl font-extrabold text-indigo-900 mt-0.5">
              {onLeaveToday.length} Staff Member(s)
            </div>
          </div>
        </div>

        <div className="p-4 bg-teal-50/70 border border-teal-100 rounded-2xl flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Scheduled in {monthName}
            </span>
            <div className="text-xl font-extrabold text-teal-900 mt-0.5">
              {
                approvedApps.filter((a) => {
                  const s = new Date(a.start_date);
                  const e = new Date(a.end_date);
                  return (
                    (s.getFullYear() === year && s.getMonth() === month) ||
                    (e.getFullYear() === year && e.getMonth() === month)
                  );
                }).length
              }{" "}
              Approved Event(s)
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Active Workforce
            </span>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">
              {Math.max(0, employees.filter((e) => e.is_active).length - onLeaveToday.length)} Available
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        {/* Month Navigation Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              {monthName} {year}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200/60 bg-slate-50/80 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 py-2.5">
          {daysOfWeek.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 min-h-[500px]">
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <div key={`empty-${idx}`} className="bg-slate-50/30 p-2 min-h-[90px]" />
          ))}

          {/* Month Days */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const monthStr = String(month + 1).padStart(2, "0");
            const dayStr = String(dayNum).padStart(2, "0");
            const dateStr = `${year}-${monthStr}-${dayStr}`;

            const isToday = dateStr === todayIso;
            const dayApps = dateAppsMap.get(dateStr) || [];

            return (
              <div
                key={`day-${dayNum}`}
                className={`p-2 min-h-[100px] flex flex-col justify-between transition-colors ${
                  isToday ? "bg-indigo-50/30" : "hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "text-slate-700"
                    }`}
                  >
                    {dayNum}
                  </span>
                  {dayApps.length > 0 && (
                    <span className="text-[10px] font-bold text-slate-400">
                      {dayApps.length} off
                    </span>
                  )}
                </div>

                {/* Leaves in this day */}
                <div className="space-y-1 overflow-y-auto max-h-[75px] scrollbar-thin">
                  {dayApps.slice(0, 3).map((app) => {
                    const emp = empMap.get(app.employee_id);
                    const lt = ltMap.get(app.leave_type_id);
                    return (
                      <div
                        key={`${app.id}-${dateStr}`}
                        title={`${emp?.full_name || "Employee"} - ${lt?.name || "Leave"} (${app.reason})`}
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/70 truncate flex items-center gap-1"
                      >
                        <span className="font-mono text-[9px] font-bold opacity-70">
                          {lt?.code || "L"}:
                        </span>
                        <span className="truncate">{emp?.full_name || "Employee"}</span>
                      </div>
                    );
                  })}
                  {dayApps.length > 3 && (
                    <span className="text-[9px] text-slate-400 font-bold block text-center">
                      +{dayApps.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
