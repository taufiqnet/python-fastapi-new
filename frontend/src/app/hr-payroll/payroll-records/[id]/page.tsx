"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import {
  PayrollRecordOut,
  BusinessProfile,
  EmployeeOut,
  PayrollPeriodOut,
} from "@/types";
import { Printer, ArrowLeft, Loader2, AlertCircle } from "lucide-react";

export default function PrintablePayslipPage() {
  const params = useParams();
  const router = useRouter();
  const recordId = params?.id as string;

  const [record, setRecord] = useState<PayrollRecordOut | null>(null);
  const [employee, setEmployee] = useState<EmployeeOut | null>(null);
  const [period, setPeriod] = useState<PayrollPeriodOut | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!recordId) return;
      setLoading(true);
      setError(null);

      try {
        const res = await apiClient.get<PayrollRecordOut>(`/payroll/records/${recordId}`);
        const rData = res.data;
        setRecord(rData);

        const promises: Promise<unknown>[] = [];

        if (rData.employee_id) {
          promises.push(
            apiClient.get<EmployeeOut>(`/employees/${rData.employee_id}`).then((res) => {
              setEmployee(res.data);
            })
          );
        }
        if (rData.period_id) {
          promises.push(
            apiClient.get<PayrollPeriodOut>(`/payroll/periods/${rData.period_id}`).then((res) => {
              setPeriod(res.data);
            })
          );
        }
        if (rData.business_id) {
          promises.push(
            apiClient.get<BusinessProfile>(`/businesses/${rData.business_id}`).then((res) => {
              setBusiness(res.data);
            })
          );
        }

        await Promise.allSettled(promises);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || "Failed to load payslip record.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [recordId]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-medium">Loading salary payslip document...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !record) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto p-6 bg-white rounded-2xl border border-red-200 mt-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Payslip Not Found</h2>
          <p className="text-xs text-slate-500">{error || "Unable to display salary payslip."}</p>
          <button
            onClick={() => router.push("/hr-payroll/payroll-records")}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
          >
            Back to Payslips
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
          href="/hr-payroll/payroll-records"
          className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs transition border border-slate-200 flex items-center gap-1.5 shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Payslips
        </Link>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition shadow-sm flex items-center gap-2"
        >
          <Printer className="w-4 h-4" /> Print Payslip
        </button>
      </div>

      {/* Printable Sheet */}
      <div
        id="printableArea"
        className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-slate-800 space-y-6 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-full"
      >
        {/* Header */}
        <div className="text-center space-y-1 border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {business?.name_en || "Company Name"}
          </h1>
          <h2 className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
            Official Salary Payslip Statement
          </h2>
          <p className="text-xs font-semibold text-slate-600">
            Payroll Period: {period?.name || "Period"}
          </p>
        </div>

        {/* Date & Ref */}
        <div className="flex items-center justify-between text-xs text-slate-600 font-medium pt-1">
          <div>
            <strong>Disbursement Date:</strong>{" "}
            {record.paid_at
              ? record.paid_at.split("T")[0]
              : period?.end_date || "N/A"}
          </div>
          <div>
            <strong>Ref:</strong> PAY-{record.id.slice(0, 8).toUpperCase()}
          </div>
        </div>

        {/* Employee Info Grid */}
        <div className="p-4 bg-slate-50/75 rounded-xl border border-slate-200 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600 w-28">Employee ID:</span>
              <span className="font-mono font-bold text-slate-900">
                {employee?.employee_id || record.employee_code || "—"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600 w-28">Employee Name:</span>
              <span className="font-bold text-slate-900">
                {employee?.full_name || record.employee_name || "Employee"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600 w-28">Designation:</span>
              <span className="text-slate-800">{employee?.job_title?.name || "N/A"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600 w-28">Department:</span>
              <span className="text-slate-800">{employee?.department?.name || "N/A"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600 w-28">TIN:</span>
              <span className="text-slate-800 font-mono">{employee?.tin || "N/A"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600 w-28">Status:</span>
              <span
                className={`font-bold uppercase ${
                  record.is_paid ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {record.is_paid ? "PAID" : "PENDING DISBURSEMENT"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600 w-28">Payment Method:</span>
              <span className="text-slate-800 capitalize">
                {record.payment_method?.replace("_", " ") || "Bank Transfer"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600 w-28">Account / MFS:</span>
              <span className="text-slate-800 font-mono">
                {record.bank_account || employee?.bank_account_no || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
          <div className="bg-slate-50 px-4 py-2 font-bold text-slate-700 uppercase tracking-wider text-[11px] border-b border-slate-200">
            Attendance Record Summary
          </div>
          <div className="p-3 grid grid-cols-3 md:grid-cols-6 gap-2 text-center">
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Working Days</div>
              <div className="font-bold text-slate-800">{record.working_days}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Present Days</div>
              <div className="font-bold text-emerald-600">{record.present_days}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Absent Days</div>
              <div className="font-bold text-rose-600">{record.absent_days}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Leave Days</div>
              <div className="font-bold text-slate-800">{record.leave_days}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Holidays</div>
              <div className="font-bold text-slate-800">{record.holiday_days}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">OT Hours</div>
              <div className="font-bold text-slate-800">{record.overtime_hours}</div>
            </div>
          </div>
        </div>

        {/* Earnings & Deductions Breakdown Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Earnings Column */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 font-bold text-slate-700 uppercase tracking-wider text-[11px] border-b border-slate-200 flex justify-between">
              <span>Earnings</span>
              <span>Amount (৳)</span>
            </div>
            <div className="divide-y divide-slate-100 p-2">
              <div className="flex justify-between py-1.5 px-2">
                <span className="text-slate-600">Basic Salary</span>
                <span className="font-semibold text-slate-900">
                  {Number(record.basic_salary).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1.5 px-2">
                <span className="text-slate-600">House Rent</span>
                <span className="font-semibold text-slate-900">
                  {Number(record.house_rent).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1.5 px-2">
                <span className="text-slate-600">Transport Allowance</span>
                <span className="font-semibold text-slate-900">
                  {Number(record.transport_allowance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1.5 px-2">
                <span className="text-slate-600">Medical Allowance</span>
                <span className="font-semibold text-slate-900">
                  {Number(record.medical_allowance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1.5 px-2">
                <span className="text-slate-600">Food Allowance</span>
                <span className="font-semibold text-slate-900">
                  {Number(record.food_allowance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1.5 px-2">
                <span className="text-slate-600">Other Allowances</span>
                <span className="font-semibold text-slate-900">
                  {Number(record.other_allowance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1.5 px-2">
                <span className="text-slate-600">Overtime Pay</span>
                <span className="font-semibold text-slate-900">
                  {Number(record.overtime_pay).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1.5 px-2">
                <span className="text-slate-600">Bonus / Incentives</span>
                <span className="font-semibold text-slate-900">
                  {Number(record.bonus).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-2 px-2 bg-slate-50 font-bold border-t border-slate-200 text-indigo-700">
                <span>Total Gross Earnings</span>
                <span>
                  ৳{Number(record.gross_salary).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Deductions Column */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 font-bold text-slate-700 uppercase tracking-wider text-[11px] border-b border-slate-200 flex justify-between">
              <span>Deductions</span>
              <span>Amount (৳)</span>
            </div>
            <div className="divide-y divide-slate-100 p-2">
              <div className="flex justify-between py-1.5 px-2">
                <span className="text-slate-600">Tax Withholding</span>
                <span className="font-semibold text-rose-600">
                  {Number(record.tax).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1.5 px-2">
                <span className="text-slate-600">Provident Fund Contribution</span>
                <span className="font-semibold text-rose-600">
                  {Number(record.provident_fund || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1.5 px-2">
                <span className="text-slate-600">Unpaid Leave Deduction</span>
                <span className="font-semibold text-rose-600">
                  {Number(record.unpaid_leave_deduction || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1.5 px-2">
                <span className="text-slate-600">Loan / Advance Installment</span>
                <span className="font-semibold text-rose-600">
                  {Number(record.loan_installment || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1.5 px-2">
                <span className="text-slate-600">Other Deductions</span>
                <span className="font-semibold text-rose-600">
                  {Number(record.other_deduction || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-2 px-2 bg-slate-50 font-bold border-t border-slate-200 text-rose-700">
                <span>Total Deductions</span>
                <span>
                  ৳{Number(record.total_deduction).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Salary Highlight Box */}
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between text-xs">
          <div>
            <div className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
              Net Disbursable Remuneration
            </div>
            <div className="text-[11px] text-emerald-700 mt-0.5">
              Net Amount = Total Gross Earnings − Total Deductions
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-800">
            ৳{Number(record.net_salary).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Signatures */}
        <div className="pt-12 grid grid-cols-2 gap-8 text-xs">
          <div>
            <div className="border-b border-slate-400 w-44 pb-1"></div>
            <div className="font-bold text-slate-900 mt-2">Head of Payroll & Finance</div>
            <div className="text-slate-500 text-[11px]">{business?.name_en || "Accounts Department"}</div>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="border-b border-slate-400 w-44 pb-1"></div>
            <div className="font-bold text-slate-900 mt-2">Employee Signature</div>
            <div className="text-slate-500 text-[11px]">
              {employee?.full_name || record.employee_name || "Employee"} — Date: ____________
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
