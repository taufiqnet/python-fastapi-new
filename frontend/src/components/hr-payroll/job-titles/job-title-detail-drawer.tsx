"use client";

import React, { useState, useMemo } from "react";
import { JobTitleOut, EmployeeOut, DepartmentOut } from "@/types";
import {
  X,
  Briefcase,
  Users,
  Award,
  Layers,
  Mail,
  Phone,
  Edit2,
  Trash2,
  Search,
  ExternalLink,
  GitBranch,
} from "lucide-react";
import Link from "next/link";
import { LEVEL_RANK_DESCRIPTIONS } from "./job-title-modal";

interface JobTitleDetailDrawerProps {
  jobTitle: JobTitleOut | null;
  isOpen: boolean;
  onClose: () => void;
  departments: DepartmentOut[];
  employees: EmployeeOut[];
  onEdit: (jobTitle: JobTitleOut) => void;
  onDelete: (jobTitle: JobTitleOut) => void;
}

export function JobTitleDetailDrawer({
  jobTitle,
  isOpen,
  onClose,
  departments,
  employees,
  onEdit,
  onDelete,
}: JobTitleDetailDrawerProps) {
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Employees holding this job title
  const assignedEmployees = useMemo(() => {
    if (!jobTitle) return [];
    return employees.filter((e) => e.job_title_id === jobTitle.id);
  }, [jobTitle, employees]);

  // Department name
  const departmentName = useMemo(() => {
    if (!jobTitle || !jobTitle.department_id) return "Company-Wide / Cross-Functional";
    const dept = departments.find((d) => d.id === jobTitle.department_id);
    return dept ? dept.name : "Company-Wide";
  }, [jobTitle, departments]);

  // Filtered employees roster
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return assignedEmployees;
    const q = employeeSearch.toLowerCase();
    return assignedEmployees.filter(
      (e) =>
        e.full_name?.toLowerCase().includes(q) ||
        e.employee_id?.toLowerCase().includes(q) ||
        e.work_email?.toLowerCase().includes(q) ||
        e.department_name?.toLowerCase().includes(q)
    );
  }, [assignedEmployees, employeeSearch]);

  if (!isOpen || !jobTitle) return null;

  const levelInfo = LEVEL_RANK_DESCRIPTIONS[jobTitle.level_rank || 5] || LEVEL_RANK_DESCRIPTIONS[5];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer content */}
      <div className="relative w-full max-w-xl bg-white shadow-2xl h-full flex flex-col z-10 border-l border-slate-200 overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header Banner */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center font-bold text-lg shadow-inner">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">{jobTitle.name}</h2>
                {jobTitle.is_active ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-700 text-slate-300 border border-slate-600">
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-400">
                {jobTitle.short_name && (
                  <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-indigo-300 font-bold">
                    {jobTitle.short_name}
                  </span>
                )}
                <span>• {departmentName}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
          <button
            onClick={() => onEdit(jobTitle)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
          >
            <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
            Edit Designation
          </button>
          <button
            onClick={() => onDelete(jobTitle)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Assigned Staff</p>
              <p className="text-2xl font-bold text-indigo-600 mt-0.5">{assignedEmployees.length}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Hierarchy Level</p>
              <div className="mt-1 flex items-center justify-center gap-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${levelInfo.badgeColor}`}>
                  Level {jobTitle.level_rank || 5} • {levelInfo.tier}
                </span>
              </div>
            </div>
          </div>

          {/* Seniority Tier Guidance Card */}
          <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-3">
            <Award className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-indigo-950 text-xs">{levelInfo.label}</p>
              <p className="text-[11px] text-indigo-800 mt-0.5 leading-relaxed">
                Employees holding this title are positioned at Level {jobTitle.level_rank || 5} within organizational reporting trees and approval matrices.
              </p>
            </div>
          </div>

          {/* Description */}
          {jobTitle.description && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Role Description</h4>
              <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                {jobTitle.description}
              </p>
            </div>
          )}

          {/* Department Affiliation */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Department Affiliation</h4>
            <div className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800">{departmentName}</span>
            </div>
          </div>

          {/* Assigned Personnel Roster */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Assigned Personnel Roster ({assignedEmployees.length})
                </h4>
                <p className="text-[11px] text-slate-400">Employees currently assigned this designation.</p>
              </div>
              <div className="relative min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter personnel..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {filteredEmployees.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No personnel holding this designation</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  {employeeSearch
                    ? "No staff matching your search filter."
                    : "Assign employees to this designation in the Employee Directory."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {filteredEmployees.map((emp) => (
                  <div key={emp.id} className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center">
                        {emp.first_name?.[0]}
                        {emp.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-xs">{emp.full_name}</p>
                        <p className="text-[11px] text-slate-500">
                          {emp.department_name ? `${emp.department_name} • ` : ""}
                          {emp.branch_name || "Head Office"}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">ID: {emp.employee_id}</p>
                      </div>
                    </div>
                    <Link
                      href={`/hr-payroll/employees/${emp.id}`}
                      className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
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
      </div>
    </div>
  );
}
