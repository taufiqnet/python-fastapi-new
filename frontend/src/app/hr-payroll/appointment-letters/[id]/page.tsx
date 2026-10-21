"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { AppointmentLetterOut, BusinessProfile } from "@/types";
import { Printer, ArrowLeft, Loader2, AlertCircle } from "lucide-react";

export default function PrintableAppointmentLetterPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params?.id as string;

  const [appointment, setAppointment] = useState<AppointmentLetterOut | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!appointmentId) return;
      setLoading(true);
      setError(null);

      try {
        const res = await apiClient.get<AppointmentLetterOut>(`/appointment-letters/${appointmentId}`);
        setAppointment(res.data);

        if (res.data?.business_id) {
          try {
            const bRes = await apiClient.get<BusinessProfile>(`/businesses/${res.data.business_id}`);
            setBusiness(bRes.data);
          } catch {
            // fallback
          }
        }
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || "Failed to load appointment letter.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [appointmentId]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-medium">Loading appointment letter document...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !appointment) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto p-6 bg-white rounded-2xl border border-red-200 mt-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Document Not Found</h2>
          <p className="text-xs text-slate-500">{error || "Unable to display appointment letter."}</p>
          <button
            onClick={() => router.push("/hr-payroll/appointment-letters")}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
          >
            Back to Appointment Letters
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Control Bar */}
      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          href="/hr-payroll/appointment-letters"
          className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs transition border border-slate-200 flex items-center gap-1.5 shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to List
        </Link>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition shadow-sm flex items-center gap-2"
        >
          <Printer className="w-4 h-4" /> Print Appointment Letter
        </button>
      </div>

      {/* Printable Sheet */}
      <div
        id="printableArea"
        className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-slate-800 space-y-6 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-full"
      >
        {/* Company Letterhead */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {business?.name_en || "Company Name"}
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {business?.address_en || business?.street || "Corporate Office"}
            </p>
            <p className="text-xs text-slate-500">
              Phone: {business?.phone || business?.mobile || "N/A"} | Email:{" "}
              {business?.email || "hr@company.com"}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-teal-50 text-teal-700 font-bold text-xs rounded-full border border-teal-200 uppercase tracking-wide">
              Official Appointment
            </span>
            <div className="text-xs font-mono text-slate-600 mt-2 font-semibold">
              Ref: APPT-{appointment.id.slice(0, 8).toUpperCase()}
            </div>
            <div className="text-xs text-slate-500">Date: {appointment.issue_date}</div>
          </div>
        </div>

        {/* Candidate Address Block */}
        <div className="text-xs text-slate-700 space-y-1">
          <div className="font-semibold text-slate-900 uppercase text-[10px] tracking-wider text-slate-500">
            Letter of Appointment Issued To:
          </div>
          <div className="text-sm font-bold text-slate-900">{appointment.candidate_name}</div>
          <div>Email: {appointment.candidate_email}</div>
          {appointment.candidate_phone && <div>Phone: {appointment.candidate_phone}</div>}
        </div>

        {/* Subject Header */}
        <div className="text-center py-2">
          <h2 className="text-sm font-bold text-slate-900 underline uppercase tracking-wide">
            LETTER OF APPOINTMENT — {appointment.job_title?.name || "EMPLOYEE"}
          </h2>
        </div>

        {/* Contractual Introduction */}
        <div className="text-xs leading-relaxed text-slate-700 space-y-3">
          <p>
            Dear <strong>{appointment.candidate_name}</strong>,
          </p>
          <p>
            With reference to your application and subsequent interviews, the management of{" "}
            <strong>{business?.name_en || "our organization"}</strong> is pleased to formally appoint you
            to the position of <strong>{appointment.job_title?.name || "Designation"}</strong> in the{" "}
            <strong>{appointment.department?.name || "assigned"}</strong> department under the following
            terms and conditions.
          </p>
        </div>

        {/* Detailed Contract Specifications */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Contract Clause</th>
                <th className="py-2.5 px-4">Appointed Terms</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-700">Position / Designation</td>
                <td className="py-2.5 px-4 font-medium text-slate-900">
                  {appointment.job_title?.name || "N/A"}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-700">Department / Division</td>
                <td className="py-2.5 px-4 font-medium text-slate-900">
                  {appointment.department?.name || "N/A"}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-700">Employment Nature</td>
                <td className="py-2.5 px-4 font-medium text-slate-900 capitalize">
                  {appointment.employment_type?.replace("_", " ")}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-700">Date of Joining</td>
                <td className="py-2.5 px-4 font-medium text-slate-900">
                  {appointment.offered_joining_date}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-700">Probationary Period</td>
                <td className="py-2.5 px-4 font-medium text-slate-900">
                  {appointment.probation_period_months} Months from date of joining
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-700">Basic Salary</td>
                <td className="py-2.5 px-4 font-semibold text-slate-900">
                  ৳{Number(appointment.offered_basic_salary).toLocaleString("en-US", { minimumFractionDigits: 2 })} / month
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-700">Gross Monthly Remuneration</td>
                <td className="py-2.5 px-4 font-bold text-teal-700">
                  ৳{Number(appointment.offered_gross_salary).toLocaleString("en-US", { minimumFractionDigits: 2 })} / month
                </td>
              </tr>
              {appointment.allowance_details && (
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-700">Allowances Breakdown</td>
                  <td className="py-2.5 px-4 font-medium text-slate-700">
                    {appointment.allowance_details}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Contractual Terms & Statutory Compliance */}
        {appointment.terms_and_conditions && (
          <div className="text-xs text-slate-700 space-y-1.5">
            <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-slate-500">
              Contractual Stipulations & Compliance:
            </div>
            <div className="bg-slate-50/75 p-3.5 rounded-xl border border-slate-200 whitespace-pre-line text-slate-700 leading-relaxed font-sans">
              {appointment.terms_and_conditions}
            </div>
          </div>
        )}

        <div className="text-xs text-slate-700 leading-relaxed">
          This appointment letter is valid until <strong>{appointment.valid_until}</strong>. Please sign
          and return the duplicate copy to human resources to confirm your formal onboarding.
        </div>

        {/* Signatures */}
        <div className="pt-12 grid grid-cols-2 gap-8 text-xs">
          <div>
            <div className="border-b border-slate-400 w-44 pb-1"></div>
            <div className="font-bold text-slate-900 mt-2">Managing Director / HR Head</div>
            <div className="text-slate-500 text-[11px]">{business?.name_en || "Human Resources Department"}</div>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="border-b border-slate-400 w-44 pb-1"></div>
            <div className="font-bold text-slate-900 mt-2">Appointee Acceptance Signature</div>
            <div className="text-slate-500 text-[11px]">
              {appointment.candidate_name} — Date: ____________
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
