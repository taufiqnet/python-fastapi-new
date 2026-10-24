"use client";

import React, { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  Coins,
  TrendingUp,
  DollarSign,
  FileText,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import {
  EmployeeLoan,
  LoanRepaymentScheduleOut,
  EmployeeOut,
} from "@/types";

interface LoanManagementTabProps {
  currentBusinessId: number;
}

export function LoanManagementTab({ currentBusinessId }: LoanManagementTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Data states
  const [loans, setLoans] = useState<EmployeeLoan[]>([]);
  const [employees, setEmployees] = useState<EmployeeOut[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Selected Loan for EMI Repayment Schedule Drawer
  const [activeLoanForSchedule, setActiveLoanForSchedule] = useState<EmployeeLoan | null>(null);
  const [schedules, setSchedules] = useState<LoanRepaymentScheduleOut[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState<boolean>(false);

  // New Loan Modal
  const [isNewLoanOpen, setIsNewLoanOpen] = useState<boolean>(false);
  const [isSubmittingLoan, setIsSubmittingLoan] = useState<boolean>(false);
  const [newLoanData, setNewLoanData] = useState({
    employee_id: "",
    loan_type: "salary_advance" as "salary_advance" | "personal_loan" | "emergency_loan",
    principal_amount: 0,
    monthly_installment_amount: 0,
    total_installments: 1,
    repayment_start_date: new Date().toISOString().split("T")[0],
    reason: "",
    notes: "",
  });

  // Fetch loans
  const fetchLoans = useCallback(
    async (isBackground = false) => {
      if (isBackground) setIsFetching(true);
      else setInitialLoading(true);
      setError(null);

      try {
        const res = await apiClient.get<EmployeeLoan[]>("/portal/loans");
        setLoans(res.data || []);
      } catch (err) {
        console.error("Failed to load employee loans:", err);
        setError("Failed to load loan and advance portfolio.");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    []
  );

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await apiClient.get<EmployeeOut[]>(
        `/employees?business_id=${currentBusinessId}&limit=500`
      );
      setEmployees(res.data || []);
      if (res.data?.length && !newLoanData.employee_id) {
        setNewLoanData((prev) => ({ ...prev, employee_id: res.data[0].id }));
      }
    } catch (err) {
      console.error("Failed to load employees for loan management:", err);
    }
  }, [currentBusinessId]);

  useEffect(() => {
    fetchLoans(false);
  }, [fetchLoans]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Employee mapping
  const employeeMap = useMemo(() => {
    const map: Record<string, EmployeeOut> = {};
    employees.forEach((emp) => {
      map[emp.id] = emp;
    });
    return map;
  }, [employees]);

  // Fetch schedules for a specific loan
  const handleOpenSchedule = async (loan: EmployeeLoan) => {
    setActiveLoanForSchedule(loan);
    setLoadingSchedule(true);
    try {
      const res = await apiClient.get<LoanRepaymentScheduleOut[]>(
        `/payroll/loans/${loan.id}/schedules`
      );
      setSchedules(res.data || []);
    } catch (err) {
      toast.error("Failed to load EMI schedule", "Could not retrieve installments.");
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Update Installment status (Pause, Resume, Mark Paid Manually)
  const handleUpdateScheduleStatus = async (
    scheduleId: string,
    newStatus: "pending" | "deducted" | "paid_manually" | "paused" | "waived"
  ) => {
    try {
      await apiClient.put(`/payroll/loan-schedules/${scheduleId}`, {
        status: newStatus,
      });
      toast.success("Schedule Updated", `Installment status changed to ${newStatus}.`);
      if (activeLoanForSchedule) {
        const res = await apiClient.get<LoanRepaymentScheduleOut[]>(
          `/payroll/loans/${activeLoanForSchedule.id}/schedules`
        );
        setSchedules(res.data || []);
      }
    } catch (err: any) {
      toast.error("Update Failed", err?.response?.data?.detail || "Could not update installment.");
    }
  };

  // Create new loan application
  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoanData.employee_id) {
      toast.error("Validation Error", "Please select an employee.");
      return;
    }
    if (newLoanData.principal_amount <= 0) {
      toast.error("Validation Error", "Principal amount must be greater than zero.");
      return;
    }
    if (!newLoanData.reason.trim()) {
      toast.error("Validation Error", "Please provide a reason for the loan.");
      return;
    }

    setIsSubmittingLoan(true);
    try {
      await apiClient.post("/portal/loans", {
        ...newLoanData,
        principal_amount: Number(newLoanData.principal_amount),
        monthly_installment_amount:
          Number(newLoanData.monthly_installment_amount) ||
          Math.ceil(Number(newLoanData.principal_amount) / (Number(newLoanData.total_installments) || 1)),
        total_installments: Number(newLoanData.total_installments) || 1,
      });

      toast.success("Application Submitted", "Employee loan / advance created.");
      setIsNewLoanOpen(false);
      setNewLoanData({
        employee_id: employees[0]?.id || "",
        loan_type: "salary_advance",
        principal_amount: 0,
        monthly_installment_amount: 0,
        total_installments: 1,
        repayment_start_date: new Date().toISOString().split("T")[0],
        reason: "",
        notes: "",
      });
      fetchLoans(true);
    } catch (err: any) {
      toast.error("Submission Failed", err?.response?.data?.detail || "Could not submit loan.");
    } finally {
      setIsSubmittingLoan(false);
    }
  };

  // Filtered loans
  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      const emp = employeeMap[loan.employee_id];
      const empName = emp ? `${emp.first_name} ${emp.last_name}`.toLowerCase() : "";
      const matchesSearch =
        !searchQuery ||
        empName.includes(searchQuery.toLowerCase()) ||
        (loan.reason && loan.reason.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = typeFilter === "all" || loan.loan_type === typeFilter;
      const matchesStatus = statusFilter === "all" || loan.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [loans, employeeMap, searchQuery, typeFilter, statusFilter]);

  // Metrics
  const totalPrincipal = useMemo(
    () => loans.reduce((acc, l) => acc + (l.principal_amount || 0), 0),
    [loans]
  );
  const totalRemaining = useMemo(
    () => loans.reduce((acc, l) => acc + (l.remaining_balance || 0), 0),
    [loans]
  );
  const activeDisbursedCount = useMemo(
    () => loans.filter((l) => l.status === "disbursed" || l.status === "approved").length,
    [loans]
  );
  const monthlyRecoveryPotential = useMemo(
    () =>
      loans
        .filter((l) => l.status === "disbursed" && (l.remaining_balance || 0) > 0)
        .reduce((acc, l) => acc + (l.monthly_installment_amount || 0), 0),
    [loans]
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              Loan & Salary Advance Management
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Employee advance applications, monthly EMI recovery schedules, and automated payroll deductions
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => fetchLoans(true)}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => setIsNewLoanOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              New Loan / Advance
            </button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
            <div className="text-[10px] font-bold uppercase text-slate-400">Total Capital Issued</div>
            <div className="text-lg font-black text-slate-800 mt-0.5">
              ৳ {totalPrincipal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{loans.length} Total Loans</div>
          </div>

          <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-100">
            <div className="text-[10px] font-bold uppercase text-amber-700">Outstanding Balance</div>
            <div className="text-lg font-black text-amber-800 mt-0.5">
              ৳ {totalRemaining.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-amber-600 font-bold mt-0.5">
              {activeDisbursedCount} Active Repayments
            </div>
          </div>

          <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
            <div className="text-[10px] font-bold uppercase text-emerald-700">Monthly Payroll EMI</div>
            <div className="text-lg font-black text-emerald-800 mt-0.5">
              ৳ {monthlyRecoveryPotential.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Auto-deducted from salary</div>
          </div>

          <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100">
            <div className="text-[10px] font-bold uppercase text-indigo-700">Recovery Ratio</div>
            <div className="text-lg font-black text-indigo-800 mt-0.5">
              {totalPrincipal > 0
                ? `${(((totalPrincipal - totalRemaining) / totalPrincipal) * 100).toFixed(1)}%`
                : "100%"}
            </div>
            <div className="text-[11px] text-indigo-600 font-medium mt-0.5">Principal Recovered</div>
          </div>
        </div>
      </div>

      {/* In-Place Loans Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden relative">
        {/* Top Progress Bar on background fetch */}
        {isFetching && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-100 overflow-hidden z-20">
            <div className="w-full h-full bg-gradient-to-r from-indigo-500 via-teal-500 to-indigo-500 animate-pulse" />
          </div>
        )}

        {/* Filter bar */}
        <div className="p-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  startTransition(() => setSearchQuery(val));
                }}
                placeholder="Search employee or reason..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-52 focus:w-64 transition-all focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                const val = e.target.value;
                startTransition(() => setTypeFilter(val));
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Loan Types</option>
              <option value="salary_advance">Salary Advance</option>
              <option value="personal_loan">Personal Loan</option>
              <option value="emergency_loan">Emergency Loan</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                const val = e.target.value;
                startTransition(() => setStatusFilter(val));
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="disbursed">Disbursed (Active)</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed / Settled</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing {filteredLoans.length} loans
          </div>
        </div>

        {/* In-Place Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3">Employee</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3 text-right">Principal</th>
                <th className="px-5 py-3 text-right">Monthly EMI</th>
                <th className="px-5 py-3 text-right">Remaining Balance</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Schedule</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-slate-100 text-xs transition-opacity duration-200 ${
                isFetching ? "opacity-75" : "opacity-100"
              }`}
            >
              {initialLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="h-3.5 bg-slate-100 rounded w-32 mb-1" />
                      <div className="h-2.5 bg-slate-100 rounded w-20" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-5 bg-slate-100 rounded-full w-24" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="h-4 bg-slate-100 rounded w-20 ml-auto" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="h-4 bg-slate-100 rounded w-16 ml-auto" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="h-4 bg-slate-100 rounded w-20 ml-auto" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-5 bg-slate-100 rounded-full w-20" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="h-6 bg-slate-100 rounded w-24 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredLoans.length > 0 ? (
                filteredLoans.map((loan) => {
                  const emp = employeeMap[loan.employee_id];
                  return (
                    <tr key={loan.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 leading-tight">
                          {emp ? `${emp.first_name} ${emp.last_name}` : `ID: ${loan.employee_id}`}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {emp?.employee_id || "EMP"}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 capitalize font-medium text-slate-700">
                        {loan.loan_type.replace("_", " ")}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-800">
                        ৳ {(loan.principal_amount || 0).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-indigo-600">
                        ৳ {(loan.monthly_installment_amount || 0).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-amber-600">
                        ৳ {(loan.remaining_balance || 0).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5">
                        {loan.status === "disbursed" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Disbursed
                          </span>
                        ) : loan.status === "completed" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                            Completed
                          </span>
                        ) : loan.status === "approved" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 capitalize">
                            {loan.status}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenSchedule(loan)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-indigo-600 hover:bg-indigo-50 font-bold text-xs transition-colors inline-flex items-center gap-1"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          EMI Schedule
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    No loan records found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EMI Schedule Drawer / Modal */}
      {activeLoanForSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden p-6 space-y-4 text-xs max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Monthly EMI Repayment Schedule
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Principal: ৳ {(activeLoanForSchedule.principal_amount || 0).toLocaleString()} | Balance: ৳{" "}
                  {(activeLoanForSchedule.remaining_balance || 0).toLocaleString()} | EMI: ৳{" "}
                  {(activeLoanForSchedule.monthly_installment_amount || 0).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveLoanForSchedule(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {loadingSchedule ? (
                <div className="py-12 text-center text-slate-400">Loading schedule...</div>
              ) : schedules.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                      <th className="px-4 py-2.5">Installment #</th>
                      <th className="px-4 py-2.5">Due Date</th>
                      <th className="px-4 py-2.5 text-right">Amount</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {schedules.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-bold text-slate-800">
                          #{item.installment_number}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{item.due_date}</td>
                        <td className="px-4 py-2.5 text-right font-black text-slate-900">
                          ৳ {(item.installment_amount || 0).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5">
                          {item.status === "deducted" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Deducted in Payroll
                            </span>
                          ) : item.status === "paid_manually" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              Paid Manually
                            </span>
                          ) : item.status === "paused" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              Paused / Skipped
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {item.status === "pending" && (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateScheduleStatus(item.id, "paused")}
                                className="px-2 py-0.5 rounded border border-amber-200 text-amber-700 hover:bg-amber-50 text-[10px] font-bold"
                              >
                                Pause
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateScheduleStatus(item.id, "paid_manually")}
                                className="px-2 py-0.5 rounded border border-blue-200 text-blue-700 hover:bg-blue-50 text-[10px] font-bold"
                              >
                                Mark Paid
                              </button>
                            </div>
                          )}
                          {item.status === "paused" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateScheduleStatus(item.id, "pending")}
                              className="px-2 py-0.5 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-[10px] font-bold"
                            >
                              Resume
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  No repayment schedule generated for this loan yet.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setActiveLoanForSchedule(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Loan Application Modal */}
      {isNewLoanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Issue Loan or Salary Advance</h3>
              <button
                type="button"
                onClick={() => setIsNewLoanOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Beneficiary Employee *
                </label>
                <select
                  required
                  value={newLoanData.employee_id}
                  onChange={(e) => setNewLoanData({ ...newLoanData, employee_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Select Employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_id || "EMP"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Loan Type</label>
                  <select
                    value={newLoanData.loan_type}
                    onChange={(e: any) =>
                      setNewLoanData({ ...newLoanData, loan_type: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="salary_advance">Salary Advance</option>
                    <option value="personal_loan">Personal Loan</option>
                    <option value="emergency_loan">Emergency Loan</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Repayment Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newLoanData.repayment_start_date}
                    onChange={(e) =>
                      setNewLoanData({ ...newLoanData, repayment_start_date: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Principal Amount (৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="1"
                    value={newLoanData.principal_amount || ""}
                    onChange={(e) => {
                      const principal = parseFloat(e.target.value) || 0;
                      const installments = newLoanData.total_installments || 1;
                      setNewLoanData({
                        ...newLoanData,
                        principal_amount: principal,
                        monthly_installment_amount: Math.ceil(principal / installments),
                      });
                    }}
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Total Installments (Months) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newLoanData.total_installments || ""}
                    onChange={(e) => {
                      const installments = parseInt(e.target.value, 10) || 1;
                      const principal = newLoanData.principal_amount || 0;
                      setNewLoanData({
                        ...newLoanData,
                        total_installments: installments,
                        monthly_installment_amount: Math.ceil(principal / installments),
                      });
                    }}
                    placeholder="e.g. 6"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Monthly EMI Installment (৳)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newLoanData.monthly_installment_amount || ""}
                  onChange={(e) =>
                    setNewLoanData({
                      ...newLoanData,
                      monthly_installment_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Reason for Loan *
                </label>
                <textarea
                  rows={2}
                  required
                  value={newLoanData.reason}
                  onChange={(e) => setNewLoanData({ ...newLoanData, reason: e.target.value })}
                  placeholder="Medical emergency, festival advance, home relocation..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewLoanOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLoan}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSubmittingLoan ? "Submitting..." : "Disburse / Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
