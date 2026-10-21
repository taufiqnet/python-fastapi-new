"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import {
  AppointmentCreatePayload,
  AppointmentOut,
  DoctorProfileOut,
  PatientOut,
  VisitType,
} from "@/types";
import {
  X,
  Calendar,
  Clock,
  UserCheck,
  Stethoscope,
  DollarSign,
  AlertCircle,
  Save,
  Loader2,
  FileText,
} from "lucide-react";

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (appointment: AppointmentOut) => void;
  doctors: DoctorProfileOut[];
  patients: PatientOut[];
  defaultDoctorId?: string;
  defaultDate?: string;
}

export function AppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  doctors,
  patients,
  defaultDoctorId,
  defaultDate,
}: AppointmentModalProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  const [doctorId, setDoctorId] = useState<string>(defaultDoctorId || (doctors[0]?.id || ""));
  const [patientId, setPatientId] = useState<string>(patients[0]?.id || "");
  const [appointmentDate, setAppointmentDate] = useState<string>(defaultDate || todayStr);
  const [scheduledTime, setScheduledTime] = useState<string>("18:00");
  const [visitType, setVisitType] = useState<VisitType>("new");
  const [fee, setFee] = useState<number>(1000);
  const [isPaid, setIsPaid] = useState<boolean>(true);
  const [chiefComplaints, setChiefComplaints] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-update fee when doctor or visit type changes
  useEffect(() => {
    const doc = doctors.find((d) => d.id === doctorId);
    if (doc) {
      if (visitType === "follow_up") {
        setFee(Number(doc.follow_up_fee) || Number(doc.consultation_fee) / 2 || 500);
      } else if (visitType === "report_review") {
        setFee(0);
      } else {
        setFee(Number(doc.consultation_fee) || 1000);
      }
    }
  }, [doctorId, visitType, doctors]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId) {
      setError("Please select a doctor.");
      return;
    }
    if (!patientId) {
      setError("Please select a patient.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: AppointmentCreatePayload = {
        business_id: 1,
        doctor_id: doctorId,
        patient_id: patientId,
        appointment_date: appointmentDate,
        scheduled_time: scheduledTime,
        visit_type: visitType,
        consultation_fee: Number(fee),
        is_paid: isPaid,
        chief_complaints: chiefComplaints.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await apiClient.post<AppointmentOut>("/healthcare/appointments", payload);
      onSuccess(res.data);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to schedule appointment.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Book OPD Token / Appointment</h2>
              <p className="text-xs text-slate-500">
                Issues daily sequential chamber token (e.g. Serial #1, #2...)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Doctor & Patient */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Doctor <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Stethoscope className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  required
                >
                  <option value="">Select Doctor</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} ({d.specialization || "General"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Patient <span className="text-rose-500">*</span>
              </label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                required
              >
                <option value="">Select Patient</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.uhid}) - {p.phone}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date, Scheduled Time & Visit Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Appointment Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Approx. Time
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Visit Type
              </label>
              <select
                value={visitType}
                onChange={(e) => setVisitType(e.target.value as VisitType)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              >
                <option value="new">New Consultation</option>
                <option value="follow_up">Follow-up</option>
                <option value="report_review">Report Review</option>
              </select>
            </div>
          </div>

          {/* Fee & Payment Status */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Consultation Fee (৳)
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  value={fee}
                  onChange={(e) => setFee(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2 text-xs font-bold text-slate-900 border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Fee Status
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-emerald-800">
                  {isPaid ? "Paid at Counter" : "Payment Pending"}
                </span>
              </label>
            </div>
          </div>

          {/* Chief Complaints */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Chief Complaints / Symptoms (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Fever for 3 days, Chest discomfort, Cough"
              value={chiefComplaints}
              onChange={(e) => setChiefComplaints(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          {/* Booking Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Desk Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Any desk remarks or patient special requirements..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Generate Token & Book
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
