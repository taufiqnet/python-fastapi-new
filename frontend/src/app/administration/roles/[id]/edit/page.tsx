"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import {
  Role,
  Permission,
  SystemModulesMap,
  BusinessProfile,
  RoleCreateInput,
} from "@/types";
import { PermissionsMatrix } from "@/components/administration/permissions-matrix";
import { useToast } from "@/context/toast-context";
import {
  ShieldCheck,
  ArrowLeft,
  Save,
  Loader2,
  Building2,
  AlertCircle,
} from "lucide-react";

interface RoleEditPageProps {
  params: Promise<{ id: string }>;
}

export default function RoleEditPage({ params }: RoleEditPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const resolvedParams = use(params);
  const roleId = resolvedParams.id;

  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [businessId, setBusinessId] = useState<string>("");
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [systemModules, setSystemModules] = useState<SystemModulesMap>({});
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadRoleAndMetadata() {
      setLoading(true);
      try {
        const [roleRes, permsRes, modsRes, bizRes] = await Promise.allSettled([
          apiClient.get<Role>(`/roles/api/${roleId}`),
          apiClient.get<Permission[]>("/permissions/api"),
          apiClient.get<SystemModulesMap>("/permissions/system-modules/api"),
          apiClient.get<BusinessProfile[]>("/business/"),
        ]);

        if (roleRes.status === "fulfilled" && roleRes.value.data) {
          const r = roleRes.value.data;
          setRole(r);
          setName(r.name || "");
          setDescription(r.description || "");
          setBusinessId(r.business_id ? String(r.business_id) : "");
          setSelectedPermissionIds(
            r.permissions ? r.permissions.map((p) => p.id) : []
          );
        } else {
          setNotFound(true);
          return;
        }

        if (permsRes.status === "fulfilled") {
          setPermissions(permsRes.value.data || []);
        }

        if (modsRes.status === "fulfilled") {
          setSystemModules(modsRes.value.data || {});
        }

        if (bizRes.status === "fulfilled") {
          setBusinesses(bizRes.value.data || []);
        }
      } catch {
        toast.error("Error", "Failed to retrieve role details.");
      } finally {
        setLoading(false);
      }
    }

    loadRoleAndMetadata();
  }, [roleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Validation Error", "Role name is required.");
      return;
    }

    setSaving(true);
    try {
      const payload: RoleCreateInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        business_id: businessId ? Number(businessId) : null,
        permission_ids: selectedPermissionIds,
      };

      await apiClient.put(`/roles/api/${roleId}`, payload);
      toast.success("Role Updated", `Role "${name}" updated successfully.`);
      router.push("/administration/roles");
    } catch (err: unknown) {
      let msg = "Failed to update role.";
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        msg = axErr.response?.data?.detail || msg;
      }
      toast.error("Update Failed", msg);
    } finally {
      setSaving(false);
    }
  };

  if (notFound) {
    return (
      <DashboardLayout>
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Role Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            The requested role #{roleId} does not exist or has been deleted.
          </p>
          <Link
            href="/administration/roles"
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
          >
            Back to Roles
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const isCoreAdmin = role?.id === 1 || role?.name === "admin";

  return (
    <DashboardLayout>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-7xl mx-auto w-full">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/administration/roles"
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
              title="Back to roles"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Edit Role: {role?.name || "..."}
                </h1>
                {isCoreAdmin && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    System Core
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Update role details, tenancy scoping, and module permissions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/administration/roles"
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || loading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        </div>

        {/* Role Details Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Role Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Role Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={isCoreAdmin}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. HR Executive"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition disabled:bg-slate-50 disabled:text-slate-500"
              />
              {isCoreAdmin && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Core admin role name cannot be renamed
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Business Scope
              </label>
              <select
                value={businessId}
                disabled={isCoreAdmin}
                onChange={(e) => setBusinessId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition disabled:bg-slate-50"
              >
                <option value="">Global System Scope (All Tenants)</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name_en || b.legal_name} (#{b.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of duties and access level granted by this role..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
            </div>
          </div>
        </div>

        {/* Permissions Matrix */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
            <p className="text-xs font-medium text-slate-500">Loading permissions matrix...</p>
          </div>
        ) : (
          <PermissionsMatrix
            permissions={permissions}
            systemModules={systemModules}
            selectedPermissionIds={selectedPermissionIds}
            onChange={setSelectedPermissionIds}
            disabled={saving}
          />
        )}

        {/* Bottom Bar */}
        <div className="flex items-center justify-end gap-3 pt-2 pb-6">
          <Link
            href="/administration/roles"
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
