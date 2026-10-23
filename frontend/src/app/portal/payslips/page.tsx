"use client";

import React, { useEffect, useState, useTransition } from "react";
import { apiClient } from "@/lib/api-client";
import { TaxCardSummary } from "@/types";
import { useToast } from "@/context/toast-context";
import {
  CreditCard,
  Download,
  Eye,
  FileSpreadsheet,
  Receipt,
  ShieldCheck,
  Calendar,
  X,
  Printer,
  Sparkles,
  Loader2,
  DollarSign,
} from "lucide-react";

interface PayslipRow {
  id: string;
  period_id: string;
  period_name: string;
  working_days: number;
  present_days: number;
  absent_days: number;
  leave_days: number;
  basic_salary: number;
  house_rent: number;
  transport_allowance: number;
  medical_allowance: number;
  food_allowance: number;
  other_allowance: number;
  bonus: number;
  gross_salary: number;
  tax: number;
  net_salary: number;
  payment_status: string;
  created_at: string;
}

export default function PortalPayslipsPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"payslips" | "tax_card">("payslips");
  const [payslips, setPayslips] = useState<PayslipRow[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipRow | null>(null);
  const [taxCard, setTaxCard] = useState<TaxCardSummary | null>(null);
  const [fiscalYear, setFiscalYear] = useState<string>("2024-2025");
  const [loading, setLoading] = useState(true);

  const loadPayslips = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<PayslipRow[]>("/portal/payslips");
      setPayslips(res.data || []);
    } catch {
      toast.error("Failed", "Unable to load payslips.");
    } finally {
      setLoading(false);
    }
  };

  const loadTaxCard = async (year: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get<TaxCardSummary>(`/portal/tax-card?fiscal_year=${year}`);
      setTaxCard(res.data);
    } catch {
      toast.error("Failed", "Unable to load Tax Card.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "payslips") {
      loadPayslips();
    } else {
      loadTaxCard(fiscalYear);
    }
  }, [activeTab, fiscalYear]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher & Year Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("payslips")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "payslips"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Monthly Payslips Archive
          </button>
          <button
            onClick={() => setActiveTab("tax_card")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "tax_card"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Annual Tax Card (ITA 2023)
          </button>
        </div>

        {activeTab === "tax_card" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Fiscal Year:</span>
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="2024-2025">2024-2025 (Current)</option>
              <option value="2023-2024">2023-2024</option>
              <option value="2022-2023">2022-2023</option>
            </select>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs text-slate-500">Retrieving earnings & tax records...</p>
        </div>
      ) : activeTab === "payslips" ? (
        /* ================= PAYSLIPS ARCHIVE TABLE ================= */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Historical Salary Records</h3>
              <p className="text-xs text-slate-500">Official monthly payslip disbursements</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {payslips.length} Records
            </span>
          </div>

          {payslips.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No payroll payslips generated yet for your account.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Gross Salary</th>
                    <th className="py-3 px-4">Tax Withheld (TDS)</th>
                    <th className="py-3 px-4">Net Payout</th>
                    <th className="py-3 px-4">Disbursement Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payslips.map((p) => (
                    <tr key={p.id} className="hover:bg-indigo-50/30 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {p.period_name}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                        ৳{p.gross_salary.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-rose-600">
                        ৳{p.tax.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                        ৳{p.net_salary.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {p.payment_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedPayslip(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-600 text-xs font-semibold transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Breakdown</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : taxCard ? (
        /* ================= ANNUAL TAX CARD (ITA 2023) ================= */
        <div className="space-y-6">
          {/* Tax KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Gross Income</span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                ৳{taxCard.total_gross_income.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">Total fiscal year earnings</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Statutory Exemptions</span>
              <span className="text-xl font-bold font-mono text-emerald-600 mt-1 block">
                ৳{taxCard.total_tax_exempted.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">House, Medical, Conveyance</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Taxable Income</span>
              <span className="text-xl font-bold font-mono text-indigo-600 mt-1 block">
                ৳{taxCard.taxable_income.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">Assessable base</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total TDS Withheld</span>
              <span className="text-xl font-bold font-mono text-rose-600 mt-1 block">
                ৳{taxCard.total_tax_withheld.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">Deducted at source</span>
            </div>
          </div>

          {/* Tax Breakdown Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <span>Annual Tax Card & TDS Withholding Statement</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Compliant with Bangladesh Income Tax Act (ITA 2023) Section 50 salary withholding rules
                </p>
              </div>

              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print Tax Certificate</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Month</th>
                    <th className="py-3 px-3">Basic Salary</th>
                    <th className="py-3 px-3">House Rent</th>
                    <th className="py-3 px-3">Medical</th>
                    <th className="py-3 px-3">Conveyance</th>
                    <th className="py-3 px-3">Gross Salary</th>
                    <th className="py-3 px-3 font-bold text-rose-600">TDS Deducted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {taxCard.monthly_breakdown.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">{r.month_name}</td>
                      <td className="py-2.5 px-3">৳{r.basic_salary.toLocaleString()}</td>
                      <td className="py-2.5 px-3">৳{r.house_rent.toLocaleString()}</td>
                      <td className="py-2.5 px-3">৳{r.medical_allowance.toLocaleString()}</td>
                      <td className="py-2.5 px-3">৳{r.conveyance.toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">৳{r.gross_salary.toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-bold text-rose-600">৳{r.tax_deducted.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50/80 font-bold border-t-2 border-slate-200">
                    <td className="py-3 px-3 font-sans text-slate-900">Total Year</td>
                    <td className="py-3 px-3">৳{taxCard.total_basic.toLocaleString()}</td>
                    <td className="py-3 px-3">৳{taxCard.total_house_rent.toLocaleString()}</td>
                    <td className="py-3 px-3">৳{taxCard.total_medical.toLocaleString()}</td>
                    <td className="py-3 px-3">৳{taxCard.total_conveyance.toLocaleString()}</td>
                    <td className="py-3 px-3 text-indigo-700">৳{taxCard.total_gross_income.toLocaleString()}</td>
                    <td className="py-3 px-3 text-rose-700">৳{taxCard.total_tax_withheld.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* Payslip Detail Drawer / Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Payslip Breakdown — {selectedPayslip.period_name}
                </h3>
                <p className="text-xs text-slate-500">Official salary specification</p>
              </div>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 text-xs">
              {/* Earnings column */}
              <div className="space-y-3">
                <h4 className="font-bold text-emerald-700 uppercase tracking-wider text-[11px] pb-1 border-b border-emerald-100">
                  Earnings Breakdown
                </h4>
                <div className="space-y-1.5 font-mono text-slate-700">
                  <div className="flex justify-between">
                    <span>Basic Salary:</span>
                    <span>৳{selectedPayslip.basic_salary.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>House Rent:</span>
                    <span>৳{selectedPayslip.house_rent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Medical Allowance:</span>
                    <span>৳{selectedPayslip.medical_allowance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Conveyance:</span>
                    <span>৳{selectedPayslip.transport_allowance.toLocaleString()}</span>
                  </div>
                  {selectedPayslip.bonus > 0 && (
                    <div className="flex justify-between text-indigo-600 font-bold">
                      <span>Festival Bonus:</span>
                      <span>৳{selectedPayslip.bonus.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                    <span>Gross Earnings:</span>
                    <span>৳{selectedPayslip.gross_salary.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Deductions column */}
              <div className="space-y-3">
                <h4 className="font-bold text-rose-700 uppercase tracking-wider text-[11px] pb-1 border-b border-rose-100">
                  Deductions Breakdown
                </h4>
                <div className="space-y-1.5 font-mono text-slate-700">
                  <div className="flex justify-between text-rose-600">
                    <span>Income Tax (TDS):</span>
                    <span>৳{selectedPayslip.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unpaid Leave / Other:</span>
                    <span>৳{(selectedPayslip.gross_salary - selectedPayslip.tax - selectedPayslip.net_salary).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-rose-700">
                    <span>Total Deductions:</span>
                    <span>৳{(selectedPayslip.gross_salary - selectedPayslip.net_salary).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Payout Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-emerald-100 block">
                  Net Disbursed Take-Home
                </span>
                <span className="text-2xl font-black font-mono">
                  ৳{selectedPayslip.net_salary.toLocaleString()}
                </span>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 uppercase tracking-wider">
                {selectedPayslip.payment_status}
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print Payslip</span>
              </button>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
