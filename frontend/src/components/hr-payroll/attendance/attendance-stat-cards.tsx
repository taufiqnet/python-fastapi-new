"use client";

import React from "react";
import {
  Clock,
  UserCheck,
  UserX,
  CalendarOff,
  AlertCircle,
  Briefcase,
  Zap,
} from "lucide-react";

interface AttendanceStatCardsProps {
  totalCount: number;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  lateHalfDayCount: number;
  totalWorkHours: number;
  totalOvertimeHours: number;
}

export function AttendanceStatCards({
  totalCount,
  presentCount,
  absentCount,
  leaveCount,
  lateHalfDayCount,
  totalWorkHours,
  totalOvertimeHours,
}: AttendanceStatCardsProps) {
  const cards = [
    {
      label: "Total Logs",
      value: totalCount,
      icon: Clock,
      color: "indigo",
      bg: "bg-indigo-50/70 border-indigo-100",
      iconBg: "bg-indigo-600 text-white",
      text: "text-indigo-950",
    },
    {
      label: "Present",
      value: presentCount,
      icon: UserCheck,
      color: "emerald",
      bg: "bg-emerald-50/70 border-emerald-100",
      iconBg: "bg-emerald-600 text-white",
      text: "text-emerald-950",
    },
    {
      label: "Absent",
      value: absentCount,
      icon: UserX,
      color: "rose",
      bg: "bg-rose-50/70 border-rose-100",
      iconBg: "bg-rose-600 text-white",
      text: "text-rose-950",
    },
    {
      label: "On Leave",
      value: leaveCount,
      icon: CalendarOff,
      color: "teal",
      bg: "bg-teal-50/70 border-teal-100",
      iconBg: "bg-teal-600 text-white",
      text: "text-teal-950",
    },
    {
      label: "Late / Half Day",
      value: lateHalfDayCount,
      icon: AlertCircle,
      color: "amber",
      bg: "bg-amber-50/70 border-amber-100",
      iconBg: "bg-amber-600 text-white",
      text: "text-amber-950",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border ${c.bg} shadow-2xs flex items-center gap-3.5 transition-all hover:shadow-xs`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${c.iconBg}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                  {c.label}
                </span>
                <div
                  className={`text-xl font-extrabold tracking-tight leading-none mt-1 ${c.text}`}
                >
                  {c.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {(totalWorkHours > 0 || totalOvertimeHours > 0) && (
        <div className="flex flex-wrap items-center gap-3 bg-slate-50/80 border border-slate-200/80 rounded-xl px-4 py-2 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-medium">
            <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
            <span>Total Accumulated Work Hours:</span>
            <span className="font-bold text-slate-900">{totalWorkHours.toFixed(1)} hrs</span>
          </div>
          {totalOvertimeHours > 0 && (
            <div className="flex items-center gap-1.5 font-medium text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Overtime Hours:</span>
              <span className="font-bold">+{totalOvertimeHours.toFixed(1)} hrs</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
