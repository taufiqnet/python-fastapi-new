"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { CompanyAsset, AssetCategory, AssetOverviewStats, EmployeeOut } from "@/types";
import { SearchableEmployeeCombobox } from "@/components/common/searchable-employee-combobox";
import { useToast } from "@/context/toast-context";
import {
  Laptop,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Wrench,
  AlertOctagon,
  RefreshCw,
  User,
  Tag,
  ArrowRight,
  SlidersHorizontal,
  X,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

export default function AssetInventoryPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Dual loading state
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  // Data states
  const [assets, setAssets] = useState<CompanyAsset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [stats, setStats] = useState<AssetOverviewStats>({
    total_assets: 0,
    available_assets: 0,
    assigned_assets: 0,
    under_maintenance_assets: 0,
    damaged_assets: 0,
  });
  const [employees, setEmployees] = useState<EmployeeOut[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedAssetForAssign, setSelectedAssetForAssign] = useState<CompanyAsset | null>(null);

  // Form states for Add Asset
  const [formName, setFormName] = useState("");
  const [formTag, setFormTag] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formSerial, setFormSerial] = useState("");
  const [formCost, setFormCost] = useState("");
  const [formCondition, setFormCondition] = useState<"new" | "good" | "fair">("new");
  const [formNotes, setFormNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for Assign
  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [assignCondition, setAssignCondition] = useState<"new" | "good" | "fair">("good");
  const [assignNotes, setAssignNotes] = useState("");

  const loadData = async (isBackground = false) => {
    if (isBackground) setIsFetching(true);
    else setInitialLoading(true);

    try {
      const params: Record<string, any> = {};
      if (selectedCategory !== "all") params.category_id = selectedCategory;
      if (selectedStatus !== "all") params.status = selectedStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [assetsRes, catsRes, statsRes, empsRes] = await Promise.allSettled([
        apiClient.get<CompanyAsset[]>("/assets/items", { params }),
        apiClient.get<AssetCategory[]>("/assets/categories"),
        apiClient.get<AssetOverviewStats>("/assets/overview/stats"),
        apiClient.get<EmployeeOut[]>("/employees"),
      ]);

      if (assetsRes.status === "fulfilled") setAssets(assetsRes.value.data || []);
      if (catsRes.status === "fulfilled") setCategories(catsRes.value.data || []);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
      if (empsRes.status === "fulfilled") setEmployees(empsRes.value.data || []);
    } catch (err: any) {
      toast.error("Error Loading Assets", err.message || "Failed to load company asset inventory.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const handleFilterChange = (cat: string, st: string, query: string) => {
    startTransition(() => {
      setSelectedCategory(cat);
      setSelectedStatus(st);
      setSearchQuery(query);
    });
  };

  useEffect(() => {
    if (!initialLoading) {
      loadData(true);
    }
  }, [selectedCategory, selectedStatus, searchQuery]);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formTag || !formCategory) {
      toast.error("Validation Error", "Name, Asset Tag and Category are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post("/assets/items", {
        name: formName,
        asset_tag: formTag,
        category_id: formCategory,
        brand: formBrand || null,
        model: formModel || null,
        serial_number: formSerial || null,
        purchase_cost: formCost ? parseFloat(formCost) : 0,
        condition: formCondition,
        notes: formNotes || null,
      });
      toast.success("Asset Added", `Asset ${formTag} has been recorded in inventory.`);
      setIsAddModalOpen(false);
      // Reset form
      setFormName("");
      setFormTag("");
      setFormCategory("");
      setFormBrand("");
      setFormModel("");
      setFormSerial("");
      setFormCost("");
      setFormNotes("");
      loadData(true);
    } catch (err: any) {
      toast.error("Creation Failed", err.response?.data?.detail || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForAssign || !assignEmployeeId) {
      toast.error("Validation Error", "Please select an employee to allocate this asset.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post("/assets/allocations", {
        asset_id: selectedAssetForAssign.id,
        employee_id: assignEmployeeId,
        issue_condition: assignCondition,
        issue_notes: assignNotes || null,
      });
      toast.success(
        "Asset Allocated",
        `Asset ${selectedAssetForAssign.asset_tag} assigned. Pending employee receipt acknowledgment.`
      );
      setIsAssignModalOpen(false);
      setSelectedAssetForAssign(null);
      setAssignEmployeeId("");
      setAssignNotes("");
      loadData(true);
    } catch (err: any) {
      toast.error("Allocation Failed", err.response?.data?.detail || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase">
              <Laptop className="w-4 h-4" />
              <span>Asset Management</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Company Operational Assets
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Serial & IMEI tracking, employee custody allocations, return condition checks, and offboarding clearance
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/assets/allocations"
              className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Custody Handover Log
            </Link>
            <Link
              href="/assets/maintenance"
              className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Repairs & Damage
            </Link>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register New Asset</span>
            </button>
          </div>
        </div>

        {/* Overview Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Tracked</span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <Tag className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{stats.total_assets}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Active equipment</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-600 uppercase">Available</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-2">{stats.available_assets}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">In storage pool</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-indigo-600 uppercase">Assigned</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <User className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-indigo-600 mt-2">{stats.assigned_assets}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">In employee custody</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-600 uppercase">Servicing</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <Wrench className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-2">{stats.under_maintenance_assets}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Under maintenance</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-rose-600 uppercase">Damaged/Lost</span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                <AlertOctagon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-rose-600 mt-2">{stats.damaged_assets}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Requires write-off</div>
          </div>
        </div>

        {/* Filter Toolbar (Non-Destructive In-Place) */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleFilterChange(selectedCategory, selectedStatus, e.target.value)}
                placeholder="Search tag (e.g. PRO-LAP-01), name, serial..."
                className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => handleFilterChange(e.target.value, selectedStatus, searchQuery)}
              className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => handleFilterChange(selectedCategory, e.target.value, searchQuery)}
              className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available in Pool</option>
              <option value="assigned">Assigned to Employee</option>
              <option value="under_maintenance">Under Maintenance</option>
              <option value="damaged">Damaged</option>
              <option value="retired">Retired / Written Off</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button
              onClick={() => loadData(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
              <span>Refresh</span>
            </button>
            <span className="font-semibold text-slate-700">{assets.length}</span> items
          </div>
        </div>

        {/* Table Container with Rule 1 In-Place Progress Indicator */}
        <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Top-rim progress indicator */}
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-100 overflow-hidden z-10">
              <div className="h-full bg-indigo-600 animate-pulse w-full" />
            </div>
          )}

          {initialLoading ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <p className="text-xs">Loading asset catalog...</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400">
              <Laptop className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No assets found</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Adjust your filters or click &ldquo;Register New Asset&rdquo; above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full text-left border-collapse transition-opacity duration-150 ${isFetching ? "opacity-75" : "opacity-100"}`}>
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Asset Tag / Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Brand / Model</th>
                    <th className="py-3 px-4">Serial / IMEI</th>
                    <th className="py-3 px-4">Current Custody</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Condition</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {assets.map((item) => {
                    const isAvailable = item.current_status === "available";
                    const isAssigned = item.current_status === "assigned";
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{item.name}</div>
                          <div className="font-mono text-[11px] text-indigo-600 font-medium">
                            {item.asset_tag}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {item.category_name || "General"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {item.brand ? `${item.brand} ${item.model || ""}` : item.model || "—"}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {item.serial_number || item.imei_or_reg_number || "—"}
                        </td>
                        <td className="py-3 px-4">
                          {isAssigned && item.current_assigned_employee_name ? (
                            <div className="flex items-center gap-1.5 text-indigo-600 font-medium">
                              <User className="w-3.5 h-3.5" />
                              <span>{item.current_assigned_employee_name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">None (In Storage)</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              item.current_status === "available"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : item.current_status === "assigned"
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : item.current_status === "under_maintenance"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {item.current_status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 capitalize">
                          {item.condition}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isAvailable ? (
                            <button
                              onClick={() => {
                                setSelectedAssetForAssign(item);
                                setIsAssignModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                            >
                              <span>Assign</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <Link
                              href="/assets/allocations"
                              className="text-xs text-slate-500 hover:text-indigo-600 font-medium inline-flex items-center gap-0.5"
                            >
                              <span>View History</span>
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Register Asset */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 relative">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase">
                <Laptop className="w-4 h-4" />
                <span>Inventory Entry</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">Register Company Asset</h2>
              <p className="text-xs text-slate-500">Record a new physical asset or IT device into the custody catalog.</p>

              <form onSubmit={handleCreateAsset} className="space-y-3.5 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase">Asset Tag *</label>
                    <input
                      type="text"
                      required
                      value={formTag}
                      onChange={(e) => setFormTag(e.target.value)}
                      placeholder="e.g. PRO-LAP-0012"
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase">Category *</label>
                    <select
                      required
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Asset Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. MacBook Pro 14 M3, Toyota Corolla X"
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase">Brand</label>
                    <input
                      type="text"
                      value={formBrand}
                      onChange={(e) => setFormBrand(e.target.value)}
                      placeholder="Apple, Dell, Samsung"
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase">Model</label>
                    <input
                      type="text"
                      value={formModel}
                      onChange={(e) => setFormModel(e.target.value)}
                      placeholder="Latitude 5420, M3 Pro"
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase">Serial Number / IMEI</label>
                    <input
                      type="text"
                      value={formSerial}
                      onChange={(e) => setFormSerial(e.target.value)}
                      placeholder="SN / IMEI / Reg No"
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase">Purchase Cost (BDT)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formCost}
                      onChange={(e) => setFormCost(e.target.value)}
                      placeholder="0.00"
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                  >
                    {isSubmitting ? "Saving..." : "Save Asset"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Allocate to Employee */}
        {isAssignModalOpen && selectedAssetForAssign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase">
                <User className="w-4 h-4" />
                <span>Custody Issuance</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">Assign Asset to Employee</h2>
              <p className="text-xs text-slate-500">
                Issuing <strong className="text-slate-800">{selectedAssetForAssign.name}</strong> ({selectedAssetForAssign.asset_tag}).
              </p>

              <form onSubmit={handleAssignAsset} className="space-y-3.5 mt-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">Select Employee *</label>
                  <SearchableEmployeeCombobox
                    employees={employees}
                    value={assignEmployeeId}
                    onChange={(id) => setAssignEmployeeId(id)}
                    placeholder="Search & select employee..."
                    allowClear={false}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Condition at Issue</label>
                  <select
                    value={assignCondition}
                    onChange={(e: any) => setAssignCondition(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="new">Brand New</option>
                    <option value="good">Good (No defects)</option>
                    <option value="fair">Fair (Minor cosmetic wear)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Handover Notes</label>
                  <textarea
                    rows={2}
                    value={assignNotes}
                    onChange={(e) => setAssignNotes(e.target.value)}
                    placeholder="Charger, bag, accessories included..."
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                  >
                    {isSubmitting ? "Allocating..." : "Confirm Handover"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
