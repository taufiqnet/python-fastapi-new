"use client";

import React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { EmployeeForm } from "@/components/hr-payroll/employee-form";
import { UserPlus, ChevronRight } from "lucide-react";

export default function CreateEmployeePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/hr-payroll/employees" className="hover:text-indigo-600 transition">
            HR & Payroll
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <Link href="/hr-payroll/employees" className="hover:text-indigo-600 transition">
            Employees
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-slate-800 font-semibold">New Employee</span>
        </nav>

        {/* Page Title Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <UserPlus className="w-7 h-7 text-indigo-600" />
              Onboard New Employee
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Add a new team member to your organizational roster and set up employment terms.
            </p>
          </div>
        </div>

        {/* Form Component */}
        <EmployeeForm isEdit={false} />
      </div>
    </DashboardLayout>
  );
}
