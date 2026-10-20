"use client";

import React, { useEffect, useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import {
  LeaveTypeOut,
  LeaveAllocationOut,
  LeaveApplicationOut,
  EmployeeOut,
} from "@/types";
import { LeaveApplicationsTab } from "@/components/hr-payroll/leave/leave-applications-tab";
import { LeaveAllocationsTab } from "@/components/hr-payroll/leave/leave-allocations-tab";
import { LeaveTypesTab } from "@/components/hr-payroll/leave/leave-types-tab";
import { LeaveCalendarTab } from "@/components/hr-payroll/leave/leave-calendar-tab";

// Modals
import { LeaveApplicationModal } from "@/components/hr-payroll/leave/modals/leave-application-modal";
import { LeaveReviewModal } from "@/components/hr-payroll/leave/modals/leave-review-modal";
import { LeaveAllocationModal } from "@/components/hr-payroll/leave/modals/leave-allocation-modal";
import { BulkAllocationModal } from "@/components/hr-payroll/leave/modals/bulk-allocation-modal";
import { LeaveTypeModal } from "@/components/hr-payroll/leave/modals/leave-type-modal";
import { LeaveExportModal } from "@/components/hr-payroll/leave/modals/leave-export-modal";

import {
  CalendarDays,
  FileText,
  PieChart,
  BookOpen,
  Calendar,
  RefreshCw,
  AlertCircle,
  Plus,
  Layers,
  FileSpreadsheet,
} from "lucide-react";

type ActiveTabType = "requests" | "allocations" | "policies" | "calendar";

export default function LeaveManagementPage() {
  const [activeTab, setActiveTab] = useState<ActiveTabType>("requests");

  // Data states
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOut[]>([]);
  const [allocations, setAllocations] = useState<LeaveAllocationOut[]>([]);
  const [applications, setApplications] = useState<LeaveApplicationOut[]>([]);
  const [employees, setEmployees] = useState<EmployeeOut[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewingApp, setReviewingApp] = useState<LeaveApplicationOut | null>(null);

  const [isAllocModalOpen, setIsAllocModalOpen] = useState(false);
  const [editingAlloc, setEditingAlloc] = useState<LeaveAllocationOut | null>(null);

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<LeaveTypeOut | null>(null);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<"applications" | "allocations" | "types">("applications");

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [typesRes, allocRes, appRes, empRes] = await Promise.allSettled([
        apiClient.get<LeaveTypeOut[]>("/leave-types?limit=500"),
        apiClient.get<LeaveAllocationOut[]>("/leave-allocations?limit=1000"),
        apiClient.get<LeaveApplicationOut[]>("/leave-applications?limit=1000"),
        apiClient.get<EmployeeOut[]>("/employees?limit=500"),
      ]);

      if (typesRes.status === "fulfilled") setLeaveTypes(typesRes.value.data || []);
      if (allocRes.status === "fulfilled") setAllocations(allocRes.value.data || []);
      if (appRes.status === "fulfilled") setApplications(appRes.value.data || []);
      if (empRes.status === "fulfilled") setEmployees(empRes.value.data || []);
    } catch {
      setError("Failed to communicate with leave management API endpoints.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingApprovalsCount = useMemo(() => {
    return applications.filter((a) => a.status === "pending").length;
  }, [applications]);

  const handleOpenReview = (app: LeaveApplicationOut) => {
    setReviewingApp(app);
    setIsReviewModalOpen(true);
  };

  const handleEditAllocation = (alloc: LeaveAllocationOut) => {
    setEditingAlloc(alloc);
    setIsAllocModalOpen(true);
  };

  const handleEditType = (type: LeaveTypeOut) => {
    setEditingType(type);
    setIsTypeModalOpen(true);
  };

  const handleOpenExportWithScope = (scope: "applications" | "allocations" | "types") => {
    setExportScope(scope);
    setIsExportModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="w-full min-w-0 max-w-full space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Leave Management Hub
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Manage statutory leave policies, annual quota allocations, and approval workflows.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-700 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadData}
              className="px-3 py-1 font-bold text-rose-700 hover:bg-rose-100 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 overflow-x-auto">
          {[
            {
              id: "requests" as ActiveTabType,
              label: "Leave Requests & Approvals",
              icon: FileText,
              badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
            },
            {
              id: "allocations" as ActiveTabType,
              label: "Balances & Quotas",
              icon: PieChart,
            },
            {
              id: "policies" as ActiveTabType,
              label: "Leave Policies & Types",
              icon: BookOpen,
            },
            {
              id: "calendar" as ActiveTabType,
              label: "Team Availability Calendar",
              icon: Calendar,
            },
          ].map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-4 font-bold text-xs whitespace-nowrap border-b-2 flex items-center gap-2 transition-all ${
                  active
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Tab View */}
        {loading && applications.length === 0 && leaveTypes.length === 0 ? (
          <div className="py-24 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
            <p className="font-semibold text-slate-700">Loading Leave Management Data...</p>
            <p className="text-xs text-slate-400 mt-0.5">Fetching policies, employee quotas, and requests.</p>
          </div>
        ) : (
          <>
            {activeTab === "requests" && (
              <LeaveApplicationsTab
                applications={applications}
                leaveTypes={leaveTypes}
                employees={employees}
                allocations={allocations}
                onRefresh={loadData}
                onOpenApplyModal={() => setIsApplyModalOpen(true)}
                onReviewApplication={handleOpenReview}
              />
            )}

            {activeTab === "allocations" && (
              <LeaveAllocationsTab
                allocations={allocations}
                leaveTypes={leaveTypes}
                employees={employees}
                onRefresh={loadData}
                onOpenNewAllocation={() => {
                  setEditingAlloc(null);
                  setIsAllocModalOpen(true);
                }}
                onOpenBulkAllocation={() => setIsBulkModalOpen(true)}
                onOpenExport={() => handleOpenExportWithScope("allocations")}
                onEditAllocation={handleEditAllocation}
              />
            )}

            {activeTab === "policies" && (
              <LeaveTypesTab
                leaveTypes={leaveTypes}
                onRefresh={loadData}
                onOpenCreateType={() => {
                  setEditingType(null);
                  setIsTypeModalOpen(true);
                }}
                onEditType={handleEditType}
                onOpenExport={() => handleOpenExportWithScope("types")}
              />
            )}

            {activeTab === "calendar" && (
              <LeaveCalendarTab
                applications={applications}
                leaveTypes={leaveTypes}
                employees={employees}
              />
            )}
          </>
        )}

        {/* Modals Container */}
        <LeaveApplicationModal
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          onSuccess={loadData}
          leaveTypes={leaveTypes}
          employees={employees}
          allocations={allocations}
        />

        <LeaveReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            setReviewingApp(null);
          }}
          onSuccess={loadData}
          application={reviewingApp}
          leaveTypes={leaveTypes}
          employees={employees}
        />

        <LeaveAllocationModal
          isOpen={isAllocModalOpen}
          onClose={() => {
            setIsAllocModalOpen(false);
            setEditingAlloc(null);
          }}
          onSuccess={loadData}
          allocationToEdit={editingAlloc}
          existingAllocations={allocations}
          leaveTypes={leaveTypes}
          employees={employees}
        />

        <BulkAllocationModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          onSuccess={loadData}
          leaveTypes={leaveTypes}
          employees={employees}
          existingAllocations={allocations}
        />

        <LeaveTypeModal
          isOpen={isTypeModalOpen}
          onClose={() => {
            setIsTypeModalOpen(false);
            setEditingType(null);
          }}
          onSuccess={loadData}
          leaveTypeToEdit={editingType}
        />

        <LeaveExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          defaultScope={exportScope}
        />
      </div>
    </DashboardLayout>
  );
}
