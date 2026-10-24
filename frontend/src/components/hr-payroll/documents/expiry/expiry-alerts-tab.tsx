"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import { DocumentRenewalAlert, EmployeeOut } from "@/types";
import {
  Bell,
  RefreshCw,
  Search,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  RotateCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

interface ExpiryAlertsTabProps {
  currentBusinessId: number;
  employees: EmployeeOut[];
}

export function ExpiryAlertsTab({ currentBusinessId, employees }: ExpiryAlertsTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [alerts, setAlerts] = useState<DocumentRenewalAlert[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Filters
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>("all");
  const [resolutionFilter, setResolutionFilter] = useState<string>("unresolved");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Resolve / Renew Modal
  const [isUpdateOpen, setIsUpdateOpen] = useState<boolean>(false);
  const [selectedAlert, setSelectedAlert] = useState<DocumentRenewalAlert | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [updateForm, setUpdateForm] = useState({
    renewal_status: "in_progress",
    tracking_reference: "",
    notes: "",
  });

  const fetchAlerts = useCallback(
    async (showBackgroundFetching: boolean = true) => {
      if (showBackgroundFetching) setIsFetching(true);
      try {
        const queryParams = new URLSearchParams();
        queryParams.append("business_id", currentBusinessId.toString());
        if (targetTypeFilter !== "all") queryParams.append("target_type", targetTypeFilter);
        if (resolutionFilter === "unresolved") queryParams.append("is_resolved", "false");
        else if (resolutionFilter === "resolved") queryParams.append("is_resolved", "true");

        const res = await apiClient.get<DocumentRenewalAlert[]>(
          `/documents/expiry-alerts?${queryParams.toString()}`
        );
        setAlerts(res.data || []);
      } catch (err: any) {
        console.error("Failed to load expiry alerts:", err);
        toast.error("Error", err.message || "Could not fetch expiry alerts");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [currentBusinessId, targetTypeFilter, resolutionFilter, toast]
  );

  useEffect(() => {
    fetchAlerts(false);
  }, [fetchAlerts]);

  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    startTransition(() => {
      setter(val);
    });
  };

  const handleTriggerScan = async () => {
    setIsScanning(true);
    try {
      const res = await apiClient.post<{ scanned_items: number; generated_alerts: number }>(
        `/documents/expiry-alerts/scan?business_id=${currentBusinessId}&threshold_days=60`,
        {}
      );
      toast.success(
        "Scan Complete",
        `Scanned ${res.data?.scanned_items ?? 0} records, found ${res.data?.generated_alerts ?? 0} new expiring items.`
      );
      fetchAlerts(true);
    } catch (err: any) {
      toast.error("Scan Failed", err.message || "Failed to run expiry scanner");
    } finally {
      setIsScanning(false);
    }
  };

  const openUpdateModal = (alert: DocumentRenewalAlert) => {
    setSelectedAlert(alert);
    setUpdateForm({
      renewal_status: alert.renewal_status,
      tracking_reference: alert.tracking_reference || "",
      notes: alert.notes || "",
    });
    setIsUpdateOpen(true);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;
    setSubmitting(true);
    try {
      const payload = {
        renewal_status: updateForm.renewal_status,
        tracking_reference: updateForm.tracking_reference,
        notes: updateForm.notes,
      };

      await apiClient.put(
        `/documents/expiry-alerts/${selectedAlert.id}?business_id=${currentBusinessId}`,
        payload
      );
      toast.success(
        "Alert Updated",
        `Renewal status updated to ${updateForm.renewal_status.replace("_", " ")}.`
      );
      setIsUpdateOpen(false);
      setSelectedAlert(null);
      fetchAlerts(true);
    } catch (err: any) {
      toast.error("Update Failed", err.message || "Failed to update alert");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered in-memory
  const filteredAlerts = alerts.filter((a) => {
    if (urgencyFilter === "overdue" && a.days_remaining >= 0) return false;
    if (urgencyFilter === "critical" && (a.days_remaining < 0 || a.days_remaining > 15)) return false;
    if (urgencyFilter === "warning" && (a.days_remaining <= 15 || a.days_remaining > 30)) return false;
    if (urgencyFilter === "info" && a.days_remaining <= 30) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const empName = a.employee_name?.toLowerCase() || "";
    const empCode = a.employee_code?.toLowerCase() || "";
    const title = a.document_title?.toLowerCase() || "";
    return empName.includes(q) || empCode.includes(q) || title.includes(q);
  });

  const overdueCount = alerts.filter((a) => a.days_remaining < 0 && a.renewal_status !== "renewed").length;
  const criticalCount = alerts.filter(
    (a) => a.days_remaining >= 0 && a.days_remaining <= 15 && a.renewal_status !== "renewed"
  ).length;
  const inProgressCount = alerts.filter(
    (a) => a.renewal_status === "in_progress"
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Open Alerts
            </p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
              {alerts.filter((a) => a.renewal_status !== "renewed").length}
            </h3>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
            <Bell className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-rose-200 dark:border-rose-900/50 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-500 dark:text-rose-400 uppercase tracking-wider">
              Overdue / Expired
            </p>
            <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {overdueCount}
            </h3>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-amber-200 dark:border-amber-900/50 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-wider">
              Critical (&lt; 15 Days)
            </p>
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {criticalCount}
            </h3>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-wider">
              Renewals In Progress
            </p>
            <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
              {inProgressCount}
            </h3>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
            <RotateCw className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Urgency Filter */}
          <div className="flex bg-slate-100 dark:bg-slate-700/60 p-1 rounded-lg">
            {["all", "overdue", "critical", "warning", "info"].map((level) => (
              <button
                key={level}
                onClick={() => handleFilterChange(setUrgencyFilter, level)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                  urgencyFilter === level
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {level === "all" ? "All Urgency" : level}
              </button>
            ))}
          </div>

          {/* Resolution Filter */}
          <select
            value={resolutionFilter}
            onChange={(e) => handleFilterChange(setResolutionFilter, e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="unresolved">Open / Pending Alerts</option>
            <option value="resolved">Resolved & Renewed</option>
            <option value="all">All Statuses</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search employee or document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
            />
          </div>

          {/* Trigger Scan Button */}
          <button
            onClick={handleTriggerScan}
            disabled={isScanning}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all rounded-lg shadow-sm disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
            {isScanning ? "Scanning Engine..." : "Run Expiry Scan"}
          </button>

          {/* Refresh */}
          <button
            onClick={() => fetchAlerts(true)}
            className="p-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
            title="Refresh alerts"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Alert Table with In-Place Non-Destructive Filtering */}
      <div className="relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {(isPending || isFetching) && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-100 overflow-hidden z-10">
            <div className="w-full h-full bg-blue-600 origin-left animate-indeterminate"></div>
          </div>
        )}

        <div
          className={`overflow-x-auto transition-opacity duration-200 ${
            isPending || isFetching ? "opacity-60" : "opacity-100"
          }`}
        >
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Target Document</th>
                <th className="px-4 py-3">Category / Alert Type</th>
                <th className="px-4 py-3">Expiry Date</th>
                <th className="px-4 py-3">Days Remaining</th>
                <th className="px-4 py-3">Renewal Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                      All Document Clearances Current
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      No document, passport, or agreement renewals are overdue or pending attention.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => {
                  const isOverdue = alert.days_remaining < 0;
                  const isCritical = alert.days_remaining >= 0 && alert.days_remaining <= 15;

                  return (
                    <tr
                      key={alert.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-colors ${
                        isOverdue ? "bg-rose-50/20 dark:bg-rose-950/10" : ""
                      }`}
                    >
                      {/* Employee */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-xs shrink-0">
                            {alert.employee_name ? alert.employee_name[0] : "E"}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-white">
                              {alert.employee_name || "Employee"}
                            </p>
                            <p className="text-[11px] text-slate-400">{alert.employee_code}</p>
                          </div>
                        </div>
                      </td>

                      {/* Target Document */}
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {alert.document_title}
                      </td>

                      {/* Category / Type */}
                      <td className="px-4 py-3 capitalize">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {alert.alert_type}
                        </span>
                      </td>

                      {/* Expiry Date */}
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {alert.expiry_date}
                        </span>
                      </td>

                      {/* Days Remaining */}
                      <td className="px-4 py-3">
                        <span
                          className={`font-semibold ${
                            alert.days_remaining < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : alert.days_remaining <= 15
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {alert.days_remaining < 0
                            ? `${Math.abs(alert.days_remaining)}d overdue`
                            : `${alert.days_remaining} days left`}
                        </span>
                      </td>

                      {/* Renewal Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                            alert.renewal_status === "renewed"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : alert.renewal_status === "in_progress"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                              : isOverdue
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : isCritical
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {alert.renewal_status.replace("_", " ")}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openUpdateModal(alert)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded transition-all"
                        >
                          Manage Renewal
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update / Manage Renewal Modal */}
      {isUpdateOpen && selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-scaleUp">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Update Renewal Workflow
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Target: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedAlert.document_title}</span>
                </p>
              </div>
              <button
                onClick={() => setIsUpdateOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedAlert.employee_name || "N/A"} ({selectedAlert.employee_code})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Expiry:</span>
                  <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                    {selectedAlert.expiry_date} ({selectedAlert.days_remaining} days)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Renewal Stage / Status *
                </label>
                <select
                  value={updateForm.renewal_status}
                  onChange={(e) =>
                    setUpdateForm({
                      ...updateForm,
                      renewal_status: e.target.value,
                    })
                  }
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending HR Review</option>
                  <option value="in_progress">In Progress (Application Submitted)</option>
                  <option value="renewed">Renewed & Fully Cleared</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tracking / Reference Number
                </label>
                <input
                  type="text"
                  value={updateForm.tracking_reference}
                  onChange={(e) =>
                    setUpdateForm({ ...updateForm, tracking_reference: e.target.value })
                  }
                  placeholder="e.g. BIDA-RNW-2026-9901"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Resolution Notes & Evidence
                </label>
                <textarea
                  rows={3}
                  value={updateForm.notes}
                  onChange={(e) =>
                    setUpdateForm({ ...updateForm, notes: e.target.value })
                  }
                  placeholder="e.g. Passport renewal slip submitted to High Commission on Oct 2026. Ref: TK-99812"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsUpdateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Resolution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
