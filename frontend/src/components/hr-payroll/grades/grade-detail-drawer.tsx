"use client";

import React, { useState } from "react";
import { SalaryGradeOut, JobTitleOut, EmployeeOut } from "@/types";
import {
  X,
  Award,
  DollarSign,
  Briefcase,
  Users,
  Search,
  ExternalLink,
  Edit,
  Trash2,
  Percent,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Link from "next/link";

interface GradeDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  grade: SalaryGradeOut | null;
  jobTitles: JobTitleOut[];
  employees: EmployeeOut[];
  onEdit: (grade: SalaryGradeOut) => void;
  onDelete: (grade: SalaryGradeOut) => void;
}

export function GradeDetailDrawer({
  isOpen,
  onClose,
  grade,
  jobTitles,
  employees,
  onEdit,
  onDelete,
}: GradeDetailDrawerProps) {
  const [employeeSearch, setEmployeeSearch] = useState("");

  if (!isOpen || !grade) return null;

  // Filter job titles assigned to this grade
  const assignedJobTitles = jobTitles.filter((jt) => jt.salary_grade_id === grade.id);

  // Filter employees assigned to this grade
  const assignedEmployees = employees.filter((emp) => emp.salary_grade_id === grade.id);

  const filteredStaff = assignedEmployees.filter((emp) => {
    const q = employeeSearch.toLowerCase();
    return (
      emp.full_name?.toLowerCase().includes(q) ||
      emp.employee_id?.toLowerCase().includes(q) ||
      emp.work_email?.toLowerCase().includes(q) ||
      emp.job_title_name?.toLowerCase().includes(q)
    );
  });

  const minGross = grade.min_gross_salary ? Number(grade.min_gross_salary) : null;
  const maxGross = grade.max_gross_salary ? Number(grade.max_gross_salary) : null;
  const midpoint = minGross && maxGross ? Math.round((minGross + maxGross) / 2) : null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl border-l border-slate-100 flex flex-col">
          {/* Drawer Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                <Award className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-800 text-[10px] font-mono font-bold tracking-wider uppercase">
                    {grade.code}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-semibold">
                    Rank {grade.level_rank}
                  </span>
                </div>
                <h3 className="text-base font-bold tracking-tight mt-1">{grade.name}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs">
            {/* Salary Scale Card */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/70 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-700" />
                  <span className="font-bold text-emerald-950 uppercase tracking-wider text-[11px]">
                    Monthly Compensation Bracket (BDT / ৳)
                  </span>
                </div>
                {grade.is_active ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Active Grade
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-200 px-2.5 py-0.5 rounded-full">
                    <XCircle className="w-3 h-3" /> Inactive
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 bg-white rounded-xl border border-emerald-100 shadow-xs">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Min Gross</span>
                  <span className="text-sm font-bold text-emerald-900">
                    {minGross !== null ? `৳${minGross.toLocaleString()}` : "Open"}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-emerald-100 shadow-xs">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Midpoint</span>
                  <span className="text-sm font-bold text-emerald-900">
                    {midpoint !== null ? `৳${midpoint.toLocaleString()}` : "—"}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-emerald-100 shadow-xs">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Max Gross</span>
                  <span className="text-sm font-bold text-emerald-900">
                    {maxGross !== null ? `৳${maxGross.toLocaleString()}` : "Open"}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-emerald-200/60 flex items-center justify-between text-[11px]">
                <span className="text-emerald-800 font-semibold flex items-center gap-1">
                  <Percent className="w-3 h-3" /> Default Basic Salary Ratio:
                </span>
                <span className="font-bold text-emerald-950 font-mono">
                  {grade.default_basic_percent || 50}% of Gross
                </span>
              </div>
            </div>

            {/* Description */}
            {grade.description && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Band Mandate & Guidelines
                </span>
                <p className="text-slate-700 leading-relaxed font-medium">{grade.description}</p>
              </div>
            )}

            {/* Associated Job Designations */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                    Associated Job Titles ({assignedJobTitles.length})
                  </span>
                </div>
              </div>

              {assignedJobTitles.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-slate-500 text-xs">
                  No job titles currently mapped to this salary grade.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {assignedJobTitles.map((jt) => (
                    <div
                      key={jt.id}
                      className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs hover:border-emerald-300 transition-colors"
                    >
                      <div className="truncate mr-2">
                        <span className="font-bold text-slate-800 block truncate">{jt.name}</span>
                        <span className="text-[10px] text-slate-500 truncate block">
                          {jt.department_name || "Company-Wide"}
                        </span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-mono font-bold text-slate-600 shrink-0">
                        {jt.employee_count || 0} Staff
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assigned Personnel Roster */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                    Assigned Employees ({assignedEmployees.length})
                  </span>
                </div>
              </div>

              {assignedEmployees.length > 3 && (
                <div className="relative mb-3">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="Search by name, ID, or title..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              )}

              {filteredStaff.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-slate-500 text-xs">
                  {employeeSearch
                    ? "No personnel match your search."
                    : "No employees currently assigned directly to this grade."}
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {filteredStaff.map((emp) => (
                    <div
                      key={emp.id}
                      className="p-3 bg-white rounded-xl border border-slate-200/90 flex items-center justify-between shadow-2xs hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">
                          {emp.full_name?.charAt(0) || "E"}
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-slate-800 truncate">{emp.full_name}</p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {emp.employee_id} • {emp.job_title_name || "No Title"}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/hr-payroll/employees/${emp.id}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors shrink-0"
                        title="View Employee Profile"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
            <button
              onClick={() => {
                onClose();
                onDelete(grade);
              }}
              className="px-4 py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold rounded-xl text-xs flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Grade
            </button>
            <button
              onClick={() => {
                onClose();
                onEdit(grade);
              }}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Edit className="w-3.5 h-3.5" /> Edit Grade
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
