"use client";

import React, { useState, useMemo } from "react";
import { DepartmentOut, EmployeeOut } from "@/types";
import {
  X,
  Building2,
  Users,
  Layers,
  UserCheck,
  Mail,
  Phone,
  Edit2,
  Plus,
  Trash2,
  Search,
  ExternalLink,
  GitBranch,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

interface DepartmentDetailDrawerProps {
  department: DepartmentOut | null;
  isOpen: boolean;
  onClose: () => void;
  departments: DepartmentOut[];
  employees: EmployeeOut[];
  onEdit: (department: DepartmentOut) => void;
  onAddSubDepartment: (parentDepartment: DepartmentOut) => void;
  onDelete: (department: DepartmentOut) => void;
  onSelectDepartment: (department: DepartmentOut) => void;
}

export function DepartmentDetailDrawer({
  department,
  isOpen,
  onClose,
  departments,
  employees,
  onEdit,
  onAddSubDepartment,
  onDelete,
  onSelectDepartment,
}: DepartmentDetailDrawerProps) {
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Sub-departments of this department
  const subDepartments = useMemo(() => {
    if (!department) return [];
    return departments.filter((d) => d.parent_department_id === department.id);
  }, [department, departments]);

  // Employees assigned to this department
  const departmentEmployees = useMemo(() => {
    if (!department) return [];
    return employees.filter((e) => e.department_id === department.id);
  }, [department, employees]);

  // Department Head details
  const headEmployee = useMemo(() => {
    if (!department || !department.head_employee_id) return null;
    return employees.find((e) => e.id === department.head_employee_id) || null;
  }, [department, employees]);

  // Filtered employees roster
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return departmentEmployees;
    const q = employeeSearch.toLowerCase();
    return departmentEmployees.filter(
      (e) =>
        e.full_name?.toLowerCase().includes(q) ||
        e.employee_id?.toLowerCase().includes(q) ||
        e.work_email?.toLowerCase().includes(q) ||
        e.job_title_name?.toLowerCase().includes(q)
    );
  }, [departmentEmployees, employeeSearch]);

  if (!isOpen || !department) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer content */}
      <div className="relative w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col z-10 border-l border-slate-200 overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center font-bold text-lg shadow-inner">
              {department.name[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">{department.name}</h2>
                {department.is_active ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-700 text-slate-300 border border-slate-600">
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                {department.code && (
                  <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-indigo-300 font-semibold">
                    {department.code}
                  </span>
                )}
                <span>slug: {department.slug}</span>
                {department.parent_department_name && (
                  <span className="text-slate-300 flex items-center gap-1">
                    • Parent: <span className="text-indigo-400 font-medium">{department.parent_department_name}</span>
                  </span>
                )}
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(department)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
            >
              <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
              Edit Details
            </button>
            <button
              onClick={() => onAddSubDepartment(department)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-600" />
              Add Sub-department
            </button>
          </div>
          <button
            onClick={() => onDelete(department)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
            title="Delete Department"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Staff</p>
              <p className="text-2xl font-bold text-indigo-600 mt-0.5">{departmentEmployees.length}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Sub-divisions</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{subDepartments.length}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center col-span-2 sm:col-span-1">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Hierarchy Level</p>
              <p className="text-xs font-semibold text-slate-700 mt-2">
                {department.parent_department_id ? "Sub-department" : "Top-Level Pillar"}
              </p>
            </div>
          </div>

          {/* Description */}
          {department.description && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Mandate & Scope</h4>
              <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 leading-relaxed">
                {department.description}
              </p>
            </div>
          )}

          {/* Department Head (HOD) Profile Card */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Department Leadership</h4>
            {headEmployee ? (
              <div className="bg-white border border-indigo-100 rounded-2xl p-4 shadow-xs hover:border-indigo-300 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-base flex items-center justify-center shadow-md">
                      {headEmployee.first_name?.[0]}
                      {headEmployee.last_name?.[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 text-sm">{headEmployee.full_name}</p>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <ShieldCheck className="w-3 h-3 text-indigo-600" /> Head of Department
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-indigo-600 mt-0.5">
                        {headEmployee.job_title_name || "Department Head"}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">ID: {headEmployee.employee_id}</p>
                    </div>
                  </div>
                  <Link
                    href={`/hr-payroll/employees/${headEmployee.id}`}
                    className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                    title="View Profile"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{headEmployee.work_email}</span>
                  </div>
                  {headEmployee.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{headEmployee.phone}</span>
                    </div>
                  )}
                  {headEmployee.branch_name && (
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                      <span>{headEmployee.branch_name}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-900">No Department Head Assigned</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Assign a director, manager, or lead to establish the organogram reporting chain.
                  </p>
                </div>
                <button
                  onClick={() => onEdit(department)}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors shrink-0"
                >
                  Assign HOD
                </button>
              </div>
            )}
          </div>

          {/* Child Sub-departments Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Child Sub-departments ({subDepartments.length})
              </h4>
              <button
                onClick={() => onAddSubDepartment(department)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Sub-dept
              </button>
            </div>

            {subDepartments.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-200">
                No child sub-departments directly nested under {department.name}.
              </p>
            ) : (
              <div className="space-y-2">
                {subDepartments.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all bg-white"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                        {sub.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-xs">{sub.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {sub.code ? `${sub.code} • ` : ""}
                          {sub.head_employee_name ? `Lead: ${sub.head_employee_name}` : "Lead Unassigned"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {sub.employee_count || 0} staff
                      </span>
                      <button
                        onClick={() => onSelectDepartment(sub)}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assigned Employees Roster */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Assigned Personnel Roster ({departmentEmployees.length})
                </h4>
                <p className="text-[11px] text-slate-400">Employees currently assigned to this department.</p>
              </div>
              <div className="relative min-w-[200px]">
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
                <p className="text-xs font-bold text-slate-700">No personnel found in this department</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  {employeeSearch
                    ? "No staff matching your search filter."
                    : "Assign employees to this department from the Employee Directory."}
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
                          {emp.id === department.head_employee_id && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700">
                              HOD
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-medium text-indigo-600">{emp.job_title_name || "Employee"}</p>
                        <p className="text-[10px] text-slate-400">
                          ID: {emp.employee_id} {emp.branch_name ? `• ${emp.branch_name}` : ""}
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
