"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { DAConveyancePolicy } from "@/types";
import { useToast } from "@/context/toast-context";
import {
  Banknote,
  Plus,
  RefreshCw,
  Search,
  Building2,
  Car,
  Hotel,
  Edit,
  Trash2,
  X,
  ArrowLeft,
} from "lucide-react";

export default function DAConveyancePoliciesPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [policies, setPolicies] = useState<DAConveyancePolicy[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<DAConveyancePolicy | null>(null);

  // Form states
  const [formGrade, setFormGrade] = useState("");
  const [formTier, setFormTier] = useState("tier_1_dhaka_ctg");
  const [formDA, setFormDA] = useState("");
  const [formHotel, setFormHotel] = useState("");
  const [formKmRate, setFormKmRate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async (isBackground = false) => {
    if (isBackground) setIsFetching(true);
    else setInitialLoading(true);

    try {
      const res = await apiClient.get<DAConveyancePolicy[]>("/expenses/policies");
      setPolicies(res.data || []);
    } catch (err: any) {
      toast.error("Error Loading Policies", err.message || "Failed to load per-diem and conveyance policies.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const openCreateModal = () => {
    setEditingPolicy(null);
    setFormGrade("");
    setFormTier("tier_1_dhaka_ctg");
    setFormDA("1500");
    setFormHotel("3500");
    setFormKmRate("12");
    setIsModalOpen(true);
  };

  const openEditModal = (p: DAConveyancePolicy) => {
    setEditingPolicy(p);
    setFormGrade(p.grade_name);
    setFormTier(p.city_tier);
    setFormDA(String(p.daily_allowance_rate));
    setFormHotel(String(p.hotel_limit_per_night));
    setFormKmRate(String(p.conveyance_rate_per_km));
    setIsModalOpen(true);
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGrade) {
      toast.error("Validation Error", "Designation/Grade name is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        grade_name: formGrade,
        city_tier: formTier,
        daily_allowance_rate: formDA ? parseFloat(formDA) : 0,
        hotel_limit_per_night: formHotel ? parseFloat(formHotel) : 0,
        conveyance_rate_per_km: formKmRate ? parseFloat(formKmRate) : 0,
      };

      if (editingPolicy) {
        await apiClient.put(`/expenses/policies/${editingPolicy.id}`, payload);
        toast.success("Policy Updated", `Policy for ${formGrade} saved.`);
      } else {
        await apiClient.post("/expenses/policies", payload);
        toast.success("Policy Created", `Policy for ${formGrade} created.`);
      }
      setIsModalOpen(false);
      loadData(true);
    } catch (err: any) {
      toast.error("Save Failed", err.response?.data?.detail || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePolicy = async (p: DAConveyancePolicy) => {
    if (!confirm(`Are you sure you want to delete policy for '${p.grade_name}' (${p.city_tier})?`)) return;
    try {
      await apiClient.delete(`/expenses/policies/${p.id}`);
      toast.success("Policy Deleted", "Policy rate removed.");
      loadData(true);
    } catch (err: any) {
      toast.error("Delete Failed", err.response?.data?.detail || err.message);
    }
  };

  const filteredPolicies = policies.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.grade_name.toLowerCase().includes(q) || p.city_tier.toLowerCase().includes(q);
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <Link
              href="/hr-payroll/travel-requests"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Travel Management</span>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Daily Allowance (DA) & Conveyance Policies
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Grade-wise per-diem meals, lodging limits by city tier, and official mileage reimbursement rates
            </p>
          </div>

          <div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Rate Policy</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search grade or city tier..."
              className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button
              onClick={() => loadData(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
              <span>Refresh</span>
            </button>
            <span className="font-semibold text-slate-700">{filteredPolicies.length}</span> policy rules
          </div>
        </div>

        {/* Table Container */}
        <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-100 overflow-hidden z-10">
              <div className="h-full bg-indigo-600 animate-pulse w-full" />
            </div>
          )}

          {initialLoading ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <p className="text-xs">Loading rate policies...</p>
            </div>
          ) : filteredPolicies.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400">
              <Banknote className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No policy rules defined</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full text-left border-collapse transition-opacity duration-150 ${isFetching ? "opacity-75" : "opacity-100"}`}>
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Designation / Grade</th>
                    <th className="py-3 px-4">City Tier</th>
                    <th className="py-3 px-4">Per-Diem DA Rate</th>
                    <th className="py-3 px-4">Max Hotel / Night</th>
                    <th className="py-3 px-4">Mileage Rate / KM</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPolicies.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{p.grade_name}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 capitalize">
                          {p.city_tier.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        BDT {Number(p.daily_allowance_rate).toLocaleString(undefined, { minimumFractionDigits: 2 })} / day
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        BDT {Number(p.hotel_limit_per_night).toLocaleString(undefined, { minimumFractionDigits: 2 })} / night
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        BDT {Number(p.conveyance_rate_per_km).toLocaleString(undefined, { minimumFractionDigits: 2 })} / km
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                          Active
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePolicy(p)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Add/Edit Policy */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase">
                <Banknote className="w-4 h-4" />
                <span>Policy Engine</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                {editingPolicy ? "Edit Rate Policy" : "Create Rate Policy"}
              </h2>

              <form onSubmit={handleSavePolicy} className="space-y-3.5 mt-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Designation / Grade *</label>
                  <input
                    type="text"
                    required
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    placeholder="e.g. Executive, Manager, Area Director"
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">City Tier</label>
                  <select
                    value={formTier}
                    onChange={(e) => setFormTier(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="tier_1_dhaka_ctg">Tier 1: Dhaka & Chittagong Metropolitan</option>
                    <option value="tier_2_divisional">Tier 2: Divisional Cities (Sylhet, Rajshahi, Khulna)</option>
                    <option value="tier_3_district">Tier 3: District & Upazila Stations</option>
                    <option value="international">Tier 4: International Travel</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase">Daily Allowance (BDT)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formDA}
                      onChange={(e) => setFormDA(e.target.value)}
                      placeholder="1500.00"
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase">Hotel Limit / Night</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formHotel}
                      onChange={(e) => setFormHotel(e.target.value)}
                      placeholder="3500.00"
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Mileage Conveyance / KM (BDT)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formKmRate}
                    onChange={(e) => setFormKmRate(e.target.value)}
                    placeholder="12.00"
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                  >
                    {isSubmitting ? "Saving..." : "Save Policy"}
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
