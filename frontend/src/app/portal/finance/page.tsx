"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { EmployeeLoan, ExpenseClaim } from "@/types";
import { useToast } from "@/context/toast-context";
import {
  Wallet,
  Receipt,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  Loader2,
  DollarSign,
  FileSpreadsheet,
} from "lucide-react";

export default function PortalFinancePage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"loans" | "expenses">("loans");
  const [loans, setLoans] = useState<EmployeeLoan[]>([]);
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);

  // Loan Modal
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [loanType, setLoanType] = useState<"salary_advance" | "personal_loan" | "emergency_loan">("salary_advance");
  const [principal, setPrincipal] = useState("");
  const [installments, setInstallments] = useState("1");
  const [loanReason, setLoanReason] = useState("");
  const [isSubmittingLoan, setIsSubmittingLoan] = useState(false);

  // Expense Claim Modal
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimTitle, setClaimTitle] = useState("");
  const [claimDate, setClaimDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<
    Array<{ expense_date: string; category: any; amount: string; description: string; receipt_url: string }>
  >([
    {
      expense_date: new Date().toISOString().slice(0, 10),
      category: "travel",
      amount: "",
      description: "",
      receipt_url: "",
    },
  ]);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [lRes, cRes] = await Promise.allSettled([
        apiClient.get<EmployeeLoan[]>("/portal/loans"),
        apiClient.get<ExpenseClaim[]>("/portal/expense-claims"),
      ]);
      if (lRes.status === "fulfilled") setLoans(lRes.value.data || []);
      if (cRes.status === "fulfilled") setClaims(cRes.value.data || []);
    } catch {
      toast.error("Failed", "Unable to load financial records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplyLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!principal || Number(principal) <= 0) {
      toast.error("Validation Error", "Please provide a valid loan amount.");
      return;
    }
    setIsSubmittingLoan(true);
    try {
      await apiClient.post("/portal/loans", {
        loan_type: loanType,
        principal_amount: Number(principal),
        total_installments: Number(installments),
        reason: loanReason,
      });
      toast.success("Application Submitted", "Your loan request was sent for approval.");
      setIsLoanModalOpen(false);
      setPrincipal("");
      setLoanReason("");
      loadData();
    } catch (err: any) {
      toast.error("Failed", err.response?.data?.detail || "Could not apply for loan.");
    } finally {
      setIsSubmittingLoan(false);
    }
  };

  const handleAddClaimItem = () => {
    setItems((prev) => [
      ...prev,
      {
        expense_date: new Date().toISOString().slice(0, 10),
        category: "travel",
        amount: "",
        description: "",
        receipt_url: "",
      },
    ]);
  };

  const handleRemoveClaimItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimTitle) {
      toast.error("Validation Error", "Please enter a claim title.");
      return;
    }
    const validItems = items.filter((it) => Number(it.amount) > 0 && it.description);
    if (validItems.length === 0) {
      toast.error("Validation Error", "Please add at least one line item with amount and description.");
      return;
    }

    setIsSubmittingClaim(true);
    try {
      await apiClient.post("/portal/expense-claims", {
        title: claimTitle,
        claim_date: claimDate,
        items: validItems.map((it) => ({
          expense_date: it.expense_date,
          category: it.category,
          amount: Number(it.amount),
          description: it.description,
          receipt_url: it.receipt_url || null,
        })),
      });
      toast.success("Claim Submitted", "Expense reimbursement submitted successfully.");
      setIsClaimModalOpen(false);
      setClaimTitle("");
      setItems([
        {
          expense_date: new Date().toISOString().slice(0, 10),
          category: "travel",
          amount: "",
          description: "",
          receipt_url: "",
        },
      ]);
      loadData();
    } catch (err: any) {
      toast.error("Failed", err.response?.data?.detail || "Could not submit claim.");
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("loans")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "loans"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Salary Advances & Loans
          </button>
          <button
            onClick={() => setActiveTab("expenses")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "expenses"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Expense Claims & Receipts
          </button>
        </div>

        <div>
          {activeTab === "loans" ? (
            <button
              onClick={() => setIsLoanModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Apply for Advance/Loan</span>
            </button>
          ) : (
            <button
              onClick={() => setIsClaimModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Expense Claim</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs text-slate-500">Loading your financial records...</p>
        </div>
      ) : activeTab === "loans" ? (
        /* ================= LOANS TABLE ================= */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Loan & Advance Applications</h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {loans.length} Records
            </span>
          </div>

          {loans.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No loan or advance applications filed.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Principal Amount</th>
                    <th className="py-3 px-4">Monthly Installment</th>
                    <th className="py-3 px-4">Remaining Balance</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loans.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 capitalize font-semibold text-slate-800">
                        {l.loan_type.replace("_", " ")}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                        ৳{l.principal_amount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        ৳{l.monthly_installment_amount.toLocaleString()} ({l.total_installments} mos)
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-rose-600">
                        ৳{l.remaining_balance.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            l.status === "disbursed"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : l.status === "approved"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : l.status === "rejected"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 italic max-w-xs truncate">
                        {l.notes || l.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ================= EXPENSE CLAIMS TABLE ================= */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Expense Reimbursement Claims</h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {claims.length} Claims
            </span>
          </div>

          {claims.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No expense reimbursement claims submitted.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Claim #</th>
                    <th className="py-3 px-4">Title & Date</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Items Count</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Disbursement Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {claims.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                        {c.claim_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">{c.title}</span>
                        <span className="text-slate-400 text-[10px] font-mono">{c.claim_date}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        ৳{c.total_amount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {c.items ? c.items.length : 0} items
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            c.status === "reimbursed"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : c.status === "approved"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : c.status === "rejected"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {c.payment_reference || "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Loan Application Modal */}
      {isLoanModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Apply for Advance / Loan</h3>
              <button onClick={() => setIsLoanModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLoan} className="space-y-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Loan Type</label>
                <select
                  value={loanType}
                  onChange={(e: any) => setLoanType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="salary_advance">Salary Advance (1-3 months)</option>
                  <option value="personal_loan">Personal Loan (6-24 months)</option>
                  <option value="emergency_loan">Emergency Relief Loan</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Amount (BDT)</label>
                  <input
                    type="number"
                    required
                    min="1000"
                    placeholder="e.g. 25000"
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Installment Months</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="48"
                    value={installments}
                    onChange={(e) => setInstallments(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              {principal && Number(installments) > 0 && (
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-700 text-xs flex justify-between">
                  <span>Estimated Monthly Deduction:</span>
                  <span className="font-bold font-mono">
                    ৳{Math.round(Number(principal) / Number(installments)).toLocaleString()} / mo
                  </span>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Purpose & Reason</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why you require this advance..."
                  value={loanReason}
                  onChange={(e) => setLoanReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLoanModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLoan}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {isSubmittingLoan ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Claim Modal */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">New Expense Reimbursement Claim</h3>
                <p className="text-xs text-slate-500">Provide official receipts for verification</p>
              </div>
              <button onClick={() => setIsClaimModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitClaim} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Claim Title / Project</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chittagong Client Site Audit"
                    value={claimTitle}
                    onChange={(e) => setClaimTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Claim Date</label>
                  <input
                    type="date"
                    required
                    value={claimDate}
                    onChange={(e) => setClaimDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Expense Breakdown Items</span>
                  <button
                    type="button"
                    onClick={handleAddClaimItem}
                    className="text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 relative"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold block">Date</label>
                        <input
                          type="date"
                          value={it.expense_date}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItems((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, expense_date: val } : item))
                            );
                          }}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold block">Category</label>
                        <select
                          value={it.category}
                          onChange={(e: any) => {
                            const val = e.target.value;
                            setItems((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, category: val } : item))
                            );
                          }}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                        >
                          <option value="travel">Travel & Transport</option>
                          <option value="meals">Food & Meals</option>
                          <option value="hotel">Hotel / Lodging</option>
                          <option value="supplies">Office Supplies</option>
                          <option value="training">Training / Certification</option>
                          <option value="other">Other Expense</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold block">Amount (BDT)</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={it.amount}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItems((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, amount: val } : item))
                            );
                          }}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Description of purchase..."
                        value={it.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, description: val } : item))
                          );
                        }}
                        className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                      />
                      <input
                        type="url"
                        placeholder="Receipt attachment link (optional)..."
                        value={it.receipt_url}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, receipt_url: val } : item))
                          );
                        }}
                        className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveClaimItem(idx)}
                        className="text-rose-500 hover:text-rose-700 text-[10px] font-semibold flex items-center gap-1 mt-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove Item</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClaim}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {isSubmittingClaim ? "Submitting..." : "Submit Expense Claim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
