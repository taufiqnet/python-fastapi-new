"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { PortalDashboard } from "@/types";
import { PunchCardWidget } from "@/components/portal/punch-card-widget";
import { LeaveBalanceDial } from "@/components/portal/leave-balance-dial";
import { useToast } from "@/context/toast-context";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Bell,
  Pin,
  CalendarDays,
  FileCheck2,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Loader2,
} from "lucide-react";

export default function PortalDashboardPage() {
  const { toast } = useToast();
  const [data, setData] = useState<PortalDashboard | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async (isInitial = false) => {
    if (isInitial) setInitialLoading(true);
    else setIsFetching(true);
    setError(null);
    try {
      const res = await apiClient.get<PortalDashboard>("/portal/dashboard");
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load employee portal telemetry.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchDashboard(true);
  }, []);

  const handleAcknowledgeNotice = async (noticeId: string) => {
    try {
      await apiClient.post(`/notices/${noticeId}/acknowledge`, {});
      toast.success("Notice Acknowledged", "Marked as read successfully.");
      fetchDashboard(false);
    } catch {
      toast.error("Failed", "Unable to acknowledge notice.");
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading your employee dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-center max-w-lg mx-auto space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="font-bold text-base">Portal Telemetry Unavailable</h3>
        <p className="text-xs text-rose-600">{error || "Unable to retrieve employee profile."}</p>
        <button
          onClick={() => fetchDashboard(true)}
          className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { profile, attendance_summary, leave_balances, upcoming_holidays, upcoming_shifts, recent_notices } = data;

  return (
    <div className="space-y-8 relative">
      {/* Top rim background fetching progress bar */}
      {isFetching && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600/20 overflow-hidden rounded-full z-20">
          <div className="h-full bg-indigo-600 animate-pulse w-full" />
        </div>
      )}

      {/* Hero Welcome & Punch Clock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PunchCardWidget
            todayStatus={attendance_summary.today_status}
            punchInTime={attendance_summary.today_punch_in}
            punchOutTime={attendance_summary.today_punch_out}
            onPunchSuccess={() => fetchDashboard(false)}
          />
        </div>

        {/* Quick Profile Summary Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold text-base">
                {profile.first_name[0]}
                {profile.last_name ? profile.last_name[0] : ""}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base leading-tight">
                  {profile.full_name}
                </h3>
                <p className="text-xs text-slate-500 font-medium">{profile.job_title_name || "Employee"}</p>
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-600 space-y-1.5 border-t border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">Employee ID:</span>
                <span className="font-mono font-semibold text-slate-800">{profile.employee_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Department:</span>
                <span className="font-medium text-slate-800">{profile.department_name || "--"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Work Email:</span>
                <span className="font-medium text-slate-800 truncate max-w-[180px]">{profile.work_email}</span>
              </div>
            </div>
          </div>

          <Link
            href="/portal/profile"
            className="mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-600 text-xs font-semibold transition"
          >
            <span>View Full Profile & Requests</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Monthly Attendance KPIs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <span>Attendance Telemetry ({attendance_summary.month})</span>
          </h2>
          <Link href="/portal/requests" className="text-xs text-indigo-600 hover:underline font-medium">
            Request Attendance Regularisation →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm text-left">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Present</span>
            <span className="text-2xl font-bold font-mono text-emerald-600 mt-1 block">
              {attendance_summary.present_days}
            </span>
            <span className="text-[10px] text-slate-400">Days attended</span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm text-left">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Late Arrivals</span>
            <span className="text-2xl font-bold font-mono text-amber-600 mt-1 block">
              {attendance_summary.late_days}
            </span>
            <span className="text-[10px] text-slate-400">Recorded grace exceed</span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm text-left">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Absent</span>
            <span className="text-2xl font-bold font-mono text-rose-600 mt-1 block">
              {attendance_summary.absent_days}
            </span>
            <span className="text-[10px] text-slate-400">Unexcused days</span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm text-left">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Approved Leaves</span>
            <span className="text-2xl font-bold font-mono text-indigo-600 mt-1 block">
              {attendance_summary.leave_days}
            </span>
            <span className="text-[10px] text-slate-400">Paid/statutory</span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm text-left col-span-2 sm:col-span-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Overtime</span>
            <span className="text-2xl font-bold font-mono text-slate-800 mt-1 block">
              {attendance_summary.overtime_hours}h
            </span>
            <span className="text-[10px] text-slate-400">Total approved OT</span>
          </div>
        </div>
      </div>

      {/* Leave Balances Radial Meter */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Leave Balances & Statutory Quota (BLA 2006)</span>
          </h2>
          <Link href="/portal/requests" className="text-xs text-indigo-600 hover:underline font-medium">
            Apply for Leave →
          </Link>
        </div>
        <LeaveBalanceDial balances={leave_balances} />
      </div>

      {/* Two Column Layout: Upcoming Schedule & Noticeboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Holidays & Schedule */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-600" />
              <span>Upcoming Holidays & Festival Closures</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Next 60 Days</span>
          </div>

          {upcoming_holidays.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No holidays scheduled in the next 60 days.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcoming_holidays.map((h, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 block">{h.name}</span>
                    <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                      {h.holiday_type}
                    </span>
                  </div>
                  <div className="text-right text-slate-500 font-mono">
                    <span>{h.start_date}</span>
                    {h.start_date !== h.end_date && <span> to {h.end_date}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Roster Shift preview if available */}
          {upcoming_shifts.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Weekly Duty Shifts</h4>
              <div className="grid grid-cols-2 gap-2">
                {upcoming_shifts.map((s, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="text-slate-400 text-[10px] block font-mono">{s.duty_date}</span>
                    <span className="font-semibold text-slate-800 block">{s.shift_name}</span>
                    <span className="text-[11px] text-indigo-600 font-mono font-medium">
                      {s.start_time} - {s.end_time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Company Announcements & Noticeboard */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              <span>Company Announcements & Notices</span>
            </h3>
            {data.unread_notices_count > 0 && (
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                {data.unread_notices_count} Unread
              </span>
            )}
          </div>

          {recent_notices.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No active announcements posted.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recent_notices.map((n) => (
                <div key={n.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      {n.is_pinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500" />}
                      <span className="text-xs font-bold text-slate-800 hover:text-indigo-600 transition cursor-pointer">
                        {n.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {n.category}
                      </span>
                      <span>{new Date(n.publish_date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div>
                    {n.is_acknowledged ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Read</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAcknowledgeNotice(n.id)}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg transition"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 text-center">
            <Link
              href="/portal/handbook"
              className="text-xs text-slate-500 hover:text-indigo-600 font-medium inline-flex items-center gap-1"
            >
              <span>Explore Company Handbook & Policies</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
