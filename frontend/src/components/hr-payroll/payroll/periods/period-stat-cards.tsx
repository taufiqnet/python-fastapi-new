"use client";

import React from "react";
import { Edit3, Loader2, Lock, CheckCircle2 } from "lucide-react";

interface PeriodStatCardsProps {
  draftCount: number;
  processingCount: number;
  lockedCount: number;
  paidCount: number;
}

export function PeriodStatCards({
  draftCount,
  processingCount,
  lockedCount,
  paidCount,
}: PeriodStatCardsProps) {
  const cards = [
    {
      label: "Draft Periods",
      value: draftCount,
      icon: Edit3,
      bg: "bg-indigo-50/70 border-indigo-100",
      iconBg: "bg-indigo-600 text-white",
      text: "text-indigo-950",
    },
    {
      label: "Processing",
      value: processingCount,
      icon: Loader2,
      bg: "bg-blue-50/70 border-blue-100",
      iconBg: "bg-blue-600 text-white",
      text: "text-blue-950",
    },
    {
      label: "Locked Cycles",
      value: lockedCount,
      icon: Lock,
      bg: "bg-amber-50/70 border-amber-100",
      iconBg: "bg-amber-600 text-white",
      text: "text-amber-950",
    },
    {
      label: "Paid Batches",
      value: paidCount,
      icon: CheckCircle2,
      bg: "bg-emerald-50/70 border-emerald-100",
      iconBg: "bg-emerald-600 text-white",
      text: "text-emerald-950",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
  );
}
