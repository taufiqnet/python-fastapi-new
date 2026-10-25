"use client";

import React, { useState, useEffect } from "react";
import { CustomerOut, CustomerCreateInput } from "@/types";
import { X, User, Phone, Mail, MapPin, Award, DollarSign, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (saved: CustomerOut) => void;
  customerToEdit?: CustomerOut | null;
  businessId: number;
}

export function CustomerFormModal({
  isOpen,
  onClose,
  onSuccess,
  customerToEdit,
  businessId,
}: CustomerFormModalProps) {
  const { toast } = useToast();
  const isEditing = Boolean(customerToEdit);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [membershipTier, setMembershipTier] = useState("Regular");
  const [loyaltyPoints, setLoyaltyPoints] = useState("0");
  const [storeCredit, setStoreCredit] = useState("0.00");
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [phoneChecking, setPhoneChecking] = useState(false);
  const [phoneWarning, setPhoneWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customerToEdit) {
      setFirstName(customerToEdit.first_name || "");
      setLastName(customerToEdit.last_name || "");
      setPhone(customerToEdit.phone || "");
      setEmail(customerToEdit.email || "");
      setAddress(customerToEdit.address || "");
      setMembershipTier(customerToEdit.membership_tier || "Regular");
      setLoyaltyPoints(String(customerToEdit.loyalty_points || 0));
      setStoreCredit(String(customerToEdit.store_credit || "0.00"));
      setIsActive(customerToEdit.is_active !== false);
    } else {
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setMembershipTier("Regular");
      setLoyaltyPoints("0");
      setStoreCredit("0.00");
      setIsActive(true);
    }
    setError(null);
    setPhoneWarning(null);
  }, [customerToEdit, isOpen]);

  if (!isOpen) return null;

  // Phone duplication check on blur (if creating new or phone modified)
  const handlePhoneBlur = async () => {
    if (!phone.trim()) return;
    if (isEditing && customerToEdit?.phone === phone.trim()) return;

    setPhoneChecking(true);
    setPhoneWarning(null);
    try {
      const res = await apiClient.get(
        `/customers/check-phone?phone=${encodeURIComponent(phone.trim())}&business_id=${businessId}`
      );
      if (res.data?.exists) {
        setPhoneWarning(res.data.message || "Customer with this phone already exists.");
      }
    } catch {
      // Ignore background check failure
    } finally {
      setPhoneChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }
    if (!phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: CustomerCreateInput = {
      first_name: firstName.trim(),
      last_name: lastName.trim() || null,
      phone: phone.trim(),
      email: email.trim() || null,
      address: address.trim() || null,
      membership_tier: membershipTier,
      loyalty_points: parseInt(loyaltyPoints, 10) || 0,
      store_credit: parseFloat(storeCredit) || 0,
      is_active: isActive,
      business_id: businessId,
    };

    try {
      let saved: CustomerOut;
      if (isEditing && customerToEdit) {
        const res = await apiClient.put<CustomerOut>(`/customers/${customerToEdit.id}`, payload);
        saved = res.data;
        toast.success("Customer profile updated successfully");
      } else {
        const res = await apiClient.post<CustomerOut>("/customers/", payload);
        saved = res.data;
        toast.success("Customer registered successfully");
      }
      onSuccess(saved);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to save customer record. Please check the inputs.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? "Edit Customer Profile" : "Register New Customer"}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing ? `Modifying ${customerToEdit?.full_name}` : "Create CRM contact profile"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g., Sarah"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g., Connor"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={handlePhoneBlur}
                placeholder="+1 555-0199 or 01700000000"
                className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              {phoneChecking && (
                <Loader2 className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-indigo-600" />
              )}
            </div>
            {phoneWarning && (
              <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3 h-3" /> {phoneWarning}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah.connor@example.com"
                className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Delivery address, suite, district, city..."
                className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Membership</label>
              <select
                value={membershipTier}
                onChange={(e) => setMembershipTier(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="Regular">Regular</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="VIP">VIP</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Loyalty Points</label>
              <input
                type="number"
                min="0"
                value={loyaltyPoints}
                onChange={(e) => setLoyaltyPoints(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Store Credit ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={storeCredit}
                onChange={(e) => setStoreCredit(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <input
              type="checkbox"
              id="cust_is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <label htmlFor="cust_is_active" className="text-xs font-medium text-slate-700 cursor-pointer">
              Active Customer Account
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {isEditing ? "Save Changes" : "Register Customer"}
          </button>
        </div>
      </div>
    </div>
  );
}
