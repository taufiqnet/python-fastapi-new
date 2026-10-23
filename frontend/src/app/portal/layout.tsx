"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  LayoutDashboard,
  User,
  CreditCard,
  CalendarCheck,
  Wallet,
  FileCheck,
  BookOpen,
  Headphones,
  Sparkles,
  Laptop,
  Plane,
  Target,
  TrendingUp,
} from "lucide-react";

const PORTAL_NAV_TABS = [
  { name: "Overview", href: "/portal", icon: LayoutDashboard },
  { name: "My Profile", href: "/portal/profile", icon: User },
  { name: "My Goals & Appraisals", href: "/portal/performance", icon: Target },
  { name: "My Career & Conduct", href: "/portal/career", icon: TrendingUp },
  { name: "My Assets", href: "/portal/assets", icon: Laptop },
  { name: "Travel Desk", href: "/portal/travel", icon: Plane },
  { name: "Loans & Expenses", href: "/portal/finance", icon: Wallet },
  { name: "Payslips & Tax", href: "/portal/payslips", icon: CreditCard },
  { name: "Requests Hub", href: "/portal/requests", icon: CalendarCheck },
  { name: "Official Letters", href: "/portal/letters", icon: FileCheck },
  { name: "Policies & Handbook", href: "/portal/handbook", icon: BookOpen },
  { name: "HR Helpdesk", href: "/portal/helpdesk", icon: Headphones },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Portal Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase">
              <Sparkles className="w-4 h-4" />
              <span>ProERP Self-Service Hub</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Employee Portal
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Personal employment profile, statutory requests, payslips & company directory
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/hr-payroll/employees"
              className="text-xs text-slate-600 hover:text-indigo-600 font-medium px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 transition-colors"
            >
              Switch to HR Admin
            </Link>
          </div>
        </div>

        {/* Horizontal Navigation Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-100">
          {PORTAL_NAV_TABS.map((tab) => {
            const isActive =
              tab.href === "/portal"
                ? pathname === "/portal"
                : pathname.startsWith(tab.href);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-bold"
                    : "text-slate-600 hover:text-indigo-600 hover:bg-slate-100"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Page Content */}
        <div>{children}</div>
      </div>
    </DashboardLayout>
  );
}
