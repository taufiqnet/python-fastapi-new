"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { AssetAssignment } from "@/types";
import { useToast } from "@/context/toast-context";
import {
  Laptop,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Search,
  User,
  X,
  ArrowLeft,
} from "lucide-react";

export default function AssetAllocationsPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [allocations, setAllocations] = useState<AssetAssignment[]>([]);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Return modal state
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedAllocForReturn, setSelectedAllocForReturn] = useState<AssetAssignment | null>(null);
  const [returnCondition, setReturnCondition] = useState<"good" | "fair" | "damaged">("good");
  const [returnNotes, setReturnNotes] = useState("");
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  const loadData = async (isBackground = false) => {
    if (isBackground) setIsFetching(true);
    else setInitialLoading(true);

    try {
      const params: Record<string, any> = {};
      if (statusFilter !== "all") params.status = statusFilter;

      const res = await apiClient.get<AssetAssignment[]>("/assets/allocations", { params });
      setAllocations(res.data || []);
    } catch (err: any) {
      toast.error("Error Loading Allocations", err.message || "Failed to load custody records.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const handleFilterChange = (st: string, query: string) => {
    startTransition(() => {
      setStatusFilter(st);
      setSearchQuery(query);
    });
  };

  useEffect(() => {
    if (!initialLoading) {
      loadData(true);
    }
  }, [statusFilter]);

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllocForReturn) return;
    setIsSubmittingReturn(true);
    try {
      await apiClient.post(`/assets/allocations/${selectedAllocForReturn.id}/return`, {
        actual_return_date: new Date().toISOString().slice(0, 10),
        return_condition: returnCondition,
        return_notes: returnNotes || null,
      });
      toast.success(
        "Asset Returned",
        `Asset ${selectedAllocForReturn.asset_tag} has been received back into storage.`
      );
      setIsReturnModalOpen(false);
      setSelectedAllocForReturn(null);
      setReturnNotes("");
      loadData(true);
    } catch (err: any) {
      toast.error("Return Processing Failed", err.response?.data?.detail || err.message);
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const filteredAllocations = allocations.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.asset_tag && item.asset_tag.toLowerCase().includes(q)) ||
      (item.asset_name && item.asset_name.toLowerCase().includes(q)) ||
      (item.employee_name && item.employee_name.toLowerCase().includes(q)) ||
      (item.employee_code && item.employee_code.toLowerCase().includes(q))
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <Link
              href="/assets"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Asset Catalog</span>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Custody Handover & Return Log
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical issuance trail, employee acceptance verification, and condition check records
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleFilterChange(statusFilter, e.target.value)}
                placeholder="Search employee, asset tag, serial..."
                className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(e.target.value, searchQuery)}
              className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700"
            >
              <option value="all">All Custody Statuses</option>
              <option value="active">Active (Acknowledged)</option>
              <option value="pending_acknowledgement">Pending Employee Ack</option>
              <option value="returned">Returned to Storage</option>
              <option value="disputed">Disputed Condition</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button
              onClick={() => loadData(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
              <span>Refresh</span>
            </button>
            <span className="font-semibold text-slate-700">{filteredAllocations.length}</span> records
          </div>
        </div>

        {/* Table Container */}
        <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-100 overflow-hidden z-10">
              <div className="h-full bg-indigo-600 animate-pulse w-full" />
            </div>
          )}

          {initialLoading ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <p className="text-xs">Loading handover records...</p>
            </div>
          ) : filteredAllocations.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400">
              <Laptop className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No handover records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full text-left border-collapse transition-opacity duration-150 ${isFetching ? "opacity-75" : "opacity-100"}`}>
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Asset Tag / Item</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Assigned Date</th>
                    <th className="py-3 px-4">Issue Condition</th>
                    <th className="py-3 px-4">Custody Status</th>
                    <th className="py-3 px-4">Return Details</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredAllocations.map((alloc) => {
                    const isReturned = alloc.status === "returned";
                    return (
                      <tr key={alloc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{alloc.asset_name || "—"}</div>
                          <div className="font-mono text-[11px] text-indigo-600 font-medium">
                            {alloc.asset_tag || "—"}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{alloc.employee_name || "—"}</span>
                          </div>
                          {alloc.employee_code && (
                            <div className="text-[11px] text-slate-400 font-mono">
                              {alloc.employee_code}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{alloc.assigned_date}</td>
                        <td className="py-3 px-4 capitalize text-slate-600">{alloc.issue_condition}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              alloc.status === "active"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : alloc.status === "pending_acknowledgement"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : alloc.status === "returned"
                                ? "bg-slate-100 text-slate-700"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {alloc.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {isReturned ? (
                            <div>
                              <span className="font-medium text-slate-800">{alloc.actual_return_date}</span>
                              <div className="text-[11px] text-slate-400 capitalize">
                                Condition: {alloc.return_condition || "good"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Held in custody</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!isReturned && (
                            <button
                              onClick={() => {
                                setSelectedAllocForReturn(alloc);
                                setIsReturnModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            >
                              <RotateCcw className="w-3 h-3 text-slate-500" />
                              <span>Process Return</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Process Return */}
        {isReturnModalOpen && selectedAllocForReturn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative">
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase">
                <RotateCcw className="w-4 h-4" />
                <span>Return Intake</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">Receive Asset Return</h2>
              <p className="text-xs text-slate-500">
                Returning <strong className="text-slate-800">{selectedAllocForReturn.asset_tag}</strong> from{" "}
                <strong className="text-slate-800">{selectedAllocForReturn.employee_name}</strong>.
              </p>

              <form onSubmit={handleProcessReturn} className="space-y-3.5 mt-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Return Condition</label>
                  <select
                    value={returnCondition}
                    onChange={(e: any) => setReturnCondition(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="good">Good (No damage)</option>
                    <option value="fair">Fair (Normal wear & tear)</option>
                    <option value="damaged">Damaged (Requires maintenance / repair)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Inspection Notes</label>
                  <textarea
                    rows={3}
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    placeholder="Physical condition, missing accessories, scratches or test status..."
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsReturnModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReturn}
                    className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                  >
                    {isSubmittingReturn ? "Processing..." : "Complete Return"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
