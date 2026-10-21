"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { BusinessProfile, BusinessProfileInput } from "@/types";
import { BusinessForm } from "@/components/administration/business/business-form";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import {
  Building2,
  RefreshCw,
  Loader2,
  AlertCircle,
  Plus,
} from "lucide-react";

export default function MyBusinessProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      // First try /business/my-profile; fallback to /business/{user.business_id} if user has business_id
      let data: BusinessProfile | null = null;
      try {
        const res = await apiClient.get<BusinessProfile>("/business/my-profile");
        data = res.data;
      } catch (err: unknown) {
        if (user?.business_id) {
          const res = await apiClient.get<BusinessProfile>(
            `/business/${user.business_id}`
          );
          data = res.data;
        } else {
          throw err;
        }
      }

      setBusiness(data);
    } catch {
      setError("No active business profile associated with your account.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user?.business_id]);

  const handleSave = async (payload: BusinessProfileInput) => {
    let updated: BusinessProfile;
    try {
      const res = await apiClient.put<BusinessProfile>(
        "/business/my-profile",
        payload
      );
      updated = res.data;
    } catch {
      if (business?.id) {
        const res = await apiClient.put<BusinessProfile>(
          `/business/${business.id}`,
          payload
        );
        updated = res.data;
      } else {
        throw new Error("Unable to identify target business profile.");
      }
    }

    setBusiness(updated);
    toast.success("Profile Updated", "Company profile saved successfully.");
    await refreshUser();
  };

  const handleUploadLogo = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    let updated: BusinessProfile;
    if (business?.id) {
      const res = await apiClient.post<BusinessProfile>(
        `/business/${business.id}/logo`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      updated = res.data;
    } else {
      const res = await apiClient.post<BusinessProfile>(
        "/business/my-profile/logo",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      updated = res.data;
    }

    setBusiness(updated);
    await refreshUser();
  };

  const handleRemoveLogo = async () => {
    let updated: BusinessProfile;
    if (business?.id) {
      const res = await apiClient.delete<BusinessProfile>(
        `/business/${business.id}/logo`
      );
      updated = res.data;
    } else {
      const res = await apiClient.delete<BusinessProfile>(
        "/business/my-profile/logo"
      );
      updated = res.data;
    }

    setBusiness(updated);
    await refreshUser();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto w-full">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                <Building2 className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Business Profile Setup
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure company branding, official registration, tax settings, address, and invoice formatting
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadProfile}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition"
              title="Refresh profile"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {user?.is_superuser && (
              <Link
                href="/administration/businesses"
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition"
              >
                All Tenant Businesses
              </Link>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
            <p className="text-xs font-medium text-slate-500">
              Loading company profile details...
            </p>
          </div>
        ) : error && !business ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-lg mx-auto">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h2 className="text-base font-bold text-slate-800">No Business Profile Found</h2>
            <p className="text-xs text-slate-500 mt-1 mb-6 leading-relaxed">
              Your account is currently not assigned to a specific business profile tenant.
            </p>

            {user?.is_superuser ? (
              <div className="flex items-center justify-center gap-3">
                <Link
                  href="/administration/businesses"
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  View All Businesses
                </Link>
                <Link
                  href="/administration/businesses/create"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Business Profile
                </Link>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">
                Please contact your platform administrator to link your account to a business profile.
              </p>
            )}
          </div>
        ) : (
          <BusinessForm
            initialData={business}
            onSave={handleSave}
            onUploadLogo={handleUploadLogo}
            onRemoveLogo={handleRemoveLogo}
            isSuperadmin={!!user?.is_superuser}
            isEdit={true}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
