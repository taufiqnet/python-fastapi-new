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
  ShieldCheck,
  Stethoscope,
  UserCheck,
  Laptop,
  Plane,
  Receipt,
  Car,
} from "lucide-react";

interface NavChild {
  name: string;
  href: string;
  permission?: { module: string; feature: string; action: string };
  superuserOnly?: boolean;
  group?: string;
  badge?: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  sectionKey?: string;
  module?: string;
  permission?: { module: string; feature: string; action: string };
  superuserOnly?: boolean;
  children?: NavChild[];
}

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  collapsed?: boolean;
}

export function Sidebar({ mobileOpen = false, onCloseMobile, collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const { user, hasPermission, hasModuleAccess } = useAuth();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    portal: true,
    ecommerce: true,
    hr: true,
    travel: true,
    fleet: true,
    assets: true,
    healthcare: true,
    finance: true,
    administration: true,
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
      name: "Employee Portal",
      href: "/portal",
      icon: UserCheck,
      sectionKey: "portal",
      children: [
        {
          name: "Overview & Check-In",
          href: "/portal",
        },
        {
          name: "My Profile",
          href: "/portal/profile",
        },
        {
          name: "Payslips & Tax Card",
          href: "/portal/payslips",
        },
        {
          name: "Leave & Attendance",
          href: "/portal/requests",
        },
        {
          name: "Loans & Expenses",
          href: "/portal/finance",
        },
        {
          name: "Official Letters & NOC",
          href: "/portal/letters",
        },
        {
          name: "Policy Handbook",
          href: "/portal/handbook",
        },
        {
          name: "HR Helpdesk",
          href: "/portal/helpdesk",
        },
      ],
    },
    {
      name: "E-Commerce",
      href: "/ecommerce/products",
      icon: ShoppingBag,
      sectionKey: "ecommerce",
      module: "ecommerce",
      children: [
        // 1. Catalog & Store
        {
          name: "Products",
          href: "/ecommerce/products",
          group: "Catalog & Store",
          permission: { module: "ecommerce", feature: "products", action: "view" },
        },
        {
          name: "Categories",
          href: "/ecommerce/categories",
          group: "Catalog & Store",
          permission: { module: "ecommerce", feature: "categories", action: "view" },
        },
        {
          name: "Brands & Models",
          href: "/ecommerce/brands",
          group: "Catalog & Store",
          permission: { module: "ecommerce", feature: "brands", action: "view" },
        },
        {
          name: "Catalog Browse",
          href: "/ecommerce/catalog",
          group: "Catalog & Store",
          permission: { module: "ecommerce", feature: "catalog", action: "view" },
        },
        {
          name: "Pricing & Coupons",
          href: "/ecommerce/pricing",
          group: "Catalog & Store",
          permission: { module: "ecommerce", feature: "pricing", action: "view" },
        },

        // 2. Sales & POS
        {
          name: "Orders",
          href: "/ecommerce/orders",
          group: "Sales & POS",
          permission: { module: "ecommerce", feature: "orders", action: "view" },
        },
        {
          name: "Customers",
          href: "/ecommerce/customers",
          group: "Sales & POS",
          permission: { module: "ecommerce", feature: "customers", action: "view" },
        },
        {
          name: "POS Terminal",
          href: "/ecommerce/pos",
          group: "Sales & POS",
          permission: { module: "ecommerce", feature: "pos_terminal", action: "view" },
        },
        {
          name: "POS Registers",
          href: "/ecommerce/pos/registers",
          group: "Sales & POS",
          permission: { module: "ecommerce", feature: "pos_registers", action: "view" },
        },

        // 3. Inventory & Warehouses
        {
          name: "Stock & Inventory",
          href: "/ecommerce/inventory",
          group: "Inventory & Warehouses",
          permission: { module: "ecommerce", feature: "inventory", action: "view" },
        },
        {
          name: "Stock Transfers",
          href: "/ecommerce/inventory/transfers",
          group: "Inventory & Warehouses",
          permission: { module: "ecommerce", feature: "inventory_transfers", action: "view" },
        },
        {
          name: "Stock Audits & Counts",
          href: "/ecommerce/inventory/counts",
          group: "Inventory & Warehouses",
          permission: { module: "ecommerce", feature: "inventory_counts", action: "view" },
        },

        // 4. Procurement & Inbound
        {
          name: "Purchase Orders",
          href: "/ecommerce/procurement",
          group: "Procurement & Inbound",
          permission: { module: "ecommerce", feature: "procurement_po", action: "view" },
        },
        {
          name: "Suppliers & Vendors",
          href: "/ecommerce/procurement/suppliers",
          group: "Procurement & Inbound",
          permission: { module: "ecommerce", feature: "procurement_suppliers", action: "view" },
        },

        // 5. Operations & Reports
        {
          name: "Shipping & Delivery",
          href: "/ecommerce/shipping",
          group: "Operations & Reports",
          permission: { module: "ecommerce", feature: "shipping", action: "view" },
        },
        {
          name: "Payments & Refunds",
          href: "/ecommerce/payments",
          group: "Operations & Reports",
          permission: { module: "ecommerce", feature: "payments", action: "view" },
        },
        {
          name: "Customer Reviews",
          href: "/ecommerce/reviews",
          group: "Operations & Reports",
          permission: { module: "ecommerce", feature: "reviews", action: "view" },
        },
        {
          name: "Multi-Vendor Sellers",
          href: "/ecommerce/sellers",
          group: "Operations & Reports",
          permission: { module: "ecommerce", feature: "sellers", action: "view" },
        },
        {
          name: "Reports & Analytics",
          href: "/ecommerce/reports",
          group: "Operations & Reports",
          permission: { module: "ecommerce", feature: "reports", action: "view" },
        },
      ],
    },
    {
      name: "HR & Payroll",
      href: "/hr-payroll/organization",
      icon: Users,
      sectionKey: "hr",
      module: "hrm",
      children: [
        // 1. Core HR & Workforce
        {
          name: "Organization",
          href: "/hr-payroll/organization",
          permission: { module: "hrm", feature: "departments", action: "view" },
          group: "Core HR & Workforce",
        },
        {
          name: "Employees",
          href: "/hr-payroll/employees",
          permission: { module: "hrm", feature: "employees", action: "view" },
          group: "Core HR & Workforce",
        },
        {
          name: "Document Management",
          href: "/hr-payroll/documents",
          permission: { module: "hrm", feature: "Documents", action: "view" },
          group: "Core HR & Workforce",
        },

        // 2. Time & Attendance
        {
          name: "Attendance",
          href: "/hr-payroll/attendance",
          permission: { module: "hrm", feature: "attendance", action: "view" },
          group: "Time & Attendance",
        },
        {
          name: "Duty Roster",
          href: "/hr-payroll/roster",
          permission: { module: "hrm", feature: "roster", action: "view" },
          group: "Time & Attendance",
        },
        {
          name: "Leave Management",
          href: "/hr-payroll/leave",
          permission: { module: "hrm", feature: "leave_applications", action: "view" },
          group: "Time & Attendance",
        },

        // 3. Payroll & Compensation
        {
          name: "Payroll Management",
          href: "/hr-payroll/payroll",
          permission: { module: "hrm", feature: "payroll_periods", action: "view" },
          group: "Payroll & Compensation",
        },
        {
          name: "Payroll Payslips",
          href: "/hr-payroll/payroll-records",
          permission: { module: "hrm", feature: "payroll_records", action: "view" },
          group: "Payroll & Compensation",
        },
        {
          name: "Salary Certificates",
          href: "/hr-payroll/salary-certificates",
          permission: { module: "hrm", feature: "salary_certificates", action: "view" },
          group: "Payroll & Compensation",
        },

        // 4. Letters & Onboarding
        {
          name: "Offer Letters",
          href: "/hr-payroll/offer-letters",
          permission: { module: "hrm", feature: "offer_letters", action: "view" },
          group: "Letters & Onboarding",
        },
        {
          name: "Appointment Letters",
          href: "/hr-payroll/appointment-letters",
          permission: { module: "hrm", feature: "appointment_letters", action: "view" },
          group: "Letters & Onboarding",
        },
        {
          name: "Experience Letters",
          href: "/hr-payroll/experience-letters",
          permission: { module: "hrm", feature: "experience_letters", action: "view" },
          group: "Letters & Onboarding",
        },

        // 5. Talent & Performance
        {
          name: "Performance Appraisals",
          href: "/hr-payroll/performance/appraisals",
          permission: { module: "hrm", feature: "performance_appraisals", action: "view" },
          group: "Talent & Performance",
        },
        {
          name: "Goals & KPIs",
          href: "/hr-payroll/performance/goals",
          permission: { module: "hrm", feature: "performance_goals", action: "view" },
          group: "Talent & Performance",
        },
        {
          name: "Appraisal Cycles",
          href: "/hr-payroll/performance/cycles",
          permission: { module: "hrm", feature: "performance_cycles", action: "view" },
          group: "Talent & Performance",
        },

        // 6. Lifecycle & Disciplinary
        {
          name: "Probation Desk",
          href: "/hr-payroll/lifecycle/probation",
          permission: { module: "hrm", feature: "probation_reviews", action: "view" },
          group: "Lifecycle & Disciplinary",
        },
        {
          name: "Career Movements",
          href: "/hr-payroll/lifecycle/movements",
          permission: { module: "hrm", feature: "career_movements", action: "view" },
          group: "Lifecycle & Disciplinary",
        },
        {
          name: "Disciplinary Actions",
          href: "/hr-payroll/disciplinary",
          permission: { module: "hrm", feature: "disciplinary_cases", action: "view" },
          group: "Lifecycle & Disciplinary",
        },
        {
          name: "Separation & Offboarding",
          href: "/hr-payroll/separation",
          permission: { module: "hrm", feature: "separations", action: "view" },
          group: "Lifecycle & Disciplinary",
        },
      ],
    },
    {
      name: "Travel & Expenses",
      href: "/hr-payroll/travel-requests",
      icon: Plane,
      sectionKey: "travel",
      module: "hrm",
      children: [
        {
          name: "Travel Requests",
          href: "/hr-payroll/travel-requests",
          permission: { module: "hrm", feature: "travel_requests", action: "view" },
        },
        {
          name: "Expense Claims",
          href: "/hr-payroll/expense-claims",
          permission: { module: "hrm", feature: "expense_claims", action: "view" },
        },
        {
          name: "DA & Conveyance Policies",
          href: "/hr-payroll/expense-policies",
          permission: { module: "hrm", feature: "da_policies", action: "view" },
        },
      ],
    },
    {
      name: "Vehicle & Fleet",
      href: "/fleet",
      icon: Car,
      sectionKey: "fleet",
      children: [
        {
          name: "Fleet Overview",
          href: "/fleet",
        },
      ],
    },
    {
      name: "Asset Management",
      href: "/assets",
      icon: Laptop,
      sectionKey: "assets",
      module: "hrm",
      children: [
        {
          name: "Asset Inventory",
          href: "/assets",
          permission: { module: "hrm", feature: "assets", action: "view" },
        },
        {
          name: "Custody Allocations",
          href: "/assets/allocations",
          permission: { module: "hrm", feature: "asset_allocations", action: "view" },
        },
        {
          name: "Maintenance & Repairs",
          href: "/assets/maintenance",
          permission: { module: "hrm", feature: "asset_maintenance", action: "view" },
        },
        {
          name: "Categories Setup",
          href: "/assets/categories",
          permission: { module: "hrm", feature: "assets", action: "view" },
        },
      ],
    },
    {
      name: "Healthcare & Clinic",
      href: "/healthcare",
      icon: Stethoscope,
      sectionKey: "healthcare",
      children: [
        {
          name: "Diagnostic Billing",
          href: "/healthcare/diagnostic/billing",
        },
        {
          name: "Patient Registry (MPI)",
          href: "/healthcare/patients",
        },
        {
          name: "Doctors & Chambers",
          href: "/healthcare/doctors",
        },
        {
          name: "Test Catalog",
          href: "/healthcare/diagnostic/catalog",
        },
        {
          name: "Phlebotomy & Samples",
          href: "/healthcare/diagnostic/phlebotomy",
        },
      ],
    },
    {
      name: "Finance & Accounts",
      href: "/finance/accounts",
      icon: Wallet,
      sectionKey: "finance",
      module: "finance",
      children: [
        {
          name: "Chart of Accounts",
          href: "/finance/accounts",
          permission: { module: "finance", feature: "accounts", action: "view" },
        },
        {
          name: "Vouchers",
          href: "/finance/vouchers",
          permission: { module: "finance", feature: "vouchers", action: "view" },
        },
        {
          name: "Ledger",
          href: "/finance/ledger",
          permission: { module: "finance", feature: "accounts", action: "view" },
        },
        {
          name: "Financial Reports",
          href: "/finance/reports",
          permission: { module: "finance", feature: "reports", action: "view" },
        },
      ],
    },
    {
      name: "Administration",
      href: "/administration/business-profile",
      icon: ShieldCheck,
      sectionKey: "administration",
      module: "general",
      children: [
        {
          name: "Company Profile",
          href: "/administration/business-profile",
          permission: { module: "general", feature: "business_profile", action: "view" },
        },
        {
          name: "User Accounts",
          href: "/administration/users",
          permission: { module: "general", feature: "users_permissions", action: "view" },
        },
        {
          name: "Roles & Permissions",
          href: "/administration/roles",
          permission: { module: "general", feature: "roles", action: "view" },
        },
        {
          name: "Subscription Plans",
          href: "/administration/subscription-plans",
          permission: { module: "general", feature: "subscription_plans", action: "view" },
        },
        {
          name: "Tenants Directory",
          href: "/administration/businesses",
          superuserOnly: true,
        },
        {
          name: "System Backups",
          href: "/administration/backups",
          superuserOnly: true,
        },
        {
          name: "Demo & Seed Data",
          href: "/administration/seed-data",
          superuserOnly: true,
        },
      ],
    },
    {
      name: "AI Assistant",
      href: "/ai-assistant",
      icon: Bot,
      permission: { module: "general", feature: "ai_assistant", action: "view" },
    },
  ];

  // Dynamically filter navigation items based on active role & module permissions
  const visibleNavItems = navItems
    .map((item) => {
      if (item.superuserOnly && !user?.is_superuser) {
        return null;
      }

      if (item.module && !user?.is_superuser && !hasModuleAccess(item.module)) {
        return null;
      }

      if (
        item.permission &&
        !user?.is_superuser &&
        !hasPermission(item.permission.module, item.permission.feature, item.permission.action)
      ) {
        return null;
      }

      if (item.children) {
        const allowedChildren = item.children.filter((sub) => {
          if (sub.superuserOnly && !user?.is_superuser) return false;
          if (user?.is_superuser) return true;
          if (sub.permission) {
            return hasPermission(
              sub.permission.module,
              sub.permission.feature,
              sub.permission.action
            );
          }
          return true;
        });

        if (allowedChildren.length === 0) {
          return null;
        }

        return {
          ...item,
          children: allowedChildren,
        };
      }

      return item;
    })
    .filter(Boolean) as (NavItem & { sectionKey?: string })[];

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
          {visibleNavItems.map((item) => {
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
                      {(() => {
                        let lastGroup: string | undefined = undefined;
                        return item.children.map((sub) => {
                          const isSubActive = pathname === sub.href;
                          const showGroupHeader = Boolean(sub.group && sub.group !== lastGroup);
                          if (sub.group) {
                            lastGroup = sub.group;
                          }
                          return (
                            <React.Fragment key={sub.name + sub.href}>
                              {showGroupHeader && (
                                <div className="pt-3 pb-1 px-2 text-[10px] font-bold tracking-wider uppercase text-slate-500 border-t border-slate-800/80 first:border-t-0 first:pt-1">
                                  {sub.group}
                                </div>
                              )}
                              <Link
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
                            </React.Fragment>
                          );
                        });
                      })()}
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

