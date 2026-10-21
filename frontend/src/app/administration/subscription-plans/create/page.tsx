"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { Permission, SystemModulesMap, SubscriptionPlanCreateInput } from "@/types";
import { PermissionsMatrix } from "@/components/administration/permissions-matrix";
import { useToast } from "@/context/toast-context";
import {
  CreditCard,
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

export default function CreateSubscriptionPlanPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [systemModules, setSystemModules] = useState<SystemModulesMap>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadFormMetadata() {
      setLoading(true);
      try {
        const [permsRes, modsRes] = await Promise.allSettled([
          apiClient.get<Permission[]>("/permissions/api"),
          apiClient.get<SystemModulesMap>("/permissions/system-modules/api"),
        ]);

        if (permsRes.status === "fulfilled") {
          setPermissions(permsRes.value.data || []);
        }

        if (modsRes.status === "fulfilled") {
          setSystemModules(modsRes.value.data || {});
        }
      } catch {
        toast.error("Initialization Failed", "Could not load permissions list and module taxonomy.");
      } finally {
        setLoading(false);
      }
    }

    loadFormMetadata();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Validation Error", "Plan name is required.");
      return;
    }

    setSaving(true);
    try {
      const payload: SubscriptionPlanCreateInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        is_active: isActive,
        permission_ids: selectedPermissionIds,
      };

      await apiClient.post("/subscription-plans/api", payload);
      toast.success("Plan Created", `Plan "${name}" was created successfully.`);
      router.push("/administration/subscription-plans");
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to create subscription plan.";
      toast.error("Creation Failed", errorMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/administration/subscription-plans"
              className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <CreditCard className="w-4 h-4" />
                </span>
                <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Create Subscription Plan
                </h1>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Define plan tier package and assign accessible module permissions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/administration/subscription-plans"
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors shadow-indigo-500/20 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Plan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Plan Details Card */}
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700/60">
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Plan Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Plan Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Standard, Pro, Enterprise Edition"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 text-gray-900 dark:text-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Plan Status
              </label>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700"
                  }`}
                >
                  {isActive ? (
                    <>
                      <ToggleRight className="w-4 h-4 text-emerald-600" />
                      <span>Active Plan (Available for Assignment)</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4 text-gray-400" />
                      <span>Inactive Plan (Archived)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                rows={2}
                placeholder="Summary of modules and capabilities included in this tier package..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 text-gray-900 dark:text-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Permissions Matrix */}
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700/60">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Plan Feature & Permission Matrix
              </h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50">
              {selectedPermissionIds.length} Permissions Selected
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs">Loading permissions matrix...</span>
            </div>
          ) : (
            <PermissionsMatrix
              permissions={permissions}
              systemModules={systemModules}
              selectedPermissionIds={selectedPermissionIds}
              onChange={setSelectedPermissionIds}
            />
          )}
        </div>
      </form>
    </DashboardLayout>
  );
}
