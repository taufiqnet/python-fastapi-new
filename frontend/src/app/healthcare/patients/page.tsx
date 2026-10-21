"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { PatientOut } from "@/types";
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Phone,
  HeartPulse,
  Edit2,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import PatientModal from "@/components/healthcare/modals/patient-modal";

export default function PatientsRegistryPage() {
  const [patients, setPatients] = useState<PatientOut[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [, startTransition] = useTransition();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientOut | null>(null);

  const fetchPatients = async (query?: string) => {
    try {
      setIsFetching(true);
      const res = await apiClient.get<PatientOut[]>("/healthcare/patients", {
        params: query ? { search: query } : undefined,
      });
      setPatients(res.data);
    } catch (err) {
      console.error("Failed to load patients", err);
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    startTransition(() => {
      fetchPatients(val);
    });
  };

  const handleOpenCreate = () => {
    setSelectedPatient(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: PatientOut) => {
    setSelectedPatient(p);
    setIsModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs tracking-wider uppercase mb-1">
              <Users className="w-4 h-4" />
              <span>Master Patient Index (MPI)</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Patient Registry
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Search, record demographics, and manage unique health identifiers (UHID)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/healthcare/diagnostic/billing"
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-colors shadow-2xs"
            >
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Counter Billing</span>
            </Link>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-600/20 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Register Patient</span>
            </button>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by UHID, patient name, or phone..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-xs text-slate-500">
              Total records: <strong className="text-slate-800">{patients.length}</strong>
            </span>
            <button
              onClick={() => fetchPatients(searchTerm)}
              disabled={isFetching}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Refresh patient list"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Patient Table Container */}
        <div className="relative bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          {/* In-Place Indeterminate Progress Bar */}
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-600 animate-pulse z-10" />
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">UHID</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Demographics</th>
                  <th className="py-3 px-4">Blood Group</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y divide-slate-100 transition-opacity duration-150 ${
                  isFetching ? "opacity-60" : "opacity-100"
                }`}
              >
                {initialLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                      <span className="text-xs">Loading patient records...</span>
                    </td>
                  </tr>
                ) : patients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                      <p className="font-semibold text-slate-700 text-sm">No patients found</p>
                      <p className="text-xs mt-1 text-slate-500">
                        {searchTerm
                          ? "Try adjusting your search criteria"
                          : "Click 'Register Patient' to add the first record"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  patients.map((pt) => (
                    <tr
                      key={pt.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => handleOpenEdit(pt)}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 text-xs whitespace-nowrap">
                        {pt.uhid}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 text-xs">{pt.full_name}</div>
                        {pt.email && (
                          <div className="text-[11px] text-slate-400">{pt.email}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        <span className="capitalize font-medium text-slate-700">{pt.gender}</span>
                        {pt.date_of_birth && (
                          <span className="text-slate-400">
                            {" "}• {Math.floor((Date.now() - new Date(pt.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))} yrs
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {pt.blood_group ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
                            {pt.blood_group}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700 font-mono">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{pt.phone}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                        {pt.address || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div
                          className="inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center gap-1 transition-colors"
                            onClick={() => handleOpenEdit(pt)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Patient Register / Edit Modal */}
        <PatientModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => fetchPatients(searchTerm)}
          patientToEdit={selectedPatient}
        />
      </div>
    </DashboardLayout>
  );
}
