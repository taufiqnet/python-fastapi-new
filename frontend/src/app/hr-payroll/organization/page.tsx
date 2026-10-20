"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import {
  BranchOut,
  DepartmentOut,
  JobTitleOut,
  EmployeeOut,
  OrganogramEmployeeNode,
  OrganogramStructureTree,
} from "@/types";
import { BranchesTab } from "@/components/hr-payroll/branches/branches-tab";
import { DepartmentsTab } from "@/components/hr-payroll/departments/departments-tab";
import { JobTitlesTab } from "@/components/hr-payroll/job-titles/job-titles-tab";
import {
  Building2,
  GitBranch,
  Network,
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Crown,
  Briefcase,
  Layers,
  ArrowRight,
  X,
  Filter,
} from "lucide-react";

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState<"organogram" | "branches" | "departments" | "job_titles">("organogram");
  const [organogramMode, setOrganogramMode] = useState<"reporting" | "structure">("reporting");

  // Data states
  const [branches, setBranches] = useState<BranchOut[]>([]);
  const [departments, setDepartments] = useState<DepartmentOut[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitleOut[]>([]);
  const [employees, setEmployees] = useState<EmployeeOut[]>([]);
  const [reportingTree, setReportingTree] = useState<OrganogramEmployeeNode[]>([]);
  const [structureTree, setStructureTree] = useState<OrganogramStructureTree | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedDept, setSelectedDept] = useState<string>("all");

  // Zoom & Pan state
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  // Slide-over detail drawer
  const [selectedNode, setSelectedNode] = useState<OrganogramEmployeeNode | null>(null);

  // Modals
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchOut | null>(null);
  const [branchFormData, setBranchFormData] = useState({
    name: "",
    code: "",
    branch_type: "branch_office",
    manager_employee_id: "",
    phone: "",
    email: "",
    address: "",
    city: "Dhaka",
    country: "Bangladesh",
    zip_code: "",
    is_head_office: false,
    is_active: true,
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [branchRes, deptRes, titleRes, empRes, repTreeRes] = await Promise.allSettled([
        apiClient.get<BranchOut[]>("/branches?limit=200"),
        apiClient.get<DepartmentOut[]>("/departments?limit=200"),
        apiClient.get<JobTitleOut[]>("/job-titles?limit=200"),
        apiClient.get<EmployeeOut[]>("/employees?limit=500"),
        apiClient.get<OrganogramEmployeeNode[]>("/organization/organogram/reporting"),
      ]);

      if (branchRes.status === "fulfilled") setBranches(branchRes.value.data || []);
      if (deptRes.status === "fulfilled") setDepartments(deptRes.value.data || []);
      if (titleRes.status === "fulfilled") setJobTitles(titleRes.value.data || []);
      if (empRes.status === "fulfilled") setEmployees(empRes.value.data || []);
      if (repTreeRes.status === "fulfilled") setReportingTree(repTreeRes.value.data || []);
    } catch {
      setError("Failed to communicate with organization API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Reporting Organogram
  const filteredReportingTree = useMemo(() => {
    if (selectedBranch === "all" && selectedDept === "all") return reportingTree;

    const filterNode = (node: OrganogramEmployeeNode): OrganogramEmployeeNode | null => {
      const matchesBranch = selectedBranch === "all" || node.branch_id === selectedBranch;
      const matchesDept = selectedDept === "all" || node.department_id === selectedDept;

      const filteredChildren = node.subordinates
        .map(filterNode)
        .filter((child): child is OrganogramEmployeeNode => child !== null);

      if ((matchesBranch && matchesDept) || filteredChildren.length > 0) {
        return {
          ...node,
          subordinates: filteredChildren,
        };
      }
      return null;
    };

    return reportingTree
      .map(filterNode)
      .filter((root): root is OrganogramEmployeeNode => root !== null);
  }, [reportingTree, selectedBranch, selectedDept]);

  // Toggle Collapse
  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Branch CRUD
  const handleOpenCreateBranch = () => {
    setEditingBranch(null);
    setBranchFormData({
      name: "",
      code: "",
      branch_type: "branch_office",
      manager_employee_id: "",
      phone: "",
      email: "",
      address: "",
      city: "Dhaka",
      country: "Bangladesh",
      zip_code: "",
      is_head_office: false,
      is_active: true,
    });
    setIsBranchModalOpen(true);
  };

  const handleOpenEditBranch = (b: BranchOut) => {
    setEditingBranch(b);
    setBranchFormData({
      name: b.name,
      code: b.code,
      branch_type: b.branch_type || "branch_office",
      manager_employee_id: b.manager_employee_id || "",
      phone: b.phone || "",
      email: b.email || "",
      address: b.address || "",
      city: b.city || "Dhaka",
      country: b.country || "Bangladesh",
      zip_code: b.zip_code || "",
      is_head_office: b.is_head_office || false,
      is_active: b.is_active,
    });
    setIsBranchModalOpen(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...branchFormData,
        manager_employee_id: branchFormData.manager_employee_id || null,
        business_id: branches[0]?.business_id || 1,
      };

      if (editingBranch) {
        await apiClient.put(`/branches/${editingBranch.id}`, payload);
      } else {
        await apiClient.post("/branches", payload);
      }
      setIsBranchModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to save branch.");
    }
  };

  const handleDeleteBranch = async (id: string) => {
    if (!confirm("Are you sure you want to delete this branch?")) return;
    try {
      await apiClient.delete(`/branches/${id}`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete branch.");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 mb-3">
                <Network className="w-3.5 h-3.5" />
                Enterprise Organization Hub
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Company Structure & Organogram</h1>
              <p className="text-slate-300 text-sm mt-1.5 max-w-2xl leading-relaxed">
                Centralized settings for Company Headquarters, Distributed Multi-Branch Outlets, Functional Departments, and Interactive Visual Reporting Hierarchies.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3">
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-3 text-center min-w-[90px]">
                <p className="text-[10px] uppercase font-semibold text-slate-400">Branches</p>
                <p className="text-xl font-bold text-white mt-0.5">{branches.length}</p>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-3 text-center min-w-[90px]">
                <p className="text-[10px] uppercase font-semibold text-slate-400">Departments</p>
                <p className="text-xl font-bold text-white mt-0.5">{departments.length}</p>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-3 text-center min-w-[90px]">
                <p className="text-[10px] uppercase font-semibold text-slate-400">Staff</p>
                <p className="text-xl font-bold text-indigo-400 mt-0.5">{employees.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("organogram")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "organogram"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Network className="w-4 h-4" />
            Organogram Chart
          </button>
          <button
            onClick={() => setActiveTab("branches")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "branches"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <GitBranch className="w-4 h-4" />
            Branches ({branches.length})
          </button>
          <button
            onClick={() => setActiveTab("departments")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "departments"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Layers className="w-4 h-4" />
            Departments ({departments.length})
          </button>
          <button
            onClick={() => setActiveTab("job_titles")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "job_titles"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Job Designations ({jobTitles.length})
          </button>
        </div>

        {/* ─── TAB 1: ORGANOGRAM ─── */}
        {activeTab === "organogram" && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, designation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>

                {/* Branch filter */}
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                {/* Department filter */}
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Zoom controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.1))}
                    className="p-2 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-[11px] font-semibold text-slate-600 select-none">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.1))}
                    className="p-2 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(1.0)}
                    className="px-2.5 py-1 text-[11px] font-medium border-l border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Tree Canvas */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 min-h-[600px] overflow-auto relative">
              <div
                className="inline-block min-w-full text-center transition-transform duration-200 origin-top"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                {filteredReportingTree.length > 0 ? (
                  <div className="flex justify-center gap-10">
                    {filteredReportingTree.map((rootNode) => (
                      <TreeNode
                        key={rootNode.id}
                        node={rootNode}
                        searchQuery={searchQuery}
                        collapsedNodes={collapsedNodes}
                        onToggleCollapse={toggleCollapse}
                        onSelectNode={setSelectedNode}
                        isRoot={true}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-24 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl mx-auto mb-3">
                      <Network className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">No Reporting Hierarchy Found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Employees need direct manager assignments to form the chain of command.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: BRANCHES ─── */}
        {activeTab === "branches" && (
          <BranchesTab
            branches={branches}
            employees={employees}
            onRefresh={loadData}
            businessId={branches[0]?.business_id || 1}
          />
        )}

        {/* ─── TAB 3: DEPARTMENTS ─── */}
        {activeTab === "departments" && (
          <DepartmentsTab
            departments={departments}
            employees={employees}
            branches={branches}
            onRefresh={loadData}
            businessId={branches[0]?.business_id || 1}
          />
        )}

        {/* ─── TAB 4: JOB TITLES ─── */}
        {activeTab === "job_titles" && (
          <JobTitlesTab
            jobTitles={jobTitles}
            departments={departments}
            employees={employees}
            onRefresh={loadData}
            businessId={branches[0]?.business_id || 1}
          />
        )}
      </div>

    </DashboardLayout>
  );
}

// Recursive Tree Node Component
function TreeNode({
  node,
  searchQuery,
  collapsedNodes,
  onToggleCollapse,
  onSelectNode,
  isRoot,
}: {
  node: OrganogramEmployeeNode;
  searchQuery: string;
  collapsedNodes: Record<string, boolean>;
  onToggleCollapse: (id: string, e: React.MouseEvent) => void;
  onSelectNode: (node: OrganogramEmployeeNode) => void;
  isRoot?: boolean;
}) {
  const isCollapsed = collapsedNodes[node.id] || false;
  const isHighlighted =
    Boolean(searchQuery) &&
    (node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (node.job_title && node.job_title.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div
        onClick={() => onSelectNode(node)}
        className={`w-56 bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative text-center group ${
          isHighlighted
            ? "ring-2 ring-amber-500 border-amber-500 bg-amber-50/20"
            : isRoot
            ? "border-indigo-600 ring-1 ring-indigo-600/30"
            : "border-slate-200 hover:border-indigo-400"
        }`}
      >
        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-base flex items-center justify-center mx-auto mb-2 shadow-inner">
          {node.name[0]?.toUpperCase()}
        </div>
        <p className="font-bold text-slate-900 text-xs truncate leading-snug">{node.name}</p>
        <p className="text-[11px] font-semibold text-indigo-600 truncate mt-0.5">{node.job_title || "Designation Pending"}</p>

        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1">
          {node.branch && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-slate-100 text-slate-700">
              <GitBranch className="w-2.5 h-2.5 text-slate-400" /> {node.branch}
            </span>
          )}
          {node.department && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-indigo-50 text-indigo-700">
              <Layers className="w-2.5 h-2.5 text-indigo-400" /> {node.department}
            </span>
          )}
        </div>

        {/* Expand/Collapse Button */}
        {node.subordinates && node.subordinates.length > 0 && (
          <button
            onClick={(e) => onToggleCollapse(node.id, e)}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-md hover:scale-110 transition-transform"
            title="Toggle Reports"
          >
            {isCollapsed ? "+" : "−"}
          </button>
        )}
      </div>

      {/* Child branches */}
      {node.subordinates && node.subordinates.length > 0 && !isCollapsed && (
        <div className="flex flex-col items-center">
          {/* Connector line down */}
          <div className="w-0.5 h-6 bg-slate-300" />

          {/* Children container with horizontal line */}
          <div className="flex items-start justify-center gap-6 relative pt-4 before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:w-[calc(100%-14rem)] before:h-0.5 before:bg-slate-300">
            {node.subordinates.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                searchQuery={searchQuery}
                collapsedNodes={collapsedNodes}
                onToggleCollapse={onToggleCollapse}
                onSelectNode={onSelectNode}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
