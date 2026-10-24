"use client";

import React, { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Coins,
  ShieldCheck,
  FileText,
  Percent,
  Calculator,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import {
  SalaryComponentOut,
  SalaryComponentCreatePayload,
  SalaryStructureOut,
  SalaryStructureCreatePayload,
} from "@/types";

interface StructuresTabProps {
  currentBusinessId: number;
}

export function StructuresTab({ currentBusinessId }: StructuresTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Sub-view toggle: "components" | "structures"
  const [subView, setSubView] = useState<"components" | "structures">("components");

  // Data states
  const [components, setComponents] = useState<SalaryComponentOut[]>([]);
  const [structures, setStructures] = useState<SalaryStructureOut[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [componentTypeFilter, setComponentTypeFilter] = useState<string>("all");

  // Component Modals
  const [isComponentModalOpen, setIsComponentModalOpen] = useState<boolean>(false);
  const [editingComponent, setEditingComponent] = useState<SalaryComponentOut | null>(null);
  const [isSubmittingComponent, setIsSubmittingComponent] = useState<boolean>(false);
  const [componentForm, setComponentForm] = useState<SalaryComponentCreatePayload>({
    business_id: currentBusinessId,
    name: "",
    code: "",
    component_type: "earning",
    calculation_type: "fixed",
    default_value: 0,
    is_taxable: true,
    is_statutory: false,
    is_active: true,
  });

  // Structure Modals
  const [isStructureModalOpen, setIsStructureModalOpen] = useState<boolean>(false);
  const [isSubmittingStructure, setIsSubmittingStructure] = useState<boolean>(false);
  const [structureForm, setStructureForm] = useState<SalaryStructureCreatePayload>({
    business_id: currentBusinessId,
    name: "",
    description: "",
    is_active: true,
    items: [],
  });

  // Fetch components & structures
  const fetchData = useCallback(
    async (isBackground = false) => {
      if (isBackground) setIsFetching(true);
      else setInitialLoading(true);
      setError(null);

      try {
        const [compRes, structRes] = await Promise.all([
          apiClient.get<SalaryComponentOut[]>(
            `/compensation/components?business_id=${currentBusinessId}&limit=200`
          ),
          apiClient.get<SalaryStructureOut[]>(
            `/compensation/structures?business_id=${currentBusinessId}&limit=100`
          ),
        ]);

        setComponents(compRes.data || []);
        setStructures(structRes.data || []);
      } catch (err) {
        console.error("Failed to load compensation components/structures:", err);
        setError("Failed to load salary components and structures.");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [currentBusinessId]
  );

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Open Edit Component
  const handleOpenEditComponent = (comp: SalaryComponentOut) => {
    setEditingComponent(comp);
    setComponentForm({
      business_id: comp.business_id,
      name: comp.name,
      code: comp.code,
      component_type: comp.component_type,
      calculation_type: comp.calculation_type,
      default_value: comp.default_value,
      is_taxable: comp.is_taxable,
      is_statutory: comp.is_statutory,
      is_active: comp.is_active,
    });
    setIsComponentModalOpen(true);
  };

  // Save Component (Create or Update)
  const handleSaveComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!componentForm.name.trim() || !componentForm.code.trim()) {
      toast.error("Validation Error", "Name and code are required.");
      return;
    }

    setIsSubmittingComponent(true);
    try {
      if (editingComponent) {
        await apiClient.put(`/compensation/components/${editingComponent.id}`, {
          ...componentForm,
          default_value: Number(componentForm.default_value) || 0,
        });
        toast.success("Component Updated", `Salary component ${componentForm.name} updated.`);
      } else {
        await apiClient.post("/compensation/components", {
          ...componentForm,
          business_id: currentBusinessId,
          code: componentForm.code.toUpperCase(),
          default_value: Number(componentForm.default_value) || 0,
        });
        toast.success("Component Created", `Salary component ${componentForm.name} added.`);
      }
      setIsComponentModalOpen(false);
      setEditingComponent(null);
      fetchData(true);
    } catch (err: any) {
      toast.error("Save Failed", err?.response?.data?.detail || "Could not save component.");
    } finally {
      setIsSubmittingComponent(false);
    }
  };

  // Add Item to Structure Form
  const handleAddStructureItem = () => {
    if (!components.length) return;
    setStructureForm((prev) => ({
      ...prev,
      items: [
        ...(prev.items || []),
        {
          component_id: components[0].id,
          calculation_type: "percent_basic",
          value: 10,
        },
      ],
    }));
  };

  // Remove Item from Structure Form
  const handleRemoveStructureItem = (index: number) => {
    setStructureForm((prev) => ({
      ...prev,
      items: (prev.items || []).filter((_, idx) => idx !== index),
    }));
  };

  // Save Structure
  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!structureForm.name.trim()) {
      toast.error("Validation Error", "Structure template name is required.");
      return;
    }

    setIsSubmittingStructure(true);
    try {
      await apiClient.post("/compensation/structures", {
        ...structureForm,
        business_id: currentBusinessId,
      });
      toast.success("Structure Saved", `Salary structure ${structureForm.name} created.`);
      setIsStructureModalOpen(false);
      setStructureForm({
        business_id: currentBusinessId,
        name: "",
        description: "",
        is_active: true,
        items: [],
      });
      fetchData(true);
    } catch (err: any) {
      toast.error("Save Failed", err?.response?.data?.detail || "Could not save structure.");
    } finally {
      setIsSubmittingStructure(false);
    }
  };

  // Filtered components
  const filteredComponents = useMemo(() => {
    return components.filter((c) => {
      const matchesSearch =
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType =
        componentTypeFilter === "all" || c.component_type === componentTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [components, searchQuery, componentTypeFilter]);

  const getComponentTypeBadge = (type: string) => {
    switch (type) {
      case "earning":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Earning (+৳)</span>;
      case "deduction":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Deduction (-৳)</span>;
      case "statutory":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Statutory</span>;
      case "reimbursement":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">Reimbursement</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 capitalize">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Salary Structure & Component Master Catalog
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Define standard earning & deduction components and bundle them into graded salary templates (Executive, Worker, Staff)
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => fetchData(true)}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            </button>

            {subView === "components" ? (
              <button
                type="button"
                onClick={() => {
                  setEditingComponent(null);
                  setComponentForm({
                    business_id: currentBusinessId,
                    name: "",
                    code: "",
                    component_type: "earning",
                    calculation_type: "fixed",
                    default_value: 0,
                    is_taxable: true,
                    is_statutory: false,
                    is_active: true,
                  });
                  setIsComponentModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Component
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setStructureForm({
                    business_id: currentBusinessId,
                    name: "",
                    description: "",
                    is_active: true,
                    items: components.slice(0, 3).map((c) => ({
                      component_id: c.id,
                      calculation_type: "percent_basic",
                      value: 10,
                    })),
                  });
                  setIsStructureModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Create Structure Template
              </button>
            )}
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setSubView("components")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              subView === "components"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Salary Components ({components.length})
          </button>

          <button
            type="button"
            onClick={() => setSubView("structures")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              subView === "structures"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Structure Templates ({structures.length})
          </button>
        </div>
      </div>

      {/* Sub-View 1: Components Catalog */}
      {subView === "components" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden relative">
          {/* Top Progress Bar on background fetch */}
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-100 overflow-hidden z-20">
              <div className="w-full h-full bg-gradient-to-r from-indigo-500 via-teal-500 to-indigo-500 animate-pulse" />
            </div>
          )}

          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    startTransition(() => setSearchQuery(val));
                  }}
                  placeholder="Search component name or code..."
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-52 focus:w-64 transition-all focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <select
                value={componentTypeFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  startTransition(() => setComponentTypeFilter(val));
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden"
              >
                <option value="all">All Component Types</option>
                <option value="earning">Earnings (+৳)</option>
                <option value="deduction">Deductions (-৳)</option>
                <option value="statutory">Statutory</option>
                <option value="reimbursement">Reimbursements</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Showing {filteredComponents.length} components
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Component Name</th>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Calculation Mode</th>
                  <th className="px-5 py-3 text-right">Default Value</th>
                  <th className="px-5 py-3">Compliance</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y divide-slate-100 text-xs transition-opacity duration-200 ${
                  isFetching ? "opacity-75" : "opacity-100"
                }`}
              >
                {initialLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-4">
                        <div className="h-3.5 bg-slate-100 rounded w-32" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 bg-slate-100 rounded w-16" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-5 bg-slate-100 rounded-full w-20" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-3 bg-slate-100 rounded w-24" />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="h-4 bg-slate-100 rounded w-16 ml-auto" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-5 bg-slate-100 rounded-full w-20" />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="h-6 bg-slate-100 rounded w-16 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredComponents.length > 0 ? (
                  filteredComponents.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{c.name}</td>
                      <td className="px-5 py-3.5 font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50/60 px-2 py-0.5 rounded border border-indigo-100 w-fit">
                        {c.code}
                      </td>
                      <td className="px-5 py-3.5">{getComponentTypeBadge(c.component_type)}</td>
                      <td className="px-5 py-3.5 capitalize text-slate-600">
                        {c.calculation_type.replace("_", " ")}
                      </td>
                      <td className="px-5 py-3.5 text-right font-black text-slate-800">
                        {c.calculation_type === "fixed"
                          ? `৳ ${c.default_value.toLocaleString()}`
                          : `${c.default_value}%`}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {c.is_taxable && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Taxable
                            </span>
                          )}
                          {c.is_statutory && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Statutory
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEditComponent(c)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors inline-flex items-center"
                          title="Edit Component"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                      No components found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-View 2: Salary Structure Templates */}
      {subView === "structures" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {structures.length > 0 ? (
            structures.map((s) => (
              <div
                key={s.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold text-slate-900">{s.name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active Template
                    </span>
                  </div>
                  {s.description && (
                    <p className="text-xs text-slate-500 mb-3">{s.description}</p>
                  )}

                  {/* Components Breakdown */}
                  <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-xs">
                    <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Component Breakdown ({s.items?.length || 0})
                    </div>
                    {s.items && s.items.length > 0 ? (
                      s.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-0.5 border-b border-slate-200/60 last:border-0"
                        >
                          <span className="font-medium text-slate-700">
                            {item.component?.name || `Component #${item.component_id}`}
                          </span>
                          <span className="font-bold text-indigo-600">
                            {item.calculation_type === "fixed"
                              ? `৳ ${item.value.toLocaleString()}`
                              : `${item.value}% (${item.calculation_type.replace("_", " ")})`}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400 italic">No line items in this structure.</div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Created {new Date(s.created_at).toLocaleDateString()}</span>
                  <span className="font-medium text-indigo-600">Standard Grade Rule</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400">
              No salary structure templates found. Click "Create Structure Template" to define one.
            </div>
          )}
        </div>
      )}

      {/* Component Create / Edit Modal */}
      {isComponentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingComponent ? "Edit Salary Component" : "Add Salary Component"}
              </h3>
              <button
                type="button"
                onClick={() => setIsComponentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveComponent} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Component Name *
                </label>
                <input
                  type="text"
                  required
                  value={componentForm.name}
                  onChange={(e) => setComponentForm({ ...componentForm, name: e.target.value })}
                  placeholder="e.g. Basic Salary, House Rent Allowance, Medical"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Component Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={componentForm.code}
                    onChange={(e) => setComponentForm({ ...componentForm, code: e.target.value.toUpperCase() })}
                    placeholder="BASIC, HRA, MED"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Type</label>
                  <select
                    value={componentForm.component_type}
                    onChange={(e: any) =>
                      setComponentForm({ ...componentForm, component_type: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="earning">Earning (+৳)</option>
                    <option value="deduction">Deduction (-৳)</option>
                    <option value="statutory">Statutory</option>
                    <option value="reimbursement">Reimbursement</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Calculation Mode</label>
                  <select
                    value={componentForm.calculation_type}
                    onChange={(e: any) =>
                      setComponentForm({ ...componentForm, calculation_type: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="fixed">Fixed Amount (৳)</option>
                    <option value="percent_basic">% of Basic</option>
                    <option value="percent_gross">% of Gross</option>
                    <option value="formula">Dynamic Formula</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Default Value (% or ৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={componentForm.default_value || ""}
                    onChange={(e) =>
                      setComponentForm({
                        ...componentForm,
                        default_value: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={componentForm.is_taxable}
                    onChange={(e) =>
                      setComponentForm({ ...componentForm, is_taxable: e.target.checked })
                    }
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium text-slate-700">Taxable Component</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={componentForm.is_statutory}
                    onChange={(e) =>
                      setComponentForm({ ...componentForm, is_statutory: e.target.checked })
                    }
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium text-slate-700">Statutory (BLA/PF)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsComponentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingComponent}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSubmittingComponent ? "Saving..." : "Save Component"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Structure Template Modal */}
      {isStructureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden p-6 space-y-4 text-xs max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
              <h3 className="text-sm font-bold text-slate-900">Define Salary Structure Template</h3>
              <button
                type="button"
                onClick={() => setIsStructureModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStructure} className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Structure Template Name *
                </label>
                <input
                  type="text"
                  required
                  value={structureForm.name}
                  onChange={(e) => setStructureForm({ ...structureForm, name: e.target.value })}
                  placeholder="e.g. Standard Executive Grade (BLA 2006 Compliant)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={structureForm.description || ""}
                  onChange={(e) =>
                    setStructureForm({ ...structureForm, description: e.target.value })
                  }
                  placeholder="Standard 50% Basic, 25% HRA, 10% Conveyance, 10% Medical, 5% Food"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800">Structure Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddStructureItem}
                    className="px-2.5 py-1 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold text-[11px] flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Component Line
                  </button>
                </div>

                <div className="space-y-2">
                  {structureForm.items && structureForm.items.length > 0 ? (
                    structureForm.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 items-center"
                      >
                        <div className="col-span-5">
                          <select
                            value={item.component_id}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updated = [...(structureForm.items || [])];
                              updated[idx].component_id = val;
                              setStructureForm({ ...structureForm, items: updated });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800 text-xs bg-white"
                          >
                            {components.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-3">
                          <select
                            value={item.calculation_type}
                            onChange={(e: any) => {
                              const val = e.target.value;
                              const updated = [...(structureForm.items || [])];
                              updated[idx].calculation_type = val;
                              setStructureForm({ ...structureForm, items: updated });
                            }}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-slate-800 text-xs bg-white"
                          >
                            <option value="percent_basic">% Basic</option>
                            <option value="percent_gross">% Gross</option>
                            <option value="fixed">Fixed ৳</option>
                          </select>
                        </div>

                        <div className="col-span-3">
                          <input
                            type="number"
                            step="0.01"
                            value={item.value}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const updated = [...(structureForm.items || [])];
                              updated[idx].value = val;
                              setStructureForm({ ...structureForm, items: updated });
                            }}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-slate-800 text-xs bg-white"
                          />
                        </div>

                        <div className="col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveStructureItem(idx)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No component line items added. Click "Add Component Line" above.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsStructureModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStructure}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSubmittingStructure ? "Saving..." : "Save Structure Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
