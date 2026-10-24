"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import { EmployeeAgreement, EmployeeOut } from "@/types";
import {
  FileSignature,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  RotateCw,
  Trash2,
  FileText,
  DollarSign,
  Shield,
} from "lucide-react";

interface AgreementsTabProps {
  currentBusinessId: number;
  employees: EmployeeOut[];
}

export function AgreementsTab({ currentBusinessId, employees }: AgreementsTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [agreements, setAgreements] = useState<EmployeeAgreement[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState({
    employee_id: "",
    agreement_type: "permanent_contract" as EmployeeAgreement["agreement_type"],
    reference_no: "",
    title: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    notice_period_days: 30,
    probation_months: 3,
    bond_amount: 0,
    governing_law: "Laws of Bangladesh (BLA 2006)",
  });

  // Renewal Modal
  const [isRenewOpen, setIsRenewOpen] = useState<boolean>(false);
  const [renewingAgreement, setRenewingAgreement] = useState<EmployeeAgreement | null>(null);
  const [renewForm, setRenewForm] = useState({
    new_start_date: new Date().toISOString().split("T")[0],
    new_end_date: "",
    new_reference_no: "",
  });
  const [processingRenew, setProcessingRenew] = useState<boolean>(false);

  const fetchAgreements = useCallback(
    async (isInitial = false) => {
      if (isInitial) setInitialLoading(true);
      else setIsFetching(true);

      try {
        const params = new URLSearchParams();
        params.set("business_id", String(currentBusinessId));
        if (typeFilter !== "all") params.set("agreement_type", typeFilter);
        if (statusFilter !== "all") params.set("agreement_status", statusFilter);

        const res = await apiClient.get<EmployeeAgreement[]>(
          `/documents/agreements?${params.toString()}`
        );
        setAgreements(res.data || []);
      } catch (err: any) {
        toast.error("Error", err.response?.data?.detail || "Failed to load employment agreements.");
      } finally {
        if (isInitial) setInitialLoading(false);
        else setIsFetching(false);
      }
    },
    [currentBusinessId, typeFilter, statusFilter, toast]
  );

  useEffect(() => {
    fetchAgreements(true);
  }, [fetchAgreements]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.employee_id) {
      toast.error("Validation Error", "Please select an employee.");
      return;
    }
    if (!createForm.reference_no.trim()) {
      toast.error("Validation Error", "Please enter a reference number.");
      return;
    }
    if (!createForm.title.trim()) {
      toast.error("Validation Error", "Please enter an agreement title.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        business_id: currentBusinessId,
        ...createForm,
        end_date: createForm.end_date || null,
        bond_amount: createForm.bond_amount > 0 ? createForm.bond_amount : null,
        status: "active",
      };

      await apiClient.post("/documents/agreements", payload);
      toast.success("Created", "Employment agreement recorded successfully.");
      setIsCreateOpen(false);
      setCreateForm({
        employee_id: "",
        agreement_type: "permanent_contract",
        reference_no: "",
        title: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        notice_period_days: 30,
        probation_months: 3,
        bond_amount: 0,
        governing_law: "Laws of Bangladesh (BLA 2006)",
      });
      fetchAgreements();
    } catch (err: any) {
      toast.error("Creation Failed", err.response?.data?.detail || "Could not save agreement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingAgreement) return;

    setProcessingRenew(true);
    try {
      await apiClient.post(`/documents/agreements/${renewingAgreement.id}/renew`, {
        new_start_date: renewForm.new_start_date,
        new_end_date: renewForm.new_end_date || null,
        new_reference_no: renewForm.new_reference_no || undefined,
      });

      toast.success("Renewed", "Agreement renewed successfully.");
      setIsRenewOpen(false);
      setRenewingAgreement(null);
      fetchAgreements();
    } catch (err: any) {
      toast.error("Renewal Failed", err.response?.data?.detail || "Could not renew agreement.");
    } finally {
      setProcessingRenew(false);
    }
  };

  const handleDelete = async (agrId: string) => {
    if (!confirm("Are you sure you want to delete this agreement record?")) return;
    try {
      await apiClient.delete(`/documents/agreements/${agrId}`);
      toast.success("Deleted", "Agreement record deleted.");
      fetchAgreements();
    } catch (err: any) {
      toast.error("Delete Failed", err.response?.data?.detail || "Could not delete.");
    }
  };

  const filteredItems = agreements.filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (item.employee_name || "").toLowerCase();
      const code = (item.employee_code || "").toLowerCase();
      const ref = item.reference_no.toLowerCase();
      const title = item.title.toLowerCase();
      if (!name.includes(q) && !code.includes(q) && !ref.includes(q) && !title.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const getStatusBadge = (status: EmployeeAgreement["status"]) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> Active
          </span>
        );
      case "renewed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400">
            <RotateCw className="w-3 h-3" /> Renewed
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400">
            <AlertTriangle className="w-3 h-3" /> Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            <Clock className="w-3 h-3" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            Contracts, NDAs & Agreement Management
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Employment contracts, non-disclosure deeds, non-compete agreements, and training bond lifecycles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAgreements()}
            disabled={isFetching}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-primary-600" : ""}`} />
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm transition-all shadow-md shadow-primary-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New Agreement
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee, title, or reference #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => {
              const val = e.target.value;
              startTransition(() => {
                setTypeFilter(val);
              });
            }}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Types</option>
            <option value="permanent_contract">Permanent Contract</option>
            <option value="probation_contract">Probation Contract</option>
            <option value="fixed_term_contract">Fixed Term Contract</option>
            <option value="nda">Non-Disclosure Agreement (NDA)</option>
            <option value="non_compete">Non-Compete Deed</option>
            <option value="training_bond">Training & Service Bond</option>
            <option value="consultancy_agreement">Consultancy Agreement</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              const val = e.target.value;
              startTransition(() => {
                setStatusFilter(val);
              });
            }}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="renewed">Renewed</option>
            <option value="expired">Expired</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {(isFetching || isPending) && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary-100 dark:bg-primary-950 overflow-hidden z-20">
            <div className="h-full bg-primary-600 animate-pulse w-full" />
          </div>
        )}

        {initialLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-600 mb-3" />
            <p className="text-sm font-medium">Loading agreements ledger...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <FileSignature className="w-12 h-12 stroke-[1.5] mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
              No agreements recorded
            </p>
            <p className="text-sm mt-1">There are no agreements matching the selected filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Title & Ref #</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Tenure</th>
                  <th className="px-6 py-4">Notice & Bond</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {item.employee_name || "Employee"}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-[11px]">
                          {item.employee_code || "—"}
                        </span>
                        {item.department_name && (
                          <span className="truncate max-w-[130px]">{item.department_name}</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white text-sm">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        Ref: {item.reference_no}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium capitalize">
                        {item.agreement_type.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-700 dark:text-slate-300">
                      <div>Start: {item.start_date}</div>
                      <div className="text-slate-400">
                        {item.end_date ? `End: ${item.end_date}` : "Indefinite / Permanent"}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <div>Notice: {item.notice_period_days} days</div>
                      {item.bond_amount && (
                        <div className="text-amber-600 dark:text-amber-400 font-mono">
                          Bond: BDT {Number(item.bond_amount).toLocaleString()}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(item.status)}</td>

                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {item.status === "active" && (
                          <button
                            onClick={() => {
                              setRenewingAgreement(item);
                              setRenewForm({
                                new_start_date: new Date().toISOString().split("T")[0],
                                new_end_date: "",
                                new_reference_no: `${item.reference_no}-R`,
                              });
                              setIsRenewOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 transition-colors"
                          >
                            Renew
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete agreement"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modal: New Agreement */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-primary-600" />
                Record New Agreement
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={createForm.employee_id}
                  onChange={(e) => setCreateForm({ ...createForm, employee_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_id || "No ID"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Agreement Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={createForm.agreement_type}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        agreement_type: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="permanent_contract">Permanent Employment Contract</option>
                    <option value="probation_contract">Probationary Contract</option>
                    <option value="fixed_term_contract">Fixed-Term Contract</option>
                    <option value="nda">Non-Disclosure Agreement (NDA)</option>
                    <option value="non_compete">Non-Compete Deed</option>
                    <option value="training_bond">Training & Service Bond</option>
                    <option value="consultancy_agreement">Consultancy Agreement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Reference # <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP/AGR/2026/001"
                    value={createForm.reference_no}
                    onChange={(e) => setCreateForm({ ...createForm, reference_no: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Agreement Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Software Engineer Employment Contract"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Effective Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={createForm.start_date}
                    onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    End Date (Leave blank if permanent)
                  </label>
                  <input
                    type="date"
                    value={createForm.end_date}
                    onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Notice Period (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={createForm.notice_period_days}
                    onChange={(e) => setCreateForm({ ...createForm, notice_period_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Service Bond Amount (BDT)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={createForm.bond_amount}
                    onChange={(e) => setCreateForm({ ...createForm, bond_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-600/20 disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Save Agreement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Renew Agreement */}
      {isRenewOpen && renewingAgreement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <RotateCw className="w-5 h-5 text-blue-600" />
                Renew Employment Agreement
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                For {renewingAgreement.employee_name} ({renewingAgreement.reference_no})
              </p>
            </div>

            <form onSubmit={handleRenewSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  New Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={renewForm.new_start_date}
                  onChange={(e) => setRenewForm({ ...renewForm, new_start_date: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  New End Date
                </label>
                <input
                  type="date"
                  value={renewForm.new_end_date}
                  onChange={(e) => setRenewForm({ ...renewForm, new_end_date: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Renewed Reference #
                </label>
                <input
                  type="text"
                  placeholder={`${renewingAgreement.reference_no}-R`}
                  value={renewForm.new_reference_no}
                  onChange={(e) => setRenewForm({ ...renewForm, new_reference_no: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRenewOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingRenew}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {processingRenew && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Confirm Renewal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
