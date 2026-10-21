"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { BusinessProfile, BusinessProfileInput } from "@/types";
import { BusinessForm } from "@/components/administration/business/business-form";
import { useToast } from "@/context/toast-context";
import { Building2, ArrowLeft } from "lucide-react";

export default function CreateBusinessPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [plans, setPlans] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await apiClient.get<Array<{ id: number; name: string }>>(
          "/subscription-plans/api"
        );
        setPlans(res.data || []);
      } catch {
        // Fallback plans if not accessible
        setPlans([
          { id: 1, name: "Free" },
          { id: 2, name: "Basic" },
          { id: 3, name: "Standard" },
          { id: 4, name: "Premium" },
        ]);
      }
    }
    loadPlans();
  }, []);

  const handleSave = async (payload: BusinessProfileInput) => {
    const res = await apiClient.post<BusinessProfile>("/business/", payload);
    toast.success(
      "Business Created",
      `Business profile "${res.data.name_en}" has been created.`
    );
    router.push(`/administration/businesses/${res.data.id}/edit`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto w-full">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/administration/businesses"
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
              title="Back to businesses"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Create Business Profile
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Onboard a new tenant business onto the SaaS enterprise platform
              </p>
            </div>
          </div>

          <Link
            href="/administration/businesses"
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
          >
            Cancel
          </Link>
        </div>

        {/* Multi-Tab Form */}
        <BusinessForm
          onSave={handleSave}
          isSuperadmin={true}
          plans={plans}
          isEdit={false}
        />
      </div>
    </DashboardLayout>
  );
}
