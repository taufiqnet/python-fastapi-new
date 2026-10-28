"use client";

import React, { useEffect, useState, useRef } from "react";
import { apiClient } from "@/lib/api-client";
import {
  X,
  Printer,
  Download,
  Maximize2,
  Minimize2,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Mushak63Printable, Mushak63Data } from "./mushak-6-3-printable";
import { exportElementToPdf } from "@/lib/pdf-export";

interface Mushak63ModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId?: string | null;
  initialData?: Mushak63Data | null;
  businessId?: number;
  autoDownload?: boolean;
}

export function Mushak63Modal({
  isOpen,
  onClose,
  invoiceId,
  initialData,
  businessId,
  autoDownload = false,
}: Mushak63ModalProps) {
  const [data, setData] = useState<Mushak63Data | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const printableRef = useRef<HTMLDivElement>(null);
  const autoDownloadedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setData(null);
      setError(null);
      setIsFullscreen(false);
      autoDownloadedRef.current = false;
      return;
    }

    if (initialData) {
      setData(initialData);
      return;
    }

    if (invoiceId) {
      fetchMushakData(invoiceId);
    }
  }, [isOpen, invoiceId, initialData]);

  // Handle auto-download if requested once data is loaded and rendered
  useEffect(() => {
    if (autoDownload && data && printableRef.current && !autoDownloadedRef.current && !loading) {
      autoDownloadedRef.current = true;
      // Slight delay to allow DOM styles to calculate accurately
      const timer = setTimeout(() => {
        handleDownloadPdf();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoDownload, data, loading]);

  const fetchMushakData = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const bizParam = businessId ? `?business_id=${businessId}` : "";
      const res = await apiClient.post<Mushak63Data>(
        `/finance/invoices/${id}/mushak-6-3${bizParam}`
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

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printableRef.current || !data) return;
    setIsDownloadingPdf(true);
    try {
      const mushakNum =
        data.header.mushak_number || data.header.invoice_number || "Tax-Invoice";
      await exportElementToPdf(printableRef.current, `Mushak-6.3-${mushakNum}`);
    } catch (err) {
      console.error("Failed to generate Mushak 6.3 PDF in frontend:", err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`bg-slate-100 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden flex flex-col transition-all duration-200 ${
          isFullscreen
            ? "w-full h-full max-w-none max-h-none rounded-none"
            : "w-full max-w-4xl max-h-[95vh]"
        }`}
      >
        {/* Top Control Bar (Hidden during printing) */}
        <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                কর চালানপত্র (মূসক-৬.৩)
                <span className="text-[11px] font-normal text-slate-400">
                  NBR Statutory Tax Invoice
                </span>
              </h3>
              {data?.header.mushak_number && (
                <p className="text-[11px] font-mono text-indigo-300">
                  {data.header.mushak_number}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={!data || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg text-xs transition shadow-xs"
              title="Print statutory invoice directly"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={!data || loading || isDownloadingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-medium rounded-lg text-xs transition border border-slate-700"
              title="Download statutory PDF natively from Next.js frontend"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-indigo-400" />
              )}
              <span>{isDownloadingPdf ? "Creating PDF..." : "Download PDF"}</span>
            </button>

            {invoiceId && (
              <a
                href={`/finance/mushak/${invoiceId}`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                title="Open full page view in new tab (Port 3000)"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200 flex justify-center">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-600 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-xs font-medium">Generating statutory Mushak 6.3 challan...</p>
            </div>
          )}

          {error && !loading && (
            <div className="max-w-md w-full bg-rose-50 border border-rose-200 rounded-xl p-4 my-auto text-rose-800 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold">Mushak Generation Failed</h4>
                <p className="text-xs mt-1 text-rose-700">{error}</p>
                <button
                  type="button"
                  onClick={() => invoiceId && fetchMushakData(invoiceId)}
                  className="mt-3 text-xs font-semibold text-rose-900 underline hover:no-underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {data && !loading && (
            <div className="shadow-lg border border-slate-300 rounded-xs bg-white">
              <Mushak63Printable ref={printableRef} data={data} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
