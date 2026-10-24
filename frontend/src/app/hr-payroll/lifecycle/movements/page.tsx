"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import {
  CareerMovement,
  IncrementPreview,
  EmployeeOut,
  JobTitleOut,
  DepartmentOut,
  BranchOut,
  SalaryGradeOut,
  LifecycleStats,
} from "@/types";
import { SearchableEmployeeCombobox } from "@/components/common/searchable-employee-combobox";
import { useToast } from "@/context/toast-context";
import {
  TrendingUp,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RefreshCw,
  X,
  ChevronRight,
  FileText,
  Calculator,
  ArrowRight,
  Building,
  Briefcase,
  DollarSign,
} from "lucide-react";

export default function CareerMovementsPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const [movements, setMovements] = useState<CareerMovement[]>([]);
  const [employees, setEmployees] = useState<EmployeeOut[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitleOut[]>([]);
  const [departments, setDepartments] = useState<DepartmentOut[]>([]);
  const [branches, setBranches] = useState<BranchOut[]>([]);
  const [salaryGrades, setSalaryGrades] = useState<SalaryGradeOut[]>([]);
  const [stats, setStats] = useState<LifecycleStats>({
    on_probation: 0,
    probation_due_30_days: 0,
    probation_overdue: 0,
    pending_movements: 0,
    open_disciplinary_cases: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Create Movement Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formActionType, setFormActionType] = useState<string>("promotion");
  const [formEffectiveDate, setFormEffectiveDate] = useState("");
  const [formReason, setFormReason] = useState("annual_appraisal");
  const [formNotes, setFormNotes] = useState("");

  // Promotion fields
  const [formNewJobTitleId, setFormNewJobTitleId] = useState("");
  const [formNewSalaryGradeId, setFormNewSalaryGradeId] = useState("");

  // Transfer fields
  const [formNewBranchId, setFormNewBranchId] = useState("");
  const [formNewDeptId, setFormNewDeptId] = useState("");
  const [formNewManagerId, setFormNewManagerId] = useState("");

  // Increment fields
  const [formIncrementType, setFormIncrementType] = useState<"percentage" | "fixed_amount">("percentage");
  const [formIncrementValue, setFormIncrementValue] = useState("10");
  const [incrementPreview, setIncrementPreview] = useState<IncrementPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Decision Modal
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<CareerMovement | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Letter Modal
  const [letterData, setLetterData] = useState<any>(null);

  const loadData = async (isBackground = false) => {
    if (isBackground) setIsFetching(true);
    else setInitialLoading(true);

    try {
      const [movRes, empsRes, jtRes, deptRes, brRes, sgRes, statsRes] = await Promise.allSettled([
        apiClient.get<CareerMovement[]>("/lifecycle/movements"),
        apiClient.get<EmployeeOut[]>("/employees"),
        apiClient.get<JobTitleOut[]>("/job-titles"),
        apiClient.get<DepartmentOut[]>("/departments"),
        apiClient.get<BranchOut[]>("/branches"),
        apiClient.get<SalaryGradeOut[]>("/salary-grades"),
        apiClient.get<LifecycleStats>("/lifecycle/overview/stats"),
      ]);

      if (movRes.status === "fulfilled") setMovements(movRes.value.data || []);
      if (empsRes.status === "fulfilled") setEmployees(empsRes.value.data || []);
      if (jtRes.status === "fulfilled") setJobTitles(jtRes.value.data || []);
      if (deptRes.status === "fulfilled") setDepartments(deptRes.value.data || []);
      if (brRes.status === "fulfilled") setBranches(brRes.value.data || []);
      if (sgRes.status === "fulfilled") setSalaryGrades(sgRes.value.data || []);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
    } catch (err: any) {
      toast.error("Error Loading Movements", err.message || "Failed to load career movements.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const handleFilterChange = (act: string, st: string, query: string) => {
    startTransition(() => {
      setSelectedType(act);
      setSelectedStatus(st);
      setSearchQuery(query);
    });
  };

  const filteredMovements = movements.filter((m) => {
    const matchesType = selectedType === "all" || m.action_type === selectedType;
    const matchesStatus = selectedStatus === "all" || m.status === selectedStatus;
    const matchesSearch =
      !searchQuery ||
      (m.employee_name && m.employee_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.movement_number.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  const handlePreviewIncrement = async () => {
    if (!formEmployeeId || !formIncrementValue) {
      toast.error("Input Missing", "Select an employee and enter an increment value.");
      return;
    }
    setIsPreviewLoading(true);
    try {
      const res = await apiClient.post<IncrementPreview>("/lifecycle/movements/preview-increment", {
        employee_id: formEmployeeId,
        increment_type: formIncrementType,
        increment_value: parseFloat(formIncrementValue) || 0,
      });
      setIncrementPreview(res.data);
    } catch (err: any) {
      toast.error("Preview Error", err.message || "Could not preview salary increment.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmployeeId || !formEffectiveDate) {
      toast.error("Validation Error", "Employee and effective date are required.");
      return;
    }

    const payload: Record<string, any> = {
      employee_id: formEmployeeId,
      action_type: formActionType,
      effective_date: formEffectiveDate,
      reason_category: formReason,
      justification_notes: formNotes || null,
    };

    if (formActionType === "promotion" || formActionType === "promotion_and_increment") {
      payload.new_job_title_id = formNewJobTitleId || null;
      payload.new_salary_grade_id = formNewSalaryGradeId || null;
    }

    if (formActionType === "transfer") {
      payload.new_branch_id = formNewBranchId || null;
      payload.new_department_id = formNewDeptId || null;
      payload.new_manager_id = formNewManagerId || null;
    }

    if (formActionType === "increment" || formActionType === "promotion_and_increment") {
      payload.increment_type = formIncrementType;
      payload.increment_value = parseFloat(formIncrementValue) || 0;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/lifecycle/movements", payload);
      toast.success("Order Created", "Career movement order registered.");
      setIsAddModalOpen(false);
      setFormEmployeeId("");
      setIncrementPreview(null);
      loadData(true);
    } catch (err: any) {
      toast.error("Creation Failed", err.message || "Failed to create career movement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecideMovement = async (approve: boolean) => {
    if (!selectedMovement) return;
    setIsSubmitting(true);
    try {
      await apiClient.post(`/lifecycle/movements/${selectedMovement.id}/decide`, {
        approve,
        rejection_reason: approve ? null : rejectionReason || "Rejected by administration",
      });
      toast.success(
        "Movement Processed",
        `Movement order has been ${approve ? "approved & applied to employee record" : "rejected"}.`
      );
      setIsDecisionModalOpen(false);
      setSelectedMovement(null);
      loadData(true);
    } catch (err: any) {
      toast.error("Decision Failed", err.message || "Failed to record decision.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFetchLetter = async (movementId: string) => {
    try {
      const res = await apiClient.get<any>(`/lifecycle/movements/${movementId}/letter`);
      setLetterData(res.data);
    } catch (err: any) {
      toast.error("Letter Error", err.message || "Letter not available.");
    }
  };

  const getActionBadge = (type: string) => {
    switch (type) {
      case "promotion":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Promotion</span>;
      case "increment":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Increment</span>;
      case "transfer":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Transfer</span>;
      case "promotion_and_increment":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">Promotion + Inc</span>;
      default:
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">{type}</span>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header Breadcrumbs & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Link href="/hr-payroll" className="hover:text-indigo-600">HR & Payroll</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span>Career Lifecycle</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-800 font-semibold">Career Movements</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">Promotions, Transfers & Increments</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Execute job elevations, inter-departmental/branch transfers, and salary increments with live compensation revisions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              className="p-2.5 text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-all"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs shadow-sm shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Initiate Movement</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search movement # or employee..."
              value={searchQuery}
              onChange={(e) => handleFilterChange(selectedType, selectedStatus, e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <select
              value={selectedType}
              onChange={(e) => handleFilterChange(e.target.value, selectedStatus, searchQuery)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 font-medium text-slate-700"
            >
              <option value="all">All Movement Types</option>
              <option value="promotion">Promotions</option>
              <option value="increment">Increments</option>
              <option value="transfer">Transfers</option>
              <option value="promotion_and_increment">Promotion & Increment</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => handleFilterChange(selectedType, e.target.value, searchQuery)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 font-medium text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="applied">Applied / Active</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden relative">
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-100 overflow-hidden z-10">
              <div className="h-full bg-indigo-600 animate-[indeterminate_1.5s_infinite_linear] origin-left w-1/3" />
            </div>
          )}

          <div className={`overflow-x-auto ${isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}`}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Action Type</th>
                  <th className="py-3.5 px-4">Effective Date</th>
                  <th className="py-3.5 px-4">Details / Changes</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {initialLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      Loading career movements...
                    </td>
                  </tr>
                ) : filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      No career movement records found.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{mov.movement_number}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{mov.employee_name || "—"}</td>
                      <td className="py-3.5 px-4">{getActionBadge(mov.action_type)}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">{mov.effective_date}</td>
                      <td className="py-3.5 px-4">
                        {mov.new_job_title_name && (
                          <div className="flex items-center gap-1.5 text-indigo-700 font-medium">
                            <Briefcase className="w-3 h-3" />
                            <span>{mov.new_job_title_name}</span>
                          </div>
                        )}
                        {mov.new_gross_salary && (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-mono font-semibold text-[11px]">
                            <DollarSign className="w-3 h-3" />
                            <span>৳{Number(mov.new_gross_salary).toLocaleString()}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {mov.status === "applied" ? (
                          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">Applied</span>
                        ) : mov.status === "rejected" ? (
                          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-700">Rejected</span>
                        ) : (
                          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">Pending</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        {mov.status === "pending_approval" && (
                          <button
                            onClick={() => {
                              setSelectedMovement(mov);
                              setIsDecisionModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                          >
                            Decide
                          </button>
                        )}
                        {mov.status === "applied" && (
                          <button
                            onClick={() => handleFetchLetter(mov.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Letter</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Initiate Career Movement */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Initiate Career Movement Order</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Configure promotions, transfers or revisions</p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateMovement} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Employee *</label>
                    <SearchableEmployeeCombobox
                      employees={employees}
                      value={formEmployeeId}
                      onChange={(id) => {
                        setFormEmployeeId(id);
                        setIncrementPreview(null);
                      }}
                      placeholder="Search & select employee..."
                      allowClear={false}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Action Type *</label>
                    <select
                      value={formActionType}
                      onChange={(e) => setFormActionType(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                    >
                      <option value="promotion">Promotion (Title / Grade)</option>
                      <option value="increment">Salary Increment</option>
                      <option value="transfer">Transfer (Branch / Dept / Manager)</option>
                      <option value="promotion_and_increment">Promotion & Increment</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Effective Date *</label>
                    <input
                      type="date"
                      required
                      value={formEffectiveDate}
                      onChange={(e) => setFormEffectiveDate(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Reason Category</label>
                    <select
                      value={formReason}
                      onChange={(e) => setFormReason(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                    >
                      <option value="annual_appraisal">Annual Appraisal</option>
                      <option value="mid_year_merit">Mid-Year Merit</option>
                      <option value="reorganization">Organizational Restructuring</option>
                      <option value="probation_completion">Probation Completion</option>
                      <option value="statutory_revision">Statutory Minimum Wage Revision</option>
                    </select>
                  </div>
                </div>

                {/* Conditional: Promotion */}
                {(formActionType === "promotion" || formActionType === "promotion_and_increment") && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Promotion Details</span>
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">New Job Title</label>
                        <select
                          value={formNewJobTitleId}
                          onChange={(e) => setFormNewJobTitleId(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                        >
                          <option value="">Select New Title...</option>
                          {jobTitles.map((jt) => (
                            <option key={jt.id} value={jt.id}>{jt.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">New Salary Grade</label>
                        <select
                          value={formNewSalaryGradeId}
                          onChange={(e) => setFormNewSalaryGradeId(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                        >
                          <option value="">Select Salary Grade...</option>
                          {salaryGrades.map((sg) => (
                            <option key={sg.id} value={sg.id}>{sg.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Conditional: Transfer */}
                {formActionType === "transfer" && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-purple-600" />
                      <span>Transfer Target Posting</span>
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">New Branch</label>
                        <select
                          value={formNewBranchId}
                          onChange={(e) => setFormNewBranchId(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                        >
                          <option value="">Select Branch...</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">New Department</label>
                        <select
                          value={formNewDeptId}
                          onChange={(e) => setFormNewDeptId(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                        >
                          <option value="">Select Department...</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Conditional: Increment */}
                {(formActionType === "increment" || formActionType === "promotion_and_increment") && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Salary Increment Parameters</span>
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Increment Type</label>
                        <select
                          value={formIncrementType}
                          onChange={(e) => setFormIncrementType(e.target.value as any)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                        >
                          <option value="percentage">Percentage (Scales Earnings)</option>
                          <option value="fixed_amount">Fixed Amount (Adds to Basic)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Value ({formIncrementType === "percentage" ? "%" : "BDT"})
                        </label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={formIncrementValue}
                          onChange={(e) => setFormIncrementValue(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handlePreviewIncrement}
                      disabled={isPreviewLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>{isPreviewLoading ? "Calculating..." : "Preview New Salary"}</span>
                    </button>

                    {incrementPreview && (
                      <div className="p-3 bg-white rounded-lg border border-emerald-200 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Basic Salary:</span>
                          <span className="font-mono font-bold text-slate-800">
                            ৳{Number(incrementPreview.previous_basic_salary).toLocaleString()} → ৳
                            {Number(incrementPreview.new_basic_salary).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Gross Salary:</span>
                          <span className="font-mono font-bold text-emerald-700">
                            ৳{Number(incrementPreview.previous_gross_salary).toLocaleString()} → ৳
                            {Number(incrementPreview.new_gross_salary).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Justification Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Management rationale..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs disabled:opacity-50"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Order"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Authorize Movement */}
        {isDecisionModalOpen && selectedMovement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Authorize Movement Order</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedMovement.movement_number} ({selectedMovement.action_type})</p>
                </div>
                <button
                  onClick={() => setIsDecisionModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Approving this movement will automatically mutate the employee master record (designation, branch, department) and/or update active payroll compensation.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rejection Reason (if declining)</label>
                  <textarea
                    rows={2}
                    placeholder="Notes..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleDecideMovement(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleDecideMovement(true)}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                  >
                    {isSubmitting ? "Processing..." : "Approve & Execute"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Movement Letter Viewer */}
        {letterData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{letterData.title}</h3>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">Ref: {letterData.reference_no}</p>
                </div>
                <button
                  onClick={() => setLetterData(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="flex justify-between border-b pb-2 text-slate-500">
                  <span>Date: {letterData.date}</span>
                  <span>To: {letterData.employee}</span>
                </div>
                <p className="leading-relaxed text-slate-800 whitespace-pre-wrap">{letterData.body}</p>
                <div className="pt-8 border-t text-slate-500 text-[11px] flex justify-between">
                  <span>Managing Director / HR Head</span>
                  <span>Company Seal</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
