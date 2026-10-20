"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Wallet,
  Bot,
  Package,
  Boxes,
  CalendarCheck,
  CalendarDays,
  FileText,
  CreditCard,
  ChevronDown,
  Building2,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: { module: string; feature: string; action: string };
  children?: { name: string; href: string }[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    ecommerce: true,
    hr: true,
    finance: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const navItems: (NavItem & { sectionKey?: string })[] = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      name: "E-Commerce",
      href: "/ecommerce/products",
      icon: ShoppingBag,
      sectionKey: "ecommerce",
      children: [
        { name: "Products", href: "/ecommerce/products" },
        { name: "Categories", href: "/ecommerce/categories" },
        { name: "Inventory", href: "/ecommerce/inventory" },
        { name: "Orders", href: "/ecommerce/orders" },
        { name: "POS Register", href: "/ecommerce/pos" },
      ],
    },
    {
      name: "HR & Payroll",
      href: "/hr-payroll/employees",
      icon: Users,
      sectionKey: "hr",
      children: [
        { name: "Employees", href: "/hr-payroll/employees" },
        { name: "Attendance", href: "/hr-payroll/attendance" },
        { name: "Leave Requests", href: "/hr-payroll/leave" },
        { name: "Payroll Records", href: "/hr-payroll/payroll" },
        { name: "Organization", href: "/hr-payroll/organization" },
      ],
    },
    {
      name: "Finance & Accounts",
      href: "/finance/accounts",
      icon: Wallet,
      sectionKey: "finance",
      children: [
        { name: "Chart of Accounts", href: "/finance/accounts" },
        { name: "Vouchers", href: "/finance/vouchers" },
        { name: "Ledger", href: "/finance/ledger" },
        { name: "Financial Reports", href: "/finance/reports" },
      ],
    },
    {
      name: "AI Assistant",
      href: "/ai-assistant",
      icon: Bot,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
      {/* Brand header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 bg-slate-950/50">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
          Pro
        </div>
        <div>
          <h1 className="font-semibold text-white tracking-tight leading-none text-base">ProERP SaaS</h1>
          <p className="text-xs text-slate-500 font-mono mt-1">v2.0 (FastAPI + Next.js)</p>
        </div>
      </div>

      {/* Tenant info */}
      {user?.business && (
        <div className="px-4 py-3 mx-3 my-3 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center gap-2.5">
          <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
          <div className="overflow-hidden">
            <p className="text-xs font-medium text-white truncate">{user.business.legal_name || "Business Tenant"}</p>
            <p className="text-[10px] text-slate-400 font-mono">Tenant #{user.business_id}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.children && item.children.some((c) => pathname.startsWith(c.href)));

          if (item.children && item.sectionKey) {
            const isOpen = openSections[item.sectionKey];
            return (
              <div key={item.name} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleSection(item.sectionKey!)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive ? "bg-indigo-600/10 text-indigo-400" : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
                </button>

                {isOpen && (
                  <div className="pl-9 pr-2 space-y-1">
                    {item.children.map((sub) => {
                      const isSubActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.name}
                          href={sub.href}
                          className={cn(
                            "block px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                            isSubActive
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "text-slate-400 hover:text-white hover:bg-slate-800"
                          )}
                        >
                          {sub.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / User status */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          API Connected
        </span>
        <span className="font-mono text-[11px] text-slate-400">:8000</span>
      </div>
    </aside>
  );
}
