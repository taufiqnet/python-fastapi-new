"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Database,
  Download,
  Trash2,
  RefreshCw,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  FileArchive,
  HardDrive,
  Clock,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface SystemBackup {
  id: number;
  filename: string;
  file_size_bytes: number;
  checksum_sha256: string | null;
  backup_type: string;
  status: string;
  error_message: string | null;
  created_at: string;
  human_size: string | null;
}

export default function SystemBackupsPage() {
  const [backups, setBackups] = useState<SystemBackup[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedChecksum, setCopiedChecksum] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [, startTransition] = useTransition();

  const fetchBackups = async (showBackgroundSpinner = false) => {
    if (showBackgroundSpinner) setIsFetching(true);
    try {
      const res = await apiClient.get<SystemBackup[]>("/api/v1/system/backups");
      startTransition(() => {
        setBackups(res.data);
        setError(null);
      });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Failed to load database backups.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await apiClient.post<{ message: string; backup: SystemBackup }>("/api/v1/system/backups", {
        backup_type: "manual_admin",
      });
      setSuccessMsg("Instant database backup snapshot created successfully!");
      fetchBackups(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Failed to trigger database backup.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBackup = async (id: number) => {
    if (!window.confirm("Are you sure you want to permanently delete this backup snapshot?")) {
      return;
    }
    try {
      await apiClient.delete(`/api/v1/system/backups/${id}`);
      fetchBackups(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      alert(e.response?.data?.detail || "Failed to delete backup.");
    }
  };

  const handleDownload = async (backup: SystemBackup) => {
    try {
      const res = await apiClient.get(`/api/v1/system/backups/${backup.id}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", backup.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download backup file.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChecksum(text);
    setTimeout(() => setCopiedChecksum(null), 2000);
  };

  const totalStorageBytes = backups.reduce((acc, curr) => acc + curr.file_size_bytes, 0);
  const totalStorageFormatted = (totalStorageBytes / (1024 * 1024)).toFixed(2) + " MB";

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                PostgreSQL System Backups
              </h1>
              <p className="text-sm text-slate-400">
                Disaster recovery snapshots, checksum verification, and secure offline storage.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchBackups(true)}
            disabled={isFetching || initialLoading}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin text-indigo-400")} />
          </button>

          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20"
          >
            {creating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {creating ? "Creating Snapshot..." : "Create Instant Backup"}
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <FileArchive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Snapshots</p>
            <p className="text-2xl font-bold text-white mt-0.5">{backups.length}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-xs flex items-center gap-4">
          <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Storage Consumed</p>
            <p className="text-2xl font-bold text-white mt-0.5">{totalStorageFormatted}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Integrity Standard</p>
            <p className="text-base font-bold text-emerald-400 mt-0.5">SHA-256 Verified</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Backups Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl relative">
        {/* Indeterminate top-rim progress bar during fetch */}
        {isFetching && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-800 overflow-hidden z-10">
            <div className="h-full bg-indigo-500 animate-pulse w-full" />
          </div>
        )}

        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Snapshot Catalog</h2>
          <span className="text-xs text-slate-500 font-mono">Format: PostgreSQL Custom (-Fc)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/50 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Filename</th>
                <th className="px-5 py-3.5">Created At</th>
                <th className="px-5 py-3.5">Size</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">SHA-256 Checksum</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-normal">
              {initialLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading database snapshots...
                  </td>
                </tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    <FileArchive className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    No backups generated yet. Click &quot;Create Instant Backup&quot; to take your first snapshot.
                  </td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-indigo-300 font-medium">
                      {b.filename}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(b.created_at).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-300">
                      {b.human_size || `${(b.file_size_bytes / 1024).toFixed(1)} KB`}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[11px]">
                        {b.backup_type}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      {b.checksum_sha256 ? (
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                          <span>{b.checksum_sha256.slice(0, 12)}...{b.checksum_sha256.slice(-6)}</span>
                          <button
                            onClick={() => copyToClipboard(b.checksum_sha256!)}
                            className="p-1 hover:text-white rounded hover:bg-slate-800 transition-colors"
                            title="Copy full SHA-256"
                          >
                            {copiedChecksum === b.checksum_sha256 ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      {b.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium text-[11px]">
                          <ShieldCheck className="w-3 h-3" />
                          Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-medium text-[11px]">
                          <AlertTriangle className="w-3 h-3" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleDownload(b)}
                          className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                          title="Download .dump file"
                        >
                          <Download className="w-4 h-4 text-indigo-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(b.id)}
                          className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete snapshot"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Disaster Recovery Guidance Callout */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          Disaster Recovery &amp; Restoration Guidance
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          These snapshots are generated using PostgreSQL&apos;s custom archive format (<code>-Fc</code>).
          To restore in a live or disaster-recovery container, execute:
        </p>
        <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 select-all overflow-x-auto">
          docker exec -i fastapi_postgres pg_restore -U postgres -d fastapi --clean --if-exists &lt; snapshot.dump
        </div>
      </div>
    </div>
  );
}
