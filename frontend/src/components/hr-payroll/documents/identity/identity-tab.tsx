"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import { EmployeeIdentityRecord, EmployeeOut } from "@/types";
import { SearchableEmployeeCombobox } from "@/components/common/searchable-employee-combobox";
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Search,
  Globe,
  Flag,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Trash2,
} from "lucide-react";

interface IdentityTabProps {
  currentBusinessId: number;
  employees: EmployeeOut[];
}

export function IdentityTab({ currentBusinessId, employees }: IdentityTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [records, setRecords] = useState<EmployeeIdentityRecord[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Filters
  const [activeSegment, setActiveSegment] = useState<"all" | "domestic" | "expatriate">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    identity_type: "nid_smart_card" as EmployeeIdentityRecord["identity_type"],
    document_number: "",
    issuing_country: "Bangladesh",
    issuing_authority: "",
    issue_date: "",
    expiry_date: "",
    visa_category: "",
    document_file_url: "",
    alert_threshold_days: 30,
    is_primary: true,
  });

  const fetchIdentityRecords = useCallback(
    async (isInitial = false) => {
      if (isInitial) setInitialLoading(true);
      else setIsFetching(true);

      try {
        const res = await apiClient.get<EmployeeIdentityRecord[]>(
          `/documents/identity-records?business_id=${currentBusinessId}`
        );
        setRecords(res.data || []);
      } catch (err: any) {
        toast.error("Error", err.response?.data?.detail || "Failed to load identity records.");
      } finally {
        if (isInitial) setInitialLoading(false);
        else setIsFetching(false);
      }
    },
    [currentBusinessId, toast]
  );

  useEffect(() => {
    fetchIdentityRecords(true);
  }, [fetchIdentityRecords]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id) {
      toast.error("Validation Error", "Please select an employee.");
      return;
    }
    const docNum = formData.document_number.trim();
    if (!docNum) {
      toast.error("Validation Error", "Document number is required.");
      return;
    }

    // Bangladesh statutory validation
    if (formData.identity_type === "nid_smart_card" && !/^\d{10}$/.test(docNum)) {
      toast.error("Validation Error", "Smart NID must be exactly 10 numeric digits.");
      return;
    }
    if (formData.identity_type === "tin_certificate" && !/^\d{12}$/.test(docNum)) {
      toast.error("Validation Error", "Bangladesh e-TIN must be exactly 12 numeric digits.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        business_id: currentBusinessId,
        ...formData,
        issue_date: formData.issue_date || null,
        expiry_date: formData.expiry_date || null,
        document_file_url: formData.document_file_url || null,
      };

      await apiClient.post("/documents/identity-records", payload);
      toast.success("Success", "Identity credential added successfully.");
      setIsCreateOpen(false);
      setFormData({
        employee_id: "",
        identity_type: "nid_smart_card",
        document_number: "",
        issuing_country: "Bangladesh",
        issuing_authority: "",
        issue_date: "",
        expiry_date: "",
        visa_category: "",
        document_file_url: "",
        alert_threshold_days: 30,
        is_primary: true,
      });
      fetchIdentityRecords();
    } catch (err: any) {
      toast.error("Creation Failed", err.response?.data?.detail || "Could not create record.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm("Remove this identity credential?")) return;
    try {
      await apiClient.delete(`/documents/identity-records/${recordId}`);
      toast.success("Deleted", "Identity record removed.");
      fetchIdentityRecords();
    } catch (err: any) {
      toast.error("Delete Failed", err.response?.data?.detail || "Could not delete record.");
    }
  };

  const filteredItems = records.filter((rec) => {
    if (activeSegment === "domestic") {
      if (!["nid_smart_card", "nid_classic", "tin_certificate", "birth_registration", "police_clearance"].includes(rec.identity_type)) {
        return false;
      }
    } else if (activeSegment === "expatriate") {
      if (!["passport", "work_permit_bida", "work_permit_bepza", "work_visa"].includes(rec.identity_type)) {
        return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (rec.employee_name || "").toLowerCase();
      const code = (rec.employee_code || "").toLowerCase();
      const doc = rec.document_number.toLowerCase();
      const country = rec.issuing_country.toLowerCase();
      if (!name.includes(q) && !code.includes(q) && !doc.includes(q) && !country.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const getIdentityBadge = (type: EmployeeIdentityRecord["identity_type"]) => {
    const labels: Record<string, { label: string; color: string }> = {
      nid_smart_card: { label: "Smart NID (10-Digit)", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
      nid_classic: { label: "Classic NID", color: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400" },
      passport: { label: "Passport", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
      work_permit_bida: { label: "BIDA Work Permit", color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400" },
      work_permit_bepza: { label: "BEPZA Work Permit", color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400" },
      work_visa: { label: "Employment Visa", color: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400" },
      tin_certificate: { label: "e-TIN (12-Digit)", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
      police_clearance: { label: "Police Clearance", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
      driving_license: { label: "Driving License", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
      birth_registration: { label: "Birth Certificate", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    };
    const info = labels[type] || { label: type, color: "bg-slate-100 text-slate-700" };
    return <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${info.color}`}>{info.label}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            ID, Passport, Visa & Work Permit Tracking
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Statutory national credentials for local personnel (Smart NID, e-TIN) and immigration permits for expatriates (BIDA / BEPZA).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchIdentityRecords()}
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
            Add Identity Record
          </button>
        </div>
      </div>

      {/* Segment / Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Pills */}
        <div className="flex items-center gap-2">
          {[
            { key: "all", label: "All Credentials" },
            { key: "domestic", label: "Domestic (NID / TIN)" },
            { key: "expatriate", label: "Expatriate (Passport / Visa / BIDA)" },
          ].map((seg) => (
            <button
              key={seg.key}
              type="button"
              onClick={() => {
                startTransition(() => {
                  setActiveSegment(seg.key as any);
                });
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeSegment === seg.key
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {seg.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee, ID # or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {(isFetching || isPending) && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary-100 dark:bg-primary-950 overflow-hidden z-20">
            <div className="h-full bg-primary-600 animate-pulse w-full" />
          </div>
        )}

        {initialLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-600 mb-3" />
            <p className="text-sm font-medium">Loading statutory identity records...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <ShieldCheck className="w-12 h-12 stroke-[1.5] mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
              No identity records found
            </p>
            <p className="text-sm mt-1">There are no records matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Credential Type</th>
                  <th className="px-6 py-4">Document Number</th>
                  <th className="px-6 py-4">Issuing Country & Authority</th>
                  <th className="px-6 py-4">Validity</th>
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

                    <td className="px-6 py-4 whitespace-nowrap">{getIdentityBadge(item.identity_type)}</td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-sm bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {item.document_number}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-700 dark:text-slate-300">
                      <div className="font-medium flex items-center gap-1 text-slate-900 dark:text-white">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        {item.issuing_country}
                      </div>
                      {item.issuing_authority && (
                        <div className="text-slate-400 mt-0.5">{item.issuing_authority}</div>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      {item.expiry_date ? (
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">
                            Exp: {item.expiry_date}
                          </div>
                          {item.issue_date && (
                            <div className="text-slate-400">Issued: {item.issue_date}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Permanent / No Expiry
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Identity Credential */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary-600" />
                Add Identity / Immigration Credential
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
                <SearchableEmployeeCombobox
                  employees={employees}
                  value={formData.employee_id}
                  onChange={(empId) => setFormData({ ...formData, employee_id: empId })}
                  placeholder="Search & select employee..."
                  allowClear={false}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Credential Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.identity_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        identity_type: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="nid_smart_card">Smart NID (10-Digit)</option>
                    <option value="nid_classic">Classic NID (13/17-Digit)</option>
                    <option value="tin_certificate">Bangladesh e-TIN (12-Digit)</option>
                    <option value="passport">International Passport</option>
                    <option value="work_permit_bida">BIDA Work Permit</option>
                    <option value="work_permit_bepza">BEPZA Work Permit</option>
                    <option value="work_visa">Employment E-Visa</option>
                    <option value="police_clearance">Police Clearance</option>
                    <option value="driving_license">Driving License</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Document Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      formData.identity_type === "nid_smart_card"
                        ? "10 digits (e.g. 1990123456)"
                        : formData.identity_type === "tin_certificate"
                        ? "12 digits (e.g. 123456789012)"
                        : "Enter document number"
                    }
                    value={formData.document_number}
                    onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Issuing Country
                  </label>
                  <input
                    type="text"
                    value={formData.issuing_country}
                    onChange={(e) => setFormData({ ...formData, issuing_country: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Issuing Authority
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Election Commission / BIDA / NBR"
                    value={formData.issuing_authority}
                    onChange={(e) => setFormData({ ...formData, issuing_authority: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
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
                  Save Credential
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
