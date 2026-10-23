"use client";

import React, { useState, useEffect } from "react";
import { Clock, CheckCircle2, Play, Square, Loader2, MapPin } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";

interface PunchCardProps {
  todayStatus: string;
  punchInTime?: string | null;
  punchOutTime?: string | null;
  onPunchSuccess?: () => void;
}

export function PunchCardWidget({
  todayStatus,
  punchInTime,
  punchOutTime,
  onPunchSuccess,
}: PunchCardProps) {
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setCurrentDate(
        now.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePunch = async (action: "in" | "out") => {
    setIsSubmitting(true);
    try {
      const endpoint = action === "in" ? "/attendance/check-in" : "/attendance/check-out";
      await apiClient.post(endpoint, {});
      toast.success(
        action === "in" ? "Punched In Successfully" : "Punched Out Successfully",
        `Time recorded at ${new Date().toLocaleTimeString()}`
      );
      if (onPunchSuccess) onPunchSuccess();
    } catch (err: any) {
      toast.error(
        "Punch Operation Failed",
        err.response?.data?.detail || "Unable to record attendance timestamp."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPunchedIn = Boolean(punchInTime && !punchOutTime);
  const isPunchedOut = Boolean(punchInTime && punchOutTime);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 shadow-xl border border-indigo-700/50">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold tracking-wide uppercase">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Digital Time Office</span>
            <span className="flex items-center gap-1 text-[11px] font-normal text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live System
            </span>
          </div>

          <div className="text-3xl md:text-4xl font-extrabold tracking-tight font-mono text-white">
            {currentTime || "--:--:--"}
          </div>
          <p className="text-indigo-200/80 text-xs">{currentDate}</p>
        </div>

        {/* Punch State Details */}
        <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-3">
          <div className="text-left">
            <span className="text-[10px] uppercase font-semibold text-indigo-300 block">Check In</span>
            <span className="text-sm font-bold font-mono text-white">
              {punchInTime || "--:--"}
            </span>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-left">
            <span className="text-[10px] uppercase font-semibold text-indigo-300 block">Check Out</span>
            <span className="text-sm font-bold font-mono text-white">
              {punchOutTime || "--:--"}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          {!isPunchedIn && !isPunchedOut ? (
            <button
              onClick={() => handlePunch("in")}
              disabled={isSubmitting}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 font-semibold text-sm text-white shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-white" />
              )}
              <span>Web Check-In</span>
            </button>
          ) : isPunchedIn ? (
            <button
              onClick={() => handlePunch("out")}
              disabled={isSubmitting}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 font-semibold text-sm text-white shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4 fill-white" />
              )}
              <span>Web Check-Out</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-emerald-300 text-xs font-semibold border border-white/10">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Shift Day Completed</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
