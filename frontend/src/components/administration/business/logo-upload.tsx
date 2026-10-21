"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, Trash2, Loader2, Image as ImageIcon, Check } from "lucide-react";
import { useToast } from "@/context/toast-context";

interface LogoUploadProps {
  currentLogoUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  disabled?: boolean;
}

export function LogoUpload({
  currentLogoUrl,
  onUpload,
  onRemove,
  disabled = false,
}: LogoUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Helper to format full image URL
  const formatLogoUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return `${apiBase}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const handleFile = async (file: File) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      toast.error(
        "Invalid Format",
        "Please select a PNG, JPG, WEBP, or SVG image file."
      );
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File Too Large", "Maximum logo image size is 2MB.");
      return;
    }

    setUploading(true);
    try {
      await onUpload(file);
      toast.success("Logo Updated", "Business logo uploaded successfully.");
    } catch (err: unknown) {
      let msg = "Failed to upload logo.";
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        msg = axErr.response?.data?.detail || msg;
      }
      toast.error("Upload Failed", msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || uploading || removing) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await onRemove();
      toast.success("Logo Removed", "Company logo has been removed.");
    } catch (err: unknown) {
      let msg = "Failed to remove logo.";
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        msg = axErr.response?.data?.detail || msg;
      }
      toast.error("Remove Failed", msg);
    } finally {
      setRemoving(false);
    }
  };

  const fullUrl = formatLogoUrl(currentLogoUrl);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50/70 border border-slate-200">
      {/* Logo Preview Frame */}
      <div className="relative w-28 h-28 rounded-2xl border-2 border-dashed border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
        {fullUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fullUrl}
            alt="Business Logo"
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <div className="text-center p-2 text-slate-300">
            <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-70" />
            <span className="text-[10px] font-medium text-slate-400 block">No Logo</span>
          </div>
        )}

        {(uploading || removing) && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        )}
      </div>

      {/* Upload & Action Controls */}
      <div className="flex-1 w-full space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.svg"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
          disabled={disabled || uploading || removing}
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => {
            if (!disabled && !uploading && !removing) {
              fileInputRef.current?.click();
            }
          }}
          className={`border border-dashed rounded-xl p-3 text-center cursor-pointer transition ${
            isDragOver
              ? "border-indigo-500 bg-indigo-50/50"
              : "border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/20"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-700">
            <UploadCloud className="w-4 h-4 text-indigo-600" />
            <span>Click to upload or drag &amp; drop</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            PNG, JPG, WEBP, or SVG (Max 2MB)
          </p>
        </div>

        {fullUrl && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-emerald-600 font-medium inline-flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Logo uploaded &amp; active
            </span>
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || uploading || removing}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 transition disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3" /> Remove logo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
