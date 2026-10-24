"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import {
  Role,
  Permission,
  SystemModulesMap,
  BusinessProfile,
  SubscriptionPlan,
  UserCreateInput,
  UnlinkedEmployee,
  User,
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
  UserCheck,
  UserX,
  CheckCircle2,
  CreditCard,
  Sparkles,
} from "lucide-react";

export default function CreateUserPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);

  // Account Type
  const [accountType, setAccountType] = useState<"employee" | "standalone">("employee");
  const [unlinkedEmployees, setUnlinkedEmployees] = useState<UnlinkedEmployee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  // Basic Account info
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [businessId, setBusinessId] = useState<string>("");

  // Flags
  const [isActive, setIsActive] = useState(true);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [canUseOfflineMode, setCanUseOfflineMode] = useState(false);

  // Role IDs & Direct Permissions
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
  const [isFetchingEmployees, setIsFetchingEmployees] = useState(false);

  const fetchEmployeesForBusiness = async (bId: string) => {
    if (!bId) {
      setUnlinkedEmployees([]);
      setSelectedEmployeeId("");
      return;
    }
    setIsFetchingEmployees(true);
    try {
      const res = await apiClient.get<UnlinkedEmployee[]>("/employees/unlinked", {
        params: { business_id: Number(bId) },
      });
      setUnlinkedEmployees(res.data || []);
      setSelectedEmployeeId("");
    } catch {
      toast.error("Lookup Error", `Failed to load employees for Tenant #${bId}.`);
    } finally {
      setIsFetchingEmployees(false);
    }
  };

  const handleBusinessChange = (newBId: string) => {
    setBusinessId(newBId);
    setSelectedEmployeeId("");
    setUsername("");
    setEmail("");
    setPhone("");
    fetchEmployeesForBusiness(newBId);
  };

  useEffect(() => {
    async function loadMetadata() {
      setLoading(true);
      try {
        let initBizId = "";
        if (typeof window !== "undefined") {
          const raw = localStorage.getItem("current_user");
          if (raw) {
            try {
              const u = JSON.parse(raw);
              setLoggedInUser(u);
              if (u.business_id) {
                initBizId = String(u.business_id);
                setBusinessId(initBizId);
              }
            } catch {}
          }
        }

        const [rolesRes, permsRes, modsRes, bizRes, plansRes, unlinkedRes] = await Promise.allSettled([
          apiClient.get<Role[]>("/roles/api"),
          apiClient.get<Permission[]>("/permissions/api"),
          apiClient.get<SystemModulesMap>("/permissions/system-modules/api"),
          apiClient.get<BusinessProfile[]>("/business/"),
          apiClient.get<SubscriptionPlan[]>("/subscription-plans/api"),
          apiClient.get<UnlinkedEmployee[]>("/employees/unlinked", {
            params: initBizId ? { business_id: Number(initBizId) } : undefined,
          }),
        ]);

        if (rolesRes.status === "fulfilled") setRoles(rolesRes.value.data || []);
        if (permsRes.status === "fulfilled") setPermissions(permsRes.value.data || []);
        if (modsRes.status === "fulfilled") setSystemModules(modsRes.value.data || {});
        if (bizRes.status === "fulfilled") {
          const loadedBusinesses = bizRes.value.data || [];
          setBusinesses(loadedBusinesses);
          // If no initial business was set from user and businesses exist, set first one
          if (!initBizId && loadedBusinesses.length > 0) {
            const firstBizId = String(loadedBusinesses[0].id);
            setBusinessId(firstBizId);
            fetchEmployeesForBusiness(firstBizId);
          }
        }
        if (plansRes.status === "fulfilled") setPlans(plansRes.value.data || []);
        if (unlinkedRes.status === "fulfilled") setUnlinkedEmployees(unlinkedRes.value.data || []);
      } catch {
        toast.error("Initialization Failed", "Could not load user configuration data.");
      } finally {
        setLoading(false);
      }
    }

    loadMetadata();
  }, []);

  const handleToggleRole = (roleId: number) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmployeeId(empId);
    const emp = unlinkedEmployees.find((e) => e.id === empId);
    if (emp) {
      const rawUser = emp.work_email || emp.employee_id;
      const suggestedUsername = (rawUser.includes("@") ? rawUser.split("@")[0] : rawUser).toLowerCase();
      setUsername(suggestedUsername);
      setEmail(emp.work_email || emp.personal_email || `${suggestedUsername}@wbsoft.local`);
      setPhone(emp.phone || "");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password) {
      toast.error("Validation Error", "Username, email, and password are required.");
      return;
    }

    setSaving(true);
    try {
      const payload: UserCreateInput = {
        username: username.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        business_id: businessId ? Number(businessId) : null,
        employee_id: accountType === "employee" && selectedEmployeeId ? selectedEmployeeId : undefined,
        is_active: isActive,
        is_superuser: isSuperuser,
        can_use_offline_mode: canUseOfflineMode,
        role_ids: selectedRoleIds,
        permission_ids: selectedPermissionIds,
      };

      await apiClient.post("/users/api", payload);
      toast.success("User Created", `User account "${username}" has been created.`);
      router.push("/administration/users");
    } catch (err: unknown) {
      let msg = "Failed to create user account.";
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        msg = axErr.response?.data?.detail || msg;
      }
      toast.error("Creation Failed", msg);
    } finally {
      setSaving(false);
    }
  };

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
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Create User Account
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure account credentials, tenancy association, role assignments, and custom privileges
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
              Save User Account
            </button>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────────────── */}
        {/* 1. Account Credentials & Tenancy Section                              */}
        {/* ───────────────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                <Building2 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>1. Account Credentials &amp; Tenancy Section</span>
                  <span className="text-rose-500 font-bold">*</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Select business profile to scope tenancy, then set up primary account credentials and flags.
                </p>
              </div>
            </div>

            {matchedBiz && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Tenant #{businessId} Selected
              </span>
            )}
          </div>

          {/* Tenancy Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Business Profile / Tenant Organization <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                required
                value={businessId}
                onChange={(e) => handleBusinessChange(e.target.value)}
                disabled={!loggedInUser?.is_superuser && !!loggedInUser?.business_id}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="">-- Choose Business Organization (Tenant ID) --</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name_en || b.legal_name} (Business ID: #{b.id})
                  </option>
                ))}
              </select>
            </div>
            {matchedBiz && (
              <div className="mt-2.5 flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-900">{matchedBiz.name_en || matchedBiz.legal_name}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 font-mono">Business ID: #{matchedBiz.id}</span>
                </div>
                <span className="text-[11px] font-semibold text-indigo-700">
                  Subscription Plan: {matchedPlan?.name || "Active Tier"}
                </span>
              </div>
            )}
          </div>

          {/* Account Credentials Grid */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>Login Credentials</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Set initial password"
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
            </div>
          </div>

          {/* Account Flags */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-6">
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
                  System Superadmin (Global access across all tenants)
                </span>
              </label>
            )}
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────────────── */}
        {/* 2. Account Type & Employee Association Section                         */}
        {/* ───────────────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                <UserCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>2. Account Type &amp; Employee Association Section</span>
                  {matchedBiz && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                      Populated under {matchedBiz.name_en || `Business #${businessId}`}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  After selecting the Business ID, employees of the existing business are populated here to link with this user account.
                </p>
              </div>
            </div>

            <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setAccountType("employee")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  accountType === "employee"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Employee Account (ESS)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountType("standalone");
                  setSelectedEmployeeId("");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  accountType === "standalone"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Standalone Account
              </button>
            </div>
          </div>

          {accountType === "employee" ? (
            <div className="space-y-3">
              {!businessId ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                  <UserX className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Please select a <strong>Business ID</strong> in Section 1 above. The employees will populate automatically.</span>
                </div>
              ) : isFetchingEmployees ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                  <span>Loading employees under Business #{businessId} ({matchedBiz?.name_en || "Tenant"})...</span>
                </div>
              ) : (
                <>
                  <label className="block text-xs font-semibold text-slate-700">
                    Select Employee under {matchedBiz?.name_en || `Business #${businessId}`}:
                  </label>
                  <div className="relative">
                    <SearchableEmployeeCombobox
                      employees={unlinkedEmployees}
                      value={selectedEmployeeId}
                      onChange={(empId) => handleSelectEmployee(empId)}
                      placeholder={`-- Choose an employee (${unlinkedEmployees.length} available) --`}
                      allowClear={true}
                      emptyUnassignedLabel="-- No Employee Selected --"
                    />
                  </div>

                  {/* Selected Employee Preview Box */}
                  {selectedEmployeeId && (
                    (() => {
                      const empPreview = unlinkedEmployees.find((e) => e.id === selectedEmployeeId);
                      if (!empPreview) return null;
                      return (
                        <div className="p-4 rounded-xl bg-slate-50 border border-indigo-200/80 shadow-2xs flex items-center justify-between gap-3 animate-in fade-in">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                              {empPreview.first_name?.[0]}{empPreview.last_name?.[0] || ""}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                <span>{empPreview.full_name}</span>
                                <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold">
                                  {empPreview.employee_id}
                                </span>
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {empPreview.job_title_name || "Staff"} • {empPreview.department_name || "General"} • {empPreview.work_email || empPreview.personal_email || "No email"}
                              </p>
                              <p className="text-[10px] text-indigo-600 font-medium mt-0.5">
                                Organization: {matchedBiz?.name_en || `Business #${businessId}`}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            Will Link to User Account
                          </span>
                        </div>
                      );
                    })()
                  )}

                  <p className="text-[11px] text-slate-500">
                    Selecting an employee populates their username, official email, and links their employee profile to this account.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
              Standalone user accounts are not linked to employee profiles (ideal for external auditors, system operators, or partner users).
            </div>
          )}
        </div>

        {/* ───────────────────────────────────────────────────────────────────── */}
        {/* 3. Assign Roles & Permissions Section                                  */}
        {/* ───────────────────────────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Role Assignment Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>3. Assign Roles &amp; Permissions</span>
              </h3>
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
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Custom Direct Permissions (Optional)
                </h4>
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
              Save User Account
            </button>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}
