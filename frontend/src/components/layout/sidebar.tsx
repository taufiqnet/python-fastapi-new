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

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  collapsed?: boolean;
}

export function Sidebar({ mobileOpen = false, onCloseMobile, collapsed = false }: SidebarProps) {
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
        { name: "Leave Management", href: "/hr-payroll/leave" },
        { name: "Payroll Management", href: "/hr-payroll/payroll" },
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
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      <aside
        className={cn(
          "bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 transition-all duration-300 z-50",
          // Mobile drawer:
          "fixed inset-y-0 left-0 lg:static",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0",
          // Width on desktop vs mobile:
          collapsed ? "lg:w-20" : "lg:w-64",
          "w-72"
        )}
      >
        {/* Brand header */}
        <div
          className={cn(
            "h-16 flex items-center border-b border-slate-800 bg-slate-950/50 transition-all",
            collapsed ? "lg:justify-center lg:px-2 px-6 justify-between" : "justify-between px-6"
          )}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 shrink-0">
              Pro
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="min-w-0">
                <h1 className="font-semibold text-white tracking-tight leading-none text-base truncate">
                  ProERP SaaS
                </h1>
                <p className="text-[11px] text-slate-500 font-mono mt-1">v2.0 Enterprise</p>
              </div>
            )}
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Tenant info */}
        {user?.business && (
          <div
            className={cn(
              "mx-3 my-3 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center transition-all",
              collapsed ? "lg:justify-center lg:p-2.5 p-3 gap-2.5" : "px-4 py-3 gap-2.5"
            )}
            title={user.business.legal_name || "Business Tenant"}
          >
            <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
            {(!collapsed || mobileOpen) && (
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-medium text-white truncate">
                  {user.business.legal_name || "Business Tenant"}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">Tenant #{user.business_id}</p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.children && item.children.some((c) => pathname.startsWith(c.href)));

            if (item.children && item.sectionKey) {
              const isOpen = openSections[item.sectionKey];

              // In collapsed desktop mode, render as a direct clickable icon link
              if (collapsed && !mobileOpen) {
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    title={item.name}
                    className={cn(
                      "flex items-center justify-center p-2.5 rounded-xl text-sm font-medium transition-colors my-1",
                      isActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </Link>
                );
              }

              return (
                <div key={item.name} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleSection(item.sectionKey!)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-indigo-600/10 text-indigo-400"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </div>
                    <ChevronDown
                      className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")}
                    />
                  </button>

                  {isOpen && (
                    <div className="pl-9 pr-2 space-y-1">
                      {item.children.map((sub) => {
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.name}
                            href={sub.href}
                            onClick={onCloseMobile}
                            className={cn(
                              "block px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                              isSubActive
                                ? "bg-indigo-600 text-white shadow-sm font-semibold"
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
                onClick={onCloseMobile}
                title={collapsed && !mobileOpen ? item.name : undefined}
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-colors",
                  collapsed && !mobileOpen
                    ? "justify-center p-2.5 my-1"
                    : "gap-3 px-3 py-2",
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}
              >
                <Icon className={collapsed && !mobileOpen ? "w-5 h-5" : "w-4 h-4"} />
                {(!collapsed || mobileOpen) && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer / User status */}
        <div
          className={cn(
            "p-3.5 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-500 flex items-center transition-all",
            collapsed && !mobileOpen ? "justify-center" : "justify-between"
          )}
        >
          <span className="flex items-center gap-1.5" title="Backend FastAPI status: Connected">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {(!collapsed || mobileOpen) && <span>API Online</span>}
          </span>
          {(!collapsed || mobileOpen) && (
            <span className="font-mono text-[10px] text-slate-400">:8000</span>
          )}
        </div>
      </aside>
    </>
  );
}

