"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Mail,
  Building,
  Briefcase,
  Calendar,
  Phone,
  Shield,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Hash,
} from "lucide-react";
import { EmployeeOut, EmployeeCreateInput, DepartmentOut, JobTitleOut, BranchOut } from "@/types";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";

interface EmployeeFormProps {
  initialData?: EmployeeOut | null;
  isEdit?: boolean;
}

export function EmployeeForm({ initialData, isEdit = false }: EmployeeFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [departments, setDepartments] = useState<DepartmentOut[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitleOut[]>([]);
  const [branches, setBranches] = useState<BranchOut[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [idPrefix, setIdPrefix] = useState("EMP-");
  const [loadingNextId, setLoadingNextId] = useState(false);
  const [gender, setGender] = useState("male");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationality, setNationality] = useState("");

  const [workEmail, setWorkEmail] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [residentialAddress, setResidentialAddress] = useState("");
  const [linkedin, setLinkedin] = useState("");

  const [departmentId, setDepartmentId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [jobTitleId, setJobTitleId] = useState("");
  const [team, setTeam] = useState("");

  const [employmentType, setEmploymentType] = useState("full_time");
  const [workArrangement, setWorkArrangement] = useState("onsite");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [workingHours, setWorkingHours] = useState("40 hrs/week");
  const [isDepartmentHead, setIsDepartmentHead] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Load Departments & Job Titles
  useEffect(() => {
    async function loadLookups() {
      try {
        const [deptRes, titleRes, branchRes] = await Promise.allSettled([
          apiClient.get<DepartmentOut[]>("/departments"),
          apiClient.get<JobTitleOut[]>("/job-titles"),
          apiClient.get<BranchOut[]>("/branches"),
        ]);

        if (deptRes.status === "fulfilled") {
          setDepartments(deptRes.value.data || []);
        }
        if (titleRes.status === "fulfilled") {
          setJobTitles(titleRes.value.data || []);
        }
        if (branchRes.status === "fulfilled") {
          setBranches(branchRes.value.data || []);
        }
      } catch {
        toast.error("Warning", "Could not load organization departments or job titles.");
      } finally {
        setLoadingLookups(false);
      }
    }

    loadLookups();
  }, [toast]);

  // Pre-fill initial data in edit mode
  useEffect(() => {
    if (initialData) {
      setFirstName(initialData.first_name || "");
      setMiddleName(initialData.middle_name || "");
      setLastName(initialData.last_name || "");
      setEmployeeId(initialData.employee_id || "");
      setGender(initialData.gender || "male");
      setDateOfBirth(initialData.date_of_birth ? String(initialData.date_of_birth).split("T")[0] : "");
      setNationality(initialData.nationality || "");

      setWorkEmail(initialData.work_email || "");
      setPersonalEmail(initialData.personal_email || "");
      setPhone(initialData.phone || "");
      setEmergencyContact(initialData.emergency_contact || "");
      setResidentialAddress(initialData.residential_address || "");
      setLinkedin(initialData.linkedin || "");

      setDepartmentId(initialData.department_id || "");
      setBranchId(initialData.branch_id || "");
      setJobTitleId(initialData.job_title_id || "");
      setTeam(initialData.team || "");

      setEmploymentType(initialData.employment_type || "full_time");
      setWorkArrangement(initialData.work_arrangement || "onsite");
      setStartDate(initialData.start_date ? String(initialData.start_date).split("T")[0] : "");
      setWorkingHours(initialData.working_hours || "40 hrs/week");
      setIsDepartmentHead(Boolean(initialData.is_department_head));
      setIsActive(initialData.is_active !== false);
    } else {
      fetchNextEmployeeId("EMP-");
    }
  }, [initialData]);

  const fetchNextEmployeeId = async (prefixVal: string = idPrefix) => {
    if (isEdit) return;
    setLoadingNextId(true);
    try {
      const res = await apiClient.get<{ next_employee_id: string }>(
        `/employees/next-id?prefix=${encodeURIComponent(prefixVal)}&padding=3`
      );
      if (res.data?.next_employee_id) {
        setEmployeeId(res.data.next_employee_id);
      }
    } catch {
      setEmployeeId(`${prefixVal}001`);
    } finally {
      setLoadingNextId(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim()) {
      toast.error("Validation Error", "First name is mandatory.");
      return;
    }

    if (!employeeId.trim()) {
      toast.error("Validation Error", "Employee ID is mandatory.");
      return;
    }

    if (!workEmail.trim() || !workEmail.includes("@")) {
      toast.error("Validation Error", "Please provide a valid work email address.");
      return;
    }

    setSubmitting(true);

    try {
      if (isEdit && initialData) {
        // Update Employee via PUT /employees/{id}
        const updatePayload: Record<string, unknown> = {
          first_name: firstName.trim(),
          middle_name: middleName.trim() || null,
          last_name: lastName.trim() || null,
          employee_id: employeeId.trim(),
          gender,
          date_of_birth: dateOfBirth || null,
          nationality: nationality.trim() || null,
          work_email: workEmail.trim().toLowerCase(),
          personal_email: personalEmail.trim().toLowerCase() || null,
          phone: phone.trim() || null,
          emergency_contact: emergencyContact.trim() || null,
          residential_address: residentialAddress.trim() || null,
          linkedin: linkedin.trim() || null,
          department_id: departmentId || null,
          branch_id: branchId || null,
          job_title_id: jobTitleId || null,
          team: team.trim() || null,
          employment_type: employmentType,
          work_arrangement: workArrangement,
          start_date: startDate || null,
          working_hours: workingHours.trim() || null,
          is_department_head: isDepartmentHead,
          is_active: isActive,
        };

        await apiClient.put(`/employees/${initialData.id}`, updatePayload);
        toast.success(
          "Employee Updated",
          `${firstName} ${lastName || ""}'s profile was updated successfully.`
        );
      } else {
        // Create Employee via POST /employees
        const createPayload: EmployeeCreateInput = {
          first_name: firstName.trim(),
          middle_name: middleName.trim() || undefined,
          last_name: lastName.trim() || undefined,
          employee_id: employeeId.trim(),
          gender,
          work_email: workEmail.trim().toLowerCase(),
          personal_email: personalEmail.trim().toLowerCase() || undefined,
          phone: phone.trim() || undefined,
          department_id: departmentId || null,
          branch_id: branchId || null,
          job_title_id: jobTitleId || null,
          team: team.trim() || undefined,
          employment_type: employmentType,
          work_arrangement: workArrangement,
          start_date: startDate || null,
          skills_expertise: undefined,
          is_department_head: isDepartmentHead,
          is_active: isActive,
          business_id: 1, // Will be bound to business in backend
        };

        await apiClient.post("/employees", createPayload);
        toast.success(
          "Employee Onboarded",
          `${firstName} ${lastName || ""} has been added to the company roster.`
        );
      }

      router.push("/hr-payroll/employees");
    } catch (err: unknown) {
      let msg = "Failed to save employee profile.";
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        msg = axErr.response?.data?.detail || msg;
      }
      toast.error(isEdit ? "Update Failed" : "Creation Failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 1. Basic Identity Information */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs">
        <div className="flex items-center gap-3 pb-5 mb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Personal Information</h2>
            <p className="text-xs text-slate-500">Legal names, identity identifiers, and basic demographics</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              First Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. John"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Middle Name</label>
            <input
              type="text"
              placeholder="Optional"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Last Name</label>
            <input
              type="text"
              placeholder="e.g. Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Employee ID Code <span className="text-rose-500">*</span>
              </label>
              {!isEdit && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={idPrefix}
                    onChange={(e) => {
                      const newPrefix = e.target.value;
                      setIdPrefix(newPrefix);
                      fetchNextEmployeeId(newPrefix);
                    }}
                    className="text-[11px] font-mono px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md font-semibold cursor-pointer"
                    title="Change ID Prefix"
                  >
                    <option value="EMP-">Prefix: EMP-</option>
                    <option value="EMP">Prefix: EMP</option>
                    <option value="STAFF-">Prefix: STAFF-</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => fetchNextEmployeeId(idPrefix)}
                    disabled={loadingNextId}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium hover:underline"
                    title="Re-calculate next sequential number"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingNextId ? "animate-spin" : ""}`} />
                    Next Code
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. EMP-001"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full pl-3.5 pr-20 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
              {!isEdit && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 pointer-events-none">
                  Auto
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other / Not Specified</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date of Birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>
        </div>
      </div>

      {/* 2. Contact & Communications */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs">
        <div className="flex items-center gap-3 pb-5 mb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Contact & Communications</h2>
            <p className="text-xs text-slate-500">Corporate and personal communication channels</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Work Corporate Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="john.doe@company.com"
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Personal Email</label>
            <input
              type="email"
              placeholder="personal.email@gmail.com"
              value={personalEmail}
              onChange={(e) => setPersonalEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Primary Phone Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                placeholder="+1 (555) 019-2834"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Emergency Contact Details</label>
            <input
              type="text"
              placeholder="Name & Relationship (e.g. Mary Doe - Spouse - +1 555-0921)"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Residential Address</label>
            <input
              type="text"
              placeholder="Full street address, city, state, postal code"
              value={residentialAddress}
              onChange={(e) => setResidentialAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>
        </div>
      </div>

      {/* 3. Organization & Job Assignment */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs">
        <div className="flex items-center gap-3 pb-5 mb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Organization & Department</h2>
            <p className="text-xs text-slate-500">Department hierarchy, designation, and team</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Branch Location</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              <option value="">Select Branch...</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.city || "Dhaka"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Department</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              <option value="">Select Department...</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Job Designation</label>
            <select
              value={jobTitleId}
              onChange={(e) => setJobTitleId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              <option value="">Select Designation...</option>
              {jobTitles.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Sub-team / Unit</label>
            <input
              type="text"
              placeholder="e.g. Core Engineering"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>
        </div>
      </div>

      {/* 4. Employment Terms & Scheduling */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs">
        <div className="flex items-center gap-3 pb-5 mb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Employment Terms</h2>
            <p className="text-xs text-slate-500">Contract types, working arrangements, and active status</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Employment Type</label>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              <option value="full_time">Full-Time Permanent</option>
              <option value="part_time">Part-Time</option>
              <option value="contract">Fixed-Term Contract</option>
              <option value="intern">Internship</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Work Arrangement</label>
            <select
              value={workArrangement}
              onChange={(e) => setWorkArrangement(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              <option value="onsite">On-Site (Office)</option>
              <option value="remote">Fully Remote</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Official Joining Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Checkbox Toggles */}
        <div className="flex flex-wrap items-center gap-8 pt-6 mt-6 border-t border-slate-100">
          <label className="inline-flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isDepartmentHead}
              onChange={(e) => setIsDepartmentHead(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 block">Department Head</span>
              <span className="text-[11px] text-slate-400 block">Grant supervisory approval privileges</span>
            </div>
          </label>

          <label className="inline-flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 block">Active Status</span>
              <span className="text-[11px] text-slate-400 block">Enabled for corporate directory and payroll calculations</span>
            </div>
          </label>
        </div>
      </div>

      {/* Form Submission Actions */}
      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <Link
          href="/hr-payroll/employees"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Employees
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/hr-payroll/employees"
            className="px-4 py-2.5 text-slate-500 hover:text-slate-800 font-semibold text-xs transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/25 transition disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Employee"}
          </button>
        </div>
      </div>
    </form>
  );
}
