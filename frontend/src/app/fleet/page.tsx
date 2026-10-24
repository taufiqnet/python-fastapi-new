"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { apiClient } from "@/lib/api-client";
import { Vehicle, FleetOverviewStats, ExpiryAlertsReport, VehicleStatus, VehicleFuelType } from "@/types";
import { VehicleFormModal } from "@/components/fleet/vehicle-form-modal";
import {
  Car,
  Plus,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wrench,
  Fuel,
  Gauge,
  Calendar,
  ShieldAlert,
  Loader2,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

export default function FleetVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState<FleetOverviewStats | null>(null);
  const [alertsReport, setAlertsReport] = useState<ExpiryAlertsReport | null>(null);

  // In-Place Two-Tier Loading State (per ui_in_place_filtering.md)
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const isInitialMount = useRef(true);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fuelFilter, setFuelFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // React startTransition for batching filter updates
  const [, startTransition] = useTransition();

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null);

  const fetchOverview = async () => {
    try {
      const [statsRes, alertsRes] = await Promise.all([
        apiClient.get("/fleet/overview/stats"),
        apiClient.get("/fleet/alerts/expiring-documents?threshold_days=30"),
      ]);
      setStats(statsRes.data);
      setAlertsReport(alertsRes.data);
    } catch {
      // Handled silently
    }
  };

  const fetchVehicles = async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    } else {
      setIsFetching(true);
    }

    try {
      const params: Record<string, string | number> = {
        skip: (currentPage - 1) * pageSize,
        limit: pageSize,
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter !== "all") params.status = statusFilter;
      if (fuelFilter !== "all") params.fuel_type = fuelFilter;

      const res = await apiClient.get("/fleet/vehicles", { params });
      setVehicles(res.data || []);
    } catch {
      setVehicles([]);
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchVehicles(true);
    } else {
      fetchVehicles(false);
    }
  }, [currentPage, statusFilter, fuelFilter, searchTerm]);

  // Handlers wrapped in startTransition to eliminate double-network calls
  const handleStatusFilterChange = (status: string) => {
    startTransition(() => {
      setStatusFilter(status);
      setCurrentPage(1);
    });
  };

  const handleFuelFilterChange = (fuel: string) => {
    startTransition(() => {
      setFuelFilter(fuel);
      setCurrentPage(1);
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    startTransition(() => {
      setSearchTerm(val);
      setCurrentPage(1);
    });
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this vehicle from fleet?")) return;
    try {
      await apiClient.delete(`/fleet/vehicles/${id}`);
      fetchVehicles(false);
      fetchOverview();
    } catch {
      alert("Failed to delete vehicle.");
    }
  };

  const formatBRTADate = (dateStr?: string | null) => {
    if (!dateStr) return { text: "N/A", badgeClass: "text-slate-400 bg-slate-100 dark:bg-slate-800" };
    const target = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return { text: `Expired (${Math.abs(diffDays)}d ago)`, badgeClass: "text-red-700 bg-red-100 dark:bg-red-950/60 dark:text-red-400 font-bold" };
    } else if (diffDays <= 7) {
      return { text: `${diffDays} days left`, badgeClass: "text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-400 font-bold" };
    } else if (diffDays <= 30) {
      return { text: `${diffDays} days left`, badgeClass: "text-yellow-700 bg-yellow-100 dark:bg-yellow-950/60 dark:text-yellow-400" };
    }
    return { text: target.toLocaleDateString(), badgeClass: "text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400" };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <Car className="w-6 h-6" />
            </span>
            Vehicle & Fleet Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            BRTA regulatory compliance, fleet trip sheets, fuel tracking, and preventative maintenance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchOverview();
              fetchVehicles(false);
            }}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
            title="Refresh Fleet Data"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
          </button>
          <button
            onClick={() => {
              setVehicleToEdit(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/25"
          >
            <Plus className="w-4 h-4" />
            <span>Register Vehicle</span>
          </button>
        </div>
      </div>

      {/* Expiry Alerts Banner if urgent expirations exist */}
      {alertsReport && alertsReport.total_alerts > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 dark:border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Statutory Compliance Alert ({alertsReport.total_alerts} Documents Require Renewal)
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                {alertsReport.expired_count} expired certificates & {alertsReport.expiring_soon_count} renewals expiring within 30 days (BRTA Fitness, Tax Token, or 5-Year CNG tests).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400">
              {alertsReport.expired_count} Expired
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
              {alertsReport.expiring_soon_count} Urgent
            </span>
          </div>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Fleet</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {stats?.total_vehicles ?? 0}
            </h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Available Pool</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats?.available_vehicles ?? 0}
            </h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">On Active Trips</p>
            <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
              {stats?.on_trip_vehicles ?? 0}
            </h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">In Maintenance</p>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {stats?.in_maintenance_vehicles ?? 0}
            </h3>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: "all", label: "All Fleet" },
              { id: "available", label: "Available" },
              { id: "on_trip", label: "On Trip" },
              { id: "under_maintenance", label: "In Workshop" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleStatusFilterChange(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                  statusFilter === tab.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Fuel Type Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search plate, brand, model..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>

            <select
              value={fuelFilter}
              onChange={(e) => handleFuelFilterChange(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            >
              <option value="all">All Fuels</option>
              <option value="octane">Octane</option>
              <option value="diesel">Diesel</option>
              <option value="cng">CNG</option>
              <option value="lpg">LPG</option>
              <option value="hybrid_octane">Hybrid</option>
              <option value="electric">Electric</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Container (Invariant: Remains mounted during search/filter transitions) */}
      <div className="relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Top Progress Bar for In-Place Feedback */}
        {isFetching && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-100 dark:bg-indigo-950 overflow-hidden z-20">
            <div className="w-full h-full bg-indigo-600 animate-pulse" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Registration & Vehicle</th>
                <th className="px-5 py-3.5">Type & Spec</th>
                <th className="px-5 py-3.5">Odometer & Fuel</th>
                <th className="px-5 py-3.5">Driver Assigned</th>
                <th className="px-5 py-3.5">BRTA Fitness Expiry</th>
                <th className="px-5 py-3.5">Tax Token Expiry</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-slate-100 dark:divide-slate-800 text-xs transition-opacity duration-150 ${
                isFetching ? "opacity-50 pointer-events-none" : "opacity-100"
              }`}
            >
              {initialLoading ? (
                // Initial Skeleton
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={8} className="px-5 py-4">
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <Car className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No vehicles found matching current criteria.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try resetting filters or registering a vehicle.</p>
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => {
                  const fitness = formatBRTADate(v.brta_fitness_expiry_date);
                  const taxToken = formatBRTADate(v.brta_tax_token_expiry_date);

                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition group"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <Car className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block font-mono">
                              {v.vehicle_number}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {v.brand_make} {v.model_name} {v.model_year ? `(${v.model_year})` : ""}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="capitalize font-medium text-slate-700 dark:text-slate-300 block">
                          {v.vehicle_type.replace("_", " ")}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {v.seating_capacity} Seats
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {Number(v.current_odometer_km).toLocaleString()} km
                        </span>
                        <span className="text-[11px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-semibold">
                          {v.fuel_type.replace("_", " ")}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {v.assigned_driver ? (
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200 block">
                              {v.assigned_driver.full_name}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {v.assigned_driver.phone}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned Pool</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-[11px] ${fitness.badgeClass}`}>
                          {fitness.text}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-[11px] ${taxToken.badgeClass}`}>
                          {taxToken.text}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold capitalize ${
                            v.status === "available"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                              : v.status === "on_trip"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400"
                              : v.status === "under_maintenance"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {v.status.replace("_", " ")}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition">
                          <button
                            onClick={() => {
                              setVehicleToEdit(v);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition"
                            title="Edit Vehicle"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteVehicle(v.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 transition"
                            title="Delete Vehicle"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination & Count */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Showing {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"}
            </span>
            {isFetching && <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin shrink-0" />}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Page {currentPage}</span>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={vehicles.length < pageSize}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Vehicle Form Modal */}
      <VehicleFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setVehicleToEdit(null);
        }}
        onSuccess={() => {
          fetchVehicles(false);
          fetchOverview();
        }}
        vehicleToEdit={vehicleToEdit}
      />
    </div>
  );
}
