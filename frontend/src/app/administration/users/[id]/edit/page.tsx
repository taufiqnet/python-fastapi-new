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
  LinkedEmployeeSummary,
  UnlinkedEmployee,
} from "@/types";
import { SearchableEmployeeCombobox } from "@/components/common/searchable-employee-combobox";
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
  RotateCcw,
  Sparkles,
  UserCheck,
  UserX,
  CheckCircle2,
  BadgeCheck,
  Link2,
  Unlink,
  RefreshCw,
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
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);

  // Form states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [businessId, setBusinessId] = useState<string>("");

  const [isActive, setIsActive] = useState(true);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [canUseOfflineMode, setCanUseOfflineMode] = useState(false);

  // Employee association states
  const [linkedEmployee, setLinkedEmployee] = useState<LinkedEmployeeSummary | null>(null);
  const [unlinkedEmployees, setUnlinkedEmployees] = useState<UnlinkedEmployee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [isLinkingDirectly, setIsLinkingDirectly] = useState(false);
  const [isSwitchingEmployee, setIsSwitchingEmployee] = useState(false);

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
        if (typeof window !== "undefined") {
          const rawUser = localStorage.getItem("current_user");
          if (rawUser) {
            try {
              setLoggedInUser(JSON.parse(rawUser));
            } catch {}
          }
        }

        const [userRes, rolesRes, permsRes, modsRes, bizRes, plansRes, unlinkedRes] = await Promise.allSettled([
          apiClient.get<User>(`/users/api/${userId}`),
          apiClient.get<Role[]>("/roles/api"),
          apiClient.get<Permission[]>("/permissions/api"),
          apiClient.get<SystemModulesMap>("/permissions/system-modules/api"),
          apiClient.get<BusinessProfile[]>("/business/"),
          apiClient.get<SubscriptionPlan[]>("/subscription-plans/api"),
          apiClient.get<UnlinkedEmployee[]>("/employees/unlinked"),
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

          if (u.employee) {
            setLinkedEmployee(u.employee);
            setSelectedEmployeeId(String(u.employee.id));
          }

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
        if (unlinkedRes.status === "fulfilled") setUnlinkedEmployees(unlinkedRes.value.data || []);
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

  const handleLinkEmployeeDirectly = async (empIdToLink: string | null) => {
    setIsLinkingDirectly(true);
    try {
      const res = await apiClient.post<User>(`/users/api/${userId}/link-employee`, {
        employee_id: empIdToLink,
      });
      if (res.data) {
        setUser(res.data);
        if (res.data.employee) {
          setLinkedEmployee(res.data.employee);
          setSelectedEmployeeId(String(res.data.employee.id));
          setIsSwitchingEmployee(false);
          toast.success(
            "Employee Linked Successfully",
            `User "${res.data.username}" is now linked to ${res.data.employee.employee_id} - ${res.data.employee.first_name} ${res.data.employee.last_name || ""}.`
          );
        } else {
          setLinkedEmployee(null);
          setSelectedEmployeeId("");
          setIsSwitchingEmployee(false);
          toast.success(
            "Employee Unlinked",
            `Unlinked employee association from User "${res.data.username}".`
          );
        }
        // Refetch unlinked employees list
        const unlinkedRes = await apiClient.get<UnlinkedEmployee[]>("/employees/unlinked");
        if (unlinkedRes.data) {
          setUnlinkedEmployees(unlinkedRes.data);
        }
      }
    } catch (err: unknown) {
      let msg = "Failed to update employee association.";
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        msg = axErr.response?.data?.detail || msg;
      }
      toast.error("Action Failed", msg);
    } finally {
      setIsLinkingDirectly(false);
    }
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
        employee_id: selectedEmployeeId ? selectedEmployeeId : undefined,
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

            {loggedInUser?.is_superuser ? (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Business Profile Tenant (Platform Superadmin)
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
            ) : (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tenant Organization
                </label>
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">
                    {matchedBiz ? (matchedBiz.name_en || matchedBiz.legal_name) : "Current Tenant Organization"}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold ml-auto">
                    Tenant #{businessId || matchedBiz?.id || "1"}
                  </span>
                </div>
              </div>
            )}
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

            {loggedInUser?.is_superuser && (
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
            )}
          </div>
        </div>

        {/* Associated Employee Record Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className={`p-2.5 rounded-xl border ${linkedEmployee && !isSwitchingEmployee ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>
                {linkedEmployee && !isSwitchingEmployee ? <UserCheck className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>{linkedEmployee && !isSwitchingEmployee ? "Associated Employee Record" : "Link to Employee Record"}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                    WBSOFT Technologies Ltd.
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  {linkedEmployee && !isSwitchingEmployee
                    ? `User #${userId} (${username}) is bound to an active employee profile in WBSOFT HR directory.`
                    : `Associate User #${userId} (${username}) with an Employee ID and Full Name under tenant business_id = 1.`}
                </p>
              </div>
            </div>

            <div>
              {linkedEmployee && !isSwitchingEmployee ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Employee Linked ({linkedEmployee.employee_id})
                </span>
              ) : isSwitchingEmployee ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                  Switching Association
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <UserX className="w-3.5 h-3.5 text-amber-600" />
                  Unlinked / Standalone
                </span>
              )}
            </div>
          </div>

          {linkedEmployee && !isSwitchingEmployee ? (
            <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-indigo-50/30 rounded-xl border border-slate-200 gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                  {linkedEmployee.first_name?.[0]}{linkedEmployee.last_name?.[0] || ""}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                    <span className="text-base text-slate-900">{linkedEmployee.first_name} {linkedEmployee.last_name || ""}</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200">
                      ID: {linkedEmployee.employee_id}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Active Staff
                    </span>
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-600 mt-1 flex-wrap">
                    <span className="font-medium text-slate-800">{linkedEmployee.designation_title || "Staff Member"}</span>
                    <span>•</span>
                    <span>{linkedEmployee.department_name || "General Department"}</span>
                    <span>•</span>
                    <span className="text-slate-500 font-mono text-[11px]">{linkedEmployee.work_email || linkedEmployee.email || "No email"}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-indigo-600 font-medium">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Organization: WBSOFT Technologies Ltd. (Tenant #1)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200">
                <Link
                  href={`/hr-payroll/employees/${linkedEmployee.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  View HR Profile
                </Link>
                <button
                  type="button"
                  onClick={() => setIsSwitchingEmployee(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  Switch Employee
                </button>
                <button
                  type="button"
                  disabled={isLinkingDirectly}
                  onClick={() => handleLinkEmployeeDirectly(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition disabled:opacity-50"
                >
                  {isLinkingDirectly ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                  Unlink
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Employee by Employee ID &amp; Full Name (WBSOFT):
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Choose an unlinked employee from WBSOFT Technologies Ltd. (business_id = 1) to link with User #{userId}.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <SearchableEmployeeCombobox
                      employees={unlinkedEmployees}
                      value={selectedEmployeeId === "unlink" ? "" : selectedEmployeeId}
                      onChange={(id) => setSelectedEmployeeId(id)}
                      placeholder="-- Choose an Unlinked Employee to Link --"
                      allowClear={true}
                      emptyUnassignedLabel="-- No Employee Selected --"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={!selectedEmployeeId || selectedEmployeeId === "unlink" || isLinkingDirectly}
                    onClick={() => handleLinkEmployeeDirectly(selectedEmployeeId)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 shrink-0"
                  >
                    {isLinkingDirectly ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5" />
                    )}
                    <span>Link Employee to User</span>
                  </button>

                  {isSwitchingEmployee && (
                    <button
                      type="button"
                      onClick={() => setIsSwitchingEmployee(false)}
                      className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition shrink-0"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Selected Employee Preview Box */}
              {selectedEmployeeId && selectedEmployeeId !== "unlink" && (
                (() => {
                  const empPreview = unlinkedEmployees.find((e) => e.id === selectedEmployeeId);
                  if (!empPreview) return null;
                  return (
                    <div className="p-3.5 rounded-xl bg-white border border-indigo-200/80 shadow-2xs flex items-center justify-between gap-3 animate-in fade-in">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {empPreview.first_name?.[0]}{empPreview.last_name?.[0] || ""}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {empPreview.full_name}
                            <span className="ml-2 font-mono text-[11px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold">
                              {empPreview.employee_id}
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {empPreview.job_title_name || "Staff"} • {empPreview.department_name || "General"} • {empPreview.work_email || empPreview.personal_email || "No email"}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        Ready to Link
                      </span>
                    </div>
                  );
                })()
              )}

              <p className="text-[11px] text-slate-500">
                Linking an employee binds their attendance clocking, leave requests, payslips, and asset allocations to this user account in WBSOFT.
              </p>
            </div>
          )}
        </div>

        {/* Role Assignment Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Assigned Roles &amp; Subscription Tiers
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select one or more roles. Roles grant predefined sets of permissions corresponding to module subscription tiers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {roles.map((r) => {
              const isChecked = selectedRoleIds.includes(r.id);
              let tierBadge = null;
              let roleTitle = r.name;

              if (r.name === "hr_basic") {
                roleTitle = "HR Basic Tier";
                tierBadge = (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                    Starter Tier
                  </span>
                );
              } else if (r.name === "hr_pro") {
                roleTitle = "HR Pro Tier";
                tierBadge = (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                    Pro Tier
                  </span>
                );
              } else if (r.name === "hr_enterprise") {
                roleTitle = "HR Enterprise Tier";
                tierBadge = (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    Enterprise Tier
                  </span>
                );
              } else if (r.name === "admin") {
                roleTitle = "System Administrator";
                tierBadge = (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    Superadmin
                  </span>
                );
              } else if (r.name === "ecommerce") {
                roleTitle = "Ecommerce & POS";
                tierBadge = (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    Commerce Tier
                  </span>
                );
              }

              return (
                <label
                  key={r.id}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                    isChecked
                      ? "bg-indigo-50/60 border-indigo-300 shadow-xs ring-1 ring-indigo-400/20"
                      : "bg-slate-50/50 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleRole(r.id)}
                    className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        {roleTitle}
                      </p>
                      {tierBadge}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                      {r.description || "No description provided"}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-mono text-indigo-600 font-semibold bg-indigo-50/80 px-1.5 py-0.5 rounded">
                        {r.permissions ? r.permissions.length : 0} permissions
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        ({r.name})
                      </span>
                    </div>
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
                {selectedPermissionIds.length > 0 ? (
                  <span className="font-semibold text-rose-600 ml-1">
                    ({selectedPermissionIds.length} custom permissions active)
                  </span>
                ) : (
                  <span className="font-semibold text-emerald-600 ml-1">
                    (Pure Role-Inherited — 0 direct overrides)
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {selectedPermissionIds.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPermissionIds([]);
                    toast.info(
                      "Direct Permissions Cleared",
                      "All direct permissions cleared. Click 'Save User Account' to commit."
                    );
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition shadow-xs"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear All Direct ({selectedPermissionIds.length})
                </button>
              )}
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform ${
                  showDirectPermissions ? "rotate-180" : ""
                }`}
              />
            </div>
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
