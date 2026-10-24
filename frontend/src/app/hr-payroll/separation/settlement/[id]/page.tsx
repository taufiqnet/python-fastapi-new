"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { FinalSettlement, BusinessProfile } from "@/types";
import { Printer, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function PrintableSettlementStatementPage() {
  const params = useParams();
  const router = useRouter();
  const settlementId = params?.id as string;

  const [settlement, setSettlement] = useState<FinalSettlement | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!settlementId) return;
      setLoading(true);
      setError(null);

      try {
        const res = await apiClient.get<FinalSettlement>(`/separation/settlements/${settlementId}`);
        const sData = (res as any)?.data || res;
        setSettlement(sData);

        if (sData.business_id) {
          try {
            const bRes = await apiClient.get<BusinessProfile>(`/businesses/${sData.business_id}`);
            setBusiness((bRes as any)?.data || bRes);
          } catch {
            // ignore
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load settlement statement.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [settlementId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Generating Full & Final Settlement Statement...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !settlement) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto my-12 p-6 bg-card border rounded-xl shadow-sm text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold">Settlement Record Not Found</h2>
          <p className="text-muted-foreground text-sm">{error || "Unable to display statement."}</p>
          <button
            onClick={() => router.push("/hr-payroll/separation")}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Separation Desk
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const s = settlement;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Navigation & Print Actions (Hidden when printing) */}
        <div className="flex items-center justify-between print:hidden">
          <Link
            href="/hr-payroll/separation"
            className="text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-2 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Offboarding
          </Link>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 shadow-sm transition inline-flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </button>
        </div>

        {/* Formal Settlement Statement Sheet */}
        <div className="bg-card border rounded-2xl shadow-lg p-8 sm:p-12 print:border-none print:shadow-none print:p-0 space-y-8 font-sans text-foreground">
          {/* Company Header */}
          <div className="border-b pb-6 flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">
                {business?.name_en || "ONODA ENTERPRISES LTD."}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {business?.address_en || "Corporate Headquarters, Dhaka, Bangladesh"}
              </p>
              <p className="text-xs text-muted-foreground">
                Phone: {business?.phone || "+880 2-9888888"} • Email: {business?.email || "hr@onoda.com.bd"}
              </p>
            </div>

            <div className="text-right space-y-1">
              <span className="inline-block px-3 py-1 text-xs font-bold uppercase rounded bg-primary/10 text-primary">
                Full & Final Settlement
              </span>
              <p className="text-xs font-mono font-bold text-foreground">
                Statement #: {s.settlement_number}
              </p>
              <p className="text-xs text-muted-foreground">
                Date: {s.settlement_date}
              </p>
            </div>
          </div>

          {/* Employee Demographic Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/30 border text-xs">
            <div>
              <span className="text-muted-foreground block font-medium">Employee Name:</span>
              <span className="font-bold text-sm text-foreground">
                {s.employee?.first_name} {s.employee?.last_name || ""}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block font-medium">Employee ID:</span>
              <span className="font-mono font-bold text-foreground">{s.employee?.employee_id}</span>
            </div>
            <div>
              <span className="text-muted-foreground block font-medium">Designation:</span>
              <span className="font-semibold text-foreground">{s.employee?.designation || "Staff"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block font-medium">Department:</span>
              <span className="font-semibold text-foreground">{s.employee?.department || "General"}</span>
            </div>
          </div>

          {/* Settlement Tables: Payables vs Deductions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payables (Gross Entitlements) */}
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2.5 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  A. Payables & Statutory Entitlements
                </h4>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y">
                  <tr className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-muted-foreground">
                      Pro-rated Unpaid Salary ({s.unpaid_salary_days} days)
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium">
                      ৳{Number(s.unpaid_salary_amount).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-muted-foreground">
                      Earned Leave Encashment (BLA Sec 117) ({s.leave_encashment_days}d)
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium">
                      ৳{Number(s.leave_encashment_amount).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-muted-foreground">
                      Gratuity (BLA Sec 2(10)/27) ({s.gratuity_years} yrs)
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium">
                      ৳{Number(s.gratuity_amount).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-muted-foreground">
                      Provident Fund Balance & Interest
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium">
                      ৳{Number(s.provident_fund_amount).toFixed(2)}
                    </td>
                  </tr>
                  {Number(s.severance_pay_amount) > 0 && (
                    <tr className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 text-muted-foreground">
                        Statutory Retrenchment / Severance Pay
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium">
                        ৳{Number(s.severance_pay_amount).toFixed(2)}
                      </td>
                    </tr>
                  )}
                  {Number(s.bonus_arrears_amount) > 0 && (
                    <tr className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 text-muted-foreground">Bonus Arrears</td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium">
                        ৳{Number(s.bonus_arrears_amount).toFixed(2)}
                      </td>
                    </tr>
                  )}
                  {Number(s.other_payable_amount) > 0 && (
                    <tr className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 text-muted-foreground">Other Payables / Claims</td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium">
                        ৳{Number(s.other_payable_amount).toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-muted/40 border-t font-bold">
                  <tr>
                    <td className="px-4 py-2.5">Total Entitlements (A)</td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-600">
                      ৳{Number(s.total_payable_amount).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Deductions & Recoveries */}
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2.5 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  B. Deductions & Recoveries
                </h4>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y">
                  <tr className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-muted-foreground">
                      Notice Shortfall Recovery ({s.notice_shortfall_days} days)
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium">
                      ৳{Number(s.notice_shortfall_deduction).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-muted-foreground">
                      Outstanding Loan / Advance Balance
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium">
                      ৳{Number(s.loan_advance_deduction).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-muted-foreground">
                      Asset Damage / Replacement Charge
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium">
                      ৳{Number(s.asset_damage_deduction).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-muted-foreground">
                      Department Clearance Liabilities
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium">
                      ৳{Number(s.clearance_charge_deduction).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-muted-foreground">
                      Tax (AIT) Withholding
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium">
                      ৳{Number(s.tax_withholding_deduction).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-muted/40 border-t font-bold">
                  <tr>
                    <td className="px-4 py-2.5">Total Deductions (B)</td>
                    <td className="px-4 py-2.5 text-right font-mono text-rose-600">
                      ৳{Number(s.total_deduction_amount).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Net Remuneration Box */}
          <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Net Full & Final Payable (A - B)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Disbursement Mode: <span className="font-semibold capitalize text-foreground">{s.payment_method.replace("_", " ")}</span>
                {s.payment_reference && <span> • Ref: <span className="font-mono">{s.payment_reference}</span></span>}
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black font-mono text-primary">
                BDT ৳{Number(s.net_payable_amount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Legal Undertaking & Employee Acknowledgment */}
          <div className="border rounded-xl p-4 bg-muted/10 text-xs text-muted-foreground space-y-2 leading-relaxed">
            <p className="font-semibold text-foreground">Employee Undertaking & Settlement Acknowledgment:</p>
            <p>
              I hereby acknowledge receipt of BDT ৳{Number(s.net_payable_amount).toLocaleString("en-BD", { minimumFractionDigits: 2 })} in full and final settlement of all my salaries, allowances, leave encashment, statutory gratuity, and dues arising out of my employment with the organization. I confirm that I have returned all company property, confidential materials, and physical assets, and have no further financial or legal claims whatsoever against the company.
            </p>
          </div>

          {/* Signatures */}
          <div className="pt-16 grid grid-cols-3 gap-8 text-center text-xs">
            <div className="border-t pt-2">
              <p className="font-semibold text-foreground">Prepared By (HR & Payroll)</p>
              <p className="text-muted-foreground text-[11px] mt-0.5">Checked & Calculated</p>
            </div>

            <div className="border-t pt-2">
              <p className="font-semibold text-foreground">Approved By (Finance / MD)</p>
              <p className="text-muted-foreground text-[11px] mt-0.5">Authorized Signatory</p>
            </div>

            <div className="border-t pt-2">
              <p className="font-semibold text-foreground">Employee Signature & Date</p>
              <p className="text-muted-foreground text-[11px] mt-0.5">Received in Full Settlement</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
