"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Building,
  Briefcase,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  Shield,
  Layers,
} from "lucide-react";
import { OrgChartNodeOut, DepartmentOut, BranchOut } from "@/types";
import { apiClient } from "@/lib/api-client";

interface OrgChartViewProps {
  departments: DepartmentOut[];
  branches?: BranchOut[];
}

export function OrgChartView({ departments, branches = [] }: OrgChartViewProps) {
  const [roots, setRoots] = useState<OrgChartNodeOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  const fetchChart = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDept !== "all") params.append("department_id", selectedDept);
      if (selectedBranch !== "all") params.append("branch_id", selectedBranch);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await apiClient.get<OrgChartNodeOut[]>(`/employees/org-chart${qs}`);
      setRoots(res.data || []);
    } catch (err) {
      console.error("Failed to load org chart hierarchy", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChart();
  }, [selectedDept, selectedBranch]);

  const toggleCollapse = (id: string) => {
    setCollapsedNodes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => setCollapsedNodes({});
  const collapseAll = () => {
    const allIds: Record<string, boolean> = {};
    const traverse = (node: OrgChartNodeOut) => {
      if (node.reports && node.reports.length > 0) {
        allIds[node.id] = true;
        node.reports.forEach(traverse);
      }
    };
    roots.forEach(traverse);
    setCollapsedNodes(allIds);
  };

  // Node Component for recursive tree rendering
  const OrgTreeNode = ({ node }: { node: OrgChartNodeOut }) => {
    const hasChildren = node.reports && node.reports.length > 0;
    const isCollapsed = collapsedNodes[node.id];
    const isMatched =
      searchQuery.trim() !== "" &&
      (node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (node.bangla_name && node.bangla_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        node.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (node.job_title && node.job_title.toLowerCase().includes(searchQuery.toLowerCase())));

    return (
      <div className="flex flex-col items-center">
        {/* Node Card */}
        <div
          className={`w-[260px] bg-white rounded-2xl border transition-all duration-200 relative p-4 shadow-sm hover:shadow-md ${
            isMatched
              ? "ring-2 ring-indigo-600 border-indigo-500 shadow-indigo-100"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          {/* Top Grade / Dept tag */}
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] font-bold text-slate-500 px-1.5 py-0.5 rounded bg-slate-100">
              {node.employee_id}
            </span>
            {node.salary_grade && (
              <span className="px-2 py-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full">
                {node.salary_grade}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
              {node.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <Link
                href={`/hr-payroll/employees/${node.id}`}
                className="text-xs font-bold text-slate-900 hover:text-indigo-600 transition-colors truncate block"
              >
                {node.name}
              </Link>
              {node.bangla_name && (
                <p className="text-[11px] text-slate-500 truncate font-bengali">
                  {node.bangla_name}
                </p>
              )}
              <p className="text-[11px] font-semibold text-indigo-600 truncate mt-0.5">
                {node.job_title || "Designation"}
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span className="truncate max-w-[130px] font-medium">
              {node.department || "No Department"}
            </span>
            <Link
              href={`/hr-payroll/employees/${node.id}`}
              className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-0.5"
            >
              View <ExternalLink className="w-2.5 h-2.5" />
            </Link>
          </div>

          {/* Subordinates Collapse / Expand Button */}
          {hasChildren && (
            <button
              onClick={() => toggleCollapse(node.id)}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border border-slate-300 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition"
              title={isCollapsed ? "Expand Subordinates" : "Collapse Subordinates"}
            >
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Tree Line Connector */}
        {hasChildren && !isCollapsed && (
          <>
            <div className="w-0.5 h-6 bg-slate-300" />
            <div className="flex relative pt-0">
              {/* Horizontal bar across children */}
              {node.reports.length > 1 && (
                <div
                  className="absolute top-0 h-0.5 bg-slate-300"
                  style={{
                    left: `${100 / (node.reports.length * 2)}%`,
                    right: `${100 / (node.reports.length * 2)}%`,
                  }}
                />
              )}
              <div className="flex gap-8">
                {node.reports.map((child) => (
                  <div key={child.id} className="flex flex-col items-center">
                    <div className="w-0.5 h-6 bg-slate-300" />
                    <OrgTreeNode node={child} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Filters & Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search box */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Highlight employee..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none font-medium"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Branch Filter if available */}
          {branches.length > 0 && (
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none font-medium"
            >
              <option value="all">All Branches / Plants</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right: Zoom & Expand Controls */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={expandAll}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
          >
            Collapse All
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {/* Zoom Buttons */}
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
            <button
              onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 py-1 text-[11px] font-bold text-slate-700 select-none">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="bg-slate-50/80 rounded-3xl border border-slate-200 p-8 min-h-[500px] overflow-auto shadow-inner relative flex justify-center items-start">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-500 mt-2">
              Building corporate reporting tree...
            </p>
          </div>
        ) : roots.length === 0 ? (
          <div className="py-20 text-center">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No Reporting Hierarchy Found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Ensure active employees are assigned a Direct Manager (supervisor) to visualize the reporting lines.
            </p>
          </div>
        ) : (
          <div
            className="transition-transform duration-200 origin-top flex flex-wrap justify-center gap-16 pt-4 pb-12"
            style={{ transform: `scale(${zoomLevel / 100})` }}
          >
            {roots.map((root) => (
              <OrgTreeNode key={root.id} node={root} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
