"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import {
  ExperienceLetterOut,
  ExperienceLetterCreatePayload,
  ExperienceLetterUpdatePayload,
  ExperienceLetterStatus,
  EmployeeOut,
} from "@/types";
import { X, Briefcase, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/context/toast-context";
import { SearchableEmployeeCombobox } from "@/components/common/searchable-employee-combobox";

interface BusinessItem {
  id: number;
  name_en: string;
}

interface ExperienceLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  letter?: ExperienceLetterOut | null;
  employees: EmployeeOut[];
  businesses: BusinessItem[];
  defaultBusinessId: number;
  isSuperuser: boolean;
}

export function ExperienceLetterModal({
  isOpen,
  onClose,
  onSuccess,
  letter,
  employees,
  businesses,
  defaultBusinessId,
  isSuperuser,
}: ExperienceLetterModalProps) {
  const { toast } = useToast();
  const todayStr = new Date().toISOString().split("T")[0];

  const [businessId, setBusinessId] = useState<number>(defaultBusinessId);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [designation, setDesignation] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [joiningDate, setJoiningDate] = useState<string>(todayStr);
  const [relievingDate, setRelievingDate] = useState<string>(todayStr);
  const [issueDate, setIssueDate] = useState<string>(todayStr);
  const [addressedTo, setAddressedTo] = useState<string>("To Whom It May Concern");
  const [conductAndCharacter, setConductAndCharacter] = useState<string>("satisfactory and commendable");
  const [dutiesSummary, setDutiesSummary] = useState<string>("");
  const [status, setStatus] = useState<ExperienceLetterStatus>("draft");
  const [notes, setNotes] = useState<string>("");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(letter);

  useEffect(() => {
    if (letter) {
      setBusinessId(letter.business_id || defaultBusinessId);
      setEmployeeId(letter.employee_id || "");
      setDesignation(letter.designation || "");
      setDepartment(letter.department || "");
      setJoiningDate(letter.joining_date || todayStr);
      setRelievingDate(letter.relieving_date || todayStr);
      setIssueDate(letter.issue_date || todayStr);
      setAddressedTo(letter.addressed_to || "To Whom It May Concern");
      setConductAndCharacter(letter.conduct_and_character || "satisfactory and commendable");
      setDutiesSummary(letter.duties_summary || "");
      setStatus(letter.status || "draft");
      setNotes(letter.notes || "");
    } else {
      setBusinessId(defaultBusinessId);
      const firstEmp = employees[0];
      setEmployeeId(firstEmp?.id || "");
      setDesignation(firstEmp?.job_title?.name || "");
      setDepartment(firstEmp?.department?.name || "");
      setJoiningDate(firstEmp?.start_date ? String(firstEmp.start_date) : todayStr);
      setRelievingDate(todayStr);
      setIssueDate(todayStr);
      setAddressedTo("To Whom It May Concern");
      setConductAndCharacter("satisfactory and commendable");
      setDutiesSummary("");
      setStatus("draft");
      setNotes("");
    }
    setError(null);
  }, [letter, isOpen, defaultBusinessId, employees, todayStr]);

  const handleEmployeeChange = (empId: string) => {
    setEmployeeId(empId);
    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      if (emp.job_title?.name) setDesignation(emp.job_title.name);
      if (emp.department?.name) setDepartment(emp.department.name);
      if (emp.start_date) setJoiningDate(String(emp.start_date));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!employeeId) {
      setError("Please select an employee.");
      return;
    }
    if (!designation.trim()) {
      setError("Designation is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && letter) {
        const payload: ExperienceLetterUpdatePayload = {
          designation,
          department: department || null,
          joining_date: joiningDate,
          relieving_date: relievingDate,
          issue_date: issueDate,
          addressed_to: addressedTo || null,
          conduct_and_character: conductAndCharacter,
          duties_summary: dutiesSummary || null,
          status,
          notes: notes || null,
        };
        await apiClient.put(`/experience-letters/${letter.id}`, payload);
        toast.success("Experience Letter Updated", `Updated letter #${letter.letter_no}`);
      } else {
        const payload: ExperienceLetterCreatePayload = {
          business_id: businessId,
          employee_id: employeeId,
          designation,
          department: department || null,
          joining_date: joiningDate,
          relieving_date: relievingDate,
          issue_date: issueDate,
          addressed_to: addressedTo || null,
          conduct_and_character: conductAndCharacter,
          duties_summary: dutiesSummary || null,
          notes: notes || null,
        };
        await apiClient.post("/experience-letters", payload);
        toast.success("Experience Letter Created", "New certificate of experience generated.");
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to save experience letter.");
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
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {isEdit
                  ? `Edit Experience Letter (#${letter?.letter_no})`
                  : "Issue Certificate of Experience"}
              </h2>
              <p className="text-xs text-slate-500">
                Official tenure verification, designation, and conduct appraisal
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Employee <span className="text-red-500">*</span>
              </label>
              <SearchableEmployeeCombobox
                employees={employees}
                value={employeeId}
                onChange={(empId) => handleEmployeeChange(empId)}
                disabled={isEdit}
                placeholder="Search & select employee..."
                allowClear={false}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Designation / Position <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Lead Frontend Architect"
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Product Engineering"
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Addressed To
              </label>
              <input
                type="text"
                value={addressedTo}
                onChange={(e) => setAddressedTo(e.target.value)}
                placeholder="e.g. To Whom It May Concern"
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Service Start / Joining Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Relieving / End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={relievingDate}
                onChange={(e) => setRelievingDate(e.target.value)}
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
                Conduct & Character Appraisal
              </label>
              <input
                type="text"
                value={conductAndCharacter}
                onChange={(e) => setConductAndCharacter(e.target.value)}
                placeholder="e.g. satisfactory and commendable"
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
                  onChange={(e) => setStatus(e.target.value as ExperienceLetterStatus)}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
                >
                  <option value="draft">Draft</option>
                  <option value="issued">Issued</option>
                  <option value="revoked">Revoked</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Summary of Duties & Responsibilities
            </label>
            <textarea
              rows={3}
              value={dutiesSummary}
              onChange={(e) => setDutiesSummary(e.target.value)}
              placeholder="Outline key project deliverables, technologies managed, leadership roles..."
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Internal HR Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Exit clearance completed"
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5"
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
              {isEdit ? "Save Changes" : "Issue Experience Letter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
