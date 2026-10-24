"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw, ShieldCheck, Clock, Server } from "lucide-react";

interface MaintenanceOverlayProps {
  isOpen: boolean;
  onReconnect?: () => void;
  customMessage?: string;
}

export function MaintenanceOverlay({
  isOpen,
  onReconnect,
  customMessage,
}: MaintenanceOverlayProps) {
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          handlePing();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const handlePing = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/v1/health", { cache: "no-store" });
      if (res.ok) {
        if (onReconnect) {
          onReconnect();
        } else {
          window.location.reload();
        }
      }
    } catch {
      // Backend still deploying
    } finally {
      setChecking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-indigo-500/10 text-center relative overflow-hidden">
        {/* Top ambient progress rim */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-indigo-500 animate-pulse" />
        </div>

        <div className="w-12 h-12 bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Server className="w-6 h-6 animate-pulse" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-3">
          <AlertTriangle className="w-3.5 h-3.5" />
          Scheduled Live Deployment
        </div>

        <h2 className="text-xl font-bold text-white tracking-tight mb-2">
          System Upgrade in Progress
        </h2>

        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          {customMessage ||
            "We are applying platform enhancements and database migrations. All your work and transaction data are safely preserved."}
        </p>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 text-xs text-left space-y-2 mb-6">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-sky-400" /> Estimated Duration:
            </span>
            <span className="font-medium text-white">~2 - 3 minutes</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Data Protection:
            </span>
            <span className="font-medium text-emerald-400">100% Backed Up</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Automatic reconnection in <strong className="text-slate-300 font-mono">{secondsLeft}s</strong>
        </p>

        <button
          onClick={handlePing}
          disabled={checking}
          className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/25"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Checking System Status..." : "Reconnect Now"}
        </button>

        <p className="mt-4 text-[11px] text-slate-500">
          ProERP Enterprise Cloud &bull; Live Status Sync
        </p>
      </div>
    </div>
  );
}
