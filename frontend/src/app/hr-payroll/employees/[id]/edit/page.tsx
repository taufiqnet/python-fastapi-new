"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { EmployeeForm } from "@/components/hr-payroll/employee-form";
import { UserCheck, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { EmployeeOut } from "@/types";
import { apiClient } from "@/lib/api-client";

export default function EditEmployeePage() {
  const params = useParams();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<EmployeeOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEmployee() {
      if (!employeeId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get<EmployeeOut>(`/employees/${employeeId}`);
        setEmployee(res.data);
      } catch (err: unknown) {
        let msg = "Failed to load employee details.";
        if (err && typeof err === "object" && "response" in err) {
          const axErr = err as { response?: { data?: { detail?: string } } };
          msg = axErr.response?.data?.detail || msg;
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    fetchEmployee();
  }, [employeeId]);

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full pb-12">
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
          <span className="text-slate-800 font-semibold">
            {employee ? `Edit ${employee.full_name || employee.first_name}` : "Edit Employee"}
          </span>
        </nav>

        {/* Page Title Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <UserCheck className="w-7 h-7 text-indigo-600" />
              Edit Employee Profile
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Update employment terms, contact information, and role assignments.
            </p>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
            <div className="flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm font-semibold text-slate-800">Loading employee record...</p>
              <p className="text-xs text-slate-400">Fetching data from FastAPI backend</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-center gap-3">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-semibold">Unable to load employee</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        ) : (
          <EmployeeForm initialData={employee} isEdit={true} />
        )}
      </div>
    </DashboardLayout>
  );
}
