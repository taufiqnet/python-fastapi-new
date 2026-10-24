"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";
import { EmployeeOut } from "@/types";
import {
  FolderLock,
  CreditCard,
  FileSignature,
  Bell,
  FileStack,
  FileCode,
  FolderTree,
  ShieldCheck,
} from "lucide-react";

import { DossierTab } from "@/components/hr-payroll/documents/dossier/dossier-tab";
import { IdentityTab } from "@/components/hr-payroll/documents/identity/identity-tab";
import { AgreementsTab } from "@/components/hr-payroll/documents/agreements/agreements-tab";
import { ExpiryAlertsTab } from "@/components/hr-payroll/documents/expiry/expiry-alerts-tab";
import { BulkLettersTab } from "@/components/hr-payroll/documents/bulk-letters/bulk-letters-tab";
import { TemplatesTab } from "@/components/hr-payroll/documents/templates/templates-tab";
import { CategoriesTab } from "@/components/hr-payroll/documents/categories/categories-tab";

export default function DocumentManagementPage() {
  const { user } = useAuth();
  const currentBusinessId = user?.business_id || 1;

  const [activeTab, setActiveTab] = useState<
    "dossier" | "identity" | "agreements" | "expiry" | "bulk_letters" | "templates" | "categories"
  >("dossier");

  const [employees, setEmployees] = useState<EmployeeOut[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(true);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await apiClient.get<EmployeeOut[]>(
        `/employees?business_id=${currentBusinessId}&limit=500`
      );
      setEmployees(res.data || []);
    } catch (err: any) {
      console.error("Failed to load employees for document management:", err);
    } finally {
      setLoadingEmployees(false);
    }
  }, [currentBusinessId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const tabs = [
    { id: "dossier", label: "Digital Dossier (201 File)", icon: FolderLock },
    { id: "identity", label: "ID, Passports & Permits", icon: CreditCard },
    { id: "agreements", label: "Contracts & NDAs", icon: FileSignature },
    { id: "expiry", label: "Expiry & Renewal Engine", icon: Bell },
    { id: "bulk_letters", label: "Bulk Letter Generator", icon: FileStack },
    { id: "templates", label: "Document Templates", icon: FileCode },
    { id: "categories", label: "Document Categories", icon: FolderTree },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              Employee Document Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Enterprise digital personal files (e-Dossier), Smart NID / TIN & BIDA work permit tracking, contract lifecycle, bulk letter automation, and ICT Act 2006 compliant e-signatures.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active Tab Content */}
        <div className="pt-2">
          {activeTab === "dossier" && (
            <DossierTab
              currentBusinessId={currentBusinessId}
              employees={employees}
            />
          )}

          {activeTab === "identity" && (
            <IdentityTab
              currentBusinessId={currentBusinessId}
              employees={employees}
            />
          )}

          {activeTab === "agreements" && (
            <AgreementsTab
              currentBusinessId={currentBusinessId}
              employees={employees}
            />
          )}

          {activeTab === "expiry" && (
            <ExpiryAlertsTab
              currentBusinessId={currentBusinessId}
              employees={employees}
            />
          )}

          {activeTab === "bulk_letters" && (
            <BulkLettersTab
              currentBusinessId={currentBusinessId}
              employees={employees}
            />
          )}

          {activeTab === "templates" && (
            <TemplatesTab
              currentBusinessId={currentBusinessId}
              employees={employees}
            />
          )}

          {activeTab === "categories" && (
            <CategoriesTab
              currentBusinessId={currentBusinessId}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
