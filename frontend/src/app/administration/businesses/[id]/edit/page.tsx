"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { BusinessProfile, BusinessProfileInput } from "@/types";
import { BusinessForm } from "@/components/administration/business/business-form";
import { useToast } from "@/context/toast-context";
import { Building2, ArrowLeft, Loader2, AlertCircle } from "lucide-react";

interface BusinessEditPageProps {
  params: Promise<{ id: string }>;
}

export default function BusinessEditPage({ params }: BusinessEditPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const resolvedParams = use(params);
  const businessId = resolvedParams.id;

  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [plans, setPlans] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [bizRes, plansRes] = await Promise.allSettled([
          apiClient.get<BusinessProfile>(`/business/${businessId}`),
          apiClient.get<Array<{ id: number; name: string }>>("/subscription-plans/api"),
        ]);

        if (bizRes.status === "fulfilled" && bizRes.value.data) {
          setBusiness(bizRes.value.data);
        } else {
          setNotFound(true);
          return;
        }

        if (plansRes.status === "fulfilled" && plansRes.value.data) {
          setPlans(plansRes.value.data);
        } else {
          setPlans([
            { id: 1, name: "Free" },
            { id: 2, name: "Basic" },
            { id: 3, name: "Standard" },
            { id: 4, name: "Premium" },
          ]);
        }
      } catch {
        toast.error("Error", "Failed to retrieve business profile details.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [businessId]);

  const handleSave = async (payload: BusinessProfileInput) => {
    const res = await apiClient.put<BusinessProfile>(
      `/business/${businessId}`,
      payload
    );
    setBusiness(res.data);
    toast.success("Profile Updated", `Business "${res.data.name_en}" saved successfully.`);
  };

  const handleUploadLogo = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await apiClient.post<BusinessProfile>(
      `/business/${businessId}/logo`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    setBusiness(res.data);
  };

  const handleRemoveLogo = async () => {
    const res = await apiClient.delete<BusinessProfile>(
      `/business/${businessId}/logo`
    );
    setBusiness(res.data);
  };

  if (notFound) {
    return (
      <DashboardLayout>
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Business Profile Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            The requested business profile #{businessId} does not exist or has been deleted.
          </p>
          <Link
            href="/administration/businesses"
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
          >
            Back to Businesses
          </Link>
        </div>
      </DashboardLayout>
    );
  }

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
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Edit Business: {business?.name_en || "..."}
                </h1>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Tenant #{businessId}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Update tenant configuration, compliance numbers, tax rates, address, and logo
              </p>
            </div>
          </div>

          <Link
            href="/administration/businesses"
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
          >
            Back to Directory
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
            <p className="text-xs font-medium text-slate-500">
              Loading business profile details...
            </p>
          </div>
        ) : (
          <BusinessForm
            initialData={business}
            onSave={handleSave}
            onUploadLogo={handleUploadLogo}
            onRemoveLogo={handleRemoveLogo}
            isSuperadmin={true}
            plans={plans}
            isEdit={true}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
