"use client";

import React, { useState, useMemo } from "react";
import { apiClient } from "@/lib/api-client";
import {
  LeaveApplicationOut,
  LeaveTypeOut,
  EmployeeOut,
  LeaveStatusEnum,
  LeaveAllocationOut,
} from "@/types";
import { LeaveStatCards, StatItem } from "./leave-stat-cards";
import {
  Search,
  Filter,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  FileText,
  Calendar,
  ExternalLink,
  Trash2,
  ChevronRight,
  UserCheck,
  RotateCcw,
  AlertCircle,
  User,
  Info,
} from "lucide-react";

interface LeaveApplicationsTabProps {
  applications: LeaveApplicationOut[];
  leaveTypes: LeaveTypeOut[];
  employees: EmployeeOut[];
  allocations: LeaveAllocationOut[];
  onRefresh: () => void;
  onOpenApplyModal: () => void;
  onReviewApplication: (app: LeaveApplicationOut) => void;
}

export function LeaveApplicationsTab({
  applications,
  leaveTypes,
  employees,
  allocations,
  onRefresh,
  onOpenApplyModal,
  onReviewApplication,
}: LeaveApplicationsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<string>("all");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Maps for fast lookups
  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const ltMap = useMemo(() => new Map(leaveTypes.map((t) => [t.id, t])), [leaveTypes]);

  // KPI Statistics
  const stats: StatItem[] = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((a) => a.status === "pending").length;
    const approved = applications.filter((a) => a.status === "approved").length;
    const rejectedOrCancelled = applications.filter(
      (a) => a.status === "rejected" || a.status === "cancelled"
    ).length;

    return [
      {
        label: "Total Requests",
        value: total,
        icon: FileText,
        color: "indigo",
        subtext: "All logged applications",
      },
      {
        label: "Pending Review",
        value: pending,
        icon: Clock,
        color: "amber",
        subtext: pending > 0 ? "Requires manager action" : "All cleared",
      },
      {
        label: "Approved Requests",
        value: approved,
        icon: CheckCircle2,
        color: "emerald",
        subtext: "Quota successfully deducted",
      },
      {
        label: "Rejected / Cancelled",
        value: rejectedOrCancelled,
        icon: Ban,
        color: "slate",
        subtext: "Declined or withdrawn",
      },
    ];
  }, [applications]);

  // Filtered List
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Status filter
      if (statusFilter !== "all" && app.status !== statusFilter) return false;

      // Type filter
      if (selectedLeaveTypeId !== "all" && app.leave_type_id !== selectedLeaveTypeId) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const emp = empMap.get(app.employee_id);
        const empName = emp?.full_name?.toLowerCase() || "";
        const empCode = emp?.employee_id?.toLowerCase() || "";
        const reason = app.reason?.toLowerCase() || "";
        const typeName = ltMap.get(app.leave_type_id)?.name?.toLowerCase() || "";

        return empName.includes(q) || empCode.includes(q) || reason.includes(q) || typeName.includes(q);
      }

      return true;
    });
  }, [applications, statusFilter, selectedLeaveTypeId, searchQuery, empMap, ltMap]);

  // Cancel Application action
  const handleCancelApplication = async (app: LeaveApplicationOut) => {
    const isApproved = app.status === "approved";
    const confirmMsg = isApproved
      ? `Are you sure you want to cancel this approved leave request? ${app.total_days} day(s) will be restored to the employee's allocation quota.`
      : "Are you sure you want to withdraw/cancel this leave application?";

    if (!window.confirm(confirmMsg)) return;

    setCancellingId(app.id);
    setActionError(null);

    try {
      // Actor is either reviewed_by or employee
      const actorId = app.reviewed_by_id || app.employee_id;
      await apiClient.post(`/leave-applications/${app.id}/cancel`, {
        actor_id: actorId,
      });
      onRefresh();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to cancel leave application.";
      setActionError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setCancellingId(null);
    }
  };

  // Delete Application action
  const handleDeleteApplication = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this leave application record?")) return;

    setDeletingId(id);
    setActionError(null);

    try {
      await apiClient.delete(`/leave-applications/${id}`);
      onRefresh();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to delete leave application.";
      setActionError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setDeletingId(null);
    }
  };

  const statusBadges: Record<LeaveStatusEnum, { bg: string; text: string; icon: any; border: string }> = {
    pending: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      icon: Clock,
    },
    approved: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      icon: CheckCircle2,
    },
    rejected: {
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-200",
      icon: XCircle,
    },
    cancelled: {
      bg: "bg-slate-100",
      text: "text-slate-600",
      border: "border-slate-200",
      icon: Ban,
    },
  };

  return (
    <div className="w-full space-y-5">
      {/* KPI Stats */}
      <LeaveStatCards stats={stats} />

      {actionError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-700 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Control Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "All Requests", count: applications.length },
              {
                id: "pending",
                label: "Pending",
                count: applications.filter((a) => a.status === "pending").length,
              },
              {
                id: "approved",
                label: "Approved",
                count: applications.filter((a) => a.status === "approved").length,
              },
              {
                id: "rejected",
                label: "Rejected",
                count: applications.filter((a) => a.status === "rejected").length,
              },
              {
                id: "cancelled",
                label: "Cancelled",
                count: applications.filter((a) => a.status === "cancelled").length,
              },
            ].map((pill) => {
              const active = statusFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => setStatusFilter(pill.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    active
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                  }`}
                >
                  <span>{pill.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      active ? "bg-white/20 text-white" : "bg-slate-200/70 text-slate-700"
                    }`}
                  >
                    {pill.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* New Request Button */}
          <button
            onClick={onOpenApplyModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Apply for Leave</span>
          </button>
        </div>

        {/* Search & Policy Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search applicant name, employee ID, or reason..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedLeaveTypeId}
              onChange={(e) => setSelectedLeaveTypeId(e.target.value)}
              className="w-full sm:w-48 px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
            >
              <option value="all">All Leave Policies</option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Applicant</th>
                <th className="py-3 px-4">Leave Policy</th>
                <th className="py-3 px-4">Duration & Span</th>
                <th className="py-3 px-4">Reason & Evidence</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No leave applications found.</p>
                    <p className="text-[11px] mt-0.5">Try altering your search or status filter.</p>
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => {
                  const emp = empMap.get(app.employee_id);
                  const lt = ltMap.get(app.leave_type_id);
                  const reviewer = app.reviewed_by_id ? empMap.get(app.reviewed_by_id) : null;
                  const badge = statusBadges[app.status] || statusBadges.pending;
                  const StatusIcon = badge.icon;

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Applicant */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs shrink-0">
                            {emp?.full_name ? emp.full_name.charAt(0) : "E"}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate">
                              {emp?.full_name || "Employee"}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate">
                              {emp?.employee_id || "No ID"} • {emp?.department_name || emp?.department?.name || "General"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Policy */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800 block">
                            {lt?.name || "Leave"}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              {lt?.code || "LT"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {lt?.is_paid ? "Paid" : "Unpaid"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Dates & Duration */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {app.start_date} → {app.end_date}
                            </span>
                          </div>
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {app.total_days} Day(s)
                          </span>
                        </div>
                      </td>

                      {/* Reason & Docs */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <p className="text-slate-700 line-clamp-2" title={app.reason}>
                          {app.reason}
                        </p>
                        {app.document_url && (
                          <a
                            href={app.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 mt-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Supporting Document</span>
                          </a>
                        )}
                      </td>

                      {/* Status & Review info */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            <span>{app.status}</span>
                          </span>

                          {reviewer && (
                            <p className="text-[10px] text-slate-400" title={app.review_note || ""}>
                              By: {reviewer.full_name}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {app.status === "pending" && (
                            <button
                              type="button"
                              onClick={() => onReviewApplication(app)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Review</span>
                            </button>
                          )}

                          {app.status === "approved" && (
                            <button
                              type="button"
                              disabled={cancellingId === app.id}
                              onClick={() => handleCancelApplication(app)}
                              title="Cancel approved leave and restore quota"
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-50"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>{cancellingId === app.id ? "Restoring..." : "Cancel"}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={deletingId === app.id}
                            onClick={() => handleDeleteApplication(app.id)}
                            title="Delete Record"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
