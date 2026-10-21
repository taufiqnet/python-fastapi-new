"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { PatientOut, PatientGender, PatientBloodGroup } from "@/types";
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  Heart,
  MapPin,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (patient?: PatientOut) => void;
  patientToEdit?: PatientOut | null;
}

export function PatientModal({
  isOpen,
  onClose,
  onSuccess,
  patientToEdit,
}: PatientModalProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<PatientGender>("male");
  const [bloodGroup, setBloodGroup] = useState<PatientBloodGroup | "">("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [address, setAddress] = useState("");
  const [nationalId, setNationalId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (patientToEdit) {
      setFullName(patientToEdit.full_name || "");
      setPhone(patientToEdit.phone || "");
      setEmail(patientToEdit.email || "");
      setDateOfBirth(patientToEdit.date_of_birth ? patientToEdit.date_of_birth.slice(0, 10) : "");
      setGender(patientToEdit.gender || "male");
      setBloodGroup(patientToEdit.blood_group || "");
      setEmergencyName(patientToEdit.emergency_contact_name || "");
      setEmergencyPhone(patientToEdit.emergency_contact_phone || "");
      setAddress(patientToEdit.address || "");
      setNationalId(patientToEdit.national_id || "");
    } else {
      setFullName("");
      setPhone("");
      setEmail("");
      setDateOfBirth("");
      setGender("male");
      setBloodGroup("");
      setEmergencyName("");
      setEmergencyPhone("");
      setAddress("");
      setNationalId("");
    }
    setError(null);
  }, [patientToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setError("Patient full name and contact phone number are required.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      business_id: 1, // Will be scoped to current tenant by backend
      full_name: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      date_of_birth: dateOfBirth || null,
      gender,
      blood_group: bloodGroup || null,
      emergency_contact_name: emergencyName.trim() || null,
      emergency_contact_phone: emergencyPhone.trim() || null,
      address: address.trim() || null,
      national_id: nationalId.trim() || null,
    };

    try {
      if (patientToEdit) {
        const res = await apiClient.put<PatientOut>(`/healthcare/patients/${patientToEdit.id}`, payload);
        onSuccess(res.data);
      } else {
        const res = await apiClient.post<PatientOut>("/healthcare/patients", payload);
        onSuccess(res.data);
      }
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to save patient record. Please check inputs.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {patientToEdit ? "Edit Patient Information" : "Register New Patient (MPI)"}
              </h3>
              <p className="text-xs text-emerald-100 mt-0.5">
                {patientToEdit
                  ? `Updating record for ${patientToEdit.uhid}`
                  : "Auto-generates unique lifetime Health ID (UHID)"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Mohammad Karim"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Contact Phone <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. 01711223344"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  placeholder="patient@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as PatientGender)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Blood Group */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
              <div className="relative">
                <Heart className="w-4 h-4 absolute left-3 top-2.5 text-rose-400" />
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value as PatientBloodGroup | "")}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                >
                  <option value="">Unknown / Not Tested</option>
                  <option value="A+">A Positive (A+)</option>
                  <option value="A-">A Negative (A-)</option>
                  <option value="B+">B Positive (B+)</option>
                  <option value="B-">B Negative (B-)</option>
                  <option value="AB+">AB Positive (AB+)</option>
                  <option value="AB-">AB Negative (AB-)</option>
                  <option value="O+">O Positive (O+)</option>
                  <option value="O-">O Negative (O-)</option>
                </select>
              </div>
            </div>

            {/* Emergency Contact Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Emergency Contact Person
              </label>
              <input
                type="text"
                placeholder="e.g. Spouse / Brother"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            {/* Emergency Contact Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                placeholder="e.g. 01800000000"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            {/* National ID / Passport */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                National ID / Birth Reg. / Passport
              </label>
              <div className="relative">
                <Shield className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. 19842691234567890"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Residential Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Address</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <textarea
                  rows={2}
                  placeholder="House, Street, Thana, District"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-600/20 flex items-center gap-2 transition-all"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {patientToEdit ? "Update Patient" : "Create Patient & Generate UHID"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PatientModal;
