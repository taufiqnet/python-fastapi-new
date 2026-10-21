"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { CommissionStatus, DoctorProfileOut, ReferralDoctorCommissionOut } from "@/types";
import { ReferralPayoutModal } from "@/components/healthcare/modals/referral-payout-modal";
import {
  DollarSign,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RefreshCw,
  CreditCard,
  UserCheck,
  Stethoscope,
  TrendingUp,
  Receipt,
} from "lucide-react";

export default function ReferralCommissionLedgerPage() {
  const [commissions, setCommissions] = useState<ReferralDoctorCommissionOut[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfileOut[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [, startTransition] = useTransition();

  // Filters
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal
  const [selectedCommission, setSelectedCommission] = useState<ReferralDoctorCommissionOut | null>(
    null
  );
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  // Load Doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await apiClient.get<DoctorProfileOut[]>("/healthcare/doctors?limit=100");
        setDoctors(res.data);
      } catch (err) {
        console.error("Failed to load doctors", err);
      }
    };
    fetchDoctors();
  }, []);

  // Fetch Commissions
  const fetchCommissions = async (docId?: string, status?: string) => {
    setIsFetching(true);
    try {
      const params: Record<string, string | number> = { limit: 200 };
      if (docId) params.doctor_id = docId;
      if (status) params.status = status;

      const res = await apiClient.get<ReferralDoctorCommissionOut[]>(
        "/healthcare/referrals/commissions",
        { params }
      );
      setCommissions(res.data);
    } catch (err) {
      console.error("Failed to load commission ledger", err);
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchCommissions(selectedDoctorId, selectedStatus);
  }, [selectedDoctorId, selectedStatus]);

  // KPI Calculations
  const stats = useMemo(() => {
    let accruedTotal = 0;
    let paidTotal = 0;
    let pendingTotal = 0;

    commissions.forEach((c) => {
      const amt = Number(c.commission_amount) || 0;
      accruedTotal += amt;
      if (c.payment_status === "paid") {
        paidTotal += amt;
      } else if (c.payment_status === "accrued") {
        pendingTotal += amt;
      }
    });

    return { accruedTotal, paidTotal, pendingTotal };
  }, [commissions]);

  // Filtered by Search Term
  const filteredCommissions = useMemo(() => {
    if (!searchTerm.trim()) return commissions;
    const q = searchTerm.toLowerCase();
    return commissions.filter(
      (c) =>
        c.referring_doctor?.full_name?.toLowerCase().includes(q) ||
        c.payment_reference?.toLowerCase().includes(q) ||
        c.order_id?.toLowerCase().includes(q)
    );
  }, [commissions, searchTerm]);

  const handleOpenPayout = (c: ReferralDoctorCommissionOut) => {
    setSelectedCommission(c);
    setIsPayoutModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="w-full min-w-0 max-w-full space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs tracking-wider uppercase mb-1">
              <DollarSign className="w-4 h-4" />
              <span>Affiliate & Referral Ledger</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Referring Doctor Commission Ledger
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated diagnostic order commission accrual, doctor statements, and payment disbursement
            </p>
          </div>

          <button
            onClick={() => fetchCommissions(selectedDoctorId, selectedStatus)}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-emerald-600" : ""}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Total Accrued Commission
              </span>
              <div className="p-2 bg-emerald-600 text-white rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-950 mt-2">
              ৳{stats.accruedTotal.toLocaleString()}
            </p>
            <p className="text-[11px] text-emerald-700 mt-1">Total lifetime commission calculated</p>
          </div>

          <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                Disbursed / Paid Out
              </span>
              <div className="p-2 bg-blue-600 text-white rounded-xl">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-blue-950 mt-2">
              ৳{stats.paidTotal.toLocaleString()}
            </p>
            <p className="text-[11px] text-blue-700 mt-1">Settled payments with vouchers</p>
          </div>

          <div className="p-4 rounded-2xl border border-amber-100 bg-amber-50/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                Pending Payable
              </span>
              <div className="p-2 bg-amber-600 text-white rounded-xl">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-amber-950 mt-2">
              ৳{stats.pendingTotal.toLocaleString()}
            </p>
            <p className="text-[11px] text-amber-700 mt-1">Outstanding commissions to be paid</p>
          </div>
        </div>

        {/* Workspace Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
          {/* In-Place Non-Destructive Filtering Control Bar */}
          <div className="p-4 bg-slate-50/60 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Doctor Picker */}
              <div className="w-56">
                <select
                  value={selectedDoctorId}
                  onChange={(e) => {
                    const val = e.target.value;
                    startTransition(() => {
                      setSelectedDoctorId(val);
                    });
                  }}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                >
                  <option value="">All Referring Doctors</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} ({d.referral_commission_rate}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Picker */}
              <div className="w-44">
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    const val = e.target.value;
                    startTransition(() => {
                      setSelectedStatus(val);
                    });
                  }}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                >
                  <option value="">All Payout Statuses</option>
                  <option value="accrued">Accrued (Payable)</option>
                  <option value="paid">Paid Out</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Quick search input */}
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search doctor or txn reference..."
                className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Indeterminate top loading progress bar (Rule: ui_in_place_filtering.md) */}
          {isFetching && (
            <div className="w-full h-1 bg-emerald-100 overflow-hidden">
              <div className="w-full h-full bg-emerald-600 animate-pulse" />
            </div>
          )}

          {/* Table */}
          <div
            className={`transition-opacity duration-200 ${
              isFetching ? "opacity-60 pointer-events-none" : "opacity-100"
            }`}
          >
            {filteredCommissions.length === 0 ? (
              <div className="py-16 text-center">
                <DollarSign className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No commission records found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Commission entries are automatically generated when diagnostic orders are checked
                  out with a referring physician.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Referring Doctor</th>
                      <th className="py-3 px-4">Billed Amount</th>
                      <th className="py-3 px-4">Commission Rate</th>
                      <th className="py-3 px-4">Commission Payable</th>
                      <th className="py-3 px-4">Payment Status</th>
                      <th className="py-3 px-4 text-right">Settlement Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCommissions.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {new Date(c.created_at).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            {c.referring_doctor?.full_name || "Doctor"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {c.referring_doctor?.chamber_name || c.referring_doctor?.specialization || "External Ref"}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono font-medium text-slate-800">
                          ৳{Number(c.bill_amount).toLocaleString()}
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-slate-700">
                          {c.commission_rate}%
                        </td>

                        <td className="py-3 px-4 font-mono font-black text-emerald-700 text-sm">
                          ৳{Number(c.commission_amount).toLocaleString()}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              c.payment_status === "paid"
                                ? "bg-emerald-100 text-emerald-800"
                                : c.payment_status === "cancelled"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {c.payment_status === "paid" ? "Disbursed" : "Accrued / Payable"}
                          </span>
                          {c.payment_reference && (
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                              Ref: {c.payment_reference}
                            </p>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          {c.payment_status === "accrued" ? (
                            <button
                              onClick={() => handleOpenPayout(c)}
                              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-1 ml-auto transition-all"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Settle Payout</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Settled</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Payout Modal */}
        <ReferralPayoutModal
          isOpen={isPayoutModalOpen}
          onClose={() => setIsPayoutModalOpen(false)}
          commission={selectedCommission}
          onSuccess={() => {
            fetchCommissions(selectedDoctorId, selectedStatus);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
