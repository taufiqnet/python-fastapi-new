"use client";

import React, { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RefreshCw,
  Plus,
  Printer,
  FileCheck,
  Award,
  ExternalLink,
  Eye,
  X,
  FileText,
  User,
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import { ReleaseLetter, EmployeeSeparation } from "@/types";

interface ReleaseLetterTabProps {
  currentBusinessId: number;
}

export function ReleaseLetterTab({ currentBusinessId }: ReleaseLetterTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Data states
  const [letters, setLetters] = useState<ReleaseLetter[]>([]);
  const [separations, setSeparations] = useState<EmployeeSeparation[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form state
  const [formData, setFormData] = useState({
    separation_id: "",
    issue_date: new Date().toISOString().split("T")[0],
    effective_exit_date: new Date().toISOString().split("T")[0],
    designation: "",
    department: "",
    letter_content: "",
  });

  // Fetch release letters
  const fetchLetters = useCallback(
    async (isBackground = false) => {
      if (isBackground) setIsFetching(true);
      else setInitialLoading(true);

      try {
        const res = await apiClient.get<ReleaseLetter[]>("/separation/release-letters", {
          params: { business_id: currentBusinessId },
        });
        setLetters(res.data || []);
      } catch (err: any) {
        toast.error("Failed to load release letters", err.response?.data?.detail || "Could not retrieve release letters.");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [currentBusinessId, toast]
  );

  // Fetch separations for dropdown
  const fetchSeparations = useCallback(async () => {
    try {
      const res = await apiClient.get<EmployeeSeparation[]>("/separation/separations", {
        params: { business_id: currentBusinessId, limit: 100 },
      });
      setSeparations(res.data || []);
    } catch {
      // ignore
    }
  }, [currentBusinessId]);

  useEffect(() => {
    fetchLetters();
    fetchSeparations();
  }, [fetchLetters, fetchSeparations]);

  // When separation is selected in modal, prepopulate fields
  const handleSeparationSelect = (sepId: string) => {
    const sep = separations.find((s) => s.id === sepId);
    if (sep) {
      const empName = `${sep.employee?.first_name || ""} ${sep.employee?.last_name || ""}`;
      const title = sep.employee?.designation || "Staff";
      const dept = sep.employee?.department || "Operations";
      const exitDate = sep.last_working_date;

      setFormData({
        separation_id: sep.id,
        issue_date: new Date().toISOString().split("T")[0],
        effective_exit_date: exitDate,
        designation: title,
        department: dept,
        letter_content: `This is to certify that Mr./Ms. ${empName} was employed with our organization as ${title} in the ${dept} department. Effective ${exitDate}, they have been relieved of all official responsibilities and duties. All departmental handovers, clearances, and financial accounts have been satisfactorily settled with no outstanding liabilities against the organization. We wish them all the best in their future endeavors.`,
      });
    } else {
      setFormData((prev) => ({ ...prev, separation_id: sepId }));
    }
  };

  // Handle Generate Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.separation_id) {
      toast.error("Validation Error", "Please select an active separation record.");
      return;
    }

    const sep = separations.find((s) => s.id === formData.separation_id);
    if (!sep) return;

    setIsSubmitting(true);
    try {
      await apiClient.post(
        "/separation/release-letters",
        {
          ...formData,
          employee_id: sep.employee_id,
        },
        { params: { business_id: currentBusinessId } }
      );
      toast.success(
        "Release Letter Generated",
        "Official Relieving & Release Letter has been issued."
      );
      setIsCreateOpen(false);
      fetchLetters(true);
    } catch (err: any) {
      toast.error(
        "Generation Failed",
        err.response?.data?.detail || "Failed to generate release letter."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered letters
  const filteredLetters = useMemo(() => {
    return letters.filter((l) => {
      const empName = `${l.employee?.first_name || ""} ${l.employee?.last_name || ""}`.toLowerCase();
      const empCode = (l.employee?.employee_id || "").toLowerCase();
      const letterNum = (l.letter_number || "").toLowerCase();
      const query = searchQuery.toLowerCase();

      return empName.includes(query) || empCode.includes(query) || letterNum.includes(query);
    });
  }, [letters, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Experience Certificate Cross-Link Alert */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Experience Certificates Desk Available</h4>
            <p className="text-xs text-muted-foreground">
              Official Service Experience Letters can also be generated and formatted from the dedicated Experience Letters desk.
            </p>
          </div>
        </div>

        <Link
          href="/hr-payroll/experience-letters"
          className="px-3.5 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition inline-flex items-center gap-1.5 shadow-sm whitespace-nowrap self-end sm:self-center"
        >
          Open Experience Letters <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Control Header */}
      <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by letter #, employee, code..."
            value={searchQuery}
            onChange={(e) => startTransition(() => setSearchQuery(e.target.value))}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLetters(true)}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg border hover:bg-muted transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Issue Release Letter
          </button>
        </div>
      </div>

      {/* Table Card */}
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
                <th className="px-4 py-3">Letter #</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Issue Date</th>
                <th className="px-4 py-3">Exit Effective Date</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {initialLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading release letters...
                  </td>
                </tr>
              ) : filteredLetters.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No relieving & release letters issued yet.
                  </td>
                </tr>
              ) : (
                filteredLetters.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/40 transition">
                    <td className="px-4 py-3 font-mono font-medium text-xs text-primary">
                      {l.letter_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {l.employee?.first_name} {l.employee?.last_name || ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {l.employee?.employee_id} • {l.department || "General"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {l.issue_date}
                    </td>
                    <td className="px-4 py-3 font-medium text-xs whitespace-nowrap">
                      {l.effective_exit_date}
                    </td>
                    <td className="px-4 py-3 text-foreground text-xs">
                      {l.designation}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Issued
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/hr-payroll/separation/release-letters/${l.id}`}
                        className="px-2.5 py-1 text-xs border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition inline-flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" /> Print Certificate
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Release Letter Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl w-full max-w-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-foreground">Issue Official Release Letter</h3>
                <p className="text-xs text-muted-foreground">Formal relieving certificate confirming clearance of all duties</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Separation Case *
                </label>
                <select
                  required
                  value={formData.separation_id}
                  onChange={(e) => handleSeparationSelect(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                >
                  <option value="">Select Separation Case</option>
                  {separations.map((sep) => (
                    <option key={sep.id} value={sep.id}>
                      {sep.separation_number} - {sep.employee?.first_name} {sep.employee?.last_name || ""} (
                      {sep.employee?.employee_id}) - {sep.separation_type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Issue Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Effective Exit Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.effective_exit_date}
                    onChange={(e) => setFormData({ ...formData, effective_exit_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Official Release Certificate Content *
                </label>
                <textarea
                  rows={5}
                  required
                  value={formData.letter_content}
                  onChange={(e) => setFormData({ ...formData, letter_content: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-muted-foreground hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition shadow-sm"
                >
                  {isSubmitting ? "Generating..." : "Issue Release Letter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
