"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

export interface StatItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: "indigo" | "emerald" | "amber" | "rose" | "teal" | "slate";
  subtext?: string;
}

interface LeaveStatCardsProps {
  stats: StatItem[];
}

const colorMap = {
  indigo: {
    bg: "bg-indigo-50/70 border-indigo-100",
    iconBg: "bg-indigo-600 text-white",
    text: "text-indigo-900",
  },
  emerald: {
    bg: "bg-emerald-50/70 border-emerald-100",
    iconBg: "bg-emerald-600 text-white",
    text: "text-emerald-900",
  },
  amber: {
    bg: "bg-amber-50/70 border-amber-100",
    iconBg: "bg-amber-600 text-white",
    text: "text-amber-900",
  },
  rose: {
    bg: "bg-rose-50/70 border-rose-100",
    iconBg: "bg-rose-600 text-white",
    text: "text-rose-900",
  },
  teal: {
    bg: "bg-teal-50/70 border-teal-100",
    iconBg: "bg-teal-600 text-white",
    text: "text-teal-900",
  },
  slate: {
    bg: "bg-slate-50 border-slate-200",
    iconBg: "bg-slate-700 text-white",
    text: "text-slate-900",
  },
};

export function LeaveStatCards({ stats }: LeaveStatCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s, idx) => {
        const theme = colorMap[s.color] || colorMap.slate;
        const Icon = s.icon;
        return (
          <div
            key={idx}
            className={`p-3.5 rounded-2xl border ${theme.bg} shadow-2xs flex items-center gap-3.5 transition-all hover:shadow-xs`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${theme.iconBg}`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                {s.label}
              </span>
              <div className="text-xl font-extrabold text-slate-900 tracking-tight leading-none mt-1">
                {s.value}
              </div>
              {s.subtext && (
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{s.subtext}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
