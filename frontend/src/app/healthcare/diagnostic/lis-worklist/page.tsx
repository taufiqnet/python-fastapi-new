"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { DiagnosticOrderOut, DiagnosticOrderItemOut } from "@/types";
import { LISResultEntryModal } from "@/components/healthcare/modals/lis-result-entry-modal";
import {
  FlaskConical,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  TestTube2,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  FileText,
  User,
  Barcode,
} from "lucide-react";

interface FlattenedWorklistItem {
  order: DiagnosticOrderOut;
  item: DiagnosticOrderItemOut;
}

export default function LISWorklistPage() {
  const [orders, setOrders] = useState<DiagnosticOrderOut[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [, startTransition] = useTransition();

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal State
  const [selectedItem, setSelectedItem] = useState<DiagnosticOrderItemOut | null>(null);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);

  const fetchOrders = async () => {
    setIsFetching(true);
    try {
      const res = await apiClient.get<DiagnosticOrderOut[]>("/healthcare/diagnostic-orders?limit=100");
      setOrders(res.data);
    } catch (err) {
      console.error("Failed to load diagnostic orders for LIS worklist", err);
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Flatten orders into test items
  const worklistItems = useMemo(() => {
    const list: FlattenedWorklistItem[] = [];
    orders.forEach((o) => {
      // Exclude cancelled
      if (o.status === "cancelled") return;
      o.items.forEach((item) => {
        list.push({ order: o, item });
      });
    });
    return list;
  }, [orders]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return worklistItems.filter(({ order, item }) => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase();
      const matchPatient = order.patient?.full_name?.toLowerCase().includes(q);
      const matchUhid = order.patient?.uhid?.toLowerCase().includes(q);
      const matchOrder = order.order_number?.toLowerCase().includes(q);
      const matchTest = item.test_name?.toLowerCase().includes(q);
      const matchBarcode = order.samples?.some((s) => s.barcode?.toLowerCase().includes(q));

      return matchPatient || matchUhid || matchOrder || matchTest || matchBarcode;
    });
  }, [worklistItems, searchTerm, statusFilter]);

  const handleOpenEntry = (item: DiagnosticOrderItemOut) => {
    setSelectedItem(item);
    setIsEntryModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="w-full min-w-0 max-w-full space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs tracking-wider uppercase mb-1">
              <FlaskConical className="w-4 h-4" />
              <span>Laboratory Information System (LIS)</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Lab Technician Result Worklist
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter parameter findings, reference ranges, and abnormal/critical flags for specimens
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/healthcare/diagnostic/verification"
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Verification Desk</span>
            </Link>
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
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
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
                  placeholder="Search patient, UHID, barcode, test..."
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Status Filter */}
              <div className="w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    startTransition(() => {
                      setStatusFilter(val);
                    });
                  }}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                >
                  <option value="">All Test Statuses</option>
                  <option value="pending">Pending Entry</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed / Result Entered</option>
                </select>
              </div>
            </div>

            <span className="text-xs font-bold text-slate-500">
              Showing <strong className="text-slate-900">{filteredItems.length}</strong> test specimens
            </span>
          </div>

          {/* Indeterminate top loading progress bar (Rule: ui_in_place_filtering.md) */}
          {isFetching && (
            <div className="w-full h-1 bg-emerald-100 overflow-hidden">
              <div className="w-full h-full bg-emerald-600 animate-pulse" />
            </div>
          )}

          {/* Worklist Table */}
          <div
            className={`transition-opacity duration-200 ${
              isFetching ? "opacity-60 pointer-events-none" : "opacity-100"
            }`}
          >
            {filteredItems.length === 0 ? (
              <div className="py-16 text-center">
                <FlaskConical className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No test items in worklist</p>
                <p className="text-xs text-slate-400 mt-1">
                  Ensure counter bills have been checked out and samples collected.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Order & Barcode</th>
                      <th className="py-3 px-4">Patient Information</th>
                      <th className="py-3 px-4">Test Investigation</th>
                      <th className="py-3 px-4">Sample Specimen</th>
                      <th className="py-3 px-4">Test Status</th>
                      <th className="py-3 px-4 text-right">LIS Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map(({ order, item }) => {
                      const sample = order.samples && order.samples[0];
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Order & Barcode */}
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-slate-900">
                              #{order.order_number}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Barcode className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-mono text-[11px] font-bold text-emerald-700">
                                {sample?.barcode || "No Barcode"}
                              </span>
                            </div>
                          </td>

                          {/* Patient */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">
                              {order.patient?.full_name}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-emerald-700">
                                {order.patient?.uhid}
                              </span>
                              <span>•</span>
                              <span>{order.patient?.gender}</span>
                              <span>•</span>
                              <span>{order.patient?.age ? `${order.patient.age}y` : "—"}</span>
                            </div>
                          </td>

                          {/* Test */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{item.test_name}</div>
                            <span className="font-mono text-[11px] text-slate-500">
                              {item.test_code}
                            </span>
                          </td>

                          {/* Sample Status */}
                          <td className="py-3 px-4">
                            {sample ? (
                              <div>
                                <span className="capitalize font-semibold text-slate-800">
                                  {sample.sample_type}
                                </span>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {sample.status === "collected" ? (
                                    <span className="text-emerald-700 font-bold">Collected</span>
                                  ) : (
                                    <span className="text-amber-700 font-bold">Pending collection</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">No Specimen</span>
                            )}
                          </td>

                          {/* Test Status */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                item.status === "completed"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : item.status === "in_progress"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {item.status.replace("_", " ").toUpperCase()}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleOpenEntry(item)}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-1 ml-auto transition-all"
                            >
                              <FlaskConical className="w-3.5 h-3.5" />
                              <span>{item.status === "completed" ? "Edit Results" : "Enter Results"}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Result Entry Modal */}
        <LISResultEntryModal
          isOpen={isEntryModalOpen}
          onClose={() => setIsEntryModalOpen(false)}
          orderItem={selectedItem}
          onSuccess={() => {
            fetchOrders();
          }}
        />
      </div>
    </DashboardLayout>
  );
}
