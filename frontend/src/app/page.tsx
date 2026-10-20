"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";
import {
  ShoppingBag,
  Users,
  Wallet,
  Bot,
  ArrowUpRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    productsCount: 0,
    employeesCount: 0,
    loading: true,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const [prodRes, empRes] = await Promise.allSettled([
          apiClient.get("/products/?limit=1"),
          apiClient.get("/employees?limit=1"),
        ]);

        let pCount = 0;
        let eCount = 0;

        if (prodRes.status === "fulfilled" && Array.isArray(prodRes.value.data)) {
          pCount = prodRes.value.data.length;
        }
        if (empRes.status === "fulfilled" && Array.isArray(empRes.value.data)) {
          eCount = empRes.value.data.length;
        }

        setStats({ productsCount: pCount, employeesCount: eCount, loading: false });
      } catch {
        setStats({ productsCount: 0, employeesCount: 0, loading: false });
      }
    }

    loadStats();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-8 w-full">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/20 to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 mb-4">
              <ShieldCheck className="w-3.5 h-3.5" />
              Multi-Tenant Architecture Active
            </span>
            <h1 className="text-3xl font-bold tracking-tight">
              Hello, {user?.first_name || user?.username || "Admin"}!
            </h1>
            <p className="text-indigo-200 mt-2 text-sm leading-relaxed">
              Welcome to the decoupled Next.js 15 dashboard. Your frontend is communicating seamlessly with the
              FastAPI backend via pure REST APIs and JWT authentication.
            </p>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                <ShoppingBag className="w-6 h-6" />
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Live
              </span>
            </div>
            <h3 className="text-sm font-medium text-slate-500">E-Commerce Module</h3>
            <p className="text-2xl font-bold text-slate-900 mt-1">Catalog & POS</p>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Products, variants, stock</span>
              <Link href="/ecommerce/products" className="text-indigo-600 font-semibold hover:underline flex items-center gap-0.5">
                Manage <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                <Users className="w-6 h-6" />
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            </div>
            <h3 className="text-sm font-medium text-slate-500">HR & Payroll</h3>
            <p className="text-2xl font-bold text-slate-900 mt-1">Workforce</p>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Staff, leaves, attendance</span>
              <Link href="/hr-payroll/employees" className="text-emerald-600 font-semibold hover:underline flex items-center gap-0.5">
                Manage <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="p-3 bg-amber-50 rounded-xl text-amber-600">
                <Wallet className="w-6 h-6" />
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
                Ledger
              </span>
            </div>
            <h3 className="text-sm font-medium text-slate-500">Finance & VAT</h3>
            <p className="text-2xl font-bold text-slate-900 mt-1">Accounting</p>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Mushak VAT, vouchers</span>
              <Link href="/finance/accounts" className="text-amber-600 font-semibold hover:underline flex items-center gap-0.5">
                View <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="p-3 bg-purple-50 rounded-xl text-purple-600">
                <Bot className="w-6 h-6" />
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full">
                OpenRouter
              </span>
            </div>
            <h3 className="text-sm font-medium text-slate-500">AI Assistant</h3>
            <p className="text-2xl font-bold text-slate-900 mt-1">HR & Payroll AI</p>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">LLM Tool Calling</span>
              <Link href="/ai-assistant" className="text-purple-600 font-semibold hover:underline flex items-center gap-0.5">
                Chat <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* System Architecture Overview for the Team */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-base font-semibold text-slate-900 mb-2">Decoupled Architecture Status</h3>
          <p className="text-xs text-slate-500 mb-6">
            The frontend and backend are ready to be maintained and developed by separate teams.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">FastAPI Backend</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">
                  Port 8000
                </span>
              </div>
              <ul className="text-xs text-slate-600 space-y-1.5 mt-3">
                <li>• Pure REST API endpoints mounted under domain modules</li>
                <li>• PostgreSQL 16 multi-tenancy & granular RBAC</li>
                <li>• Alembic schema migration control</li>
                <li>• Live cPanel WSGI runner (<code className="text-indigo-600">passenger_wsgi.py</code>)</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Next.js Frontend</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                  Port 3000
                </span>
              </div>
              <ul className="text-xs text-slate-600 space-y-1.5 mt-3">
                <li>• React 19 + TypeScript + Tailwind CSS</li>
                <li>• Axios API client with automatic JWT token attachment</li>
                <li>• Client-side session management & permission checks</li>
                <li>• Ready for static export (<code className="text-emerald-600">output: &apos;export&apos;</code>) to cPanel</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
