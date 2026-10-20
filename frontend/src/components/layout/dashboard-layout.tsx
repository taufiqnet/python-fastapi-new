"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Loader2 } from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showTimeoutNotice, setShowTimeoutNotice] = React.useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setShowTimeoutNotice(true);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <Loader2 className="w-9 h-9 animate-spin text-indigo-600" />
          <div>
            <p className="text-base font-medium text-slate-800">Connecting to SaaS Workspace...</p>
            <p className="text-xs text-slate-500 mt-1">Authenticating session with ProERP backend</p>
          </div>

          {showTimeoutNotice && (
            <div className="mt-2 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col gap-3 animate-in fade-in">
              <p>
                Taking longer than usual? The backend service might still be initializing or you may need to sign in again.
              </p>
              <div className="flex items-center justify-center gap-2">
                <a
                  href="/login"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-700 transition"
                >
                  Go to Sign In
                </a>
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 transition"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium text-slate-500">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50">
          {children}
        </main>
      </div>
    </div>
  );
}
