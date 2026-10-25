"use client";

import React, { useState } from "react";
import { UploadCloud, Download, FileSpreadsheet, X, Loader2, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";

interface CategoryImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: number;
  onSuccess: () => void;
}

export function CategoryImportModal({
  isOpen,
  onClose,
  businessId,
  onSuccess,
}: CategoryImportModalProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const response = await apiClient.get(`/categories/template-excel?business_id=${businessId}`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `category_template_business_${businessId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Template downloaded", "Excel template is ready for data entry.");
    } catch {
      toast.error("Download failed", "Could not download category Excel template.");
    } finally {
      setDownloading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("File required", "Please select a .xlsx file to upload.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiClient.post(
        `/categories/import-excel?business_id=${businessId}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const importedCount = res.data?.imported_count ?? 1;
      toast.success(
        "Import complete",
        `Successfully imported ${importedCount} categories into catalog.`
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to import categories.";
      toast.error("Import failed", msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Import Categories</h3>
              <p className="text-[11px] text-slate-400">Bulk upload categories via Excel spreadsheet</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleUpload} className="p-6 space-y-5">
          {/* Step 1: Download Template */}
          <div className="bg-indigo-50/60 rounded-xl p-3.5 border border-indigo-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-indigo-950">1. Download Template</p>
              <p className="text-[11px] text-indigo-700">Pre-formatted schema with sample rows</p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={downloading}
              className="px-3 py-1.5 bg-white hover:bg-indigo-100/60 border border-indigo-200 text-indigo-700 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition active:scale-95 shadow-2xs"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Download
            </button>
          </div>

          {/* Step 2: Upload File */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              2. Upload Excel File (.xlsx)
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-6 text-center cursor-pointer transition bg-slate-50/50 hover:bg-indigo-50/20 relative">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5 text-indigo-600" />
                </div>
                {file ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{file.name}</span>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-slate-700">
                      Click or drag spreadsheet here
                    </p>
                    <p className="text-[11px] text-slate-400">Supports standard .xlsx format</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || uploading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Upload & Import
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
