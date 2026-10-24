"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import { RawAttendanceLog, EmployeeOut } from "@/types";
import {
  ListFilter,
  RefreshCw,
  Search,
  CheckCircle,
  Clock,
  Fingerprint,
  Radio,
  FileCode,
  Plus,
} from "lucide-react";

interface RawAttendanceTabProps {
  currentBusinessId: number;
}

export function RawAttendanceTab({ currentBusinessId }: RawAttendanceTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [logs, setLogs] = useState<RawAttendanceLog[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [processedFilter, setProcessedFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Push Simulation Modal State
  const [isPushModalOpen, setIsPushModalOpen] = useState<boolean>(false);
  const [pushData, setPushData] = useState({
    biometric_user_id: "",
    punch_state: "check_in",
    verification_type: "face",
    punch_time: new Date().toISOString().slice(0, 16),
  });

  const fetchRawLogs = useCallback(
    async (isInitial = false) => {
      if (isInitial) setInitialLoading(true);
      else setIsFetching(true);

      try {
        const params: Record<string, any> = {
          business_id: currentBusinessId,
          limit: 200,
        };
        if (processedFilter !== "all") {
          params.is_processed = processedFilter === "processed";
        }
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;

        const res = await apiClient.get<RawAttendanceLog[]>("/attendance/raw-logs", { params });
        setLogs(res.data || []);
      } catch (err: any) {
        toast.error("Error", err.response?.data?.detail || "Failed to load raw attendance logs.");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [currentBusinessId, processedFilter, startDate, endDate, toast]
  );

  useEffect(() => {
    fetchRawLogs(true);
  }, [fetchRawLogs]);

  const handleSimulatePush = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post("/attendance/raw-logs/push", {
        business_id: currentBusinessId,
        punches: [
          {
            business_id: currentBusinessId,
            biometric_user_id: pushData.biometric_user_id,
            punch_time: new Date(pushData.punch_time).toISOString(),
            punch_state: pushData.punch_state,
            verification_type: pushData.verification_type,
          },
        ],
      });
      toast.success("Punch Ingested", "Simulated punch received by server.");
      setIsPushModalOpen(false);
      fetchRawLogs();
    } catch (err: any) {
      toast.error("Push Failed", err.response?.data?.detail || "Could not push punch.");
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.biometric_user_id.toLowerCase().includes(q) ||
      (log.employee_name && log.employee_name.toLowerCase().includes(q)) ||
      (log.employee_code && log.employee_code.toLowerCase().includes(q)) ||
      (log.device_name && log.device_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Top Rim Loading Progress Invariant */}
      {isFetching && <div className="h-0.5 bg-primary animate-pulse w-full rounded" />}

      {/* Control Header & Filters */}
      <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by ID, name, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-lg bg-background focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Status Filter */}
          <select
            value={processedFilter}
            onChange={(e) => {
              const val = e.target.value;
              startTransition(() => setProcessedFilter(val));
            }}
            className="px-3 py-1.5 text-sm border rounded-lg bg-background text-foreground"
          >
            <option value="all">All Logs</option>
            <option value="unprocessed">Unprocessed (Staged)</option>
            <option value="processed">Processed (Consolidated)</option>
          </select>

          {/* Date Range */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              const val = e.target.value;
              startTransition(() => setStartDate(val));
            }}
            className="px-2.5 py-1.5 text-xs border rounded-lg bg-background text-foreground"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              const val = e.target.value;
              startTransition(() => setEndDate(val));
            }}
            className="px-2.5 py-1.5 text-xs border rounded-lg bg-background text-foreground"
          />
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          <button
            onClick={() => fetchRawLogs()}
            disabled={isFetching}
            className="p-2 border rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh stream"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setIsPushModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium rounded-lg transition-colors border border-primary/20"
          >
            <Radio className="w-3.5 h-3.5" />
            Simulate Device Punch
          </button>
        </div>
      </div>

      {/* Raw Punch Stream Ledger */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="py-3 px-4">Biometric ID</th>
                <th className="py-3 px-4">Matched Employee</th>
                <th className="py-3 px-4">Punch Timestamp</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4">Terminal Device</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initialLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50" />
                    Loading punch logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <FileCode className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No punch records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className={`hover:bg-muted/30 transition-colors ${
                      isFetching ? "opacity-60" : ""
                    }`}
                  >
                    <td className="py-2.5 px-4 font-mono font-medium text-xs text-foreground">
                      {log.biometric_user_id}
                    </td>
                    <td className="py-2.5 px-4">
                      {log.employee_name ? (
                        <div>
                          <span className="font-medium text-foreground block">
                            {log.employee_name}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {log.employee_code}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                          Unassigned ID
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">
                      {new Date(log.punch_time).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-xs font-medium uppercase">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] ${
                          log.punch_state === "check_in"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                        }`}
                      >
                        {log.punch_state.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-xs capitalize text-muted-foreground flex items-center gap-1.5 pt-3.5">
                      <Fingerprint className="w-3.5 h-3.5 text-muted-foreground/70" />
                      {log.verification_type}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-muted-foreground font-mono">
                      {log.device_name || "Direct Push / API"}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          log.is_processed
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {log.is_processed ? "Processed" : "Pending Sync"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulate Punch Push Modal */}
      {isPushModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border rounded-xl max-w-sm w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-semibold text-foreground">
                Simulate Hardware Punch
              </h3>
              <button
                onClick={() => setIsPushModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSimulatePush} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Biometric / RFID ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BIO-101 or Card #"
                  value={pushData.biometric_user_id}
                  onChange={(e) =>
                    setPushData({ ...pushData, biometric_user_id: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Punch Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={pushData.punch_time}
                  onChange={(e) => setPushData({ ...pushData, punch_time: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Punch State
                  </label>
                  <select
                    value={pushData.punch_state}
                    onChange={(e) => setPushData({ ...pushData, punch_state: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-background"
                  >
                    <option value="check_in">Check In</option>
                    <option value="check_out">Check Out</option>
                    <option value="auto">Auto / General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Verification
                  </label>
                  <select
                    value={pushData.verification_type}
                    onChange={(e) =>
                      setPushData({ ...pushData, verification_type: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-background"
                  >
                    <option value="face">Face Recognition</option>
                    <option value="fingerprint">Fingerprint</option>
                    <option value="rfid">RFID Card</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsPushModalOpen(false)}
                  className="px-3.5 py-1.5 border rounded-lg text-xs hover:bg-accent text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90"
                >
                  Push Punch Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
