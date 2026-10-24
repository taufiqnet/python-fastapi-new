"use client";

import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/context/auth-context";
import {
  FileText,
  UserX,
  ShieldCheck,
  Laptop,
  MessageSquare,
  Calculator,
  Award,
} from "lucide-react";
import { ResignationTab } from "@/components/hr-payroll/separation/resignations/resignation-tab";
import { SeparationTab } from "@/components/hr-payroll/separation/separations/separation-tab";
import { DepartmentClearanceTab } from "@/components/hr-payroll/separation/clearance/department-clearance-tab";
import { AssetHandoverTab } from "@/components/hr-payroll/separation/assets/asset-handover-tab";
import { ExitInterviewTab } from "@/components/hr-payroll/separation/exit-interviews/exit-interview-tab";
import { FinalSettlementTab } from "@/components/hr-payroll/separation/settlement/final-settlement-tab";
import { ReleaseLetterTab } from "@/components/hr-payroll/separation/release-letters/release-letter-tab";

export default function SeparationOffboardingPage() {
  const { user } = useAuth();
  const currentBusinessId = user?.business_id || 1;

  const [activeTab, setActiveTab] = useState<
    "resignations" | "separations" | "clearances" | "assets" | "exit_interviews" | "settlement" | "release_letters"
  >("resignations");

  const [targetSeparationId, setTargetSeparationId] = useState<string | null>(null);

  const handleNavigateTab = (tab: string, separationId?: string) => {
    if (separationId) setTargetSeparationId(separationId);
    setActiveTab(tab as any);
  };

  const tabs = [
    { id: "resignations", label: "Resignations", icon: FileText },
    { id: "separations", label: "Separations Master", icon: UserX },
    { id: "clearances", label: "Department NOC", icon: ShieldCheck },
    { id: "assets", label: "Asset Handover", icon: Laptop },
    { id: "exit_interviews", label: "Exit Interviews", icon: MessageSquare },
    { id: "settlement", label: "Final Settlement (FnF)", icon: Calculator },
    { id: "release_letters", label: "Release Letters", icon: Award },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Separation & Offboarding
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            End-to-end offboarding governance, notice calculation, 5-tier department clearances, asset recovery, and BLA 2006 statutory full & final settlements.
          </p>
        </div>

        {/* Tab Bar */}
        <div className="border-b flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setTargetSeparationId(null);
                  setActiveTab(tab.id as any);
                }}
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
          {activeTab === "resignations" && (
            <ResignationTab
              currentBusinessId={currentBusinessId}
              onRefreshSeparations={() => {}}
            />
          )}

          {activeTab === "separations" && (
            <SeparationTab
              currentBusinessId={currentBusinessId}
              onNavigateTab={handleNavigateTab}
            />
          )}

          {activeTab === "clearances" && (
            <DepartmentClearanceTab currentBusinessId={currentBusinessId} />
          )}

          {activeTab === "assets" && (
            <AssetHandoverTab currentBusinessId={currentBusinessId} />
          )}

          {activeTab === "exit_interviews" && (
            <ExitInterviewTab currentBusinessId={currentBusinessId} />
          )}

          {activeTab === "settlement" && (
            <FinalSettlementTab
              currentBusinessId={currentBusinessId}
              initialSeparationId={targetSeparationId}
            />
          )}

          {activeTab === "release_letters" && (
            <ReleaseLetterTab currentBusinessId={currentBusinessId} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
