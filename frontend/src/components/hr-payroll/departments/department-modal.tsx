"use client";

import React, { useState, useEffect, useMemo } from "react";
import { DepartmentOut, EmployeeOut } from "@/types";
import { X, Building2, User, Layers, Info, Check, AlertCircle } from "lucide-react";
import { SearchableEmployeeCombobox } from "@/components/common/searchable-employee-combobox";

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  editingDepartment: DepartmentOut | null;
  departments: DepartmentOut[];
  employees: EmployeeOut[];
  initialParentId?: string | null;
  businessId?: number;
}

export function DepartmentModal({
  isOpen,
  onClose,
  onSave,
  editingDepartment,
  departments,
  employees,
  initialParentId,
  businessId = 1,
}: DepartmentModalProps) {
  const isEditing = Boolean(editingDepartment);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [parentDepartmentId, setParentDepartmentId] = useState<string>("");
  const [headEmployeeId, setHeadEmployeeId] = useState<string>("");
  const [multipleHeadsAllowed, setMultipleHeadsAllowed] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to slugify string
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  // Populate or reset form
  useEffect(() => {
    if (editingDepartment) {
      setName(editingDepartment.name || "");
      setCode(editingDepartment.code || "");
      setSlug(editingDepartment.slug || "");
      setSlugManuallyEdited(true);
      setDescription(editingDepartment.description || "");
      setParentDepartmentId(editingDepartment.parent_department_id || "");
      setHeadEmployeeId(editingDepartment.head_employee_id || "");
      setMultipleHeadsAllowed(editingDepartment.multiple_heads_allowed || false);
      setIsActive(editingDepartment.is_active);
    } else {
      setName("");
      setCode("");
      setSlug("");
      setSlugManuallyEdited(false);
      setDescription("");
      setParentDepartmentId(initialParentId || "");
      setHeadEmployeeId("");
      setMultipleHeadsAllowed(false);
      setIsActive(true);
    }
    setError(null);
  }, [editingDepartment, initialParentId, isOpen]);

  // Compute invalid parent IDs to prevent cycle (self + all descendants)
  const invalidParentIds = useMemo(() => {
    if (!editingDepartment) return new Set<string>();

    const invalid = new Set<string>();
    invalid.add(editingDepartment.id);

    const toCheck = [editingDepartment.id];
    while (toCheck.length > 0) {
      const current = toCheck.shift()!;
      const children = departments.filter((d) => d.parent_department_id === current);
      for (const child of children) {
        if (!invalid.has(child.id)) {
          invalid.add(child.id);
          toCheck.push(child.id);
        }
      }
    }
    return invalid;
  }, [editingDepartment, departments]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!slugManuallyEdited && !isEditing) {
      setSlug(generateSlug(val));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value);
    setSlugManuallyEdited(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Department name is required.");
      return;
    }
    if (!slug.trim()) {
      setError("Slug is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase() || null,
        slug: slug.trim().toLowerCase(),
        description: description.trim() || null,
        parent_department_id: parentDepartmentId || null,
        head_employee_id: headEmployeeId || null,
        multiple_heads_allowed: multipleHeadsAllowed,
        is_active: isActive,
        business_id: businessId,
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((d: any) => d.msg).join(", "));
      } else {
        setError(err.message || "Failed to save department.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isEditing ? `Edit: ${editingDepartment?.name}` : "Create New Department"}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? "Update organizational division parameters and chain of command."
                  : "Establish a new functional department or sub-division."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Department Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Department Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Technology & Engineering"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          {/* Code & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Department Code / Short Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. TECH-01"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Unique Slug <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={handleSlugChange}
                placeholder="e.g. technology-engineering"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-700 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all bg-slate-50/50"
              />
            </div>
          </div>

          {/* Parent Department */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Parent Department
            </label>
            <div className="relative">
              <select
                value={parentDepartmentId}
                onChange={(e) => setParentDepartmentId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all appearance-none bg-white"
              >
                <option value="">-- Top-Level Division (No Parent) --</option>
                {departments.map((d) => {
                  const isInvalid = invalidParentIds.has(d.id);
                  return (
                    <option key={d.id} value={d.id} disabled={isInvalid}>
                      {d.name} {d.code ? `(${d.code})` : ""} {isInvalid ? "(Cannot select: cycle)" : ""}
                    </option>
                  );
                })}
              </select>
              <Layers className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Leave blank if this is a primary organizational pillar (e.g. Finance, Operations).
            </p>
          </div>

          {/* Department Head */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Head of Department (HOD)
            </label>
            <SearchableEmployeeCombobox
              employees={employees}
              value={headEmployeeId}
              onChange={(empId) => setHeadEmployeeId(empId)}
              placeholder="Search & select department head..."
              allowClear={true}
              emptyUnassignedLabel="-- No Department Head Assigned --"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Description & Objectives
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline the department's mandate, responsibilities, and operational scope..."
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          {/* Checkboxes */}
          <div className="pt-2 flex flex-wrap items-center gap-6 border-t border-slate-100">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-800 select-none">
              <input
                type="checkbox"
                checked={multipleHeadsAllowed}
                onChange={(e) => setMultipleHeadsAllowed(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              Allow Multiple Co-Heads
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-800 select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              Active Status
            </label>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-60 flex items-center gap-1.5"
            >
              {saving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isEditing ? "Update Department" : "Create Department"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
