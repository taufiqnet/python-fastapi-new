"use client";

import { useEffect, useState, useTransition } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { DoctorProfileOut } from "@/types";
import {
  UserCheck,
  Search,
  Plus,
  RefreshCw,
  Award,
  Phone,
  Mail,
  Building2,
  DollarSign,
  Percent,
  Edit2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import DoctorModal from "@/components/healthcare/modals/doctor-modal";

export default function DoctorsDirectoryPage() {
  const [doctors, setDoctors] = useState<DoctorProfileOut[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [, startTransition] = useTransition();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfileOut | null>(null);

  const fetchDoctors = async (query?: string) => {
    try {
      setIsFetching(true);
      const res = await apiClient.get<DoctorProfileOut[]>("/healthcare/doctors", {
        params: query ? { search: query } : undefined,
      });
      setDoctors(res.data);
    } catch (err) {
      console.error("Failed to load doctors", err);
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    startTransition(() => {
      fetchDoctors(val);
    });
  };

  const handleOpenCreate = () => {
    setSelectedDoctor(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (doc: DoctorProfileOut) => {
    setSelectedDoctor(doc);
    setIsModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs tracking-wider uppercase mb-1">
              <UserCheck className="w-4 h-4" />
              <span>Consultant & Referrer Directory</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Doctors & OPD Chambers
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage physician credentials, BMDC registrations, OPD consultation fees, and referral commission rates
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-600/20 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Doctor</span>
            </button>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, specialization, or BMDC reg..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-xs text-slate-500">
              Active Physicians: <strong className="text-slate-800">{doctors.length}</strong>
            </span>
            <button
              onClick={() => fetchDoctors(searchTerm)}
              disabled={isFetching}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Refresh doctor list"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Doctor Table Container */}
        <div className="relative bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          {/* In-Place Indeterminate Progress Bar */}
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600 animate-pulse z-10" />
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Doctor Name & BMDC</th>
                  <th className="py-3 px-4">Specialization & Degree</th>
                  <th className="py-3 px-4">OPD Chamber</th>
                  <th className="py-3 px-4">Consultation Fee</th>
                  <th className="py-3 px-4">Ref. Commission</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-center">Status</th>
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
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                      <span className="text-xs">Loading doctors list...</span>
                    </td>
                  </tr>
                ) : doctors.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                      <p className="font-semibold text-slate-700 text-sm">No doctors registered yet</p>
                      <p className="text-xs mt-1 text-slate-500">
                        {searchTerm
                          ? "No matching doctor profiles found"
                          : "Click 'Add Doctor' to register consultants and referrers"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  doctors.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => handleOpenEdit(doc)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 text-xs">{doc.full_name}</div>
                        {doc.bmdc_reg_number ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 mt-0.5">
                            <Award className="w-3.5 h-3.5 text-blue-600" />
                            <span>BMDC: {doc.bmdc_reg_number}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400">No BMDC reg.</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-medium text-slate-800">
                          {doc.specialization || "General Physician"}
                        </div>
                        {doc.medical_degrees && (
                          <div className="text-[11px] text-slate-400">{doc.medical_degrees}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {doc.chamber_name ? (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{doc.chamber_name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap font-medium text-slate-800">
                        {doc.consultation_fee != null ? (
                          <span>${Number(doc.consultation_fee).toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        {doc.referral_commission_rate > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            {doc.referral_commission_rate}%
                          </span>
                        ) : (
                          <span className="text-slate-400">0%</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {doc.contact_phone && (
                          <div className="flex items-center gap-1 text-slate-600">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{doc.contact_phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {doc.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
                            <XCircle className="w-3 h-3" />
                            <span>Inactive</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div
                          className="inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg flex items-center gap-1 transition-colors"
                            onClick={() => handleOpenEdit(doc)}
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

        {/* Doctor Create / Edit Modal */}
        <DoctorModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => fetchDoctors(searchTerm)}
          doctorToEdit={selectedDoctor}
        />
      </div>
    </DashboardLayout>
  );
}
