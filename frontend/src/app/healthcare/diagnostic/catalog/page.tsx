"use client";

import { useEffect, useState, useTransition } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { DiagnosticTestOut } from "@/types";
import {
  FileSpreadsheet,
  Search,
  Plus,
  RefreshCw,
  Clock,
  FlaskConical,
  Edit2,
  Tag,
  CheckCircle2,
  XCircle,
  Layers,
} from "lucide-react";
import TestModal from "@/components/healthcare/modals/test-modal";

const DEPARTMENTS = [
  "all",
  "hematology",
  "biochemistry",
  "pathology",
  "radiology",
  "microbiology",
  "molecular",
  "cardiology",
  "general",
];

export default function DiagnosticCatalogPage() {
  const [tests, setTests] = useState<DiagnosticTestOut[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeDept, setActiveDept] = useState("all");
  const [, startTransition] = useTransition();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<DiagnosticTestOut | null>(null);

  const fetchCatalog = async (dept?: string, query?: string) => {
    try {
      setIsFetching(true);
      const params: Record<string, string> = {};
      if (dept && dept !== "all") params.department = dept;
      if (query) params.search = query;

      const res = await apiClient.get<DiagnosticTestOut[]>("/healthcare/diagnostic-tests", { params });
      setTests(res.data);
    } catch (err) {
      console.error("Failed to load test catalog", err);
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchCatalog(activeDept, searchTerm);
  }, []);

  const handleDeptChange = (dept: string) => {
    setActiveDept(dept);
    startTransition(() => {
      fetchCatalog(dept, searchTerm);
    });
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    startTransition(() => {
      fetchCatalog(activeDept, val);
    });
  };

  const handleOpenCreate = () => {
    setSelectedTest(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: DiagnosticTestOut) => {
    setSelectedTest(t);
    setIsModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
          <div>
            <div className="flex items-center gap-2 text-teal-600 font-semibold text-xs tracking-wider uppercase mb-1">
              <FlaskConical className="w-4 h-4" />
              <span>LIS Master Tariff Catalog</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Diagnostic Test Catalog
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure laboratory investigations, standard pricing, specimen tube requirements, and reference range analytes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm shadow-teal-600/20 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Investigation</span>
            </button>
          </div>
        </div>

        {/* Department Filter Tabs & Search Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
          {/* Department Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept}
                onClick={() => handleDeptChange(dept)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition-all ${
                  activeDept === dept
                    ? "bg-teal-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-1">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by test code or test name..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <span className="text-xs text-slate-500">
                Total tests: <strong className="text-slate-800">{tests.length}</strong>
              </span>
              <button
                onClick={() => fetchCatalog(activeDept, searchTerm)}
                disabled={isFetching}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Refresh catalog"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Tests Table Container */}
        <div className="relative bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          {/* In-Place Indeterminate Progress Bar */}
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-teal-600 animate-pulse z-10" />
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Test Code</th>
                  <th className="py-3 px-4">Investigation Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Specimen Tube</th>
                  <th className="py-3 px-4">TAT (Hours)</th>
                  <th className="py-3 px-4">Parameters</th>
                  <th className="py-3 px-4 text-right">Standard Price</th>
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
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                      <span className="text-xs">Loading test catalog...</span>
                    </td>
                  </tr>
                ) : tests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <FlaskConical className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                      <p className="font-semibold text-slate-700 text-sm">No diagnostic tests found</p>
                      <p className="text-xs mt-1 text-slate-500">
                        {searchTerm
                          ? "Try modifying your search or department filter"
                          : "Click 'New Investigation' to populate the master catalog"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  tests.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => handleOpenEdit(t)}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-teal-700 whitespace-nowrap">
                        {t.test_code}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 text-xs">{t.name}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          {t.requires_fasting && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              Fasting Required
                            </span>
                          )}
                          <span className="capitalize text-[11px] font-mono text-slate-400">
                            {t.report_template_type} template
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                          {t.department}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <FlaskConical className="w-3.5 h-3.5 text-teal-600" />
                          <span>{t.sample_type || "None"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{t.default_turnaround_hours} hrs</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                          <Layers className="w-3 h-3" />
                          <span>{t.parameters?.length || 0} analytes</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono font-bold text-right text-slate-900 whitespace-nowrap">
                        ${Number(t.sale_price).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {t.is_active ? (
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
                            className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg flex items-center gap-1 transition-colors"
                            onClick={() => handleOpenEdit(t)}
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

        {/* Test Create / Edit Modal */}
        <TestModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => fetchCatalog(activeDept, searchTerm)}
          testToEdit={selectedTest}
        />
      </div>
    </DashboardLayout>
  );
}
