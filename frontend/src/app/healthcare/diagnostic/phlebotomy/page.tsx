"use client";

import { useEffect, useState, useTransition } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { DiagnosticSampleOut } from "@/types";
import {
  Pipette,
  Search,
  RefreshCw,
  QrCode,
  CheckCircle2,
  Clock,
  UserCheck,
  Calendar,
  AlertCircle,
  FileCheck2,
  Printer,
} from "lucide-react";
import SampleCollectModal from "@/components/healthcare/modals/sample-collect-modal";

const STATUS_TABS = [
  { id: "all", label: "All Specimens" },
  { id: "pending", label: "Pending Collection" },
  { id: "collected", label: "Collected" },
  { id: "received", label: "Received in Lab" },
  { id: "analyzed", label: "Tested & Released" },
];

export default function PhlebotomyWorklistPage() {
  const [samples, setSamples] = useState<DiagnosticSampleOut[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [, startTransition] = useTransition();

  // Modal State
  const [selectedSample, setSelectedSample] = useState<DiagnosticSampleOut | null>(null);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);

  const fetchSamples = async (status?: string, search?: string) => {
    try {
      setIsFetching(true);
      const params: Record<string, string> = {};
      if (status && status !== "all") params.status = status;
      if (search) params.search = search;

      const res = await apiClient.get<DiagnosticSampleOut[]>("/healthcare/samples", { params });
      setSamples(res.data);
    } catch (err) {
      console.error("Failed to fetch phlebotomy samples", err);
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchSamples(statusFilter, searchTerm);
  }, []);

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    startTransition(() => {
      fetchSamples(status, searchTerm);
    });
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    startTransition(() => {
      fetchSamples(statusFilter, val);
    });
  };

  const handleOpenCollect = (sample: DiagnosticSampleOut) => {
    setSelectedSample(sample);
    setIsCollectModalOpen(true);
  };

  const printTubeLabel = (sample: DiagnosticSampleOut) => {
    const printWindow = window.open("", "_blank", "width=400,height=300");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Specimen Tube Barcode Label</title>
          <style>
            @page { size: 50mm 30mm; margin: 2mm; }
            body { font-family: monospace; font-size: 11px; margin: 0; padding: 4px; }
            .container { border: 1px dashed #000; padding: 6px; text-align: center; }
            .barcode { font-size: 14px; font-weight: bold; letter-spacing: 2px; margin: 6px 0; }
            .type { font-size: 11px; font-weight: bold; text-transform: uppercase; }
            .time { font-size: 9px; color: #555; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="type">${sample.sample_type}</div>
            <div class="barcode">${sample.barcode}</div>
            <div class="time">${new Date().toLocaleString()}</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getTubeBadgeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("edta")) return "bg-purple-50 text-purple-700 border-purple-200";
    if (t.includes("serum") || t.includes("clot")) return "bg-rose-50 text-rose-700 border-rose-200";
    if (t.includes("fluoride") || t.includes("glucose")) return "bg-slate-100 text-slate-700 border-slate-300";
    if (t.includes("heparin")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (t.includes("citrate")) return "bg-sky-50 text-sky-700 border-sky-200";
    if (t.includes("urine") || t.includes("stool")) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-teal-50 text-teal-700 border-teal-200";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
          <div>
            <div className="flex items-center gap-2 text-amber-600 font-semibold text-xs tracking-wider uppercase mb-1">
              <Pipette className="w-4 h-4" />
              <span>Phlebotomy & Accessioning Station</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Specimen Collection Worklist
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Track blood tubes, urine containers, barcode labelling, and sample accessioning
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchSamples(statusFilter, searchTerm)}
              disabled={isFetching}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-colors shadow-2xs"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Status Filter Tabs & Search Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleStatusChange(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-1">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Scan or type barcode (e.g. SMP-1-2026-000001)..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-mono"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <span className="text-xs text-slate-500">
                Queue size: <strong className="text-slate-800">{samples.length}</strong> tubes
              </span>
            </div>
          </div>
        </div>

        {/* Samples Table Container */}
        <div className="relative bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          {/* In-Place Indeterminate Progress Bar */}
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-600 animate-pulse z-10" />
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Specimen Barcode</th>
                  <th className="py-3 px-4">Required Tube / Container</th>
                  <th className="py-3 px-4">Order Ref</th>
                  <th className="py-3 px-4">Created Time</th>
                  <th className="py-3 px-4">Accession / Collection Status</th>
                  <th className="py-3 px-4">Phlebotomist</th>
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
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                      <span className="text-xs">Loading phlebotomy queue...</span>
                    </td>
                  </tr>
                ) : samples.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Pipette className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                      <p className="font-semibold text-slate-700 text-sm">No specimens found in this queue</p>
                      <p className="text-xs mt-1 text-slate-500">
                        {statusFilter === "pending"
                          ? "All ordered specimens have been collected!"
                          : "Try selecting another status tab or clearing search"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  samples.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-amber-700 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <QrCode className="w-4 h-4 text-slate-400" />
                          <span>{s.barcode}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${getTubeBadgeColor(
                            s.sample_type
                          )}`}
                        >
                          {s.sample_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                        {s.order_id.slice(0, 8)}...
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{new Date(s.created_at).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {s.status === "collected" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Collected</span>
                          </span>
                        ) : s.status === "received" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Received in Lab</span>
                          </span>
                        ) : s.status === "analyzed" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>Tested & Released</span>
                          </span>
                        ) : s.status === "rejected" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Rejected</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Pending Phlebotomy</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        {s.collected_by_name ? (
                          <div className="flex items-center gap-1 text-slate-800 font-semibold">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{s.collected_by_name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Uncollected</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center gap-1 transition-colors"
                            onClick={() => printTubeLabel(s)}
                            title="Print tube barcode label"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Label</span>
                          </button>

                          {s.status === "pending" && (
                            <button
                              type="button"
                              className="px-3 py-1 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs flex items-center gap-1 transition-all"
                              onClick={() => handleOpenCollect(s)}
                            >
                              <Pipette className="w-3.5 h-3.5" />
                              <span>Collect</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Specimen Collection Modal */}
        <SampleCollectModal
          isOpen={isCollectModalOpen}
          onClose={() => setIsCollectModalOpen(false)}
          onSuccess={() => fetchSamples(statusFilter, searchTerm)}
          sample={selectedSample}
        />
      </div>
    </DashboardLayout>
  );
}
