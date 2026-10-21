"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { OfferLetterOut, OfferLetterCreatePayload, OfferLetterUpdatePayload, OfferLetterStatus } from "@/types";
import { X, FileText, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/context/toast-context";

interface BusinessItem {
  id: number;
  name_en: string;
}

interface OfferLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  letter?: OfferLetterOut | null;
  businesses: BusinessItem[];
  defaultBusinessId: number;
  isSuperuser: boolean;
}

export function OfferLetterModal({
  isOpen,
  onClose,
  onSuccess,
  letter,
  businesses,
  defaultBusinessId,
  isSuperuser,
}: OfferLetterModalProps) {
  const { toast } = useToast();
  const todayStr = new Date().toISOString().split("T")[0];

  const [businessId, setBusinessId] = useState<number>(defaultBusinessId);
  const [candidateName, setCandidateName] = useState<string>("");
  const [candidateEmail, setCandidateEmail] = useState<string>("");
  const [candidatePhone, setCandidatePhone] = useState<string>("");
  const [jobTitle, setJobTitle] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [offeredSalary, setOfferedSalary] = useState<number>(0);
  const [joiningDate, setJoiningDate] = useState<string>(todayStr);
  const [issueDate, setIssueDate] = useState<string>(todayStr);
  const [validUntil, setValidUntil] = useState<string>("");
  const [status, setStatus] = useState<OfferLetterStatus>("draft");
  const [terms, setTerms] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(letter);

  useEffect(() => {
    if (letter) {
      setBusinessId(letter.business_id || defaultBusinessId);
      setCandidateName(letter.candidate_name || "");
      setCandidateEmail(letter.candidate_email || "");
      setCandidatePhone(letter.candidate_phone || "");
      setJobTitle(letter.job_title || "");
      setDepartment(letter.department || "");
      setOfferedSalary(letter.offered_salary || 0);
      setJoiningDate(letter.joining_date || todayStr);
      setIssueDate(letter.issue_date || todayStr);
      setValidUntil(letter.valid_until || "");
      setStatus(letter.status || "draft");
      setTerms(letter.terms || "");
      setNotes(letter.notes || "");
    } else {
      setBusinessId(defaultBusinessId);
      setCandidateName("");
      setCandidateEmail("");
      setCandidatePhone("");
      setJobTitle("");
      setDepartment("");
      setOfferedSalary(0);
      setJoiningDate(todayStr);
      setIssueDate(todayStr);
      setValidUntil("");
      setStatus("draft");
      setTerms(
        "1. Working hours: 9:00 AM to 6:00 PM (Sunday through Thursday).\n2. Probationary period of 3 months applies.\n3. Compensation review after successful completion of probation."
      );
      setNotes("");
    }
    setError(null);
  }, [letter, isOpen, defaultBusinessId, todayStr]);

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
    if (!jobTitle.trim()) {
      setError("Job title is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && letter) {
        const payload: OfferLetterUpdatePayload = {
          candidate_name: candidateName,
          candidate_email: candidateEmail,
          candidate_phone: candidatePhone || null,
          job_title: jobTitle,
          department: department || null,
          offered_salary: Number(offeredSalary),
          joining_date: joiningDate,
          issue_date: issueDate,
          valid_until: validUntil || null,
          status,
          terms: terms || null,
          notes: notes || null,
        };
        await apiClient.put(`/offer-letters/${letter.id}`, payload);
        toast.success("Offer Letter Updated", `Updated letter #${letter.letter_no}`);
      } else {
        const payload: OfferLetterCreatePayload = {
          business_id: businessId,
          candidate_name: candidateName,
          candidate_email: candidateEmail,
          candidate_phone: candidatePhone || null,
          job_title: jobTitle,
          department: department || null,
          offered_salary: Number(offeredSalary),
          joining_date: joiningDate,
          issue_date: issueDate,
          valid_until: validUntil || null,
          terms: terms || null,
          notes: notes || null,
        };
        await apiClient.post("/offer-letters", payload);
        toast.success("Offer Letter Created", "New job offer letter has been generated.");
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to save offer letter. Please try again.");
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
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {isEdit ? `Edit Offer Letter (#${letter?.letter_no})` : "Generate Offer Letter"}
              </h2>
              <p className="text-xs text-slate-500">
                Official employment proposal and compensation terms
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
                Candidate Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="e.g. Tanvir Ahmed"
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
                placeholder="+880 1711 000000"
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Job Title / Designation <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Software Engineer"
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
                placeholder="e.g. Engineering & Technology"
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Offered Monthly Gross Salary (৳) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="500"
                required
                value={offeredSalary}
                onChange={(e) => setOfferedSalary(Number(e.target.value))}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Joining Date <span className="text-red-500">*</span>
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
                Offer Valid Until
              </label>
              <input
                type="date"
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
                  onChange={(e) => setStatus(e.target.value as OfferLetterStatus)}
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
              Terms & Conditions
            </label>
            <textarea
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Specify offer conditions, probation terms, working hours..."
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
              placeholder="e.g. Recommended by VP Engineering"
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
              {isEdit ? "Save Changes" : "Generate Offer Letter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
