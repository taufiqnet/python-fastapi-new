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
  CreditCard,
  Heart,
  Droplet,
  Smartphone,
  Wallet,
  FileText,
  BadgeCheck,
  Building2,
  UserCheck,
  Laptop,
} from "lucide-react";
import { EmployeeOut, DepartmentOut, JobTitleOut } from "@/types";
import { apiClient } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { DeleteEmployeeDialog } from "@/components/hr-payroll/delete-employee-dialog";
import { NomineeTab } from "@/components/hr-payroll/employees/nominee-tab";
import { IDCardGenerator } from "@/components/hr-payroll/employees/id-card-generator";

type DetailTab = "basic" | "details" | "nominees" | "idcard" | "assets";

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<EmployeeOut | null>(null);
  const [departments, setDepartments] = useState<DepartmentOut[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitleOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("basic");
  const [clearanceData, setClearanceData] = useState<any>(null);
  const [loadingClearance, setLoadingClearance] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const loadClearance = async () => {
    if (!employeeId) return;
    setLoadingClearance(true);
    try {
      const res = await apiClient.get(`/employees/${employeeId}/clearance`);
      setClearanceData(res.data);
    } catch {
      // Non-blocking
    } finally {
      setLoadingClearance(false);
    }
  };

  const loadData = async () => {
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
  };

  useEffect(() => {
    loadData();
  }, [employeeId]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="w-full py-20 text-center">
          <Loader2 className="w-9 h-9 animate-spin text-indigo-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-800 mt-3">Loading employee profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !employee) {
    return (
      <DashboardLayout>
        <div className="w-full py-12">
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
    departments.find((d) => d.id === employee.department_id)?.name || employee.department_name || "Unassigned Department";
  const titleName =
    jobTitles.find((j) => j.id === employee.job_title_id)?.name || employee.job_title_name || "Staff Member";

  const initials = `${employee.first_name[0] || ""}${employee.last_name?.[0] || ""}`.toUpperCase();

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full pb-16">
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
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 relative p-6 flex justify-between items-start">
            <div className="flex flex-wrap items-center gap-2">
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

              {employee.employee_category && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white border border-white/20 capitalize">
                  {employee.employee_category}
                </span>
              )}

              {employee.blood_group && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  <Droplet className="w-3 h-3 fill-rose-300" /> {employee.blood_group}
                </span>
              )}

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
                {employee.photo_url ? (
                  <img
                    src={employee.photo_url}
                    alt={employee.full_name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white font-bold text-2xl flex items-center justify-center tracking-wider">
                    {initials || "EM"}
                  </div>
                )}
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-black text-slate-900 leading-tight">
                    {employee.full_name || `${employee.first_name} ${employee.last_name || ""}`}
                  </h1>
                  {employee.bangla_name && (
                    <span className="text-sm font-semibold text-slate-500 font-bengali">
                      ({employee.bangla_name})
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-indigo-600 font-bold">{titleName}</span>
                  <span>•</span>
                  <span>{deptName}</span>
                  {employee.branch_name && (
                    <>
                      <span>•</span>
                      <span className="text-slate-600">{employee.branch_name}</span>
                    </>
                  )}
                  {employee.salary_grade_name && (
                    <>
                      <span>•</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Grade: {employee.salary_grade_name}
                      </span>
                    </>
                  )}
                  <span>•</span>
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold text-slate-700">
                    {employee.employee_id}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation Strip */}
          <div className="px-6 border-t border-slate-100 flex items-center gap-2 overflow-x-auto bg-slate-50/50">
            <button
              onClick={() => setActiveTab("basic")}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "basic"
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Basic Information
            </button>

            <button
              onClick={() => setActiveTab("details")}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "details"
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Service & Details Setup
            </button>

            <button
              onClick={() => setActiveTab("nominees")}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "nominees"
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              Nominees & Emergency (Form 33)
              {employee.nominees && employee.nominees.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-700 font-bold">
                  {employee.nominees.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("idcard")}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "idcard"
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Smart ID Card
            </button>

            <button
              onClick={() => {
                setActiveTab("assets");
                loadClearance();
              }}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "assets"
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              Assets & Exit Clearance
            </button>
          </div>
        </div>

        {/* ── TAB 1: BASIC INFORMATION ────────────────────────────────────────── */}
        {activeTab === "basic" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
            {/* Identity & Statutory IDs */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <Shield className="w-4 h-4 text-indigo-500" />
                Statutory Identification
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">National ID (NID)</span>
                  <span className="font-mono font-bold text-slate-800 mt-0.5 block">
                    {employee.national_id || "Not submitted"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">e-TIN (12 Digits)</span>
                  <span className="font-mono font-bold text-slate-800 mt-0.5 block">
                    {employee.tin || "Not submitted"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Passport Number</span>
                  <span className="font-mono font-semibold text-slate-800 mt-0.5 block">
                    {employee.passport_no || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Religion</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {employee.religion || "Islam"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Nationality</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {employee.nationality || "Bangladeshi"}
                  </span>
                </div>
              </div>
            </div>

            {/* Family Lineage (BLA Rules 2015) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                Family Lineage (BLA Record)
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Father's Full Name</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {employee.father_name || "Not recorded"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Mother's Full Name</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {employee.mother_name || "Not recorded"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Spouse Full Name</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {employee.spouse_name || "Unmarried / None"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Marital Status</span>
                  <span className="font-semibold text-slate-800 capitalize mt-0.5 block">
                    {employee.marital_status || "Single"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Date of Birth</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {formatDate(employee.date_of_birth)}
                  </span>
                </div>
              </div>
            </div>

            {/* Corporate Placement & Reporting Line */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <Building className="w-4 h-4 text-purple-500" />
                Corporate Placement
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Department</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{deptName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Branch / Factory Plant</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {employee.branch_name || "Corporate HQ"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Direct Manager (Reporting Line)</span>
                  <span className="font-semibold text-indigo-600 mt-0.5 block">
                    {employee.manager_name || "Directly under Managing Director"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Corporate Email</span>
                  <a href={`mailto:${employee.work_email}`} className="font-semibold text-indigo-600 hover:underline block truncate mt-0.5">
                    {employee.work_email}
                  </a>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Contact Phone</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {employee.phone || "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: SERVICE & DETAILS SETUP ──────────────────────────────────── */}
        {activeTab === "details" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Service Terms & BLA Compliance */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-3 border-b border-slate-100 mb-4">
                <Briefcase className="w-4 h-4 text-indigo-500" />
                Service Terms & Compliance Conditions
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Employee Category</span>
                  <span className="font-bold text-slate-800 capitalize mt-0.5 block">
                    {employee.employee_category || "Management"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Employment Type</span>
                  <span className="font-semibold text-slate-800 capitalize mt-0.5 block">
                    {employee.employment_type?.replace("_", " ") || "Full Time"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Probation Period</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {employee.probation_period_months || 3} Months
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Notice Period</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {employee.notice_period_days || 30} Days
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Overtime Eligible</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold mt-1 ${
                    employee.is_overtime_eligible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                  }`}>
                    {employee.is_overtime_eligible ? "Yes (BLA § 102)" : "No (Exempt)"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Joining Date</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {formatDate(employee.start_date)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Confirmation Date</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {formatDate(employee.confirmation_date) || "Under Probation"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Work Arrangement</span>
                  <span className="font-semibold text-slate-800 capitalize mt-0.5 block">
                    {employee.work_arrangement || "Onsite"}
                  </span>
                </div>
              </div>
            </div>

            {/* Address Architecture: Present vs Permanent Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Present Address */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Present Address (বর্তমান ঠিকানা)
                </h4>
                <div className="space-y-2 text-xs">
                  <p className="text-slate-800 font-medium">
                    {employee.present_address || employee.residential_address || "Not recorded"}
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Thana (থানা):</span>
                      <span className="font-bold text-slate-700">{employee.present_thana || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">District (জেলা):</span>
                      <span className="font-bold text-slate-700">{employee.present_district || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Division (বিভাগ):</span>
                      <span className="font-bold text-slate-700">{employee.present_division || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Postal Code:</span>
                      <span className="font-mono font-bold text-slate-700">{employee.present_post_code || "-"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Permanent Address */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Permanent Address (স্থায়ী ঠিকানা)
                </h4>
                <div className="space-y-2 text-xs">
                  <p className="text-slate-800 font-medium">
                    {employee.permanent_address || "Same as present address"}
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Thana (থানা):</span>
                      <span className="font-bold text-slate-700">{employee.permanent_thana || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">District (জেলা):</span>
                      <span className="font-bold text-slate-700">{employee.permanent_district || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Division (বিভাগ):</span>
                      <span className="font-bold text-slate-700">{employee.permanent_division || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Postal Code:</span>
                      <span className="font-mono font-bold text-slate-700">{employee.permanent_post_code || "-"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Salary Disbursement & Banking / MFS */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-3 border-b border-slate-100 mb-4">
                <Wallet className="w-4 h-4 text-emerald-500" />
                Salary Disbursement Setup (Banking & MFS)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Traditional Bank Details */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Commercial Bank Account</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                      BEFTN / NPSB
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Bank Name & Branch:</span>
                    <span className="font-semibold text-slate-800">
                      {employee.bank_name ? `${employee.bank_name} (${employee.bank_branch || "Main Branch"})` : "Not Configured"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Account Number:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {employee.bank_account_no || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Routing Number (9 Digits):</span>
                    <span className="font-mono font-semibold text-slate-700">
                      {employee.bank_routing_number || "N/A"}
                    </span>
                  </div>
                </div>

                {/* MFS Account Details */}
                <div className="p-4 rounded-xl bg-pink-50/60 border border-pink-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-pink-950 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-pink-600" />
                      Mobile Financial Services (MFS)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-200 text-pink-800 uppercase">
                      {employee.mfs_provider || "bKash"}
                    </span>
                  </div>
                  <div>
                    <span className="text-pink-800/70 block text-[11px]">MFS Provider:</span>
                    <span className="font-bold text-pink-900 uppercase">
                      {employee.mfs_provider || "bKash / Nagad / Rocket"}
                    </span>
                  </div>
                  <div>
                    <span className="text-pink-800/70 block text-[11px]">Registered Mobile Number:</span>
                    <span className="font-mono font-bold text-pink-950 text-sm">
                      {employee.mfs_number || employee.phone || "Not Configured"}
                    </span>
                  </div>
                  <div>
                    <span className="text-pink-800/70 block text-[11px]">Disbursement Mode:</span>
                    <span className="font-semibold text-pink-900 capitalize">
                      {employee.disbursement_method?.replace("_", " ") || "Bank Transfer"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Access Control & Biometrics */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-3 border-b border-slate-100 mb-4">
                <Shield className="w-4 h-4 text-indigo-500" />
                Access Control & Biometric Integration
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Biometric Machine User ID:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {employee.biometric_user_id || "Unsynced"}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 bg-white px-2 py-1 rounded border">
                    ZKTeco / Hikvision
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 block text-[11px]">RFID Proximity Card Number:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {employee.rfid_card_number || "Unassigned"}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 bg-white px-2 py-1 rounded border">
                    Mifare / EM 125kHz
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: NOMINEES & EMERGENCY CONTACTS (FORM 33) ─────────────────── */}
        {activeTab === "nominees" && (
          <div className="animate-in fade-in duration-200">
            <NomineeTab
              employeeId={employee.id}
              initialNominees={employee.nominees || []}
              onRefresh={loadData}
            />
          </div>
        )}

        {/* ── TAB 4: SMART ID CARD GENERATOR ──────────────────────────────────── */}
        {activeTab === "idcard" && (
          <div className="animate-in fade-in duration-200">
            <IDCardGenerator employee={employee} />
          </div>
        )}

        {/* ── TAB 5: ASSETS & EXIT CLEARANCE ───────────────────────────────────── */}
        {activeTab === "assets" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Clearance Summary Banner */}
            <div className={`p-6 rounded-2xl border shadow-xs ${
              clearanceData?.is_cleared
                ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                : "bg-amber-50/60 border-amber-200 text-amber-900"
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    clearanceData?.is_cleared ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {clearanceData?.is_cleared ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <AlertCircle className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold">
                      {clearanceData?.is_cleared
                        ? "Employee Cleared of Company Custody"
                        : "Outstanding Company Custody & Advances"}
                    </h3>
                    <p className="text-xs opacity-80 mt-0.5">
                      {clearanceData?.is_cleared
                        ? "All company laptops, cellular SIMs, and travel advances are fully returned and settled."
                        : "Assets must be returned and travel advances cleared prior to final offboarding and severance payout."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/assets/allocations"
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
                  >
                    Open Custody Handover Log
                  </Link>
                </div>
              </div>
            </div>

            {/* Unreturned Assets */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">Assigned Company Equipment & Gear</h3>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {clearanceData?.unreturned_assets_count || 0} items active
                </span>
              </div>

              {loadingClearance ? (
                <div className="p-8 text-center text-slate-400 text-xs">Checking asset custody...</div>
              ) : clearanceData?.unreturned_assets && clearanceData.unreturned_assets.length > 0 ? (
                <div className="divide-y divide-slate-100 mt-2">
                  {clearanceData.unreturned_assets.map((item: any) => (
                    <div key={item.assignment_id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-900">{item.asset_name || "Company Asset"}</div>
                        <div className="font-mono text-[11px] text-indigo-600">{item.asset_tag}</div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 capitalize">
                          {item.status.replace("_", " ")}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-0.5">Assigned: {item.assigned_date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No company hardware or equipment currently assigned to this employee.
                </div>
              )}
            </div>

            {/* Unsettled Advances */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">Unsettled Travel Advances</h3>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {clearanceData?.unsettled_advances_count || 0} active advances
                </span>
              </div>

              {clearanceData?.unsettled_advances && clearanceData.unsettled_advances.length > 0 ? (
                <div className="divide-y divide-slate-100 mt-2">
                  {clearanceData.unsettled_advances.map((adv: any) => (
                    <div key={adv.advance_id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-900 font-mono">{adv.advance_number}</div>
                        <div className="text-[11px] text-slate-400">Travel Advance Fund</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-900">BDT {Number(adv.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 capitalize mt-0.5">
                          {adv.settlement_status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No unsettled pre-trip advances found for this employee.
                </div>
              )}
            </div>
          </div>
        )}

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
