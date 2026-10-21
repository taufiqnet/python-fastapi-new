"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import {
  User,
  Role,
  Permission,
  SystemModulesMap,
  BusinessProfile,
  SubscriptionPlan,
  UserUpdateInput,
} from "@/types";
import { PermissionsMatrix } from "@/components/administration/permissions-matrix";
import { useToast } from "@/context/toast-context";
import {
  Users,
  ArrowLeft,
  Save,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Wifi,
  ChevronDown,
  Building2,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  AlertCircle,
  CreditCard,
  ExternalLink,
} from "lucide-react";

interface UserEditPageProps {
  params: Promise<{ id: string }>;
}

export default function UserEditPage({ params }: UserEditPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const resolvedParams = use(params);
  const userId = resolvedParams.id;

  const [user, setUser] = useState<User | null>(null);

  // Form states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [businessId, setBusinessId] = useState<string>("");

  const [isActive, setIsActive] = useState(true);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [canUseOfflineMode, setCanUseOfflineMode] = useState(false);

  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
  const [showDirectPermissions, setShowDirectPermissions] = useState(false);

  // Metadata
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [systemModules, setSystemModules] = useState<SystemModulesMap>({});
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadUserAndMetadata() {
      setLoading(true);
      try {
        const [userRes, rolesRes, permsRes, modsRes, bizRes, plansRes] = await Promise.allSettled([
          apiClient.get<User>(`/users/api/${userId}`),
          apiClient.get<Role[]>("/roles/api"),
          apiClient.get<Permission[]>("/permissions/api"),
          apiClient.get<SystemModulesMap>("/permissions/system-modules/api"),
          apiClient.get<BusinessProfile[]>("/business/"),
          apiClient.get<SubscriptionPlan[]>("/subscription-plans/api"),
        ]);

        if (userRes.status === "fulfilled" && userRes.value.data) {
          const u = userRes.value.data;
          setUser(u);
          setUsername(u.username || "");
          setEmail(u.email || "");
          setPhone(u.phone || "");
          setBusinessId(u.business_id ? String(u.business_id) : "");
          setIsActive(u.is_active);
          setIsSuperuser(u.is_superuser);
          setCanUseOfflineMode(!!u.can_use_offline_mode);

          const rIds = u.roles ? u.roles.map((r) => r.id) : [];
          setSelectedRoleIds(rIds);

          const pIds = u.direct_permissions
            ? u.direct_permissions.map((p) => p.id)
            : [];
          setSelectedPermissionIds(pIds);
          if (pIds.length > 0) {
            setShowDirectPermissions(true);
          }
        } else {
          setNotFound(true);
          return;
        }

        if (rolesRes.status === "fulfilled") setRoles(rolesRes.value.data || []);
        if (permsRes.status === "fulfilled") setPermissions(permsRes.value.data || []);
        if (modsRes.status === "fulfilled") setSystemModules(modsRes.value.data || {});
        if (bizRes.status === "fulfilled") setBusinesses(bizRes.value.data || []);
        if (plansRes.status === "fulfilled") setPlans(plansRes.value.data || []);
      } catch {
        toast.error("Error", "Failed to retrieve user account details.");
      } finally {
        setLoading(false);
      }
    }

    loadUserAndMetadata();
  }, [userId]);

  const handleToggleRole = (roleId: number) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim()) {
      toast.error("Validation Error", "Username and email are required.");
      return;
    }

    setSaving(true);
    try {
      const payload: UserUpdateInput = {
        username: username.trim(),
        email: email.trim(),
        password: password ? password : undefined,
        phone: phone.trim() || undefined,
        business_id: businessId ? Number(businessId) : null,
        is_active: isActive,
        is_superuser: isSuperuser,
        can_use_offline_mode: canUseOfflineMode,
        role_ids: selectedRoleIds,
        permission_ids: selectedPermissionIds,
      };

      await apiClient.put(`/users/api/${userId}`, payload);
      toast.success("User Updated", `User account "${username}" updated successfully.`);
      router.push("/administration/users");
    } catch (err: unknown) {
      let msg = "Failed to update user account.";
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
          <h2 className="text-lg font-bold text-slate-800">User Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            The requested user #{userId} does not exist or has been removed.
          </p>
          <Link
            href="/administration/users"
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
          >
            Back to Users
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const matchedBiz = businesses.find((b) => b.id === Number(businessId));
  const matchedPlan = matchedBiz?.subscription_plan_id
    ? plans.find((p) => p.id === matchedBiz.subscription_plan_id)
    : null;

  return (
    <DashboardLayout>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-7xl mx-auto w-full">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/administration/users"
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
              title="Back to users"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Edit User: {user?.username || "..."}
                </h1>
                {user?.is_superuser && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    System Superadmin
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Update account credentials, tenant scoping, role memberships, and permissions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/administration/users"
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

        {/* Tenant Subscription & Strategy Context Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
                <CreditCard className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Tenant Subscription & Strategy Context</h3>
                <p className="text-xs text-slate-500">How this user's access is governed in the system.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                Pure RBAC Active (Domestic Software)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[11px] font-medium text-slate-500">Assigned Business Tenant</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-bold text-slate-800">
                  {matchedBiz ? (matchedBiz.name_en || matchedBiz.legal_name) : "Global / Unassigned"}
                </span>
                {matchedBiz && (
                  <Link
                    href={`/administration/businesses/${matchedBiz.id}/edit`}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
                  >
                    <span>Tenant Settings</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[11px] font-medium text-slate-500">Tenant Subscription Plan</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-bold text-purple-700">
                  {matchedPlan ? `${matchedPlan.name} Plan` : (matchedBiz?.subscription_plan_id ? `Plan #${matchedBiz.subscription_plan_id}` : "No Plan Assigned")}
                </span>
                {matchedPlan && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-semibold">
                    {matchedPlan.permission_ids?.length || 0} features
                  </span>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[11px] font-medium text-slate-500">Effective Authorization Mode</p>
              <p className="text-xs font-bold text-emerald-700 mt-1">
                Role-Based Access Control (RBAC)
              </p>
            </div>
          </div>

          <div className="text-[11px] text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
            <span className="font-semibold text-slate-800">Superadmin Guidance:</span> In this domestic deployment, external subscription paywalls are bypassed. This user's actual system capabilities are governed strictly by the <strong>Roles and Custom Permissions</strong> assigned below. To adjust access for this user, simply toggle their roles.
          </div>
        </div>

        {/* Identity & Account Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-indigo-600" />
            Account Credentials & Tenancy
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. john_doe"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password{" "}
                <span className="text-slate-400 font-normal">
                  (Leave blank to keep unchanged)
                </span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password to change"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+8801700000000"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Business Profile Tenant
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={businessId}
                  onChange={(e) => setBusinessId(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                >
                  <option value="">Global / Unassigned Tenant Level</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name_en || b.legal_name} (#{b.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Account Flags */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center gap-6">
            <label className="inline-flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition"
              />
              <span className="text-xs font-semibold text-slate-800">
                Account Active
              </span>
            </label>

            <label className="inline-flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={canUseOfflineMode}
                onChange={(e) => setCanUseOfflineMode(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 transition"
              />
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                Allow Offline Mode &amp; Local Sync
              </span>
            </label>

            <label className="inline-flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isSuperuser}
                onChange={(e) => setIsSuperuser(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 transition"
              />
              <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                System Superadmin (Bypasses RBAC checks)
              </span>
            </label>
          </div>
        </div>

        {/* Role Assignment Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Assigned Roles
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select one or more roles. Roles grant predefined sets of permissions to the user.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {roles.map((r) => {
              const isChecked = selectedRoleIds.includes(r.id);
              return (
                <label
                  key={r.id}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                    isChecked
                      ? "bg-indigo-50/60 border-indigo-300 shadow-xs"
                      : "bg-slate-50/50 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleRole(r.id)}
                    className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 leading-tight">
                      {r.name}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                      {r.description || "No description provided"}
                    </p>
                    <span className="inline-block mt-1.5 text-[10px] font-mono text-indigo-600">
                      {r.permissions ? r.permissions.length : 0} permissions
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Collapsible Direct Permissions Matrix */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div
            onClick={() => setShowDirectPermissions((prev) => !prev)}
            className="flex items-center justify-between p-5 bg-slate-50 cursor-pointer hover:bg-slate-100/70 transition"
          >
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Custom Direct Permissions (Optional)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Grant fine-grained module permissions directly to this user beyond role inheritance
                {selectedPermissionIds.length > 0 && (
                  <span className="font-semibold text-indigo-600 ml-1">
                    ({selectedPermissionIds.length} custom permissions active)
                  </span>
                )}
              </p>
            </div>

            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform ${
                showDirectPermissions ? "rotate-180" : ""
              }`}
            />
          </div>

          {showDirectPermissions && (
            <div className="p-6 border-t border-slate-200">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Loading permissions matrix...</p>
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
            </div>
          )}
        </div>

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2 pb-6">
          <Link
            href="/administration/users"
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
