"use client";

import React, { useState, useEffect } from "react";
import { Shift, ShiftCreatePayload } from "@/types";
import { X, Clock, Palette, AlertCircle, ShieldCheck } from "lucide-react";

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: ShiftCreatePayload, shiftId?: string) => Promise<void>;
  shift?: Shift | null;
}

const PRESET_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#64748B", // Slate
  "#EF4444", // Rose
];

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  onSave,
  shift,
}) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:30");
  const [workHours, setWorkHours] = useState(8.0);
  const [breakMinutes, setBreakMinutes] = useState(60);
  const [graceIn, setGraceIn] = useState(15);
  const [graceOut, setGraceOut] = useState(15);
  const [isNightShift, setIsNightShift] = useState(false);
  const [isOffDay, setIsOffDay] = useState(false);
  const [colorCode, setColorCode] = useState("#3B82F6");
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shift) {
      setName(shift.name);
      setCode(shift.code);
      setStartTime(shift.start_time ? shift.start_time.substring(0, 5) : "08:00");
      setEndTime(shift.end_time ? shift.end_time.substring(0, 5) : "16:30");
      setWorkHours(shift.work_hours);
      setBreakMinutes(shift.break_duration_minutes);
      setGraceIn(shift.grace_in_minutes);
      setGraceOut(shift.grace_out_minutes);
      setIsNightShift(shift.is_night_shift);
      setIsOffDay(shift.is_off_day);
      setColorCode(shift.color_code || "#3B82F6");
      setIsActive(shift.is_active);
    } else {
      setName("");
      setCode("");
      setStartTime("08:00");
      setEndTime("16:30");
      setWorkHours(8.0);
      setBreakMinutes(60);
      setGraceIn(15);
      setGraceOut(15);
      setIsNightShift(false);
      setIsOffDay(false);
      setColorCode("#3B82F6");
      setIsActive(true);
    }
    setError(null);
  }, [shift, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError("Shift name and unique code are required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: ShiftCreatePayload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        start_time: isOffDay ? null : startTime,
        end_time: isOffDay ? null : endTime,
        work_hours: isOffDay ? 0 : Number(workHours),
        break_duration_minutes: isOffDay ? 0 : Number(breakMinutes),
        grace_in_minutes: isOffDay ? 0 : Number(graceIn),
        grace_out_minutes: isOffDay ? 0 : Number(graceOut),
        is_night_shift: isOffDay ? false : isNightShift,
        is_off_day: isOffDay,
        color_code: colorCode,
        is_active: isActive,
      };

      await onSave(payload, shift?.id);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to save shift definition.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {shift ? "Edit Shift Definition" : "Create New Shift"}
              </h3>
              <p className="text-xs text-slate-500">
                Define timing windows, tolerances, and badge appearance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shift Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Morning Shift A"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shift Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. MS-1"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 uppercase focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Rest Day Toggle */}
          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-amber-900">Designated Rest Day (OFF)</div>
              <div className="text-[11px] text-amber-700">
                Mark as weekly rest day for BLA 2006 compliance
              </div>
            </div>
            <input
              type="checkbox"
              checked={isOffDay}
              onChange={(e) => setIsOffDay(e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded-md focus:ring-amber-500"
            />
          </div>

          {!isOffDay && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Work Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={workHours}
                    onChange={(e) => setWorkHours(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Grace In (min)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={graceIn}
                    onChange={(e) => setGraceIn(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Grace Out (min)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={graceOut}
                    onChange={(e) => setGraceOut(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-night-shift"
                  checked={isNightShift}
                  onChange={(e) => setIsNightShift(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500"
                />
                <label htmlFor="chk-night-shift" className="text-xs text-slate-700 font-medium">
                  Overnight Shift (Crosses midnight boundary into next day)
                </label>
              </div>
            </>
          )}

          {/* Color Code Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-slate-500" />
              Calendar Badge Color
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColorCode(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-lg transition-transform ${
                    colorCode === c ? "scale-115 ring-2 ring-indigo-500 ring-offset-2" : "hover:scale-105"
                  }`}
                />
              ))}
              <input
                type="color"
                value={colorCode}
                onChange={(e) => setColorCode(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0 ml-1"
                title="Custom Color"
              />
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="chk-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500"
            />
            <label htmlFor="chk-active" className="text-xs text-slate-700 font-medium">
              Active Shift (Available in roster scheduling)
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              {saving ? "Saving..." : shift ? "Update Shift" : "Create Shift"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
