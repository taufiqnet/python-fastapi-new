"use client";

import React, { useState, useMemo } from "react";
import { BranchOut, EmployeeOut } from "@/types";
import {
  X,
  Building2,
  Users,
  Crown,
  MapPin,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Search,
  ExternalLink,
  ShieldCheck,
  Layers,
} from "lucide-react";
import Link from "next/link";

interface BranchDetailDrawerProps {
  branch: BranchOut | null;
  isOpen: boolean;
  onClose: () => void;
  employees: EmployeeOut[];
  onEdit: (branch: BranchOut) => void;
  onDelete: (branch: BranchOut) => void;
}

export function BranchDetailDrawer({
  branch,
  isOpen,
  onClose,
  employees,
  onEdit,
  onDelete,
}: BranchDetailDrawerProps) {
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Employees assigned to this branch
  const branchEmployees = useMemo(() => {
    if (!branch) return [];
    return employees.filter((e) => e.branch_id === branch.id);
  }, [branch, employees]);

  // Branch Manager details
  const managerEmployee = useMemo(() => {
    if (!branch || !branch.manager_employee_id) return null;
    return employees.find((e) => e.id === branch.manager_employee_id) || null;
  }, [branch, employees]);

  // Filtered roster
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return branchEmployees;
    const q = employeeSearch.toLowerCase();
    return branchEmployees.filter(
      (e) =>
        e.full_name?.toLowerCase().includes(q) ||
        e.employee_id?.toLowerCase().includes(q) ||
        e.work_email?.toLowerCase().includes(q) ||
        e.department_name?.toLowerCase().includes(q) ||
        e.job_title_name?.toLowerCase().includes(q)
    );
  }, [branchEmployees, employeeSearch]);

  if (!isOpen || !branch) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer content */}
      <div className="relative w-full max-w-xl bg-white shadow-2xl h-full flex flex-col z-10 border-l border-slate-200 overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center font-bold text-lg shadow-inner">
              {branch.name[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white tracking-tight">{branch.name}</h2>
                {branch.is_head_office && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Crown className="w-3 h-3 text-amber-400" /> Head Office
                  </span>
                )}
                {branch.is_active ? (
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
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-indigo-300 font-bold">
                  {branch.code}
                </span>
                <span className="capitalize">• {branch.branch_type.replace("_", " ")}</span>
                {branch.city && <span>• {branch.city}, {branch.country || "Bangladesh"}</span>}
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
            onClick={() => onEdit(branch)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
          >
            <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
            Edit Branch Details
          </button>
          <button
            onClick={() => onDelete(branch)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Assigned Staff</p>
              <p className="text-2xl font-bold text-indigo-600 mt-0.5">{branchEmployees.length}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Branch Category</p>
              <p className="text-xs font-bold text-slate-800 mt-2 capitalize">
                {branch.branch_type.replace("_", " ")}
              </p>
            </div>
          </div>

          {/* Branch Manager Card */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Branch Leadership</h4>
            {managerEmployee ? (
              <div className="bg-white border border-indigo-100 rounded-2xl p-4 shadow-xs">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-base flex items-center justify-center shadow-md">
                      {managerEmployee.first_name?.[0]}
                      {managerEmployee.last_name?.[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 text-sm">{managerEmployee.full_name}</p>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <ShieldCheck className="w-3 h-3 text-indigo-600" /> Branch Manager
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-indigo-600 mt-0.5">
                        {managerEmployee.job_title_name || "Manager"}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">ID: {managerEmployee.employee_id}</p>
                    </div>
                  </div>
                  <Link
                    href={`/hr-payroll/employees/${managerEmployee.id}`}
                    className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                    title="View Profile"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{managerEmployee.work_email}</span>
                  </div>
                  {managerEmployee.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{managerEmployee.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-900">No Branch Manager Assigned</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Assign an employee to lead this branch location.
                  </p>
                </div>
                <button
                  onClick={() => onEdit(branch)}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors shrink-0"
                >
                  Assign Manager
                </button>
              </div>
            )}
          </div>

          {/* Location & Contact Information */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Location & Contact</h4>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs text-slate-700">
              {branch.address && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{branch.address}, {branch.city}, {branch.country || "Bangladesh"} {branch.zip_code ? `(${branch.zip_code})` : ""}</span>
                </div>
              )}
              {branch.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-mono">{branch.phone}</span>
                </div>
              )}
              {branch.email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{branch.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Employees Roster */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Assigned Personnel Roster ({branchEmployees.length})
                </h4>
                <p className="text-[11px] text-slate-400">Employees currently stationed at this branch.</p>
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
                <p className="text-xs font-bold text-slate-700">No personnel stationed at this branch</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  {employeeSearch
                    ? "No staff matching your search filter."
                    : "Assign employees to this branch from the Employee Directory."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {filteredEmployees.map((emp) => (
                  <div key={emp.id} className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                        {emp.first_name?.[0]}
                        {emp.last_name?.[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-slate-900 text-xs">{emp.full_name}</p>
                          {emp.id === branch.manager_employee_id && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700">
                              Manager
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-medium text-indigo-600">{emp.job_title_name || "Employee"}</p>
                        <p className="text-[10px] text-slate-400">
                          {emp.department_name ? `${emp.department_name} • ` : ""}ID: {emp.employee_id}
                        </p>
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
