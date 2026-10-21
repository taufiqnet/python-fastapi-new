"use client";

import React, { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { DayOfWeek, DoctorProfileOut, DoctorScheduleSlotCreatePayload, DoctorScheduleSlotOut } from "@/types";
import { X, Clock, Calendar, AlertCircle, Save, Loader2, Stethoscope } from "lucide-react";

interface ScheduleSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (slot: DoctorScheduleSlotOut) => void;
  doctors: DoctorProfileOut[];
  defaultDoctorId?: string;
}

const DAYS_OF_WEEK: { label: string; value: DayOfWeek }[] = [
  { label: "Saturday", value: "saturday" },
  { label: "Sunday", value: "sunday" },
  { label: "Monday", value: "monday" },
  { label: "Tuesday", value: "tuesday" },
  { label: "Wednesday", value: "wednesday" },
  { label: "Thursday", value: "thursday" },
  { label: "Friday", value: "friday" },
];

export function ScheduleSlotModal({
  isOpen,
  onClose,
  onSuccess,
  doctors,
  defaultDoctorId,
}: ScheduleSlotModalProps) {
  const [doctorId, setDoctorId] = useState<string>(defaultDoctorId || (doctors[0]?.id || ""));
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>("saturday");
  const [startTime, setStartTime] = useState("17:00");
  const [endTime, setEndTime] = useState("21:00");
  const [maxPatients, setMaxPatients] = useState(30);
  const [slotDuration, setSlotDuration] = useState(15);
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId) {
      setError("Please select a doctor.");
      return;
    }
    if (!startTime || !endTime) {
      setError("Please specify both start and end times.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: DoctorScheduleSlotCreatePayload = {
        business_id: 1,
        doctor_id: doctorId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        max_patients: Number(maxPatients) || 30,
        slot_duration_minutes: Number(slotDuration) || 15,
        is_active: isActive,
      };

      const res = await apiClient.post<DoctorScheduleSlotOut>(
        `/healthcare/doctors/${doctorId}/slots`,
        payload
      );
      onSuccess(res.data);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to save schedule slot.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add Chamber Schedule Slot</h2>
              <p className="text-xs text-slate-500">Configure recurring weekly OPD visiting hours</p>
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

          {/* Doctor Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Doctor / Consultant <span className="text-rose-500">*</span>
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
                    {d.full_name} ({d.specialization || "General"}) - {d.chamber_name || "Chamber"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Day of Week */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Day of Week <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {DAYS_OF_WEEK.map((d) => (
                <button
                  type="button"
                  key={d.value}
                  onClick={() => setDayOfWeek(d.value)}
                  className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition-all ${
                    dayOfWeek === d.value
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {d.label.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Start Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                End Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                required
              />
            </div>
          </div>

          {/* Max Patients & Avg Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Max Daily Tokens
              </label>
              <input
                type="number"
                min="1"
                max="200"
                value={maxPatients}
                onChange={(e) => setMaxPatients(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
              <span className="text-[10px] text-slate-400">Total serial capacity per day</span>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Slot Duration (Minutes)
              </label>
              <input
                type="number"
                min="5"
                max="60"
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
              <span className="text-[10px] text-slate-400">Est. consultation time per token</span>
            </div>
          </div>

          {/* Active Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500"
            />
            <span className="text-xs font-bold text-slate-800">Active slot for online/counter booking</span>
          </label>

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
              Save Schedule Slot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
