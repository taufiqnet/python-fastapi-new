"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import {
  AppointmentLetterOut,
  AppointmentLetterCreatePayload,
  AppointmentLetterUpdatePayload,
  AppointmentStatus,
  DepartmentOut,
  JobTitleOut,
} from "@/types";
import { X, FileText, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/context/toast-context";

interface BusinessItem {
  id: number;
  name_en: string;
}

interface AppointmentLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointment?: AppointmentLetterOut | null;
  departments: DepartmentOut[];
  jobTitles: JobTitleOut[];
  businesses: BusinessItem[];
  defaultBusinessId: number;
  isSuperuser: boolean;
}

export function AppointmentLetterModal({
  isOpen,
  onClose,
  onSuccess,
  appointment,
  departments,
  jobTitles,
  businesses,
  defaultBusinessId,
  isSuperuser,
}: AppointmentLetterModalProps) {
  const { toast } = useToast();
  const todayStr = new Date().toISOString().split("T")[0];

  const [businessId, setBusinessId] = useState<number>(defaultBusinessId);
  const [candidateName, setCandidateName] = useState<string>("");
  const [candidateEmail, setCandidateEmail] = useState<string>("");
  const [candidatePhone, setCandidatePhone] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [jobTitleId, setJobTitleId] = useState<string>("");
  const [offeredJoiningDate, setOfferedJoiningDate] = useState<string>(todayStr);
  const [probationMonths, setProbationMonths] = useState<number>(3);
  const [employmentType, setEmploymentType] = useState<string>("full_time");
  const [basicSalary, setBasicSalary] = useState<number>(0);
  const [grossSalary, setGrossSalary] = useState<number>(0);
  const [allowanceDetails, setAllowanceDetails] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>(todayStr);
  const [validUntil, setValidUntil] = useState<string>(todayStr);
  const [status, setStatus] = useState<AppointmentStatus>("draft");
  const [terms, setTerms] = useState<string>("");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(appointment);

  useEffect(() => {
    if (appointment) {
      setBusinessId(appointment.business_id || defaultBusinessId);
      setCandidateName(appointment.candidate_name || "");
      setCandidateEmail(appointment.candidate_email || "");
      setCandidatePhone(appointment.candidate_phone || "");
      setDepartmentId(appointment.department_id || "");
      setJobTitleId(appointment.job_title_id || "");
      setOfferedJoiningDate(appointment.offered_joining_date || todayStr);
      setProbationMonths(appointment.probation_period_months || 3);
      setEmploymentType(appointment.employment_type || "full_time");
      setBasicSalary(appointment.offered_basic_salary || 0);
      setGrossSalary(appointment.offered_gross_salary || 0);
      setAllowanceDetails(appointment.allowance_details || "");
      setIssueDate(appointment.issue_date || todayStr);
      setValidUntil(appointment.valid_until || todayStr);
      setStatus(appointment.status || "draft");
      setTerms(appointment.terms_and_conditions || "");
    } else {
      setBusinessId(defaultBusinessId);
      setCandidateName("");
      setCandidateEmail("");
      setCandidatePhone("");
      setDepartmentId(departments[0]?.id || "");
      setJobTitleId(jobTitles[0]?.id || "");
      setOfferedJoiningDate(todayStr);
      setProbationMonths(3);
      setEmploymentType("full_time");
      setBasicSalary(0);
      setGrossSalary(0);
      setAllowanceDetails("");
      setIssueDate(todayStr);
      // Valid until 15 days later by default
      const defaultValid = new Date();
      defaultValid.setDate(defaultValid.getDate() + 15);
      setValidUntil(defaultValid.toISOString().split("T")[0]);
      setStatus("draft");
      setTerms(
        "1. This appointment is subject to Bangladesh Labour Act 2006 compliance.\n2. Normal working hours will be 48 hours per week with designated weekly rest.\n3. Entitled to statutory medical and earned leave following confirmation."
      );
    }
    setError(null);
  }, [appointment, isOpen, defaultBusinessId, departments, jobTitles, todayStr]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!candidateName.trim()) {
      setError("Candidate name is required.");
      return;
    }
    if (!candidateEmail.trim()) {
      setError("Candidate email is required.");
      return;
    }
    if (Number(grossSalary) <= 0) {
      setError("Offered gross salary must be greater than 0.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && appointment) {
        const payload: AppointmentLetterUpdatePayload = {
          candidate_name: candidateName,
          candidate_email: candidateEmail,
          candidate_phone: candidatePhone || null,
          department_id: departmentId || null,
          job_title_id: jobTitleId || null,
          offered_joining_date: offeredJoiningDate,
          probation_period_months: Number(probationMonths),
          employment_type: employmentType,
          offered_basic_salary: Number(basicSalary),
          offered_gross_salary: Number(grossSalary),
          allowance_details: allowanceDetails || null,
          issue_date: issueDate,
          valid_until: validUntil,
          status,
          terms_and_conditions: terms || null,
        };
        await apiClient.put(`/appointment-letters/${appointment.id}`, payload);
        toast.success("Appointment Letter Updated", `Updated appointment for ${candidateName}`);
      } else {
        const payload: AppointmentLetterCreatePayload = {
          business_id: businessId,
          candidate_name: candidateName,
          candidate_email: candidateEmail,
          candidate_phone: candidatePhone || null,
          department_id: departmentId || null,
          job_title_id: jobTitleId || null,
          offered_joining_date: offeredJoiningDate,
          probation_period_months: Number(probationMonths),
          employment_type: employmentType,
          offered_basic_salary: Number(basicSalary),
          offered_gross_salary: Number(grossSalary),
          allowance_details: allowanceDetails || null,
          issue_date: issueDate,
          valid_until: validUntil,
          terms_and_conditions: terms || null,
        };
        await apiClient.post("/appointment-letters", payload);
        toast.success("Appointment Letter Created", `Generated appointment letter for ${candidateName}`);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to save appointment letter.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {isEdit ? "Edit Appointment Letter" : "Create Official Appointment Letter"}
              </h2>
              <p className="text-xs text-slate-500">
                Formal employment contract terms and compensation assignment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isSuperuser && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Business <span className="text-red-500">*</span>
              </label>
              <select
                value={businessId}
                onChange={(e) => setBusinessId(Number(e.target.value))}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name_en}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Candidate Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="e.g. Nusrat Jahan"
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Candidate Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                placeholder="candidate@example.com"
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Candidate Phone
              </label>
              <input
                type="text"
                value={candidatePhone}
                onChange={(e) => setCandidatePhone(e.target.value)}
                placeholder="+880 1812 000000"
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Designation / Job Title
              </label>
              <select
                value={jobTitleId}
                onChange={(e) => setJobTitleId(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Job Title</option>
                {jobTitles.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Employment Type
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contractual">Contractual</option>
                <option value="intern">Intern</option>
                <option value="probationary">Probationary</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Offered Basic Salary (৳) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="500"
                required
                value={basicSalary}
                onChange={(e) => setBasicSalary(Number(e.target.value))}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Offered Gross Salary (৳) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="500"
                required
                value={grossSalary}
                onChange={(e) => setGrossSalary(Number(e.target.value))}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Probation Period (Months)
              </label>
              <input
                type="number"
                min="0"
                max="12"
                value={probationMonths}
                onChange={(e) => setProbationMonths(Number(e.target.value))}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Offered Joining Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={offeredJoiningDate}
                onChange={(e) => setOfferedJoiningDate(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Issue Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valid Until / Acceptance Deadline <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {isEdit && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="accepted">Accepted</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Allowance Details / Remuneration Breakdown
            </label>
            <input
              type="text"
              value={allowanceDetails}
              onChange={(e) => setAllowanceDetails(e.target.value)}
              placeholder="e.g. Basic: 60%, House Rent: 25%, Medical: 10%, Conveyance: 5%"
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Terms & Conditions
            </label>
            <textarea
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Official contractual stipulations, leave entitlements, notice period..."
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Appointment Letter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
