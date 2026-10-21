"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import {
  AppointmentOut,
  AppointmentStatus,
  DoctorProfileOut,
  DoctorScheduleSlotOut,
  PatientOut,
  VisitType,
} from "@/types";
import { AppointmentModal } from "@/components/healthcare/modals/appointment-modal";
import { ScheduleSlotModal } from "@/components/healthcare/modals/schedule-slot-modal";
import {
  Stethoscope,
  Users,
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Play,
  UserCheck,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Phone,
  Layers,
} from "lucide-react";

export default function OPDChambersPage() {
  const router = useRouter();
  const todayStr = new Date().toISOString().split("T")[0];

  // Primary Data
  const [appointments, setAppointments] = useState<AppointmentOut[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfileOut[]>([]);
  const [patients, setPatients] = useState<PatientOut[]>([]);
  const [slots, setSlots] = useState<DoctorScheduleSlotOut[]>([]);

  // Filtering states
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"queue" | "slots">("queue");

  // In-place loading states (Rule: ui_in_place_filtering.md)
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [, startTransition] = useTransition();

  // Modals
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);

  // Initial Load: Doctors & Patients
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [docsRes, patsRes] = await Promise.all([
          apiClient.get<DoctorProfileOut[]>("/healthcare/doctors?limit=100"),
          apiClient.get<PatientOut[]>("/healthcare/patients?limit=100"),
        ]);
        setDoctors(docsRes.data);
        setPatients(patsRes.data);
      } catch (err) {
        console.error("Failed to load doctor/patient registries", err);
      }
    };
    fetchMasterData();
  }, []);

  // Fetch Appointments
  const fetchAppointments = async (docId?: string, dt?: string, st?: string) => {
    setIsFetching(true);
    try {
      const params: Record<string, string | number> = { limit: 200 };
      if (docId) params.doctor_id = docId;
      if (dt) params.appointment_date = dt;
      if (st) params.status = st;

      const res = await apiClient.get<AppointmentOut[]>("/healthcare/appointments", { params });
      setAppointments(res.data);
    } catch (err) {
      console.error("Failed to load appointments", err);
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  // Fetch Slots when tab is slots or doctor changes
  const fetchSlots = async (docId?: string) => {
    if (!docId && doctors.length > 0) {
      docId = doctors[0].id;
    }
    if (!docId) return;

    try {
      const res = await apiClient.get<DoctorScheduleSlotOut[]>(
        `/healthcare/doctors/${docId}/slots`
      );
      setSlots(res.data);
    } catch (err) {
      console.error("Failed to fetch slots", err);
    }
  };

  useEffect(() => {
    fetchAppointments(selectedDoctorId, selectedDate, selectedStatus);
  }, [selectedDoctorId, selectedDate, selectedStatus]);

  useEffect(() => {
    if (activeTab === "slots") {
      fetchSlots(selectedDoctorId);
    }
  }, [activeTab, selectedDoctorId]);

  // Handle status transitions
  const handleUpdateStatus = async (appId: string, newStatus: AppointmentStatus) => {
    try {
      setIsFetching(true);
      await apiClient.patch<AppointmentOut>(`/healthcare/appointments/${appId}`, {
        status: newStatus,
      });
      // In-place local update
      setAppointments((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
      );
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setIsFetching(false);
    }
  };

  // Queue Analytics
  const queueStats = useMemo(() => {
    const total = appointments.length;
    const withDoc = appointments.find((a) => a.status === "with_doctor");
    const nextInLine = appointments.find(
      (a) => a.status === "checked_in" || a.status === "booked"
    );
    const completed = appointments.filter((a) => a.status === "completed").length;
    return { total, withDoc, nextInLine, completed };
  }, [appointments]);

  // Filtered by Search Term
  const filteredAppointments = useMemo(() => {
    if (!searchTerm.trim()) return appointments;
    const q = searchTerm.toLowerCase();
    return appointments.filter(
      (a) =>
        a.patient?.full_name?.toLowerCase().includes(q) ||
        a.patient?.uhid?.toLowerCase().includes(q) ||
        a.patient?.phone?.includes(q) ||
        a.serial_number.toString() === q
    );
  }, [appointments, searchTerm]);

  return (
    <DashboardLayout>
      <div className="w-full min-w-0 max-w-full space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs tracking-wider uppercase mb-1">
              <Stethoscope className="w-4 h-4" />
              <span>OPD Chamber & Token Engine</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Doctor Chamber Scheduling & Queue
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily OPD patient token calling, doctor chamber hours, and consultation desk launch
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsSlotModalOpen(true)}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Chamber Hours</span>
            </button>
            <button
              onClick={() => setIsAppointmentModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Book OPD Token</span>
            </button>
          </div>
        </div>

        {/* Live Token Queue Display Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Current Serving */}
          <div className="p-4 bg-linear-to-br from-emerald-600 to-teal-700 text-white rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">
                Now Serving
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                Live Chamber
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black">
                {queueStats.withDoc ? `Token #${queueStats.withDoc.serial_number}` : "Chamber Idle"}
              </span>
            </div>
            <p className="text-xs text-emerald-100 mt-1 truncate">
              {queueStats.withDoc
                ? `${queueStats.withDoc.patient?.full_name} (${queueStats.withDoc.patient?.uhid})`
                : "No patient currently inside"}
            </p>
          </div>

          {/* Next Token */}
          <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Next in Queue
              </span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">
                {queueStats.nextInLine ? `Token #${queueStats.nextInLine.serial_number}` : "None"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate">
              {queueStats.nextInLine
                ? `${queueStats.nextInLine.patient?.full_name} (${queueStats.nextInLine.patient?.uhid})`
                : "Queue is clear"}
            </p>
          </div>

          {/* Total Appointments Today */}
          <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Booked
              </span>
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2">
              <span className="text-3xl font-black text-slate-900">{queueStats.total}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Total serial tokens issued today</p>
          </div>

          {/* Completed Consultations */}
          <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Completed
              </span>
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
            </div>
            <div className="mt-2">
              <span className="text-3xl font-black text-slate-900">{queueStats.completed}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Consulted & prescription generated</p>
          </div>
        </div>

        {/* Main Workspace Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
          {/* Top Tabs */}
          <div className="px-6 pt-4 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setActiveTab("queue")}
                className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === "queue"
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Live Patient Queue ({appointments.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("slots")}
                className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === "slots"
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Doctor Schedule Slots ({slots.length})</span>
              </button>
            </div>
          </div>

          {/* In-Place Non-Destructive Filtering Control Bar */}
          <div className="p-4 bg-slate-50/60 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Doctor Picker */}
              <div className="w-56">
                <select
                  value={selectedDoctorId}
                  onChange={(e) => {
                    const val = e.target.value;
                    startTransition(() => {
                      setSelectedDoctorId(val);
                    });
                  }}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                >
                  <option value="">All Doctors / Chambers</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} ({d.specialization || "General"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Picker */}
              <div className="w-40">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    startTransition(() => {
                      setSelectedDate(val);
                    });
                  }}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Status Picker (for queue) */}
              {activeTab === "queue" && (
                <div className="w-44">
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      const val = e.target.value;
                      startTransition(() => {
                        setSelectedStatus(val);
                      });
                    }}
                    className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    <option value="">All Statuses</option>
                    <option value="booked">Booked (Waiting)</option>
                    <option value="checked_in">Checked In</option>
                    <option value="with_doctor">With Doctor</option>
                    <option value="completed">Completed</option>
                    <option value="no_show">No Show</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}
            </div>

            {/* Quick search input */}
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search patient, UHID or token..."
                className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Indeterminate top loading progress bar (Rule: ui_in_place_filtering.md) */}
          {isFetching && (
            <div className="w-full h-1 bg-emerald-100 overflow-hidden">
              <div className="w-full h-full bg-emerald-600 animate-pulse" />
            </div>
          )}

          {/* Table Container with subtle opacity transition */}
          <div
            className={`transition-opacity duration-200 ${
              isFetching ? "opacity-60 pointer-events-none" : "opacity-100"
            }`}
          >
            {activeTab === "queue" ? (
              /* Patient Queue Table */
              filteredAppointments.length === 0 ? (
                <div className="py-16 text-center">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No appointments scheduled</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Book an OPD token or select a different date / doctor.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4 w-20 text-center">Token #</th>
                        <th className="py-3 px-4">Patient Information</th>
                        <th className="py-3 px-4">Doctor & Chamber</th>
                        <th className="py-3 px-4">Visit Type</th>
                        <th className="py-3 px-4">Fee</th>
                        <th className="py-3 px-4">Queue Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAppointments.map((app) => (
                        <tr
                          key={app.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            app.status === "with_doctor" ? "bg-emerald-50/40" : ""
                          }`}
                        >
                          {/* Token Number */}
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block font-mono font-black text-sm px-2.5 py-1 rounded-xl shadow-2xs ${
                                app.status === "with_doctor"
                                  ? "bg-emerald-600 text-white"
                                  : app.status === "completed"
                                  ? "bg-slate-200 text-slate-600"
                                  : "bg-slate-100 text-slate-800"
                              }`}
                            >
                              #{app.serial_number}
                            </span>
                          </td>

                          {/* Patient Details */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{app.patient?.full_name}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-emerald-700">{app.patient?.uhid}</span>
                              <span>•</span>
                              <span>{app.patient?.phone}</span>
                              <span>•</span>
                              <span>{app.patient?.gender}</span>
                            </div>
                            {app.chief_complaints && (
                              <p className="text-[10px] text-slate-500 italic mt-0.5 truncate max-w-xs">
                                Complaints: {app.chief_complaints}
                              </p>
                            )}
                          </td>

                          {/* Doctor */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{app.doctor?.full_name}</div>
                            <div className="text-[11px] text-slate-500">
                              {app.doctor?.chamber_name || "OPD Chamber"}
                            </div>
                          </td>

                          {/* Visit Type */}
                          <td className="py-3 px-4">
                            <span className="capitalize px-2 py-0.5 rounded-md font-medium text-[11px] bg-slate-100 text-slate-700">
                              {app.visit_type.replace("_", " ")}
                            </span>
                          </td>

                          {/* Fee & Payment */}
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-slate-900">
                              ৳{Number(app.consultation_fee).toLocaleString()}
                            </div>
                            <span
                              className={`text-[10px] font-bold ${
                                app.is_paid ? "text-emerald-700" : "text-amber-700"
                              }`}
                            >
                              {app.is_paid ? "Paid" : "Due"}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                app.status === "with_doctor"
                                  ? "bg-emerald-100 text-emerald-800 animate-pulse"
                                  : app.status === "checked_in"
                                  ? "bg-blue-100 text-blue-800"
                                  : app.status === "completed"
                                  ? "bg-slate-100 text-slate-700"
                                  : app.status === "cancelled" || app.status === "no_show"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {app.status === "with_doctor"
                                ? "In Consultation"
                                : app.status.replace("_", " ").toUpperCase()}
                            </span>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Open Doctor Desk / EMR */}
                              <Link
                                href={`/healthcare/doctor-desk/${app.id}`}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-1 transition-all"
                              >
                                <Stethoscope className="w-3.5 h-3.5" />
                                <span>Doctor Desk</span>
                              </Link>

                              {/* Quick State Handlers */}
                              {app.status === "booked" && (
                                <button
                                  onClick={() => handleUpdateStatus(app.id, "checked_in")}
                                  className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg"
                                >
                                  Check In
                                </button>
                              )}

                              {(app.status === "booked" || app.status === "checked_in") && (
                                <button
                                  onClick={() => handleUpdateStatus(app.id, "with_doctor")}
                                  className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                                >
                                  Call
                                </button>
                              )}

                              {app.status === "with_doctor" && (
                                <button
                                  onClick={() => handleUpdateStatus(app.id, "completed")}
                                  className="px-2 py-1 text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg"
                                >
                                  Done
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              /* Doctor Chamber Schedule Slots Table */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Day of Week</th>
                      <th className="py-3 px-4">Chamber Visiting Hours</th>
                      <th className="py-3 px-4">Daily Token Limit</th>
                      <th className="py-3 px-4">Est. Duration</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {slots.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          No schedule slots configured for this doctor yet. Click Chamber Hours above
                          to add one.
                        </td>
                      </tr>
                    ) : (
                      slots.map((slot) => (
                        <tr key={slot.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-bold capitalize text-slate-900">
                            {slot.day_of_week}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-800">
                            {slot.start_time} — {slot.end_time}
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            <span className="font-bold text-slate-900">{slot.max_patients}</span> tokens
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            {slot.slot_duration_minutes} mins / patient
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                slot.is_active
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {slot.is_active ? "Active" : "Paused"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        <AppointmentModal
          isOpen={isAppointmentModalOpen}
          onClose={() => setIsAppointmentModalOpen(false)}
          onSuccess={() => {
            fetchAppointments(selectedDoctorId, selectedDate, selectedStatus);
          }}
          doctors={doctors}
          patients={patients}
          defaultDoctorId={selectedDoctorId || undefined}
          defaultDate={selectedDate}
        />

        <ScheduleSlotModal
          isOpen={isSlotModalOpen}
          onClose={() => setIsSlotModalOpen(false)}
          onSuccess={() => {
            fetchSlots(selectedDoctorId);
          }}
          doctors={doctors}
          defaultDoctorId={selectedDoctorId || undefined}
        />
      </div>
    </DashboardLayout>
  );
}
