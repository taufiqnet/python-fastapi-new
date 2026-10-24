"use client";

import React, { useState, useEffect, useMemo } from "react";
import { apiClient } from "@/lib/api-client";
import {
  PayrollRecordOut,
  PayrollRecordCreatePayload,
  PayrollRecordUpdatePayload,
  EmployeeOut,
  PayrollPeriodOut,
} from "@/types";
import { X, DollarSign, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/context/toast-context";
import { SearchableEmployeeCombobox } from "@/components/common/searchable-employee-combobox";

interface BusinessItem {
  id: number;
  name_en: string;
}

interface PayrollRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  record?: PayrollRecordOut | null;
  employees: EmployeeOut[];
  periods: PayrollPeriodOut[];
  businesses: BusinessItem[];
  defaultBusinessId: number;
  isSuperuser: boolean;
}

export function PayrollRecordModal({
  isOpen,
  onClose,
  onSuccess,
  record,
  employees,
  periods,
  businesses,
  defaultBusinessId,
  isSuperuser,
}: PayrollRecordModalProps) {
  const { toast } = useToast();
  const todayStr = new Date().toISOString().split("T")[0];

  const [businessId, setBusinessId] = useState<number>(defaultBusinessId);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [periodId, setPeriodId] = useState<string>("");

  // Attendance
  const [workingDays, setWorkingDays] = useState<number>(30);
  const [presentDays, setPresentDays] = useState<number>(26);
  const [absentDays, setAbsentDays] = useState<number>(0);
  const [leaveDays, setLeaveDays] = useState<number>(0);
  const [holidayDays, setHolidayDays] = useState<number>(4);
  const [overtimeHours, setOvertimeHours] = useState<number>(0);

  // Earnings
  const [basicSalary, setBasicSalary] = useState<number>(0);
  const [houseRent, setHouseRent] = useState<number>(0);
  const [transportAllowance, setTransportAllowance] = useState<number>(0);
  const [medicalAllowance, setMedicalAllowance] = useState<number>(0);
  const [foodAllowance, setFoodAllowance] = useState<number>(0);
  const [otherAllowance, setOtherAllowance] = useState<number>(0);
  const [overtimePay, setOvertimePay] = useState<number>(0);
  const [bonus, setBonus] = useState<number>(0);

  // Deductions
  const [tax, setTax] = useState<number>(0);
  const [providentFund, setProvidentFund] = useState<number>(0);
  const [unpaidLeaveDeduction, setUnpaidLeaveDeduction] = useState<number>(0);
  const [loanInstallment, setLoanInstallment] = useState<number>(0);
  const [otherDeduction, setOtherDeduction] = useState<number>(0);

  // Payment info
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const [bankAccount, setBankAccount] = useState<string>("");
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [paidAt, setPaidAt] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(record);

  // Calculated totals
  const computedGross = useMemo(() => {
    return (
      Number(basicSalary || 0) +
      Number(houseRent || 0) +
      Number(transportAllowance || 0) +
      Number(medicalAllowance || 0) +
      Number(foodAllowance || 0) +
      Number(otherAllowance || 0) +
      Number(overtimePay || 0) +
      Number(bonus || 0)
    );
  }, [
    basicSalary,
    houseRent,
    transportAllowance,
    medicalAllowance,
    foodAllowance,
    otherAllowance,
    overtimePay,
    bonus,
  ]);

  const computedDeductions = useMemo(() => {
    return (
      Number(tax || 0) +
      Number(providentFund || 0) +
      Number(unpaidLeaveDeduction || 0) +
      Number(loanInstallment || 0) +
      Number(otherDeduction || 0)
    );
  }, [tax, providentFund, unpaidLeaveDeduction, loanInstallment, otherDeduction]);

  const computedNet = useMemo(() => {
    return Math.max(0, computedGross - computedDeductions);
  }, [computedGross, computedDeductions]);

  useEffect(() => {
    if (record) {
      setBusinessId(record.business_id || defaultBusinessId);
      setEmployeeId(record.employee_id || "");
      setPeriodId(record.period_id || "");
      setWorkingDays(record.working_days || 0);
      setPresentDays(record.present_days || 0);
      setAbsentDays(record.absent_days || 0);
      setLeaveDays(record.leave_days || 0);
      setHolidayDays(record.holiday_days || 0);
      setOvertimeHours(record.overtime_hours || 0);

      setBasicSalary(record.basic_salary || 0);
      setHouseRent(record.house_rent || 0);
      setTransportAllowance(record.transport_allowance || 0);
      setMedicalAllowance(record.medical_allowance || 0);
      setFoodAllowance(record.food_allowance || 0);
      setOtherAllowance(record.other_allowance || 0);
      setOvertimePay(record.overtime_pay || 0);
      setBonus(record.bonus || 0);

      setTax(record.tax || 0);
      setProvidentFund(record.provident_fund || 0);
      setUnpaidLeaveDeduction(record.unpaid_leave_deduction || 0);
      setLoanInstallment(record.loan_installment || 0);
      setOtherDeduction(record.other_deduction || 0);

      setPaymentMethod(record.payment_method || "bank_transfer");
      setBankAccount(record.bank_account || "");
      setIsPaid(Boolean(record.is_paid));
      setPaidAt(record.paid_at ? record.paid_at.split("T")[0] : "");
      setNote(record.note || "");
    } else {
      setBusinessId(defaultBusinessId);
      setEmployeeId(employees[0]?.id || "");
      setPeriodId(periods[0]?.id || "");
      setWorkingDays(30);
      setPresentDays(26);
      setAbsentDays(0);
      setLeaveDays(0);
      setHolidayDays(4);
      setOvertimeHours(0);

      setBasicSalary(0);
      setHouseRent(0);
      setTransportAllowance(0);
      setMedicalAllowance(0);
      setFoodAllowance(0);
      setOtherAllowance(0);
      setOvertimePay(0);
      setBonus(0);

      setTax(0);
      setProvidentFund(0);
      setUnpaidLeaveDeduction(0);
      setLoanInstallment(0);
      setOtherDeduction(0);

      setPaymentMethod("bank_transfer");
      setBankAccount("");
      setIsPaid(false);
      setPaidAt("");
      setNote("");
    }
    setError(null);
  }, [record, isOpen, defaultBusinessId, employees, periods]);

  // When selecting an employee, autofill basic salary and bank account if available
  const handleEmployeeChange = (empId: string) => {
    setEmployeeId(empId);
    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      if (emp.bank_account_no) {
        setBankAccount(emp.bank_account_no);
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!employeeId) {
      setError("Please select an employee.");
      return;
    }
    if (!periodId) {
      setError("Please select a payroll period.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && record) {
        const payload: PayrollRecordUpdatePayload = {
          working_days: Number(workingDays),
          present_days: Number(presentDays),
          absent_days: Number(absentDays),
          leave_days: Number(leaveDays),
          holiday_days: Number(holidayDays),
          overtime_hours: Number(overtimeHours),
          basic_salary: Number(basicSalary),
          house_rent: Number(houseRent),
          transport_allowance: Number(transportAllowance),
          medical_allowance: Number(medicalAllowance),
          food_allowance: Number(foodAllowance),
          other_allowance: Number(otherAllowance),
          overtime_pay: Number(overtimePay),
          bonus: Number(bonus),
          tax: Number(tax),
          provident_fund: Number(providentFund),
          unpaid_leave_deduction: Number(unpaidLeaveDeduction),
          loan_installment: Number(loanInstallment),
          other_deduction: Number(otherDeduction),
          payment_method: paymentMethod,
          bank_account: bankAccount || null,
          is_paid: isPaid,
          paid_at: isPaid ? (paidAt ? `${paidAt}T12:00:00Z` : new Date().toISOString()) : null,
          note: note || null,
        };
        await apiClient.put(`/payroll/records/${record.id}`, payload);
        toast.success("Payslip Updated", "Payroll record has been updated successfully.");
      } else {
        const payload: PayrollRecordCreatePayload = {
          business_id: businessId,
          employee_id: employeeId,
          period_id: periodId,
          working_days: Number(workingDays),
          present_days: Number(presentDays),
          absent_days: Number(absentDays),
          leave_days: Number(leaveDays),
          holiday_days: Number(holidayDays),
          overtime_hours: Number(overtimeHours),
          basic_salary: Number(basicSalary),
          house_rent: Number(houseRent),
          transport_allowance: Number(transportAllowance),
          medical_allowance: Number(medicalAllowance),
          food_allowance: Number(foodAllowance),
          other_allowance: Number(otherAllowance),
          overtime_pay: Number(overtimePay),
          bonus: Number(bonus),
          tax: Number(tax),
          provident_fund: Number(providentFund),
          unpaid_leave_deduction: Number(unpaidLeaveDeduction),
          loan_installment: Number(loanInstallment),
          other_deduction: Number(otherDeduction),
          payment_method: paymentMethod,
          bank_account: bankAccount || null,
          is_paid: isPaid,
          paid_at: isPaid ? (paidAt ? `${paidAt}T12:00:00Z` : new Date().toISOString()) : null,
          note: note || null,
        };
        await apiClient.post("/payroll/records", payload);
        toast.success("Payslip Created", "New payroll record has been generated.");
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to save payroll record.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {isEdit ? "Edit Payroll Payslip Record" : "Generate Employee Payslip"}
              </h2>
              <p className="text-xs text-slate-500">
                Detailed monthly earnings, allowances, deductions, and payment snapshot
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section: Period & Employee Target */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Employee <span className="text-red-500">*</span>
              </label>
              <SearchableEmployeeCombobox
                employees={employees}
                value={employeeId}
                onChange={(empId) => handleEmployeeChange(empId)}
                disabled={isEdit}
                placeholder="Search & select employee..."
                allowClear={false}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payroll Period <span className="text-red-500">*</span>
              </label>
              <select
                value={periodId}
                onChange={(e) => setPeriodId(e.target.value)}
                disabled={isEdit}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
              >
                <option value="">Select Period</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section: Attendance Metric */}
          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Attendance Summary
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-500">Working Days</label>
                <input
                  type="number"
                  min="0"
                  value={workingDays}
                  onChange={(e) => setWorkingDays(Number(e.target.value))}
                  className="w-full text-xs rounded-lg border border-slate-200 p-1.5 bg-white text-center"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500">Present</label>
                <input
                  type="number"
                  min="0"
                  value={presentDays}
                  onChange={(e) => setPresentDays(Number(e.target.value))}
                  className="w-full text-xs rounded-lg border border-slate-200 p-1.5 bg-white text-center text-emerald-700 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500">Absent</label>
                <input
                  type="number"
                  min="0"
                  value={absentDays}
                  onChange={(e) => setAbsentDays(Number(e.target.value))}
                  className="w-full text-xs rounded-lg border border-slate-200 p-1.5 bg-white text-center text-rose-600 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500">Leave Days</label>
                <input
                  type="number"
                  min="0"
                  value={leaveDays}
                  onChange={(e) => setLeaveDays(Number(e.target.value))}
                  className="w-full text-xs rounded-lg border border-slate-200 p-1.5 bg-white text-center"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500">Holidays</label>
                <input
                  type="number"
                  min="0"
                  value={holidayDays}
                  onChange={(e) => setHolidayDays(Number(e.target.value))}
                  className="w-full text-xs rounded-lg border border-slate-200 p-1.5 bg-white text-center"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500">OT (Hours)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={overtimeHours}
                  onChange={(e) => setOvertimeHours(Number(e.target.value))}
                  className="w-full text-xs rounded-lg border border-slate-200 p-1.5 bg-white text-center"
                />
              </div>
            </div>
          </div>

          {/* Section: Earnings and Allowances */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Salary Earnings & Allowances
              </h3>
              <span className="text-xs font-bold text-indigo-700">
                Gross: ৳{computedGross.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">Basic Salary (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={basicSalary}
                  onChange={(e) => setBasicSalary(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">House Rent (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={houseRent}
                  onChange={(e) => setHouseRent(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">Transport Allowance (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={transportAllowance}
                  onChange={(e) => setTransportAllowance(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">Medical Allowance (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={medicalAllowance}
                  onChange={(e) => setMedicalAllowance(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">Food Allowance (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={foodAllowance}
                  onChange={(e) => setFoodAllowance(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">Other Allowances (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={otherAllowance}
                  onChange={(e) => setOtherAllowance(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">Overtime Pay (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={overtimePay}
                  onChange={(e) => setOvertimePay(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">Bonus / Incentive (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={bonus}
                  onChange={(e) => setBonus(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2"
                />
              </div>
            </div>
          </div>

          {/* Section: Deductions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Salary Deductions
              </h3>
              <span className="text-xs font-bold text-rose-600">
                Total Deductions: ৳{computedDeductions.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">Tax Withheld (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={tax}
                  onChange={(e) => setTax(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">Provident Fund (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={providentFund}
                  onChange={(e) => setProvidentFund(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">Unpaid Leave (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={unpaidLeaveDeduction}
                  onChange={(e) => setUnpaidLeaveDeduction(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">Loan Installment (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={loanInstallment}
                  onChange={(e) => setLoanInstallment(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">Other Deduction (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={otherDeduction}
                  onChange={(e) => setOtherDeduction(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2"
                />
              </div>
            </div>
          </div>

          {/* Net Pay Highlight Banner */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Calculated Net Payable
              </div>
              <div className="text-xs text-emerald-600">Gross Salary minus Total Deductions</div>
            </div>
            <div className="text-xl font-bold text-emerald-700">
              ৳{computedNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Section: Payment Execution */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white capitalize"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="mobile_money">Mobile Financial Service</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bank Account / MFS No
              </label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="Account number"
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition">
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={(e) => {
                    setIsPaid(e.target.checked);
                    if (e.target.checked && !paidAt) setPaidAt(todayStr);
                  }}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-800">Mark as Paid</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Note</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Disbursed via BEFTN"
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
              {isEdit ? "Update Payslip" : "Save & Generate Payslip"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
