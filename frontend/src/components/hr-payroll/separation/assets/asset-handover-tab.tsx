"use client";

import React, { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import {
  Laptop,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  Tag,
  Calendar,
  X,
  Check,
  Building,
  User,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import { AssetHandoverItem, EmployeeOut } from "@/types";
import { SearchableEmployeeCombobox } from "@/components/common/searchable-employee-combobox";

interface AssetHandoverTabProps {
  currentBusinessId: number;
}

export function AssetHandoverTab({ currentBusinessId }: AssetHandoverTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Data states
  const [employees, setEmployees] = useState<EmployeeOut[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [assets, setAssets] = useState<AssetHandoverItem[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Return asset modal
  const [selectedAssignment, setSelectedAssignment] = useState<AssetHandoverItem | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);
  const [returnCondition, setReturnCondition] = useState<string>("good");
  const [returnNotes, setReturnNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await apiClient.get<EmployeeOut[]>("/employees", {
        params: { business_id: currentBusinessId, limit: 300 },
      });
      setEmployees(res.data || []);
      if (res.data && res.data.length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(res.data[0].id);
      }
    } catch {
      // ignore
    }
  }, [currentBusinessId, selectedEmployeeId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Fetch assets for selected employee
  const fetchEmployeeAssets = useCallback(
    async (empId: string, isBackground = false) => {
      if (!empId) return;
      if (isBackground) setIsFetching(true);
      else setInitialLoading(true);

      try {
        const res = await apiClient.get<AssetHandoverItem[]>(`/separation/employees/${empId}/assets`, {
          params: { business_id: currentBusinessId },
        });
        setAssets(res.data || []);
      } catch (err: any) {
        toast.error("Failed to load assets", err.response?.data?.detail || "Could not retrieve employee assets.");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [currentBusinessId, toast]
  );

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchEmployeeAssets(selectedEmployeeId);
    }
  }, [selectedEmployeeId, fetchEmployeeAssets]);

  // Handle Return Asset Submit
  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    setIsSubmitting(true);
    try {
      await apiClient.post(
        `/separation/assets/${selectedAssignment.assignment_id}/return`,
        {
          return_condition: returnCondition,
          return_notes: returnNotes,
        },
        { params: { business_id: currentBusinessId } }
      );
      toast.success(
        "Asset Returned",
        `${selectedAssignment.asset_name} marked as returned (${returnCondition}).`
      );
      setIsReturnModalOpen(false);
      fetchEmployeeAssets(selectedEmployeeId, true);
    } catch (err: any) {
      toast.error(
        "Return Failed",
        err.response?.data?.detail || "Failed to process asset return."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedEmp = useMemo(() => {
    return employees.find((e) => e.id === selectedEmployeeId);
  }, [employees, selectedEmployeeId]);

  const stats = useMemo(() => {
    const total = assets.length;
    const returned = assets.filter((a) => a.status === "returned").length;
    const pending = assets.filter((a) => a.status !== "returned").length;
    return { total, returned, pending };
  }, [assets]);

  return (
    <div className="space-y-6">
      {/* Employee Selector Bar */}
      <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <User className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Select Separating / Offboarding Employee
            </label>
            <SearchableEmployeeCombobox
              employees={employees}
              value={selectedEmployeeId}
              onChange={(empId) => setSelectedEmployeeId(empId)}
              placeholder="Search & select separating employee..."
              allowClear={true}
              emptyUnassignedLabel="-- Select Separating Employee --"
            />
          </div>
        </div>

        <button
          onClick={() => fetchEmployeeAssets(selectedEmployeeId, true)}
          disabled={!selectedEmployeeId}
          className="p-2 self-end sm:self-center text-muted-foreground hover:text-foreground rounded-lg border hover:bg-muted transition"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Allocated Assets</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Laptop className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Handover</p>
            <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{stats.pending}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Handed Over / Returned</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{stats.returned}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden relative">
        {isFetching && (
          <div className="h-0.5 bg-primary/20 overflow-hidden relative">
            <div className="h-full bg-primary animate-pulse w-full" />
          </div>
        )}

        <div className={`overflow-x-auto transition-opacity duration-150 ${isFetching ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Asset Tag</th>
                <th className="px-4 py-3">Asset Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Assigned Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Handover Notes</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {initialLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading assigned assets...
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No physical assets currently allocated to this employee.
                  </td>
                </tr>
              ) : (
                assets.map((a) => (
                  <tr key={a.assignment_id} className="hover:bg-muted/40 transition">
                    <td className="px-4 py-3 font-mono font-medium text-xs text-primary">
                      {a.asset_tag}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {a.asset_name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {a.category || "General Asset"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {a.assigned_date || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {a.status === "returned" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Returned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                          <Clock className="w-3.5 h-3.5" /> In Custody
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                      {a.condition_notes || "—"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {a.status !== "returned" ? (
                        <button
                          onClick={() => {
                            setSelectedAssignment(a);
                            setReturnCondition("good");
                            setReturnNotes("");
                            setIsReturnModalOpen(true);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition inline-flex items-center gap-1 shadow-sm"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Handover Return
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Cleared</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Asset Modal */}
      {isReturnModalOpen && selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-foreground">Process Asset Handover</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedAssignment.asset_name} ({selectedAssignment.asset_tag})
                </p>
              </div>
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Physical Return Condition *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReturnCondition("good")}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      returnCondition === "good"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-600"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" /> Good / Intact
                  </button>

                  <button
                    type="button"
                    onClick={() => setReturnCondition("fair")}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      returnCondition === "fair"
                        ? "bg-amber-500/10 border-amber-500 text-amber-600"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    Fair Wear
                  </button>

                  <button
                    type="button"
                    onClick={() => setReturnCondition("damaged")}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      returnCondition === "damaged"
                        ? "bg-rose-500/10 border-rose-500 text-rose-600"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Damaged
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Inspection & Condition Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail screen condition, charger return, accessories, or damage observations..."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-muted-foreground hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition"
                >
                  {isSubmitting ? "Processing..." : "Confirm Return"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
