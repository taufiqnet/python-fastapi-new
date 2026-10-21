"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import {
  SalaryCertificateOut,
  SalaryCertificateCreatePayload,
  SalaryCertificateUpdatePayload,
  SalaryCertificatePurpose,
  SalaryCertificateStatus,
  EmployeeOut,
} from "@/types";
import { X, Award, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/context/toast-context";

interface BusinessItem {
  id: number;
  name_en: string;
}

interface SalaryCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  certificate?: SalaryCertificateOut | null;
  employees: EmployeeOut[];
  businesses: BusinessItem[];
  defaultBusinessId: number;
  isSuperuser: boolean;
}

export function SalaryCertificateModal({
  isOpen,
  onClose,
  onSuccess,
  certificate,
  employees,
  businesses,
  defaultBusinessId,
  isSuperuser,
}: SalaryCertificateModalProps) {
  const { toast } = useToast();
  const todayStr = new Date().toISOString().split("T")[0];

  const [businessId, setBusinessId] = useState<number>(defaultBusinessId);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>(todayStr);
  const [fiscalYear, setFiscalYear] = useState<string>("2023-2024");
  const [assessmentYear, setAssessmentYear] = useState<string>("2024-2025");
  const [purpose, setPurpose] = useState<SalaryCertificatePurpose>("general");
  const [addressedTo, setAddressedTo] = useState<string>("");
  const [includeBreakdown, setIncludeBreakdown] = useState<boolean>(true);
  const [status, setStatus] = useState<SalaryCertificateStatus>("draft");

  // Financial components
  const [basicSalary, setBasicSalary] = useState<number>(0);
  const [grossSalary, setGrossSalary] = useState<number>(0);
  const [netSalary, setNetSalary] = useState<number>(0);
  const [houseRent, setHouseRent] = useState<number>(0);
  const [medicalAllowance, setMedicalAllowance] = useState<number>(0);
  const [conveyance, setConveyance] = useState<number>(0);
  const [othersAllowance, setOthersAllowance] = useState<number>(0);
  const [bonus, setBonus] = useState<number>(0);
  const [taxDeducted, setTaxDeducted] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(certificate);

  useEffect(() => {
    if (certificate) {
      setBusinessId(certificate.business_id || defaultBusinessId);
      setEmployeeId(certificate.employee_id || "");
      setIssueDate(certificate.issue_date || todayStr);
      setFiscalYear(certificate.fiscal_year || "2023-2024");
      setAssessmentYear(certificate.assessment_year || "");
      setPurpose(certificate.purpose || "general");
      setAddressedTo(certificate.addressed_to || "");
      setIncludeBreakdown(certificate.include_breakdown ?? true);
      setStatus(certificate.status || "draft");

      setBasicSalary(certificate.basic_salary || 0);
      setGrossSalary(certificate.gross_salary || 0);
      setNetSalary(certificate.net_salary || 0);
      setHouseRent(certificate.house_rent || 0);
      setMedicalAllowance(certificate.medical_allowance || 0);
      setConveyance(certificate.conveyance || 0);
      setOthersAllowance(certificate.others_allowance || 0);
      setBonus(certificate.bonus || 0);
      setTaxDeducted(certificate.tax_deducted || 0);
      setNotes(certificate.notes || "");
    } else {
      setBusinessId(defaultBusinessId);
      setEmployeeId(employees[0]?.id || "");
      setIssueDate(todayStr);
      setFiscalYear("2023-2024");
      setAssessmentYear("2024-2025");
      setPurpose("general");
      setAddressedTo("To Whom It May Concern");
      setIncludeBreakdown(true);
      setStatus("draft");

      setBasicSalary(0);
      setGrossSalary(0);
      setNetSalary(0);
      setHouseRent(0);
      setMedicalAllowance(0);
      setConveyance(0);
      setOthersAllowance(0);
      setBonus(0);
      setTaxDeducted(0);
      setNotes("");
    }
    setError(null);
  }, [certificate, isOpen, defaultBusinessId, employees, todayStr]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!employeeId) {
      setError("Please select an employee.");
      return;
    }
    if (Number(grossSalary) < 0) {
      setError("Gross salary cannot be negative.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && certificate) {
        const payload: SalaryCertificateUpdatePayload = {
          issue_date: issueDate,
          fiscal_year: fiscalYear,
          assessment_year: assessmentYear || null,
          purpose,
          addressed_to: addressedTo || null,
          include_breakdown: includeBreakdown,
          status,
          basic_salary: Number(basicSalary),
          gross_salary: Number(grossSalary),
          net_salary: Number(netSalary),
          house_rent: Number(houseRent),
          medical_allowance: Number(medicalAllowance),
          conveyance: Number(conveyance),
          others_allowance: Number(othersAllowance),
          bonus: Number(bonus),
          tax_deducted: Number(taxDeducted),
          notes: notes || null,
        };
        await apiClient.put(`/salary-certificates/${certificate.id}`, payload);
        toast.success("Certificate Updated", `Certificate #${certificate.certificate_no} updated.`);
      } else {
        const payload: SalaryCertificateCreatePayload = {
          business_id: businessId,
          employee_id: employeeId,
          issue_date: issueDate,
          fiscal_year: fiscalYear,
          assessment_year: assessmentYear || null,
          purpose,
          addressed_to: addressedTo || null,
          include_breakdown: includeBreakdown,
          basic_salary: Number(basicSalary),
          gross_salary: Number(grossSalary),
          net_salary: Number(netSalary),
          house_rent: Number(houseRent),
          medical_allowance: Number(medicalAllowance),
          conveyance: Number(conveyance),
          others_allowance: Number(othersAllowance),
          bonus: Number(bonus),
          tax_deducted: Number(taxDeducted),
          notes: notes || null,
        };
        await apiClient.post("/salary-certificates", payload);
        toast.success("Certificate Issued", "New salary certificate generated.");
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to save salary certificate.");
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
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {isEdit
                  ? `Edit Salary Certificate (#${certificate?.certificate_no})`
                  : "Issue Formal Salary Certificate"}
              </h2>
              <p className="text-xs text-slate-500">
                Official salary verification for bank loans, visas, credit cards, or tax returns
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
                Employee <span className="text-red-500">*</span>
              </label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={isEdit}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
              >
                <option value="">Select Employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name} ({e.employee_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Certificate Purpose
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as SalaryCertificatePurpose)}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
              >
                <option value="general">General Purpose</option>
                <option value="bank_loan">Bank Loan Application</option>
                <option value="visa">Visa / Immigration</option>
                <option value="tax">Tax Assessment</option>
                <option value="credit_card">Credit Card Issuance</option>
                <option value="embassy">Foreign Embassy Attestation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Income / Fiscal Year <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                placeholder="e.g. 2023-2024"
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assessment Year
              </label>
              <input
                type="text"
                value={assessmentYear}
                onChange={(e) => setAssessmentYear(e.target.value)}
                placeholder="e.g. 2024-2025"
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
                Addressed To / Recipient
              </label>
              <input
                type="text"
                value={addressedTo}
                onChange={(e) => setAddressedTo(e.target.value)}
                placeholder="e.g. The Branch Manager, Standard Chartered Bank"
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
                  onChange={(e) => setStatus(e.target.value as SalaryCertificateStatus)}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
                >
                  <option value="draft">Draft</option>
                  <option value="issued">Issued</option>
                  <option value="revoked">Revoked</option>
                </select>
              </div>
            )}
          </div>

          {/* Financial Breakdown Section */}
          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Certified Compensation Figures
              </h3>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBreakdown}
                  onChange={(e) => setIncludeBreakdown(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-600"
                />
                Include Breakdown Table on Document
              </label>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">Basic Salary (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={basicSalary}
                  onChange={(e) => setBasicSalary(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">Gross Salary (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={grossSalary}
                  onChange={(e) => setGrossSalary(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2 bg-white font-semibold text-indigo-700"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">Net Monthly Salary (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={netSalary}
                  onChange={(e) => setNetSalary(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2 bg-white font-semibold text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">House Rent (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={houseRent}
                  onChange={(e) => setHouseRent(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">Medical Allowance (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={medicalAllowance}
                  onChange={(e) => setMedicalAllowance(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">Conveyance (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={conveyance}
                  onChange={(e) => setConveyance(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2 bg-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Verified by Payroll Officer"
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
              {isEdit ? "Save Changes" : "Issue Salary Certificate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
