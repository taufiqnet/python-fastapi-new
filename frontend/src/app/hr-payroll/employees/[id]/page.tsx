"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  CheckCircle2,
  XCircle,
  Sparkles,
  Edit,
  Trash2,
  ArrowLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  MapPin,
  Clock,
  Shield,
} from "lucide-react";
import { EmployeeOut, DepartmentOut, JobTitleOut } from "@/types";
import { apiClient } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { DeleteEmployeeDialog } from "@/components/hr-payroll/delete-employee-dialog";

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<EmployeeOut | null>(null);
  const [departments, setDepartments] = useState<DepartmentOut[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitleOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!employeeId) return;
      setLoading(true);
      setError(null);
      try {
        const [empRes, deptRes, titleRes] = await Promise.allSettled([
          apiClient.get<EmployeeOut>(`/employees/${employeeId}`),
          apiClient.get<DepartmentOut[]>("/departments"),
          apiClient.get<JobTitleOut[]>("/job-titles"),
        ]);

        if (empRes.status === "fulfilled") {
          setEmployee(empRes.value.data);
        } else {
          setError("Employee record not found or could not be loaded.");
        }

        if (deptRes.status === "fulfilled") {
          setDepartments(deptRes.value.data || []);
        }

        if (titleRes.status === "fulfilled") {
          setJobTitles(titleRes.value.data || []);
        }
      } catch {
        setError("Error communicating with backend server.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [employeeId]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-800 mt-3">Loading employee profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !employee) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto py-12">
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-center gap-3">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-semibold">Unable to load profile</p>
              <p className="text-xs mt-0.5">{error || "Employee not found."}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link
              href="/hr-payroll/employees"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:underline font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Employees Roster
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const deptName =
    departments.find((d) => d.id === employee.department_id)?.name || "Unassigned Department";
  const titleName =
    jobTitles.find((j) => j.id === employee.job_title_id)?.name || "Staff Member";

  const initials = `${employee.first_name[0] || ""}${employee.last_name?.[0] || ""}`.toUpperCase();

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/hr-payroll/employees" className="hover:text-indigo-600 transition">
            HR & Payroll
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <Link href="/hr-payroll/employees" className="hover:text-indigo-600 transition">
            Employees
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-slate-800 font-semibold">{employee.full_name || employee.first_name}</span>
        </nav>

        {/* Profile Hero Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 relative p-6 flex justify-between items-start">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-md ${
                  employee.is_active
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-slate-500/20 text-slate-300 border border-slate-500/40"
                }`}
              >
                {employee.is_active ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-slate-400" />
                )}
                {employee.is_active ? "Active Staff" : "Inactive / On Leave"}
              </span>

              {employee.is_department_head && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Head of Department
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/hr-payroll/employees/${employee.id}/edit`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/20 transition"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit Profile
              </Link>
              <button
                type="button"
                onClick={() => setIsDeleteOpen(true)}
                className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition"
                title="Delete Employee"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-2xl bg-white p-1.5 shadow-lg border border-slate-200 shrink-0">
                <div className="w-full h-full rounded-xl bg-indigo-600 text-white font-bold text-2xl flex items-center justify-center tracking-wider">
                  {initials || "EM"}
                </div>
              </div>
              <div className="pb-1">
                <h1 className="text-2xl font-black text-slate-900 leading-tight">
                  {employee.full_name || `${employee.first_name} ${employee.last_name || ""}`}
                </h1>
                <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                  <span className="text-indigo-600 font-semibold">{titleName}</span>
                  <span>•</span>
                  <span>{deptName}</span>
                  <span>•</span>
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-600">
                    {employee.employee_id}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Employment Terms */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Briefcase className="w-4 h-4 text-indigo-500" />
              Employment Terms
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Employment Type</span>
                <span className="font-semibold text-slate-800 capitalize mt-0.5 block">
                  {employee.employment_type?.replace("_", " ") || "Full Time"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Work Arrangement</span>
                <span className="font-semibold text-slate-800 capitalize mt-0.5 block">
                  {employee.work_arrangement || "On-site"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Joining Date</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {formatDate(employee.start_date)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Working Schedule</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {employee.working_hours || "40 hrs/week"}
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: Communications & Contacts */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Mail className="w-4 h-4 text-emerald-500" />
              Contact Details
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Corporate Work Email</span>
                <a
                  href={`mailto:${employee.work_email}`}
                  className="font-semibold text-indigo-600 hover:underline mt-0.5 block truncate"
                >
                  {employee.work_email}
                </a>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Personal Email</span>
                <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                  {employee.personal_email || "-"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Phone Number</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {employee.phone || "-"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Emergency Contact</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {employee.emergency_contact || "-"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Residential Address</span>
                <span className="text-slate-700 mt-0.5 block">
                  {employee.residential_address || "-"}
                </span>
              </div>
            </div>
          </div>

          {/* Column 3: Personal & Organization Info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Building className="w-4 h-4 text-purple-500" />
              Personal & Organization
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Department</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{deptName}</span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Sub-Team / Unit</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {employee.team || "General Department"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Gender</span>
                <span className="font-semibold text-slate-800 capitalize mt-0.5 block">
                  {employee.gender || "-"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Date of Birth</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {formatDate(employee.date_of_birth)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Nationality</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {employee.nationality || "-"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <DeleteEmployeeDialog
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onSuccess={() => {
            router.push("/hr-payroll/employees");
          }}
          employee={employee}
        />
      </div>
    </DashboardLayout>
  );
}
