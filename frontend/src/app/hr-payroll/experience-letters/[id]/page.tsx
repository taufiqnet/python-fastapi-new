"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { ExperienceLetterOut, BusinessProfile, EmployeeOut } from "@/types";
import { Printer, ArrowLeft, Loader2, AlertCircle } from "lucide-react";

export default function PrintableExperienceLetterPage() {
  const params = useParams();
  const router = useRouter();
  const letterId = params?.id as string;

  const [letter, setLetter] = useState<ExperienceLetterOut | null>(null);
  const [employee, setEmployee] = useState<EmployeeOut | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!letterId) return;
      setLoading(true);
      setError(null);

      try {
        const res = await apiClient.get<ExperienceLetterOut>(`/experience-letters/${letterId}`);
        const lData = res.data;
        setLetter(lData);

        const promises: Promise<unknown>[] = [];

        if (lData.employee_id) {
          promises.push(
            apiClient.get<EmployeeOut>(`/employees/${lData.employee_id}`).then((res) => {
              setEmployee(res.data);
            })
          );
        }
        if (lData.business_id) {
          promises.push(
            apiClient.get<BusinessProfile>(`/businesses/${lData.business_id}`).then((res) => {
              setBusiness(res.data);
            })
          );
        }

        await Promise.allSettled(promises);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || "Failed to load experience letter.");
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
          <p className="text-xs text-slate-500 font-medium">Loading experience letter document...</p>
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
          <p className="text-xs text-slate-500">{error || "Unable to display experience letter."}</p>
          <button
            onClick={() => router.push("/hr-payroll/experience-letters")}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
          >
            Back to Experience Letters
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
          href="/hr-payroll/experience-letters"
          className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs transition border border-slate-200 flex items-center gap-1.5 shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to List
        </Link>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition shadow-sm flex items-center gap-2"
        >
          <Printer className="w-4 h-4" /> Print Experience Letter
        </button>
      </div>

      {/* Printable Document Sheet */}
      <div
        id="printableArea"
        className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-slate-800 space-y-6 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-full font-serif"
      >
        {/* Company Header */}
        <div className="flex items-start justify-between border-b border-slate-300 pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {business?.name_en || "Company Name"}
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {business?.address_en || business?.street || "Corporate Headquarters, Dhaka, Bangladesh"}
            </p>
            <p className="text-xs text-slate-500">
              Phone: {business?.phone || business?.mobile || "N/A"} | Email:{" "}
              {business?.email || "hr@company.com"}
            </p>
          </div>
          <div className="text-right font-sans">
            <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full border border-indigo-100 uppercase tracking-wide">
              Experience Certificate
            </span>
            <div className="text-xs font-mono text-slate-600 mt-2 font-semibold">
              Ref: {letter.letter_no}
            </div>
            <div className="text-xs text-slate-500">Date: {letter.issue_date}</div>
          </div>
        </div>

        {/* Recipient */}
        <div className="text-xs text-slate-700 font-sans space-y-1">
          <div className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">
            Issued To:
          </div>
          <div className="font-bold text-slate-900 text-sm">
            {letter.addressed_to || "To Whom It May Concern"}
          </div>
        </div>

        {/* Subject */}
        <div className="text-center py-2">
          <h2 className="text-base font-bold text-slate-900 underline uppercase tracking-wide">
            Certificate of Employment & Experience
          </h2>
        </div>

        {/* Formal Attestation Narrative */}
        <div className="text-xs leading-relaxed text-slate-800 space-y-3 font-sans">
          <p>
            This is to certify that <strong>{employee?.full_name || "The Employee"}</strong> (Employee ID:{" "}
            <strong>{employee?.employee_id || "—"}</strong>) was an esteemed employee of{" "}
            <strong>{business?.name_en || "our organization"}</strong>, successfully serving from{" "}
            <strong>{letter.joining_date}</strong> to <strong>{letter.relieving_date}</strong>.
          </p>
          <p>
            During their tenure with us, they held the position of <strong>{letter.designation}</strong>
            {letter.department && (
              <>
                {" "}
                in the <strong>{letter.department}</strong> department
              </>
            )}
            . In their capacity, they carried out all assigned tasks with utmost diligence, technical
            competence, and high professional standards.
          </p>
          <p>
            Throughout their period of service, we observed their character, conduct, and professional
            performance to be <strong>{letter.conduct_and_character}</strong>.
          </p>
          {letter.duties_summary && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-semibold text-slate-800 block mb-1">
                Key Responsibilities & Contributions:
              </span>
              <p className="text-slate-600 italic whitespace-pre-line">{letter.duties_summary}</p>
            </div>
          )}
          <p>
            We take this opportunity to thank them for their valuable contributions and wish them
            every continued success in all their future personal and professional endeavors.
          </p>
        </div>

        {/* Service Summary Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden font-sans">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Service Record Summary</th>
                <th className="py-2.5 px-4">Certified Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-700">Full Name</td>
                <td className="py-2.5 px-4 font-medium text-slate-900">
                  {employee?.full_name || "Employee"}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-700">Designation Held</td>
                <td className="py-2.5 px-4 font-medium text-slate-900">{letter.designation}</td>
              </tr>
              {letter.department && (
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-700">Department</td>
                  <td className="py-2.5 px-4 font-medium text-slate-900">{letter.department}</td>
                </tr>
              )}
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-700">Date of Joining</td>
                <td className="py-2.5 px-4 font-medium text-slate-900">{letter.joining_date}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-700">Date of Relieving / Exit</td>
                <td className="py-2.5 px-4 font-medium text-slate-900">{letter.relieving_date}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="pt-16 grid grid-cols-2 gap-8 text-xs font-sans">
          <div>
            <div className="w-24 h-24 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-[10px] text-slate-400 uppercase tracking-widest text-center p-2">
              Official Seal
            </div>
          </div>
          <div className="text-right flex flex-col items-end justify-end">
            <div className="border-b border-slate-400 w-52 pb-1"></div>
            <div className="font-bold text-slate-900 mt-2">Authorized Signatory</div>
            <div className="text-slate-500 text-[11px]">Human Resources & People Operations</div>
            <div className="text-slate-500 text-[11px]">{business?.name_en}</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
