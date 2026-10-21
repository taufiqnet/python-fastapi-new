"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { SalaryCertificateOut, BusinessProfile, EmployeeOut } from "@/types";
import { Printer, ArrowLeft, Loader2, AlertCircle } from "lucide-react";

export default function PrintableSalaryCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const certId = params?.id as string;

  const [certificate, setCertificate] = useState<SalaryCertificateOut | null>(null);
  const [employee, setEmployee] = useState<EmployeeOut | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!certId) return;
      setLoading(true);
      setError(null);

      try {
        const res = await apiClient.get<SalaryCertificateOut>(`/salary-certificates/${certId}`);
        const cData = res.data;
        setCertificate(cData);

        const promises: Promise<unknown>[] = [];

        if (cData.employee_id) {
          promises.push(
            apiClient.get<EmployeeOut>(`/employees/${cData.employee_id}`).then((res) => {
              setEmployee(res.data);
            })
          );
        }
        if (cData.business_id) {
          promises.push(
            apiClient.get<BusinessProfile>(`/businesses/${cData.business_id}`).then((res) => {
              setBusiness(res.data);
            })
          );
        }

        await Promise.allSettled(promises);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || "Failed to load salary certificate.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [certId]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-medium">Loading salary certificate document...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !certificate) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto p-6 bg-white rounded-2xl border border-red-200 mt-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Certificate Not Found</h2>
          <p className="text-xs text-slate-500">{error || "Unable to display salary certificate."}</p>
          <button
            onClick={() => router.push("/hr-payroll/salary-certificates")}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
          >
            Back to Salary Certificates
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
          href="/hr-payroll/salary-certificates"
          className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs transition border border-slate-200 flex items-center gap-1.5 shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to List
        </Link>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition shadow-sm flex items-center gap-2"
        >
          <Printer className="w-4 h-4" /> Print Certificate
        </button>
      </div>

      {/* Printable Sheet */}
      <div
        id="printableArea"
        className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-slate-800 space-y-6 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-full font-serif"
      >
        {/* Company Header */}
        <div className="flex items-center justify-between border-b border-slate-300 pb-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              {business?.name_en || "Company Name"}
            </h1>
            {business?.company_tagline && (
              <p className="text-xs text-slate-500 italic">{business.company_tagline}</p>
            )}
            <p className="text-[11px] text-slate-500">
              {business?.address_en || business?.street || "Corporate Office, Bangladesh"}
            </p>
            {(business?.cr_number || business?.vat_number) && (
              <p className="text-[10px] text-slate-500">
                {business.cr_number && `CR No: ${business.cr_number}`}
                {business.cr_number && business.vat_number && " | "}
                {business.vat_number && `VAT Reg: ${business.vat_number}`}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="px-3 py-1 bg-slate-100 text-slate-800 font-bold text-xs rounded uppercase font-sans tracking-widest border border-slate-200">
              Official Record
            </div>
          </div>
        </div>

        {/* Certificate Title */}
        <div className="text-center space-y-1 py-1">
          <h2 className="text-xl font-bold text-slate-900 tracking-wide uppercase underline">
            Salary Certificate
          </h2>
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-widest font-sans">
            To Whom It May Concern
          </h3>
        </div>

        {/* Date & Ref */}
        <div className="flex items-center justify-between text-xs text-slate-700 font-sans font-medium pt-1">
          <div>
            <strong>Date:</strong> {certificate.issue_date}
          </div>
          <div>
            <strong>Ref No:</strong> {certificate.certificate_no}
          </div>
        </div>

        {certificate.addressed_to && (
          <div className="text-xs text-slate-700 font-sans">
            <span className="font-bold">Addressed To:</span> {certificate.addressed_to}
          </div>
        )}

        {/* Formal Legal Certification Narrative */}
        <div className="text-xs leading-relaxed text-slate-800 space-y-3 font-sans">
          <p>
            This is to certify that <strong>{employee?.full_name || "Employee"}</strong> (Employee ID:{" "}
            <strong>{employee?.employee_id || "—"}</strong>) is a permanent employee of{" "}
            <strong>{business?.name_en || "our organization"}</strong>, currently serving as{" "}
            <strong>{employee?.job_title?.name || "Designation"}</strong> in the{" "}
            <strong>{employee?.department?.name || "assigned"}</strong> department.
          </p>
          <p>
            During the income year <strong>{certificate.fiscal_year}</strong>
            {certificate.assessment_year && (
              <>
                {" "}
                (Assessment Year: <strong>{certificate.assessment_year}</strong>)
              </>
            )}
            , the employee was disbursed a gross monthly compensation of{" "}
            <strong>
              BDT{" "}
              {Number(certificate.gross_salary).toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </strong>{" "}
            and a net monthly take-home salary of{" "}
            <strong>
              BDT{" "}
              {Number(certificate.net_salary).toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </strong>
            .
          </p>
        </div>

        {/* Particulars Table */}
        {certificate.include_breakdown && (
          <div className="border border-slate-800 rounded-none overflow-hidden my-4">
            <table className="w-full text-xs text-left border-collapse font-sans">
              <thead className="bg-slate-100 border-b border-slate-800 text-slate-900 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2.5 border-r border-slate-800">Salary Component</th>
                  <th className="p-2.5 text-right">Certified Monthly Amount (BDT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                <tr>
                  <td className="p-2.5 border-r border-slate-800 font-medium">Basic Salary</td>
                  <td className="p-2.5 text-right font-semibold">
                    {Number(certificate.basic_salary).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                {Number(certificate.house_rent || 0) > 0 && (
                  <tr>
                    <td className="p-2.5 border-r border-slate-800 font-medium">House Rent Allowance</td>
                    <td className="p-2.5 text-right font-semibold">
                      {Number(certificate.house_rent).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
                {Number(certificate.medical_allowance || 0) > 0 && (
                  <tr>
                    <td className="p-2.5 border-r border-slate-800 font-medium">Medical Allowance</td>
                    <td className="p-2.5 text-right font-semibold">
                      {Number(certificate.medical_allowance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
                {Number(certificate.conveyance || 0) > 0 && (
                  <tr>
                    <td className="p-2.5 border-r border-slate-800 font-medium">Conveyance Allowance</td>
                    <td className="p-2.5 text-right font-semibold">
                      {Number(certificate.conveyance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
                {Number(certificate.others_allowance || 0) > 0 && (
                  <tr>
                    <td className="p-2.5 border-r border-slate-800 font-medium">Other Special Allowances</td>
                    <td className="p-2.5 text-right font-semibold">
                      {Number(certificate.others_allowance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
                <tr className="bg-slate-50 font-bold border-t border-slate-800">
                  <td className="p-2.5 border-r border-slate-800">Gross Monthly Remuneration</td>
                  <td className="p-2.5 text-right text-indigo-900">
                    {Number(certificate.gross_salary).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                {Number(certificate.tax_deducted || 0) > 0 && (
                  <tr>
                    <td className="p-2.5 border-r border-slate-800 font-medium text-rose-700">
                      Applicable Monthly Tax Deducted at Source (TDS)
                    </td>
                    <td className="p-2.5 text-right text-rose-700 font-semibold">
                      {Number(certificate.tax_deducted).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
                <tr className="bg-slate-100 font-bold border-t border-slate-800 text-emerald-900">
                  <td className="p-2.5 border-r border-slate-800">Net Monthly Remuneration</td>
                  <td className="p-2.5 text-right">
                    {Number(certificate.net_salary).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="text-xs text-slate-700 leading-relaxed font-sans">
          This certificate is issued at the specific request of the employee for the purpose of{" "}
          <strong className="capitalize">{certificate.purpose?.replace("_", " ")}</strong> without any
          financial liability on part of the issuing company or any of its officers.
        </div>

        {/* Official Seal and Signatures */}
        <div className="pt-16 grid grid-cols-2 gap-8 text-xs font-sans">
          <div>
            <div className="w-24 h-24 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-[10px] text-slate-400 uppercase tracking-widest text-center p-2">
              Official Company Seal
            </div>
          </div>
          <div className="text-right flex flex-col items-end justify-end">
            <div className="border-b border-slate-400 w-52 pb-1"></div>
            <div className="font-bold text-slate-900 mt-2">Authorized Signatory</div>
            <div className="text-slate-500 text-[11px]">Human Resources & Payroll Administration</div>
            <div className="text-slate-500 text-[11px]">{business?.name_en}</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
