"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  UserCheck,
  Phone,
  CreditCard,
  Calendar,
  AlertTriangle,
  Loader2,
  Heart,
  User,
} from "lucide-react";
import { EmployeeNomineeOut, EmployeeNomineeInput } from "@/types";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";

interface NomineeTabProps {
  employeeId: string;
  initialNominees: EmployeeNomineeOut[];
  onRefresh: () => void;
}

export function NomineeTab({
  employeeId,
  initialNominees,
  onRefresh,
}: NomineeTabProps) {
  const { toast } = useToast();
  const [nominees, setNominees] = useState<EmployeeNomineeOut[]>(initialNominees);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNominee, setEditingNominee] = useState<EmployeeNomineeOut | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<EmployeeNomineeInput>({
    nominee_name: "",
    nominee_name_bangla: "",
    relation: "Spouse",
    nid_or_birth_cert: "",
    dob: "",
    share_percentage: 100,
    phone: "",
    address: "",
    is_minor: false,
    guardian_name: "",
    guardian_relation: "",
    guardian_nid: "",
    guardian_phone: "",
    guardian_address: "",
  });

  // Calculate total share %
  const totalShare = (nominees || []).reduce((acc, curr) => acc + (Number(curr.share_percentage) || 0), 0);
  const isCompliant = Math.abs(totalShare - 100) < 0.01;

  const handleOpenCreate = () => {
    setEditingNominee(null);
    const remaining = Math.max(0, 100 - totalShare);
    setFormData({
      nominee_name: "",
      nominee_name_bangla: "",
      relation: "Spouse",
      nid_or_birth_cert: "",
      dob: "",
      share_percentage: remaining > 0 ? remaining : 0,
      phone: "",
      address: "",
      is_minor: false,
      guardian_name: "",
      guardian_relation: "",
      guardian_nid: "",
      guardian_phone: "",
      guardian_address: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (nominee: EmployeeNomineeOut) => {
    setEditingNominee(nominee);
    setFormData({
      nominee_name: nominee.nominee_name,
      nominee_name_bangla: nominee.nominee_name_bangla || "",
      relation: nominee.relation,
      nid_or_birth_cert: nominee.nid_or_birth_cert || "",
      dob: nominee.dob || "",
      share_percentage: nominee.share_percentage,
      phone: nominee.phone || "",
      address: nominee.address || "",
      is_minor: nominee.is_minor || false,
      guardian_name: nominee.guardian_name || "",
      guardian_relation: nominee.guardian_relation || "",
      guardian_nid: nominee.guardian_nid || "",
      guardian_phone: nominee.guardian_phone || "",
      guardian_address: nominee.guardian_address || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nominee_name.trim()) {
      toast.error("Validation Error", "Nominee name is required.");
      return;
    }
    if (formData.share_percentage <= 0 || formData.share_percentage > 100) {
      toast.error("Validation Error", "Share percentage must be between 1% and 100%.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingNominee) {
        const res = await apiClient.put<EmployeeNomineeOut>(
          `/employees/${employeeId}/nominees/${editingNominee.id}`,
          formData
        );
        toast.success("Nominee Updated", `${res.data.nominee_name}'s record has been updated.`);
      } else {
        const res = await apiClient.post<EmployeeNomineeOut>(
          `/employees/${employeeId}/nominees`,
          formData
        );
        toast.success("Nominee Added", `${res.data.nominee_name} has been designated as statutory nominee.`);
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to save nominee record.";
      toast.error("Nominee Save Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from statutory nominees?`)) return;
    setDeletingId(id);
    try {
      await apiClient.delete(`/employees/${employeeId}/nominees/${id}`);
      toast.success("Nominee Removed", `${name} has been removed.`);
      onRefresh();
    } catch (err: any) {
      toast.error("Delete Error", err.response?.data?.detail || "Failed to remove nominee.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Statutory Form 33 Compliance Header & Meter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Statutory Nominee Declarations (BLA 2006 Form 33)
              </h3>
              {isCompliant ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" /> 100% Compliant
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5" /> {totalShare}% Allocated (Pending 100%)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Statutory requirement under Bangladesh Labour Act 2006 (§ 19, 20, 38) & Labour Rules 2015 Form 33 for Provident Fund, Gratuity, and Group Insurance settlement.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Nominee
          </button>
        </div>

        {/* Share Distribution Progress Bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-slate-600">Total Terminal Benefit Allocation:</span>
            <span className={isCompliant ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
              {totalShare}% of 100%
            </span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isCompliant
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                  : totalShare > 100
                  ? "bg-rose-500"
                  : "bg-gradient-to-r from-indigo-500 to-amber-500"
              }`}
              style={{ width: `${Math.min(totalShare, 100)}%` }}
            />
          </div>
          {!isCompliant && (
            <p className="text-[11px] text-amber-700 font-medium mt-2 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              Remaining unallocated share: <span className="font-bold">{Math.max(0, 100 - totalShare)}%</span>.
              The profile requires exactly 100% total distribution to be fully statutory compliant.
            </p>
          )}
        </div>
      </div>

      {/* Nominees Grid / List */}
      {nominees.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Heart className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No Nominees Registered</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Under Bangladesh Labour Law, every employee must designate legal nominees to receive terminal dues, provident fund, and insurance compensation in unforeseen circumstances.
          </p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Register First Nominee
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {nominees.map((nominee) => (
            <div
              key={nominee.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              {/* Share Percentage Badge */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm">
                  {nominee.share_percentage}% Share
                </span>
              </div>

              <div className="flex items-start gap-3.5 pr-20">
                <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-base shrink-0">
                  {nominee.nominee_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">
                    {nominee.nominee_name}
                  </h4>
                  {nominee.nominee_name_bangla && (
                    <p className="text-xs text-slate-500 font-medium mt-0.5 font-bengali">
                      {nominee.nominee_name_bangla}
                    </p>
                  )}
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                    Relationship: {nominee.relation}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-600 block text-[11px]">NID / Birth Reg:</span>
                  <span className="font-semibold text-slate-800">
                    {nominee.nid_or_birth_cert || "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[11px]">Contact Phone:</span>
                  <span className="font-semibold text-slate-800">
                    {nominee.phone || "Not provided"}
                  </span>
                </div>
              </div>

              {/* Minor Guardian Section if Applicable */}
              {nominee.is_minor && (
                <div className="mt-3.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1">
                    <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                    Minor Nominee (&lt;18 yrs) — Legal Guardian:
                  </div>
                  <p className="text-amber-800">
                    <span className="font-semibold">{nominee.guardian_name}</span> ({nominee.guardian_relation})
                    {nominee.guardian_phone && ` • Phone: ${nominee.guardian_phone}`}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(nominee)}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-xs flex items-center gap-1 px-2.5 font-semibold"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(nominee.id, nominee.nominee_name)}
                  disabled={deletingId === nominee.id}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-xs flex items-center gap-1 px-2.5 font-semibold"
                >
                  {deletingId === nominee.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Nominee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingNominee ? "Edit Statutory Nominee" : "Add Statutory Nominee (Form 33)"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Designate legally binding recipient for terminal dues and provident fund.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nominee Full Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nominee_name}
                    onChange={(e) => setFormData({ ...formData, nominee_name: e.target.value })}
                    placeholder="e.g. Nasreen Akter"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    বাংলায় পূর্ণ নাম (Bangla Name)
                  </label>
                  <input
                    type="text"
                    value={formData.nominee_name_bangla || ""}
                    onChange={(e) => setFormData({ ...formData, nominee_name_bangla: e.target.value })}
                    placeholder="যেমন: নাসরীন আক্তার"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Relationship with Employee *
                  </label>
                  <select
                    value={formData.relation}
                    onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="Spouse">Spouse (স্ত্রী / স্বামী)</option>
                    <option value="Son">Son (পুত্র)</option>
                    <option value="Daughter">Daughter (কন্যা)</option>
                    <option value="Father">Father (পিতা)</option>
                    <option value="Mother">Mother (মাতা)</option>
                    <option value="Brother">Brother (ভাই)</option>
                    <option value="Sister">Sister (বোন)</option>
                    <option value="Other">Other Relative (অন্যান্য)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Share Percentage (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max="100"
                      required
                      value={formData.share_percentage}
                      onChange={(e) => setFormData({ ...formData, share_percentage: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none pr-8 font-bold"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    National ID (NID) / Birth Certificate
                  </label>
                  <input
                    type="text"
                    value={formData.nid_or_birth_cert || ""}
                    onChange={(e) => setFormData({ ...formData, nid_or_birth_cert: e.target.value })}
                    placeholder="10 / 17 digit NID or Birth Cert"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 01711XXXXXX"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nominee Residential Address
                </label>
                <textarea
                  rows={2}
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Village/Holding, Thana, District"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Minor Protection Toggle */}
              <div className="pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_minor}
                    onChange={(e) => setFormData({ ...formData, is_minor: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Nominee is a Minor (Under 18 Years Old)
                  </span>
                </label>
                <p className="text-[11px] text-slate-600 ml-6">
                  Per BLA Rule 23, a legal adult guardian must be designated to receive dues on behalf of minor beneficiaries.
                </p>
              </div>

              {/* Minor Guardian Fields */}
              {formData.is_minor && (
                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-3 animate-in fade-in">
                  <h5 className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                    Legal Guardian Information
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">
                        Guardian Full Name *
                      </label>
                      <input
                        type="text"
                        required={formData.is_minor}
                        value={formData.guardian_name || ""}
                        onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                        placeholder="Adult Guardian Name"
                        className="w-full text-xs px-2.5 py-1.5 border border-amber-300 rounded-lg focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">
                        Relationship to Minor *
                      </label>
                      <input
                        type="text"
                        required={formData.is_minor}
                        value={formData.guardian_relation || ""}
                        onChange={(e) => setFormData({ ...formData, guardian_relation: e.target.value })}
                        placeholder="e.g. Mother, Uncle"
                        className="w-full text-xs px-2.5 py-1.5 border border-amber-300 rounded-lg focus:outline-none bg-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">
                        Guardian NID
                      </label>
                      <input
                        type="text"
                        value={formData.guardian_nid || ""}
                        onChange={(e) => setFormData({ ...formData, guardian_nid: e.target.value })}
                        placeholder="Guardian National ID"
                        className="w-full text-xs px-2.5 py-1.5 border border-amber-300 rounded-lg focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">
                        Guardian Phone
                      </label>
                      <input
                        type="text"
                        value={formData.guardian_phone || ""}
                        onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
                        placeholder="01711XXXXXX"
                        className="w-full text-xs px-2.5 py-1.5 border border-amber-300 rounded-lg focus:outline-none bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition shadow-sm"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingNominee ? "Update Nominee" : "Save Nominee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
