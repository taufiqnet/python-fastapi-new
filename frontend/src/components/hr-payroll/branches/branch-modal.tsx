"use client";

import React, { useState, useEffect } from "react";
import { BranchOut, EmployeeOut } from "@/types";
import { X, Building2, User, MapPin, Phone, Mail, Check, AlertCircle, Crown } from "lucide-react";
import { SearchableEmployeeCombobox } from "@/components/common/searchable-employee-combobox";

interface BranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  editingBranch: BranchOut | null;
  employees: EmployeeOut[];
  businessId?: number;
}

export const BRANCH_TYPES = [
  { value: "headquarters", label: "Corporate Headquarters" },
  { value: "regional_office", label: "Regional / Divisional Office" },
  { value: "branch_office", label: "Branch Office" },
  { value: "retail_outlet", label: "Retail Super Shop Outlet" },
  { value: "warehouse_hub", label: "Logistics / Warehouse Hub" },
];

export function BranchModal({
  isOpen,
  onClose,
  onSave,
  editingBranch,
  employees,
  businessId = 1,
}: BranchModalProps) {
  const isEditing = Boolean(editingBranch);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [branchType, setBranchType] = useState("branch_office");
  const [managerEmployeeId, setManagerEmployeeId] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Dhaka");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("Bangladesh");
  const [zipCode, setZipCode] = useState("");
  const [isHeadOffice, setIsHeadOffice] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingBranch) {
      setName(editingBranch.name || "");
      setCode(editingBranch.code || "");
      setBranchType(editingBranch.branch_type || "branch_office");
      setManagerEmployeeId(editingBranch.manager_employee_id || "");
      setPhone(editingBranch.phone || "");
      setEmail(editingBranch.email || "");
      setAddress(editingBranch.address || "");
      setCity(editingBranch.city || "Dhaka");
      setState(editingBranch.state || "");
      setCountry(editingBranch.country || "Bangladesh");
      setZipCode(editingBranch.zip_code || "");
      setIsHeadOffice(editingBranch.is_head_office || false);
      setIsActive(editingBranch.is_active);
    } else {
      setName("");
      setCode("");
      setBranchType("branch_office");
      setManagerEmployeeId("");
      setPhone("");
      setEmail("");
      setAddress("");
      setCity("Dhaka");
      setState("");
      setCountry("Bangladesh");
      setZipCode("");
      setIsHeadOffice(false);
      setIsActive(true);
    }
    setError(null);
  }, [editingBranch, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Branch name is required.");
      return;
    }
    if (!code.trim()) {
      setError("Branch code is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        branch_type: branchType,
        manager_employee_id: managerEmployeeId || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        country: country.trim() || null,
        zip_code: zipCode.trim() || null,
        is_head_office: isHeadOffice,
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
        setError(err.message || "Failed to save branch.");
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
                {isEditing ? `Edit: ${editingBranch?.name}` : "Create Company Branch"}
              </h3>
              <p className="text-xs text-slate-500">
                Setup distributed offices, regional retail outlets, or logistics hubs.
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
          {/* Branch Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Branch Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chittagong Regional Hub"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          {/* Code & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Branch Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. CTG-01"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Branch Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={branchType}
                onChange={(e) => setBranchType(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
              >
                {BRANCH_TYPES.map((bt) => (
                  <option key={bt.value} value={bt.value}>
                    {bt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Branch Manager */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Branch Manager / Lead
            </label>
            <SearchableEmployeeCombobox
              employees={employees}
              value={managerEmployeeId}
              onChange={(empId) => setManagerEmployeeId(empId)}
              placeholder="Search & select branch manager / lead..."
              allowClear={true}
              emptyUnassignedLabel="-- No Branch Manager Assigned --"
            />
          </div>

          {/* Contact (Phone & Email) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Phone Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+880 1712-345678"
                  className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Official Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="branch@supershop.com"
                  className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Physical Street Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Agrabad Commercial Area, House 12, Road 4"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          {/* City & Country */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                City / District
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Dhaka"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Bangladesh"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="pt-2 flex flex-wrap items-center gap-6 border-t border-slate-100">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-800 select-none">
              <input
                type="checkbox"
                checked={isHeadOffice}
                onChange={(e) => setIsHeadOffice(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span className="flex items-center gap-1 font-bold text-slate-900">
                <Crown className="w-3.5 h-3.5 text-amber-500" /> Corporate Head Office (HQ)
              </span>
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
                  <span>{isEditing ? "Update Branch" : "Create Branch"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
