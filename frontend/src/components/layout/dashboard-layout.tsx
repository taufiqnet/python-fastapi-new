"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Loader2, ShieldAlert, ArrowLeft, Users } from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, hasModuleAccess } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showTimeoutNotice, setShowTimeoutNotice] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

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

  // Check module-level route authorization (Pure RBAC)
  const isEcommerceRoute = pathname.startsWith("/ecommerce");
  const isFinanceRoute = pathname.startsWith("/finance");
  const isAdministrationRoute = pathname.startsWith("/administration");

  let restrictedModuleName = "";
  if (isEcommerceRoute && !hasModuleAccess("ecommerce")) {
    restrictedModuleName = "E-Commerce";
  } else if (isFinanceRoute && !hasModuleAccess("finance")) {
    restrictedModuleName = "Finance & Accounting";
  } else if (isAdministrationRoute && !user.is_superuser && !hasModuleAccess("general")) {
    restrictedModuleName = "System Administration";
  }

  const isModuleRestricted = Boolean(restrictedModuleName);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        collapsed={collapsed}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onToggleMobileMenu={() => setMobileOpen((prev) => !prev)}
          isSidebarCollapsed={collapsed}
          onToggleSidebarCollapse={() => setCollapsed((prev) => !prev)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/50 w-full min-w-0">
          {isModuleRestricted ? (
            <div className="max-w-2xl mx-auto my-12 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs text-center">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-xs">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Access Restricted (Role-Based Access Control)</h2>
              <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                Your account does not have an assigned role granting access to the <span className="font-semibold text-slate-700">{restrictedModuleName}</span> module. Access in this system is governed strictly by your assigned roles and permissions. Please contact your System Administrator to request the required role.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/hr-payroll/employees"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs transition"
                >
                  <Users className="w-4 h-4" />
                  Go to HR &amp; Payroll
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Return to Dashboard
                </Link>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
