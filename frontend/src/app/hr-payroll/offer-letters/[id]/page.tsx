"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { OfferLetterOut, BusinessProfile } from "@/types";
import { Printer, ArrowLeft, Loader2, AlertCircle } from "lucide-react";

export default function PrintableOfferLetterPage() {
  const params = useParams();
  const router = useRouter();
  const letterId = params?.id as string;

  const [letter, setLetter] = useState<OfferLetterOut | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!letterId) return;
      setLoading(true);
      setError(null);

      try {
        const res = await apiClient.get<OfferLetterOut>(`/offer-letters/${letterId}`);
        setLetter(res.data);

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
        setError(axiosErr.response?.data?.detail || "Failed to load offer letter.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [letterId]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-medium">Loading offer letter document...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !letter) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto p-6 bg-white rounded-2xl border border-red-200 mt-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Document Not Found</h2>
          <p className="text-xs text-slate-500">{error || "Unable to display offer letter."}</p>
          <button
            onClick={() => router.push("/hr-payroll/offer-letters")}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
          >
            Back to Offer Letters
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Control Bar (Hidden on print) */}
      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          href="/hr-payroll/offer-letters"
          className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs transition border border-slate-200 flex items-center gap-1.5 shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to List
        </Link>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition shadow-sm flex items-center gap-2"
        >
          <Printer className="w-4 h-4" /> Print Offer Letter
        </button>
      </div>

      {/* Printable Document Sheet */}
      <div
        id="printableArea"
        className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-slate-800 space-y-6 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-full"
      >
        {/* Company Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {business?.name_en || "Company Name"}
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {business?.address_en || business?.street || "Corporate Headquarters"}
            </p>
            <p className="text-xs text-slate-500">
              Phone: {business?.phone || business?.mobile || "N/A"} | Email:{" "}
              {business?.email || "hr@company.com"}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full border border-indigo-100 uppercase tracking-wide">
              Job Offer Letter
            </span>
            <div className="text-xs font-mono text-slate-600 mt-2 font-semibold">
              Ref: {letter.letter_no}
            </div>
            <div className="text-xs text-slate-500">Date: {letter.issue_date}</div>
          </div>
        </div>

        {/* Candidate Address Block */}
        <div className="text-xs text-slate-700 space-y-1">
          <div className="font-semibold text-slate-900 uppercase text-[10px] tracking-wider text-slate-500">
            Offer Addressed To:
          </div>
          <div className="text-sm font-bold text-slate-900">{letter.candidate_name}</div>
          <div>Email: {letter.candidate_email}</div>
          {letter.candidate_phone && <div>Phone: {letter.candidate_phone}</div>}
        </div>

        {/* Subject */}
        <div className="text-center py-2">
          <h2 className="text-sm font-bold text-slate-900 underline uppercase tracking-wide">
            OFFER OF EMPLOYMENT — {letter.job_title}
          </h2>
        </div>

        {/* Formal Body */}
        <div className="text-xs leading-relaxed text-slate-700 space-y-3">
          <p>
            Dear <strong>{letter.candidate_name}</strong>,
          </p>
          <p>
            We are pleased to offer you employment at{" "}
            <strong>{business?.name_en || "our organization"}</strong> for the position of{" "}
            <strong>{letter.job_title}</strong>
            {letter.department && (
              <>
                {" "}
                in the <strong>{letter.department}</strong> department
              </>
            )}
            . We were thoroughly impressed with your experience, accomplishments, and professional
            profile.
          </p>
          <p>
            Your scheduled starting date of employment will be <strong>{letter.joining_date}</strong>.
            This offer is contingent upon successful verification of your credentials and references.
          </p>
        </div>

        {/* Key Offer Terms Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Offer Component</th>
                <th className="py-2.5 px-4">Terms & Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-700">Designation / Role</td>
                <td className="py-2.5 px-4 font-medium text-slate-900">{letter.job_title}</td>
              </tr>
              {letter.department && (
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-700">Department</td>
                  <td className="py-2.5 px-4 font-medium text-slate-900">{letter.department}</td>
                </tr>
              )}
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-700">Offered Gross Salary</td>
                <td className="py-2.5 px-4 font-bold text-indigo-700">
                  ৳{Number(letter.offered_salary).toLocaleString("en-US", { minimumFractionDigits: 2 })} / month
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-700">Target Joining Date</td>
                <td className="py-2.5 px-4 font-medium text-slate-900">{letter.joining_date}</td>
              </tr>
              {letter.valid_until && (
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-700">Offer Expiry Date</td>
                  <td className="py-2.5 px-4 font-medium text-rose-600">{letter.valid_until}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Terms & Conditions Block */}
        {letter.terms && (
          <div className="text-xs text-slate-700 space-y-1.5">
            <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-slate-500">
              Terms & Conditions:
            </div>
            <div className="bg-slate-50/75 p-3.5 rounded-xl border border-slate-200 whitespace-pre-line text-slate-700 leading-relaxed font-sans">
              {letter.terms}
            </div>
          </div>
        )}

        <div className="text-xs text-slate-700 leading-relaxed">
          Please confirm your acceptance of this offer by signing and returning a duplicate copy of
          this letter on or before{" "}
          <strong>{letter.valid_until || "the designated date"}</strong>.
        </div>

        {/* Signature Blocks */}
        <div className="pt-12 grid grid-cols-2 gap-8 text-xs">
          <div>
            <div className="border-b border-slate-400 w-44 pb-1"></div>
            <div className="font-bold text-slate-900 mt-2">Authorized Signatory</div>
            <div className="text-slate-500 text-[11px]">{business?.name_en || "Human Resources"}</div>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="border-b border-slate-400 w-44 pb-1"></div>
            <div className="font-bold text-slate-900 mt-2">Candidate Acceptance Signature</div>
            <div className="text-slate-500 text-[11px]">
              {letter.candidate_name} — Date: ____________
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
