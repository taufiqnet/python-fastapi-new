"use client";

import React, { useState, useMemo } from "react";
import { DepartmentOut } from "@/types";
import {
  ChevronDown,
  ChevronRight,
  Building2,
  Users,
  Plus,
  Edit2,
  Trash2,
  Eye,
  ShieldCheck,
  FolderTree,
} from "lucide-react";

interface DepartmentTreeViewProps {
  departments: DepartmentOut[];
  searchQuery: string;
  onView: (department: DepartmentOut) => void;
  onEdit: (department: DepartmentOut) => void;
  onAddSubDepartment: (parentDepartment: DepartmentOut) => void;
  onDelete: (department: DepartmentOut) => void;
}

interface TreeItem {
  department: DepartmentOut;
  children: TreeItem[];
}

export function DepartmentTreeView({
  departments,
  searchQuery,
  onView,
  onEdit,
  onAddSubDepartment,
  onDelete,
}: DepartmentTreeViewProps) {
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  // Build recursive tree structure
  const rootItems = useMemo(() => {
    const itemMap = new Map<string, TreeItem>();
    departments.forEach((d) => {
      itemMap.set(d.id, { department: d, children: [] });
    });

    const roots: TreeItem[] = [];
    departments.forEach((d) => {
      const item = itemMap.get(d.id)!;
      if (d.parent_department_id && itemMap.has(d.parent_department_id)) {
        itemMap.get(d.parent_department_id)!.children.push(item);
      } else {
        roots.push(item);
      }
    });

    return roots;
  }, [departments]);

  const toggleCollapse = (id: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExpandAll = () => {
    setCollapsedNodes({});
  };

  const handleCollapseAll = () => {
    const all: Record<string, boolean> = {};
    departments.forEach((d) => {
      all[d.id] = true;
    });
    setCollapsedNodes(all);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
      {/* Tree header tools */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-indigo-600" />
            Functional Division Hierarchy
          </h3>
          <p className="text-xs text-slate-500">
            Interactive organizational parent-subdivision structure with personnel counts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExpandAll}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={handleCollapseAll}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Tree Nodes List */}
      <div className="pt-4 space-y-2">
        {rootItems.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No departments available to display in tree structure.
          </div>
        ) : (
          rootItems.map((root) => (
            <TreeItemRow
              key={root.department.id}
              item={root}
              level={0}
              searchQuery={searchQuery}
              collapsedNodes={collapsedNodes}
              onToggleCollapse={toggleCollapse}
              onView={onView}
              onEdit={onEdit}
              onAddSubDepartment={onAddSubDepartment}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TreeItemRow({
  item,
  level,
  searchQuery,
  collapsedNodes,
  onToggleCollapse,
  onView,
  onEdit,
  onAddSubDepartment,
  onDelete,
}: {
  item: TreeItem;
  level: number;
  searchQuery: string;
  collapsedNodes: Record<string, boolean>;
  onToggleCollapse: (id: string) => void;
  onView: (d: DepartmentOut) => void;
  onEdit: (d: DepartmentOut) => void;
  onAddSubDepartment: (d: DepartmentOut) => void;
  onDelete: (d: DepartmentOut) => void;
}) {
  const d = item.department;
  const hasChildren = item.children.length > 0;
  const isCollapsed = collapsedNodes[d.id] || false;

  const isMatched =
    Boolean(searchQuery) &&
    (d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.code && d.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.head_employee_name && d.head_employee_name.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div className="flex flex-col">
      <div
        style={{ paddingLeft: `${level * 24}px` }}
        className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all ${
          isMatched
            ? "border-amber-400 bg-amber-50/40 ring-1 ring-amber-300"
            : level === 0
            ? "border-slate-200 bg-slate-50/70 hover:bg-slate-50"
            : "border-slate-100 bg-white hover:bg-indigo-50/20 hover:border-indigo-200"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Expand/Collapse Toggle */}
          {hasChildren ? (
            <button
              onClick={() => onToggleCollapse(d.id)}
              className="w-6 h-6 rounded-lg bg-slate-200/70 hover:bg-indigo-600 hover:text-white flex items-center justify-center text-slate-700 transition-colors"
            >
              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <div className="w-6 h-6 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            </div>
          )}

          {/* Department Icon & Name */}
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
            {d.name[0]}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-900 truncate">{d.name}</span>
              {d.code && (
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-200/60 text-slate-600 font-semibold">
                  {d.code}
                </span>
              )}
              {!d.is_active && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {d.head_employee_name ? (
                <span className="inline-flex items-center gap-1 text-slate-600">
                  <ShieldCheck className="w-3 h-3 text-indigo-600" /> Lead: {d.head_employee_name}
                </span>
              ) : (
                <span className="text-slate-400 italic">No Head Assigned</span>
              )}
            </p>
          </div>
        </div>

        {/* Right side stats and actions */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            <Users className="w-3 h-3 text-indigo-400" /> {d.employee_count || 0}
          </span>

          {hasChildren && (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
              {item.children.length} sub-depts
            </span>
          )}

          {/* Action buttons (hover or always visible on desktop) */}
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onView(d)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
              title="Inspect Details"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAddSubDepartment(d)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
              title="Add Sub-department"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onEdit(d)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
              title="Edit Department"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(d)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Delete Department"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Render children recursively if not collapsed */}
      {hasChildren && !isCollapsed && (
        <div className="mt-1 space-y-1">
          {item.children.map((child) => (
            <TreeItemRow
              key={child.department.id}
              item={child}
              level={level + 1}
              searchQuery={searchQuery}
              collapsedNodes={collapsedNodes}
              onToggleCollapse={onToggleCollapse}
              onView={onView}
              onEdit={onEdit}
              onAddSubDepartment={onAddSubDepartment}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
