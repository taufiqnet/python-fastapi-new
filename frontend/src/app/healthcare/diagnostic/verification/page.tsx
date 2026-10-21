"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import {
  DiagnosticOrderOut,
  DiagnosticOrderItemOut,
  LabTestResultOut,
  LabVerificationPayload,
} from "@/types";
import { LabReportModal } from "@/components/healthcare/modals/lab-report-modal";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  Printer,
  FlaskConical,
  AlertTriangle,
  UserCheck,
  RefreshCw,
  Clock,
  Sparkles,
} from "lucide-react";

interface VerificationRow {
  order: DiagnosticOrderOut;
  item: DiagnosticOrderItemOut;
}

export default function VerificationDeskPage() {
  const [orders, setOrders] = useState<DiagnosticOrderOut[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [, startTransition] = useTransition();

  const [searchTerm, setSearchTerm] = useState("");
  const [pathologistName, setPathologistName] = useState("Prof. Dr. M. Rahman (Pathologist)");

  // Lab Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DiagnosticOrderOut | null>(null);
  const [selectedItem, setSelectedItem] = useState<DiagnosticOrderItemOut | null>(null);
  const [selectedResults, setSelectedResults] = useState<LabTestResultOut[]>([]);

  const fetchOrders = async () => {
    setIsFetching(true);
    try {
      const res = await apiClient.get<DiagnosticOrderOut[]>("/healthcare/diagnostic-orders?limit=100");
      setOrders(res.data);
    } catch (err) {
      console.error("Failed to load verification orders", err);
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const verificationRows = useMemo(() => {
    const list: VerificationRow[] = [];
    orders.forEach((o) => {
      if (o.status === "cancelled") return;
      o.items.forEach((item) => {
        list.push({ order: o, item });
      });
    });
    return list;
  }, [orders]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return verificationRows;
    const q = searchTerm.toLowerCase();
    return verificationRows.filter(
      ({ order, item }) =>
        order.patient?.full_name?.toLowerCase().includes(q) ||
        order.patient?.uhid?.toLowerCase().includes(q) ||
        order.order_number?.toLowerCase().includes(q) ||
        item.test_name?.toLowerCase().includes(q)
    );
  }, [verificationRows, searchTerm]);

  // Handle Verify Action
  const handleVerifyItem = async (order: DiagnosticOrderOut, item: DiagnosticOrderItemOut) => {
    try {
      setIsFetching(true);
      const payload: LabVerificationPayload = {
        verified_by_name: pathologistName,
        remarks: "Parameters clinically examined and certified.",
      };
      await apiClient.post(`/healthcare/lis/results/verify`, payload, {
        params: { order_item_id: item.id },
      });
      // Refresh
      await fetchOrders();
    } catch (err) {
      console.error("Failed to verify lab results", err);
    } finally {
      setIsFetching(false);
    }
  };

  // Open Printable Report Modal
  const handleOpenReport = async (order: DiagnosticOrderOut, item: DiagnosticOrderItemOut) => {
    try {
      setIsFetching(true);
      const res = await apiClient.get<LabTestResultOut[]>(
        `/healthcare/lis/results?order_item_id=${item.id}`
      );
      setSelectedOrder(order);
      setSelectedItem(item);
      setSelectedResults(res.data);
      setIsReportModalOpen(true);
    } catch (err) {
      console.error("Failed to fetch results for report", err);
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full min-w-0 max-w-full space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs tracking-wider uppercase mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Pathologist & Radiologist Sign-off</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Diagnostic Report Verification Desk
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review entered laboratory findings, validate abnormal/critical values, and authorize printable A4 reports
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <input
                type="text"
                value={pathologistName}
                onChange={(e) => setPathologistName(e.target.value)}
                className="bg-transparent font-bold text-slate-800 border-none p-0 focus:outline-hidden text-xs w-56"
                title="Signing Consultant"
              />
            </div>
            <button
              onClick={fetchOrders}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-emerald-600" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* In-Place Non-Destructive Filtering Control Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50/60 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  const val = e.target.value;
                  startTransition(() => {
                    setSearchTerm(val);
                  });
                }}
                placeholder="Search patient, UHID or test name..."
                className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <span className="text-xs font-bold text-slate-500">
              Showing <strong className="text-slate-900">{filteredRows.length}</strong> reports
            </span>
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
            {filteredRows.length === 0 ? (
              <div className="py-16 text-center">
                <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No test reports to verify</p>
                <p className="text-xs text-slate-400 mt-1">
                  Once laboratory findings are entered in LIS, they appear here for clinical sign-off.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Order # & Date</th>
                      <th className="py-3 px-4">Patient Information</th>
                      <th className="py-3 px-4">Test Description</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Verification Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map(({ order, item }) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-900">
                            #{order.order_number}
                          </span>
                          <div className="text-[11px] text-slate-500">
                            {new Date(order.order_date).toLocaleDateString("en-GB")}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{order.patient?.full_name}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-emerald-700">{order.patient?.uhid}</span>
                            <span>•</span>
                            <span>{order.patient?.gender}</span>
                            <span>•</span>
                            <span>{order.patient?.phone}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{item.test_name}</div>
                          <span className="font-mono text-[11px] text-slate-500">{item.test_code}</span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === "completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {item.status === "completed" ? "Verified & Ready" : "Awaiting Verification"}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Authorize button */}
                            <button
                              onClick={() => handleVerifyItem(order, item)}
                              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl shadow-2xs flex items-center gap-1 transition-all"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Authorize</span>
                            </button>

                            {/* View / Print Official Report */}
                            <button
                              onClick={() => handleOpenReport(order, item)}
                              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-1 transition-all"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Official Report</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Printable Lab Report Modal */}
        <LabReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          order={selectedOrder}
          orderItem={selectedItem}
          results={selectedResults}
        />
      </div>
    </DashboardLayout>
  );
}
