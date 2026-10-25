"use client";

import React, { useEffect, useState, useMemo, useRef, startTransition } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { POSRegisterOut, POSSessionOut } from "@/types";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import {
  Monitor,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Edit,
  Play,
  StopCircle,
  DollarSign,
  Filter,
  X,
  Loader2,
  Warehouse,
  Coins,
  History,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

export default function POSRegistersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const businessId = user?.business_id || 1;

  // Data States
  const [registers, setRegisters] = useState<POSRegisterOut[]>([]);
  const [currentSession, setCurrentSession] = useState<POSSessionOut | null>(null);

  // Two-tier Loading per ui_in_place_filtering.md
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerToEdit, setRegisterToEdit] = useState<POSRegisterOut | null>(null);
  const [registerFormName, setRegisterFormName] = useState("");
  const [registerFormCode, setRegisterFormCode] = useState("");
  const [registerFormWarehouseId, setRegisterFormWarehouseId] = useState("");
  const [registerFormIsActive, setRegisterFormIsActive] = useState(true);
  const [savingRegister, setSavingRegister] = useState(false);

  // Shift Modals
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [openShiftRegister, setOpenShiftRegister] = useState<POSRegisterOut | null>(null);
  const [openingCash, setOpeningCash] = useState("100.00");
  const [shiftNotes, setShiftNotes] = useState("");
  const [processingShift, setProcessingShift] = useState(false);

  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [closingCash, setClosingCash] = useState("");
  const [closeShiftNotes, setCloseShiftNotes] = useState("");

  const loadData = async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    } else {
      setIsFetching(true);
    }
    setError(null);

    try {
      const [regRes, sessRes] = await Promise.allSettled([
        apiClient.get<POSRegisterOut[]>(`/pos/registers?business_id=${businessId}`),
        apiClient.get<POSSessionOut | null>("/pos/sessions/current"),
      ]);

      if (regRes.status === "fulfilled") setRegisters(regRes.value.data || []);
      if (sessRes.status === "fulfilled") setCurrentSession(sessRes.value.data || null);
    } catch {
      setError("Failed to fetch POS registers and active cash drawer sessions.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadData(true);
    }
  }, []);

  // Filter Handlers with React startTransition
  const handleSearchChange = (q: string) => {
    startTransition(() => {
      setSearchQuery(q);
    });
  };

  const handleStatusChange = (status: string) => {
    startTransition(() => {
      setStatusFilter(status);
    });
  };

  const clearFilters = () => {
    startTransition(() => {
      setSearchQuery("");
      setStatusFilter("all");
    });
  };

  // Filtered Registers
  const filteredRegisters = useMemo(() => {
    return registers.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.warehouse_name && r.warehouse_name.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && r.is_active) ||
        (statusFilter === "inactive" && !r.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [registers, searchQuery, statusFilter]);

  // Open Register Form
  const handleOpenRegisterForm = (reg?: POSRegisterOut) => {
    if (reg) {
      setRegisterToEdit(reg);
      setRegisterFormName(reg.name);
      setRegisterFormCode(reg.code);
      setRegisterFormWarehouseId(reg.warehouse_id);
      setRegisterFormIsActive(reg.is_active);
    } else {
      setRegisterToEdit(null);
      setRegisterFormName("");
      setRegisterFormCode(`REG-${registers.length + 1}`);
      setRegisterFormWarehouseId("");
      setRegisterFormIsActive(true);
    }
    setIsRegisterModalOpen(true);
  };

  const handleSaveRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerFormName.trim() || !registerFormCode.trim()) {
      toast.error("Name and code are required.");
      return;
    }

    setSavingRegister(true);
    try {
      const payload = {
        name: registerFormName.trim(),
        code: registerFormCode.trim().toUpperCase(),
        warehouse_id: registerFormWarehouseId || "00000000-0000-0000-0000-000000000001",
        is_active: registerFormIsActive,
        business_id: businessId,
      };

      if (registerToEdit) {
        await apiClient.put(`/pos/registers/${registerToEdit.id}?business_id=${businessId}`, payload);
        toast.success("Register updated successfully");
      } else {
        await apiClient.post("/pos/registers", payload);
        toast.success("Register created successfully");
      }
      setIsRegisterModalOpen(false);
      loadData(false);
    } catch {
      toast.error("Failed to save register.");
    } finally {
      setSavingRegister(false);
    }
  };

  // Open Shift
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openShiftRegister) return;

    setProcessingShift(true);
    try {
      await apiClient.post(`/pos/sessions/open?business_id=${businessId}`, {
        register_id: openShiftRegister.id,
        opening_cash: parseFloat(openingCash) || 0,
        notes: shiftNotes.trim() || undefined,
      });
      toast.success(`Shift opened on ${openShiftRegister.name}`);
      setIsOpenShiftModalOpen(false);
      loadData(false);
    } catch {
      toast.error("Failed to open shift. There may already be an active session.");
    } finally {
      setProcessingShift(false);
    }
  };

  // Close Shift
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;

    setProcessingShift(true);
    try {
      await apiClient.post(
        `/pos/sessions/${currentSession.id}/close?business_id=${businessId}`,
        {
          closing_cash_counted: parseFloat(closingCash) || 0,
          notes: closeShiftNotes.trim() || undefined,
        }
      );
      toast.success("Shift closed and cash drawer reconciled.");
      setIsCloseShiftModalOpen(false);
      loadData(false);
    } catch {
      toast.error("Failed to close shift.");
    } finally {
      setProcessingShift(false);
    }
  };

  const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== "all";

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
              <span>Sales & POS</span>
              <span>•</span>
              <span>Registers & Cashier Shifts</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Monitor className="w-7 h-7 text-indigo-600" />
              POS Registers & Cash Control
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage terminal devices, cashier shifts, opening floats, and cash drawer reconciliations.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => loadData(false)}
              disabled={isFetching}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
              title="Refresh Registers"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => handleOpenRegisterForm()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition shadow-md shadow-indigo-600/25 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add Register
            </button>
          </div>
        </div>

        {/* Active Cashier Shift Banner */}
        {currentSession ? (
          <div className="p-5 rounded-2xl bg-linear-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                    Active Shift Open
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    {currentSession.register_name || "Terminal 1"}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Cashier: <strong>{currentSession.cashier_name}</strong> • Opened with float{" "}
                  <strong>{formatCurrency(Number(currentSession.opening_cash))}</strong> on{" "}
                  {formatDate(currentSession.opened_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/ecommerce/pos"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition shadow-xs"
              >
                Launch POS Terminal
              </a>
              <button
                type="button"
                onClick={() => {
                  setClosingCash(String(currentSession.opening_cash || "100.00"));
                  setIsCloseShiftModalOpen(true);
                }}
                className="px-3.5 py-2 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold rounded-xl text-xs transition"
              >
                Close Shift
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between text-xs text-amber-800">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>No cashier shift is currently open for your account on this device.</span>
            </div>
            <span className="text-[11px] font-semibold text-amber-900">
              Open a shift below to begin ringing sales.
            </span>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search registers by name or code..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Status:
            </span>
            {[
              { id: "all", label: "All" },
              { id: "active", label: "Active" },
              { id: "inactive", label: "Inactive" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleStatusChange(tab.id)}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  statusFilter === tab.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Registers Table Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden relative">
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-100 overflow-hidden z-20">
              <div className="w-full h-full bg-indigo-600 origin-left animate-indeterminate" />
            </div>
          )}

          {initialLoading && registers.length === 0 ? (
            <div className="p-16 text-center">
              <div className="flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-sm font-semibold text-slate-800">Loading POS registers...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Register Name</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Warehouse</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-slate-100 text-xs ${isFetching ? "opacity-50 transition-opacity" : ""}`}>
                  {filteredRegisters.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No registers found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRegisters.map((reg) => (
                      <tr key={reg.id} className="hover:bg-slate-50/75 transition-colors group">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition">
                            {reg.name}
                          </p>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{reg.code}</td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                            {reg.warehouse_name || "Primary Warehouse"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {reg.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <XCircle className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {reg.created_at ? formatDate(reg.created_at) : "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!currentSession && reg.is_active && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenShiftRegister(reg);
                                  setOpeningCash("100.00");
                                  setShiftNotes("");
                                  setIsOpenShiftModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg text-[11px] transition"
                              >
                                <Play className="w-3 h-3 fill-current" /> Open Shift
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenRegisterForm(reg)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Edit Register"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Register Create/Edit Modal */}
        {isRegisterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-base font-bold text-slate-900">
                  {registerToEdit ? "Edit Register" : "Add Register Terminal"}
                </h3>
                <button
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveRegister} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Terminal Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={registerFormName}
                    onChange={(e) => setRegisterFormName(e.target.value)}
                    placeholder="e.g., Counter 1 - Fast Checkout"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Register Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={registerFormCode}
                    onChange={(e) => setRegisterFormCode(e.target.value.toUpperCase())}
                    placeholder="e.g., POS-REG-01"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="reg_active"
                    checked={registerFormIsActive}
                    onChange={(e) => setRegisterFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="reg_active" className="text-xs font-medium text-slate-700">
                    Active Terminal Device
                  </label>
                </div>

                <div className="pt-3 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsRegisterModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingRegister}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                  >
                    {savingRegister ? "Saving..." : "Save Register"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Open Shift Modal */}
        {isOpenShiftModalOpen && openShiftRegister && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Play className="w-4 h-4 fill-current" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Open Cashier Shift</h3>
                    <p className="text-[11px] text-slate-500">{openShiftRegister.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpenShiftModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleOpenShift} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Opening Float Cash ($) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                    placeholder="100.00"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Count all coins and paper bills inside drawer before opening session.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Shift Notes
                  </label>
                  <textarea
                    rows={2}
                    value={shiftNotes}
                    onChange={(e) => setShiftNotes(e.target.value)}
                    placeholder="Morning shift / Cashier handover notes..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsOpenShiftModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingShift}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                  >
                    {processingShift ? "Opening..." : "Confirm & Open Shift"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Close Shift Modal */}
        {isCloseShiftModalOpen && currentSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5 text-rose-600">
                  <StopCircle className="w-5 h-5" />
                  <h3 className="text-sm font-bold text-slate-900">Close Cashier Shift & Reconcile</h3>
                </div>
                <button
                  onClick={() => setIsCloseShiftModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCloseShift} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Counted Closing Cash ($) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={closingCash}
                    onChange={(e) => setClosingCash(e.target.value)}
                    placeholder="Enter physical cash counted in drawer"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    System will automatically calculate surplus or shortage differences.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reconciliation Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={closeShiftNotes}
                    onChange={(e) => setCloseShiftNotes(e.target.value)}
                    placeholder="Any cash discrepancies, petty cash payouts, or remarks..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsCloseShiftModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingShift}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                  >
                    {processingShift ? "Closing..." : "Close Shift & Lock Drawer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
