"use client";

import React from "react";
import { Search, Filter, RotateCcw, Download, Building2 } from "lucide-react";

interface BusinessOption {
  id: number;
  name_en: string;
}

interface PeriodFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  businessId: string | number;
  onBusinessChange: (val: string | number) => void;
  businesses: BusinessOption[];
  isSuperuser: boolean;
  onResetFilters: () => void;
  onExportClick: () => void;
  isFetching?: boolean;
}

export function PeriodFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  businessId,
  onBusinessChange,
  businesses,
  isSuperuser,
  onResetFilters,
  onExportClick,
  isFetching = false,
}: PeriodFilterBarProps) {
  const statuses = [
    { value: "all", label: "All Statuses" },
    { value: "draft", label: "Draft" },
    { value: "processing", label: "Processing" },
    { value: "locked", label: "Locked" },
    { value: "paid", label: "Paid" },
  ];

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
        {/* Search */}
        <div className={isSuperuser ? "lg:col-span-4" : "lg:col-span-6"}>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            Search Periods
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by period name or notes..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-9.5 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Status Dropdown */}
        <div className={isSuperuser ? "lg:col-span-4" : "lg:col-span-6"}>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Period Status
          </label>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full h-9.5 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Business Selector (Superuser only) */}
        {isSuperuser && (
          <div className="lg:col-span-4">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Business Profile
            </label>
            <select
              value={businessId || ""}
              onChange={(e) => onBusinessChange(e.target.value)}
              className="w-full h-9.5 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            >
              <option value="">All Businesses</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name_en}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
        <div className="text-[11px] text-slate-400">
          {isFetching ? "Refreshing periods in place..." : "Filters update live in place"}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onResetFilters}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 font-semibold transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear Filters
          </button>
          <button
            type="button"
            onClick={onExportClick}
            className="px-3.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-semibold transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </button>
        </div>
      </div>
    </div>
  );
}
