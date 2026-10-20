"use client";

import React, { useState } from "react";
import {
  Filter,
  RotateCcw,
  Download,
  Calendar,
  Users,
  Building2,
  ChevronDown,
  Search,
} from "lucide-react";

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

interface AttendanceFilterBarProps {
  employees: EmployeeOption[];
  businesses: BusinessOption[];
  isSuperuser: boolean;
  selectedEmployee: string;
  onSelectEmployee: (empId: string) => void;
  selectedBusiness: string | number;
  onSelectBusiness: (bizId: string | number) => void;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  onResetFilters: () => void;
  onExportClick: () => void;
  isFetching?: boolean;
}

export function AttendanceFilterBar({
  employees,
  businesses,
  isSuperuser,
  selectedEmployee,
  onSelectEmployee,
  selectedBusiness,
  onSelectBusiness,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  statusFilter,
  onStatusFilterChange,
  onResetFilters,
  onExportClick,
  isFetching = false,
}: AttendanceFilterBarProps) {
  const [empSearch, setEmpSearch] = useState("");
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);

  const filteredEmployees = employees.filter((e) => {
    if (!empSearch.trim()) return true;
    const term = empSearch.toLowerCase();
    return (
      e.full_name.toLowerCase().includes(term) ||
      (e.employee_id && e.employee_id.toLowerCase().includes(term))
    );
  });

  const selectedEmpObj = employees.find((e) => e.id === selectedEmployee);

  const statuses = [
    { value: "all", label: "All Statuses" },
    { value: "present", label: "Present" },
    { value: "absent", label: "Absent" },
    { value: "late", label: "Late" },
    { value: "half_day", label: "Half Day" },
    { value: "on_leave", label: "On Leave" },
  ];

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
        {/* Business Selector (Superuser only) */}
        {isSuperuser && (
          <div className="lg:col-span-3">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Business Profile
            </label>
            <select
              value={selectedBusiness || ""}
              onChange={(e) => onSelectBusiness(e.target.value)}
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

        {/* Employee Searchable Dropdown */}
        <div className={isSuperuser ? "lg:col-span-3" : "lg:col-span-4"}>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            Employee
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setEmpDropdownOpen(!empDropdownOpen)}
              className="w-full h-9.5 px-3 rounded-xl border border-slate-200 bg-white text-xs text-left font-medium text-slate-800 flex items-center justify-between hover:border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            >
              <span className="truncate">
                {selectedEmpObj
                  ? `(${selectedEmpObj.employee_id}) ${selectedEmpObj.full_name}`
                  : "All Employees"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </button>

            {empDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setEmpDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-60 overflow-hidden flex flex-col">
                  <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search employee..."
                        value={empSearch}
                        onChange={(e) => setEmpSearch(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto py-1 max-h-48 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectEmployee("");
                        setEmpDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left hover:bg-slate-50 transition-colors ${
                        !selectedEmployee ? "font-bold text-indigo-600 bg-indigo-50/50" : "text-slate-700"
                      }`}
                    >
                      All Employees
                    </button>
                    {filteredEmployees.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => {
                          onSelectEmployee(e.id);
                          setEmpDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-1.5 text-left hover:bg-slate-50 transition-colors truncate ${
                          selectedEmployee === e.id
                            ? "font-bold text-indigo-600 bg-indigo-50/50"
                            : "text-slate-700"
                        }`}
                      >
                        <span className="font-mono text-slate-400 mr-1.5">
                          [{e.employee_id}]
                        </span>
                        <span>{e.full_name}</span>
                      </button>
                    ))}
                    {filteredEmployees.length === 0 && (
                      <div className="px-3 py-2 text-center text-slate-400 text-xs">
                        No employees found
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Start Date */}
        <div className={isSuperuser ? "lg:col-span-2" : "lg:col-span-2"}>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full h-9.5 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        {/* End Date */}
        <div className={isSuperuser ? "lg:col-span-2" : "lg:col-span-2"}>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full h-9.5 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        {/* Status Dropdown */}
        <div className={isSuperuser ? "lg:col-span-2" : "lg:col-span-4"}>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="w-full h-9.5 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Footer: Reset Filters & Export Shortcut */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
        <div className="text-[11px] text-slate-400">
          {isFetching ? "Refreshing records in place..." : "Filters update live in place"}
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
            Export Results
          </button>
        </div>
      </div>
    </div>
  );
}
