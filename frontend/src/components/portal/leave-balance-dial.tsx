"use client";

import React from "react";
import { PortalLeaveBalance } from "@/types";
import { Calendar, ShieldCheck, Sparkles } from "lucide-react";

interface LeaveBalanceDialProps {
  balances: PortalLeaveBalance[];
}

export function LeaveBalanceDial({ balances }: LeaveBalanceDialProps) {
  if (!balances || balances.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center text-slate-500 text-xs">
        No active leave allocations found for current calendar year.
      </div>
    );
  }

  const getDialColor = (code: string) => {
    switch (code.toUpperCase()) {
      case "AL":
      case "EL":
        return {
          stroke: "stroke-indigo-600",
          text: "text-indigo-600",
          bg: "bg-indigo-50",
          ring: "#4f46e5",
        };
      case "SL":
        return {
          stroke: "stroke-emerald-600",
          text: "text-emerald-600",
          bg: "bg-emerald-50",
          ring: "#059669",
        };
      case "CL":
        return {
          stroke: "stroke-amber-600",
          text: "text-amber-600",
          bg: "bg-amber-50",
          ring: "#d97706",
        };
      default:
        return {
          stroke: "stroke-violet-600",
          text: "text-violet-600",
          bg: "bg-violet-50",
          ring: "#7c3aed",
        };
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {balances.map((b) => {
        const theme = getDialColor(b.code);
        const radius = 38;
        const circumference = 2 * Math.PI * radius;
        const percent = b.allocated_days > 0 ? (b.remaining_days / b.allocated_days) * 100 : 0;
        const strokeDashoffset = circumference - (percent / 100) * circumference;

        return (
          <div
            key={b.leave_type_id}
            className="group relative p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all duration-300 flex items-center justify-between"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  {b.code}
                </span>
                {b.is_statutory && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    BLA 2006
                  </span>
                )}
              </div>
              <h4 className="font-semibold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">
                {b.leave_type_name}
              </h4>
              <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                <span>Allocated: <strong>{b.allocated_days}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Used: <strong>{b.used_days}</strong></span>
              </div>
            </div>

            {/* Circular Gauge */}
            <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  className="stroke-slate-100"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  className={`${theme.stroke} transition-all duration-700 ease-out`}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className={`text-lg font-black font-mono leading-none ${theme.text}`}>
                  {b.remaining_days}
                </span>
                <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 mt-0.5">
                  Left
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
