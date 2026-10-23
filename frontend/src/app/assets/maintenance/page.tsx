"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { AssetMaintenanceLog, CompanyAsset } from "@/types";
import { useToast } from "@/context/toast-context";
import {
  Wrench,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertOctagon,
  X,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";

export default function AssetMaintenancePage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [logs, setLogs] = useState<AssetMaintenanceLog[]>([]);
  const [assets, setAssets] = useState<CompanyAsset[]>([]);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedLogForUpdate, setSelectedLogForUpdate] = useState<AssetMaintenanceLog | null>(null);

  // Form states for Create
  const [formAssetId, setFormAssetId] = useState("");
  const [formIssueType, setFormIssueType] = useState<"damage" | "preventive" | "breakdown" | "upgrade">("damage");
  const [formDescription, setFormDescription] = useState("");
  const [formVendor, setFormVendor] = useState("");
  const [formCost, setFormCost] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for Update
  const [updateStatus, setUpdateStatus] = useState<"reported" | "in_repair" | "repaired" | "irreparable">("repaired");
  const [updateResolution, setUpdateResolution] = useState("");
  const [updateCost, setUpdateCost] = useState("");

  const loadData = async (isBackground = false) => {
    if (isBackground) setIsFetching(true);
    else setInitialLoading(true);

    try {
      const params: Record<string, any> = {};
      if (statusFilter !== "all") params.status = statusFilter;

      const [logsRes, assetsRes] = await Promise.allSettled([
        apiClient.get<AssetMaintenanceLog[]>("/assets/maintenance", { params }),
        apiClient.get<CompanyAsset[]>("/assets/items"),
      ]);

      if (logsRes.status === "fulfilled") setLogs(logsRes.value.data || []);
      if (assetsRes.status === "fulfilled") setAssets(assetsRes.value.data || []);
    } catch (err: any) {
      toast.error("Error Loading Maintenance", err.message || "Failed to load repair orders.");
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

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAssetId || !formDescription) {
      toast.error("Validation Error", "Asset and problem description are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post("/assets/maintenance", {
        asset_id: formAssetId,
        issue_type: formIssueType,
        problem_description: formDescription,
        vendor_service_center: formVendor || null,
        cost: formCost ? parseFloat(formCost) : 0,
      });
      toast.success("Maintenance Logged", "Repair order has been dispatched.");
      setIsCreateModalOpen(false);
      setFormAssetId("");
      setFormDescription("");
      setFormVendor("");
      setFormCost("");
      loadData(true);
    } catch (err: any) {
      toast.error("Error Creating Order", err.response?.data?.detail || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLogForUpdate) return;
    setIsSubmitting(true);
    try {
      await apiClient.put(`/assets/maintenance/${selectedLogForUpdate.id}`, {
        status: updateStatus,
        resolution_notes: updateResolution || null,
        cost: updateCost ? parseFloat(updateCost) : undefined,
        completion_date: updateStatus === "repaired" || updateStatus === "irreparable" ? new Date().toISOString().slice(0, 10) : null,
      });
      toast.success("Order Updated", `Maintenance status updated to ${updateStatus}.`);
      setIsUpdateModalOpen(false);
      setSelectedLogForUpdate(null);
      setUpdateResolution("");
      loadData(true);
    } catch (err: any) {
      toast.error("Update Failed", err.response?.data?.detail || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (log.asset_tag && log.asset_tag.toLowerCase().includes(q)) ||
      (log.asset_name && log.asset_name.toLowerCase().includes(q)) ||
      (log.problem_description && log.problem_description.toLowerCase().includes(q)) ||
      (log.vendor_service_center && log.vendor_service_center.toLowerCase().includes(q))
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
              Damage & Maintenance Work Orders
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Repair tickets, servicing vendor tracking, costs, and resolution workflows
            </p>
          </div>

          <div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Repair Ticket</span>
            </button>
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
                placeholder="Search ticket, asset tag, problem, vendor..."
                className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(e.target.value, searchQuery)}
              className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700"
            >
              <option value="all">All Ticket Statuses</option>
              <option value="reported">Reported / Queued</option>
              <option value="in_repair">In Repair at Vendor</option>
              <option value="repaired">Repaired & Back in Pool</option>
              <option value="irreparable">Irreparable / Condemned</option>
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
            <span className="font-semibold text-slate-700">{filteredLogs.length}</span> tickets
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
              <p className="text-xs">Loading maintenance tickets...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400">
              <Wrench className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No maintenance tickets found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full text-left border-collapse transition-opacity duration-150 ${isFetching ? "opacity-75" : "opacity-100"}`}>
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Asset Tag / Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Reported Date</th>
                    <th className="py-3 px-4">Problem Description</th>
                    <th className="py-3 px-4">Vendor / Center</th>
                    <th className="py-3 px-4">Cost (BDT)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredLogs.map((log) => {
                    const isClosed = log.status === "repaired" || log.status === "irreparable";
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{log.asset_name || "—"}</div>
                          <div className="font-mono text-[11px] text-indigo-600 font-medium">
                            {log.asset_tag || "—"}
                          </div>
                        </td>
                        <td className="py-3 px-4 capitalize text-slate-600">{log.issue_type}</td>
                        <td className="py-3 px-4 text-slate-600">{log.reported_date}</td>
                        <td className="py-3 px-4 text-slate-700 max-w-xs truncate">{log.problem_description}</td>
                        <td className="py-3 px-4 text-slate-600">{log.vendor_service_center || "—"}</td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-800">
                          {Number(log.cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              log.status === "repaired"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : log.status === "in_repair"
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : log.status === "reported"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {log.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!isClosed && (
                            <button
                              onClick={() => {
                                setSelectedLogForUpdate(log);
                                setUpdateStatus("repaired");
                                setUpdateCost(String(log.cost || ""));
                                setIsUpdateModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                            >
                              <span>Update</span>
                              <ChevronRight className="w-3 h-3" />
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

        {/* Modal: Create Repair Ticket */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 relative">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase">
                <Wrench className="w-4 h-4" />
                <span>Maintenance Work Order</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">Open Repair Ticket</h2>
              <p className="text-xs text-slate-500">Record reported hardware defect, damage, or routine servicing.</p>

              <form onSubmit={handleCreateOrder} className="space-y-3.5 mt-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Select Asset *</label>
                  <select
                    required
                    value={formAssetId}
                    onChange={(e) => setFormAssetId(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="">Select Asset...</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.asset_tag}) - Status: {a.current_status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase">Issue Type</label>
                    <select
                      value={formIssueType}
                      onChange={(e: any) => setFormIssueType(e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="damage">Physical Damage</option>
                      <option value="breakdown">Operational Breakdown</option>
                      <option value="preventive">Preventive Servicing</option>
                      <option value="upgrade">Hardware Upgrade</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase">Estimated Cost (BDT)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formCost}
                      onChange={(e) => setFormCost(e.target.value)}
                      placeholder="0.00"
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Service Vendor / Lab</label>
                  <input
                    type="text"
                    value={formVendor}
                    onChange={(e) => setFormVendor(e.target.value)}
                    placeholder="Authorized Service Center, Local Lab..."
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Problem Description *</label>
                  <textarea
                    required
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Describe specific symptoms, error codes, broken screen, battery failure..."
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                  >
                    {isSubmitting ? "Dispatching..." : "Open Ticket"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Update / Resolve Order */}
        {isUpdateModalOpen && selectedLogForUpdate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative">
              <button
                onClick={() => setIsUpdateModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase">
                <Wrench className="w-4 h-4" />
                <span>Ticket Resolution</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">Update Repair Status</h2>
              <p className="text-xs text-slate-500">
                Updating ticket for <strong className="text-slate-800">{selectedLogForUpdate.asset_tag}</strong>.
              </p>

              <form onSubmit={handleUpdateOrder} className="space-y-3.5 mt-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Current Status</label>
                  <select
                    value={updateStatus}
                    onChange={(e: any) => setUpdateStatus(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="in_repair">In Repair at Vendor</option>
                    <option value="repaired">Repaired (Return asset to pool)</option>
                    <option value="irreparable">Irreparable (Mark asset damaged/condemned)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Final Cost (BDT)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={updateCost}
                    onChange={(e) => setUpdateCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Resolution Notes</label>
                  <textarea
                    rows={3}
                    value={updateResolution}
                    onChange={(e) => setUpdateResolution(e.target.value)}
                    placeholder="Replaced SSD, repaired power supply, re-imaged OS..."
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsUpdateModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                  >
                    {isSubmitting ? "Updating..." : "Save Resolution"}
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
