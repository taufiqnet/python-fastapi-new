"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import {
  Printer,
  Download,
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileCheck2,
} from "lucide-react";
import {
  Mushak63Printable,
  Mushak63Data,
} from "@/components/finance/mushak-6-3-printable";
import { exportElementToPdf } from "@/lib/pdf-export";

export default function MushakStandaloneViewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const invoiceId = params?.id as string;
  const businessId = user?.business_id || 1;

  const [data, setData] = useState<Mushak63Data | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const printableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!invoiceId) return;

    const fetchMushakData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.post<Mushak63Data>(
          `/finance/invoices/${invoiceId}/mushak-6-3?business_id=${businessId}`
        );
        setData(res.data);
      } catch (err: unknown) {
        const errMessage =
          err instanceof Error
            ? err.message
            : "Failed to generate Mushak 6.3 Tax Invoice from server.";
        setError(errMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchMushakData();
  }, [invoiceId, businessId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printableRef.current || !data) return;
    setIsDownloadingPdf(true);
    try {
      const mushakNum =
        data.header.mushak_number || data.header.invoice_number || "Tax-Invoice";
      await exportElementToPdf(
        printableRef.current,
        `Mushak-6.3-${mushakNum}`
      );
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-200 text-slate-900 flex flex-col font-sans">
      {/* Top Header Control Strip (Hidden in Print) */}
      <header className="bg-slate-900 text-white px-6 py-3.5 border-b border-slate-800 flex items-center justify-between print:hidden sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/finance/mushak")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700"
            title="Back to Mushak Registry"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Registry</span>
          </button>

          <div className="h-5 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-indigo-400" />
            <div>
              <h1 className="text-sm font-bold flex items-center gap-2">
                কর চালানপত্র (মূসক-৬.৩)
                <span className="text-xs font-normal text-slate-400">
                  Statutory Tax Invoice
                </span>
              </h1>
              {data?.header.mushak_number && (
                <p className="text-[11px] font-mono text-indigo-300">
                  {data.header.mushak_number}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            disabled={!data || loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition shadow-xs"
            title="Print invoice directly"
          >
            <Printer className="w-4 h-4" />
            <span>Print A4</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={!data || loading || isDownloadingPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold rounded-xl text-xs transition border border-slate-700 shadow-xs"
            title="Download PDF directly in browser"
          >
            {isDownloadingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            ) : (
              <Download className="w-4 h-4 text-indigo-400" />
            )}
            <span>{isDownloadingPdf ? "Creating PDF..." : "Download PDF"}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 flex justify-center items-start print:p-0">
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            <p className="text-sm font-semibold text-slate-700">
              Generating statutory Mushak 6.3 Tax Invoice...
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="max-w-md w-full bg-rose-50 border border-rose-200 rounded-2xl p-6 my-auto text-rose-800 space-y-3 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-rose-600" />
              <h2 className="text-base font-bold">Mushak Generation Failed</h2>
            </div>
            <p className="text-xs text-rose-700">{error}</p>
            <button
              type="button"
              onClick={() => router.push("/finance/mushak")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition"
            >
              Back to Registry
            </button>
          </div>
        )}

        {data && !loading && (
          <div className="shadow-2xl border border-slate-300 rounded-xs bg-white print:shadow-none print:border-none">
            <Mushak63Printable ref={printableRef} data={data} />
          </div>
        )}
      </main>
    </div>
  );
}
