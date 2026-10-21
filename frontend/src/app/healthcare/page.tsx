"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { DiagnosticOrderOut, PatientOut, DoctorProfileOut, DiagnosticTestOut } from "@/types";
import { MoneyReceiptModal } from "@/components/healthcare/modals/money-receipt-modal";
import { PatientModal } from "@/components/healthcare/modals/patient-modal";
import {
  Stethoscope,
  Users,
  CreditCard,
  FlaskConical,
  TestTube2,
  Plus,
  Search,
  Printer,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";

export default function HealthcareHubPage() {
  const [orders, setOrders] = useState<DiagnosticOrderOut[]>([]);
  const [patients, setPatients] = useState<PatientOut[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfileOut[]>([]);
  const [tests, setTests] = useState<DiagnosticTestOut[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<DiagnosticOrderOut | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [ordersRes, patientsRes, doctorsRes, testsRes] = await Promise.allSettled([
        apiClient.get<DiagnosticOrderOut[]>("/healthcare/diagnostic-orders?limit=100"),
        apiClient.get<PatientOut[]>("/healthcare/patients?limit=50"),
        apiClient.get<DoctorProfileOut[]>("/healthcare/doctors?limit=50"),
        apiClient.get<DiagnosticTestOut[]>("/healthcare/diagnostic-tests?limit=100"),
      ]);

      if (ordersRes.status === "fulfilled") setOrders(ordersRes.value.data || []);
      if (patientsRes.status === "fulfilled") setPatients(patientsRes.value.data || []);
      if (doctorsRes.status === "fulfilled") setDoctors(doctorsRes.value.data || []);
      if (testsRes.status === "fulfilled") setTests(testsRes.value.data || []);
    } catch {
      setError("Failed to fetch healthcare dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // KPI Calculations
  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, o) => sum + Number(o.paid_amount || 0), 0);
  }, [orders]);

  const totalDue = useMemo(() => {
    return orders.reduce((sum, o) => sum + Number(o.due_amount || 0), 0);
  }, [orders]);

  const handleOpenReceipt = (order: DiagnosticOrderOut) => {
    setSelectedReceiptOrder(order);
    setIsReceiptModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="w-full min-w-0 max-w-full space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-emerald-600" />
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Healthcare & Diagnostic Hub
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Polyclinic OPD Chambers, Diagnostic Counter Billing, Phlebotomy, and Patient Index.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPatientModalOpen(true)}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Users className="w-4 h-4 text-emerald-600" />
              Register Patient
            </button>
            <Link
              href="/healthcare/diagnostic/billing"
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Diagnostic Bill
            </Link>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadData}
              className="px-3 py-1 font-bold text-rose-700 hover:bg-rose-100 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Total Patients (MPI)
              </span>
              <div className="p-2 bg-emerald-600 text-white rounded-xl">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-950 mt-2">{patients.length}</p>
            <p className="text-[11px] text-emerald-700 mt-1">Unique lifetime Health IDs</p>
          </div>

          <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                Active Doctors
              </span>
              <div className="p-2 bg-blue-600 text-white rounded-xl">
                <Stethoscope className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-blue-950 mt-2">{doctors.length}</p>
            <p className="text-[11px] text-blue-700 mt-1">OPD consultants & referral doctors</p>
          </div>

          <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
                Diagnostic Tests
              </span>
              <div className="p-2 bg-indigo-600 text-white rounded-xl">
                <FlaskConical className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-indigo-950 mt-2">{tests.length}</p>
            <p className="text-[11px] text-indigo-700 mt-1">In pathology & radiology catalog</p>
          </div>

          <div className="p-4 rounded-2xl border border-amber-100 bg-amber-50/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                Diagnostic Collection
              </span>
              <div className="p-2 bg-amber-600 text-white rounded-xl">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-amber-950 mt-2">
              ৳{totalRevenue.toLocaleString()}
            </p>
            <p className="text-[11px] text-amber-700 mt-1">
              Outstanding due: ৳{totalDue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Quick Operational Launcher Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/healthcare/diagnostic/billing"
            className="p-4 bg-white border border-slate-200/80 hover:border-emerald-500 rounded-2xl shadow-2xs hover:shadow-md transition-all group flex items-start justify-between"
          >
            <div className="space-y-1">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl w-fit group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 pt-2">Counter Billing (POS)</h3>
              <p className="text-xs text-slate-500">Fast test booking, discounts & receipts</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
          </Link>

          <Link
            href="/healthcare/patients"
            className="p-4 bg-white border border-slate-200/80 hover:border-emerald-500 rounded-2xl shadow-2xs hover:shadow-md transition-all group flex items-start justify-between"
          >
            <div className="space-y-1">
              <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl w-fit group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 pt-2">Patient Index (MPI)</h3>
              <p className="text-xs text-slate-500">UHID lookup, demographics & visits</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
          </Link>

          <Link
            href="/healthcare/diagnostic/phlebotomy"
            className="p-4 bg-white border border-slate-200/80 hover:border-emerald-500 rounded-2xl shadow-2xs hover:shadow-md transition-all group flex items-start justify-between"
          >
            <div className="space-y-1">
              <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl w-fit group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <TestTube2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 pt-2">Phlebotomy Desk</h3>
              <p className="text-xs text-slate-500">Barcode specimen collection worklist</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
          </Link>

          <Link
            href="/healthcare/diagnostic/catalog"
            className="p-4 bg-white border border-slate-200/80 hover:border-emerald-500 rounded-2xl shadow-2xs hover:shadow-md transition-all group flex items-start justify-between"
          >
            <div className="space-y-1">
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl w-fit group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <FlaskConical className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 pt-2">Test Master Catalog</h3>
              <p className="text-xs text-slate-500">LIS parameters, prices & ref. ranges</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
          </Link>
        </div>

        {/* Recent Diagnostic Invoices */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-slate-900">Recent Diagnostic Invoices</h2>
              <p className="text-xs text-slate-400">
                Latest customer billing receipts and order statuses
              </p>
            </div>
            <button
              onClick={loadData}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Patient Information</th>
                  <th className="py-3 px-4">Tests</th>
                  <th className="py-3 px-4 text-right">Bill Amount</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      {loading ? (
                        <div className="flex flex-col items-center gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                          <span>Loading healthcare records...</span>
                        </div>
                      ) : (
                        <div>
                          <p>No diagnostic orders found yet.</p>
                          <Link
                            href="/healthcare/diagnostic/billing"
                            className="inline-block mt-2 text-xs font-bold text-emerald-600 hover:underline"
                          >
                            Create first diagnostic bill &rarr;
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  orders.slice(0, 15).map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {order.order_number}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {order.order_date ? new Date(order.order_date).toLocaleDateString() : ""}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{order.patient?.full_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {order.patient?.uhid} • {order.patient?.phone}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {order.items?.length || 0} test(s)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ৳{Number(order.net_amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-700 font-bold">
                        ৳{Number(order.paid_amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {Number(order.due_amount) > 0 ? (
                          <span className="font-bold text-rose-600">
                            ৳{Number(order.due_amount).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold">Paid</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {order.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenReceipt(order)}
                          className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-1 mx-auto transition-colors"
                        >
                          <Printer className="w-3 h-3" />
                          Receipt
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modals */}
        <MoneyReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          order={selectedReceiptOrder}
        />

        <PatientModal
          isOpen={isPatientModalOpen}
          onClose={() => setIsPatientModalOpen(false)}
          onSuccess={() => loadData()}
        />
      </div>
    </DashboardLayout>
  );
}
