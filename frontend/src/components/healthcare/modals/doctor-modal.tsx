"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { DoctorProfileOut, EmployeeOut } from "@/types";
import {
  X,
  Stethoscope,
  Award,
  Phone,
  DoorOpen,
  DollarSign,
  Percent,
  UserCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface DoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  doctorToEdit?: DoctorProfileOut | null;
  employees?: EmployeeOut[];
}

export function DoctorModal({
  isOpen,
  onClose,
  onSuccess,
  doctorToEdit,
  employees = [],
}: DoctorModalProps) {
  const [fullName, setFullName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [medicalDegrees, setMedicalDegrees] = useState("");
  const [bmdcRegNumber, setBmdcRegNumber] = useState("");
  const [chamberName, setChamberName] = useState("");
  const [consultationFee, setConsultationFee] = useState<string>("1000");
  const [followUpFee, setFollowUpFee] = useState<string>("500");
  const [contactPhone, setContactPhone] = useState("");
  const [isReferralDoctor, setIsReferralDoctor] = useState(true);
  const [referralCommissionRate, setReferralCommissionRate] = useState<string>("15");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (doctorToEdit) {
      setFullName(doctorToEdit.full_name || "");
      setSpecialization(doctorToEdit.specialization || "");
      setMedicalDegrees(doctorToEdit.medical_degrees || "");
      setBmdcRegNumber(doctorToEdit.bmdc_reg_number || "");
      setChamberName(doctorToEdit.chamber_name || "");
      setConsultationFee(String(doctorToEdit.consultation_fee ?? 0));
      setFollowUpFee(String(doctorToEdit.follow_up_fee ?? 0));
      setContactPhone(doctorToEdit.contact_phone || "");
      setIsReferralDoctor(doctorToEdit.is_referral_doctor);
      setReferralCommissionRate(String(doctorToEdit.referral_commission_rate ?? 0));
      setEmployeeId(doctorToEdit.employee_id || "");
      setIsActive(doctorToEdit.is_active);
    } else {
      setFullName("");
      setSpecialization("");
      setMedicalDegrees("");
      setBmdcRegNumber("");
      setChamberName("");
      setConsultationFee("1000");
      setFollowUpFee("500");
      setContactPhone("");
      setIsReferralDoctor(true);
      setReferralCommissionRate("15");
      setEmployeeId("");
      setIsActive(true);
    }
    setError(null);
  }, [doctorToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !specialization.trim() || !medicalDegrees.trim()) {
      setError("Doctor name, specialization, and medical degrees are required.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      business_id: 1,
      full_name: fullName.trim(),
      specialization: specialization.trim(),
      medical_degrees: medicalDegrees.trim(),
      bmdc_reg_number: bmdcRegNumber.trim() || null,
      chamber_name: chamberName.trim() || null,
      consultation_fee: parseFloat(consultationFee) || 0.0,
      follow_up_fee: parseFloat(followUpFee) || 0.0,
      contact_phone: contactPhone.trim() || null,
      is_referral_doctor: isReferralDoctor,
      referral_commission_rate: parseFloat(referralCommissionRate) || 0.0,
      employee_id: employeeId ? employeeId : null,
      is_active: isActive,
    };

    try {
      if (doctorToEdit) {
        await apiClient.put(`/healthcare/doctors/${doctorToEdit.id}`, payload);
      } else {
        await apiClient.post("/healthcare/doctors", payload);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to save doctor profile.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {doctorToEdit ? "Edit Doctor Profile" : "Register Doctor / Specialist"}
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Manage OPD chamber consultations and referral commission
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-100 hover:text-white hover:bg-white/10 transition-colors"
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
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Doctor Full Name & Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Prof. Dr. A. K. Azad"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            {/* Specialization */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Clinical Specialization <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Cardiologist / Medicine"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            {/* Medical Degrees */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Degrees & Qualifications <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MBBS, FCPS, MD"
                value={medicalDegrees}
                onChange={(e) => setMedicalDegrees(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            {/* BMDC Registration No */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                BM&DC Registration No.
              </label>
              <div className="relative">
                <Award className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. A-45210"
                  value={bmdcRegNumber}
                  onChange={(e) => setBmdcRegNumber(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            {/* Chamber Name / Room */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Chamber / Room Location
              </label>
              <div className="relative">
                <DoorOpen className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Room 204, OPD Block B"
                  value={chamberName}
                  onChange={(e) => setChamberName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            {/* Consultation Fee */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Visit Fee (BDT)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            {/* Follow-up Fee */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Follow-up Fee (BDT)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={followUpFee}
                onChange={(e) => setFollowUpFee(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            {/* Referral Commission Rate */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Referral Commission Rate (%)
              </label>
              <div className="relative">
                <Percent className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={referralCommissionRate}
                  onChange={(e) => setReferralCommissionRate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Contact Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="tel"
                  placeholder="e.g. 01700112233"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            {/* HR Link Employee */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Link to HR Employee Record (Optional)
              </label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="">None (Independent / External Consultant)</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.employee_id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={isReferralDoctor}
                onChange={(e) => setIsReferralDoctor(e.target.checked)}
                className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-semibold">Eligible for Diagnostic Referrals</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-semibold">Active Doctor Status</span>
            </label>
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
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-600/20 flex items-center gap-2 transition-all"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {doctorToEdit ? "Update Doctor Profile" : "Register Doctor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DoctorModal;
