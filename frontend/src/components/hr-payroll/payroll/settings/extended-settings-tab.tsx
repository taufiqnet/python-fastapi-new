"use client";

import React, { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import {
  Building2,
  Receipt,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Landmark,
  Coins,
  Percent,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import {
  CompanyBankAccountOut,
  CompanyBankAccountCreatePayload,
  TaxSlabOut,
  TaxSlabCreatePayload,
  StatutoryComplianceSettingOut,
  StatutoryComplianceSettingUpdatePayload,
} from "@/types";

interface ExtendedSettingsTabProps {
  currentBusinessId: number;
}

export function ExtendedSettingsTab({ currentBusinessId }: ExtendedSettingsTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Sub-section tab: "bank_accounts" | "tax_slabs" | "statutory"
  const [section, setSection] = useState<"bank_accounts" | "tax_slabs" | "statutory">("bank_accounts");

  // Bank Accounts State
  const [bankAccounts, setBankAccounts] = useState<CompanyBankAccountOut[]>([]);
  const [isBankModalOpen, setIsBankModalOpen] = useState<boolean>(false);
  const [editingBankAccount, setEditingBankAccount] = useState<CompanyBankAccountOut | null>(null);
  const [bankForm, setBankForm] = useState<CompanyBankAccountCreatePayload>({
    business_id: currentBusinessId,
    bank_name: "",
    branch_name: "",
    account_title: "",
    account_number: "",
    routing_number: "",
    is_default: false,
    is_active: true,
  });

  // Tax Slabs State (ITA 2023)
  const [taxSlabs, setTaxSlabs] = useState<TaxSlabOut[]>([]);
  const [genderFilter, setGenderFilter] = useState<"general_male" | "female_senior" | "disabled_freedom_fighter">("general_male");
  const [isTaxModalOpen, setIsTaxModalOpen] = useState<boolean>(false);
  const [editingTaxSlab, setEditingTaxSlab] = useState<TaxSlabOut | null>(null);
  const [taxForm, setTaxForm] = useState<TaxSlabCreatePayload>({
    business_id: currentBusinessId,
    fiscal_year: "2024-2025",
    gender_category: "general_male",
    slab_order: 1,
    min_income: 0,
    max_income: 350000,
    tax_rate_percent: 0,
  });

  // Statutory Compliance Settings
  const [statutorySettings, setStatutorySettings] = useState<StatutoryComplianceSettingOut | null>(null);
  const [statutoryForm, setStatutoryForm] = useState<StatutoryComplianceSettingUpdatePayload>({
    enable_provident_fund: true,
    pf_employee_percent: 8.33,
    pf_employer_percent: 8.33,
    enable_tax_auto_deduction: true,
    minimum_tax_amount: 5000,
    gratuity_qualifying_years: 5,
  });

  // Loading & Saving states
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Fetch all settings data
  const fetchData = useCallback(
    async (isBackground = false) => {
      if (isBackground) setIsFetching(true);
      else setLoading(true);

      try {
        const [banksRes, taxRes, statRes] = await Promise.all([
          apiClient.get<CompanyBankAccountOut[]>(
            `/payroll/bank-accounts?business_id=${currentBusinessId}`
          ),
          apiClient.get<TaxSlabOut[]>(
            `/payroll/tax-slabs?business_id=${currentBusinessId}`
          ),
          apiClient.get<StatutoryComplianceSettingOut>(
            `/payroll/statutory-settings?business_id=${currentBusinessId}`
          ),
        ]);

        setBankAccounts(banksRes.data || []);
        setTaxSlabs(taxRes.data || []);
        if (statRes.data) {
          setStatutorySettings(statRes.data);
          setStatutoryForm({
            enable_provident_fund: statRes.data.enable_provident_fund,
            pf_employee_percent: statRes.data.pf_employee_percent,
            pf_employer_percent: statRes.data.pf_employer_percent,
            enable_tax_auto_deduction: statRes.data.enable_tax_auto_deduction,
            minimum_tax_amount: statRes.data.minimum_tax_amount,
            gratuity_qualifying_years: statRes.data.gratuity_qualifying_years,
          });
        }
      } catch (err) {
        console.error("Failed to load extended payroll settings:", err);
      } finally {
        setLoading(false);
        setIsFetching(false);
      }
    },
    [currentBusinessId]
  );

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Save Bank Account
  const handleSaveBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.bank_name.trim() || !bankForm.account_number.trim()) {
      toast.error("Validation Error", "Bank name and account number are required.");
      return;
    }

    setSaving(true);
    try {
      if (editingBankAccount) {
        await apiClient.put(`/payroll/bank-accounts/${editingBankAccount.id}`, bankForm);
        toast.success("Account Updated", `Bank account ${bankForm.account_number} updated.`);
      } else {
        await apiClient.post("/payroll/bank-accounts", {
          ...bankForm,
          business_id: currentBusinessId,
        });
        toast.success("Account Added", `Bank account ${bankForm.account_number} created.`);
      }
      setIsBankModalOpen(false);
      setEditingBankAccount(null);
      fetchData(true);
    } catch (err: any) {
      toast.error("Save Failed", err?.response?.data?.detail || "Could not save bank account.");
    } finally {
      setSaving(false);
    }
  };

  // Save Tax Slab
  const handleSaveTaxSlab = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingTaxSlab) {
        await apiClient.put(`/payroll/tax-slabs/${editingTaxSlab.id}`, {
          ...taxForm,
          min_income: Number(taxForm.min_income),
          max_income: taxForm.max_income ? Number(taxForm.max_income) : null,
          tax_rate_percent: Number(taxForm.tax_rate_percent),
          slab_order: Number(taxForm.slab_order),
        });
        toast.success("Tax Slab Updated", "Progressive tax bracket updated.");
      } else {
        await apiClient.post("/payroll/tax-slabs", {
          ...taxForm,
          business_id: currentBusinessId,
          min_income: Number(taxForm.min_income),
          max_income: taxForm.max_income ? Number(taxForm.max_income) : null,
          tax_rate_percent: Number(taxForm.tax_rate_percent),
          slab_order: Number(taxForm.slab_order),
        });
        toast.success("Tax Slab Created", "Progressive tax bracket added.");
      }
      setIsTaxModalOpen(false);
      setEditingTaxSlab(null);
      fetchData(true);
    } catch (err: any) {
      toast.error("Save Failed", err?.response?.data?.detail || "Could not save tax slab.");
    } finally {
      setSaving(false);
    }
  };

  // Delete Tax Slab
  const handleDeleteTaxSlab = async (id: string) => {
    try {
      await apiClient.delete(`/payroll/tax-slabs/${id}`);
      toast.success("Tax Slab Removed", "Bracket deleted.");
      fetchData(true);
    } catch (err: any) {
      toast.error("Delete Failed", err?.response?.data?.detail || "Could not remove tax slab.");
    }
  };

  // Save Statutory Compliance Settings
  const handleSaveStatutorySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.put(`/payroll/statutory-settings?business_id=${currentBusinessId}`, {
        ...statutoryForm,
        pf_employee_percent: Number(statutoryForm.pf_employee_percent),
        pf_employer_percent: Number(statutoryForm.pf_employer_percent),
        minimum_tax_amount: Number(statutoryForm.minimum_tax_amount),
        gratuity_qualifying_years: Number(statutoryForm.gratuity_qualifying_years),
      });
      toast.success("Statutory Settings Saved", "Provident fund and tax parameters updated.");
      fetchData(true);
    } catch (err: any) {
      toast.error("Save Failed", err?.response?.data?.detail || "Could not update statutory settings.");
    } finally {
      setSaving(false);
    }
  };

  // Filtered Tax Slabs
  const filteredTaxSlabs = useMemo(() => {
    return taxSlabs
      .filter((s) => s.gender_category === genderFilter)
      .sort((a, b) => a.slab_order - b.slab_order);
  }, [taxSlabs, genderFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Statutory, Banking & Income Tax Setup
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure disbursement bank accounts (BEFTN/Routing), Income Tax Act 2023 progressive slabs, and BLA 2006 statutory rules
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchData(true)}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors self-start sm:self-auto"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>

        {/* Section Navigation Pills */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setSection("bank_accounts")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              section === "bank_accounts"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            Company Bank Accounts ({bankAccounts.length})
          </button>

          <button
            type="button"
            onClick={() => setSection("tax_slabs")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              section === "tax_slabs"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            Income Tax Slabs (ITA 2023)
          </button>

          <button
            type="button"
            onClick={() => setSection("statutory")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              section === "statutory"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Statutory Compliance (BLA / PF)
          </button>
        </div>
      </div>

      {/* Section 1: Company Bank Accounts */}
      {section === "bank_accounts" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden relative">
          <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Corporate Disbursement Accounts</h3>
              <p className="text-xs text-slate-500">
                Company debit accounts used for BEFTN salary disbursement files
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingBankAccount(null);
                setBankForm({
                  business_id: currentBusinessId,
                  bank_name: "",
                  branch_name: "",
                  account_title: "",
                  account_number: "",
                  routing_number: "",
                  is_default: bankAccounts.length === 0,
                  is_active: true,
                });
                setIsBankModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Bank Account
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Bank & Branch</th>
                  <th className="px-5 py-3">Account Title</th>
                  <th className="px-5 py-3">Account Number</th>
                  <th className="px-5 py-3">Routing No.</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {bankAccounts.length > 0 ? (
                  bankAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{acc.bank_name}</div>
                        <div className="text-[11px] text-slate-400">{acc.branch_name} Branch</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 font-medium">{acc.account_title}</td>
                      <td className="px-5 py-3.5 font-mono text-slate-800 font-bold">
                        {acc.account_number}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-indigo-700">{acc.routing_number}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {acc.is_default && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Default Debit
                            </span>
                          )}
                          {acc.is_active ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                              Inactive
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBankAccount(acc);
                            setBankForm({
                              business_id: acc.business_id,
                              bank_name: acc.bank_name,
                              branch_name: acc.branch_name,
                              account_title: acc.account_title,
                              account_number: acc.account_number,
                              routing_number: acc.routing_number,
                              is_default: acc.is_default,
                              is_active: acc.is_active,
                            });
                            setIsBankModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors inline-flex items-center"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                      No corporate bank accounts added. Click "Add Bank Account" to configure BEFTN source accounts.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 2: Income Tax Slabs (ITA 2023) */}
      {section === "tax_slabs" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden relative">
          <div className="p-4 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Income Tax Act 2023 Progressive Tax Slabs
              </h3>
              <p className="text-xs text-slate-500">
                Tax brackets and tiered rates applied automatically in salary processing
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Category Filter Pills */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold text-slate-600">
                <button
                  type="button"
                  onClick={() => startTransition(() => setGenderFilter("general_male"))}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    genderFilter === "general_male" ? "bg-white text-slate-900 shadow-2xs font-bold" : ""
                  }`}
                >
                  General Male (3.5L Exempt)
                </button>
                <button
                  type="button"
                  onClick={() => startTransition(() => setGenderFilter("female_senior"))}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    genderFilter === "female_senior" ? "bg-white text-slate-900 shadow-2xs font-bold" : ""
                  }`}
                >
                  Female & Senior 65+ (4.0L Exempt)
                </button>
                <button
                  type="button"
                  onClick={() => startTransition(() => setGenderFilter("disabled_freedom_fighter"))}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    genderFilter === "disabled_freedom_fighter" ? "bg-white text-slate-900 shadow-2xs font-bold" : ""
                  }`}
                >
                  Disabled / FF (4.75L Exempt)
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingTaxSlab(null);
                  setTaxForm({
                    business_id: currentBusinessId,
                    fiscal_year: "2024-2025",
                    gender_category: genderFilter,
                    slab_order: (filteredTaxSlabs.length || 0) + 1,
                    min_income: 0,
                    max_income: null,
                    tax_rate_percent: 5,
                  });
                  setIsTaxModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Slab
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Tier Order</th>
                  <th className="px-5 py-3 text-right">Income Bracket (From)</th>
                  <th className="px-5 py-3 text-right">Income Bracket (To)</th>
                  <th className="px-5 py-3 text-right">Applicable Tax Rate</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTaxSlabs.length > 0 ? (
                  filteredTaxSlabs.map((slab) => (
                    <tr key={slab.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-800">
                        Tier #{slab.slab_order}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-slate-700">
                        ৳ {(slab.min_income || 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-slate-700">
                        {slab.max_income ? `৳ ${slab.max_income.toLocaleString()}` : "Above / Remaining"}
                      </td>
                      <td className="px-5 py-3.5 text-right font-black text-indigo-600">
                        {slab.tax_rate_percent}%
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTaxSlab(slab);
                              setTaxForm({
                                business_id: slab.business_id,
                                fiscal_year: slab.fiscal_year,
                                gender_category: slab.gender_category,
                                slab_order: slab.slab_order,
                                min_income: slab.min_income,
                                max_income: slab.max_income,
                                tax_rate_percent: slab.tax_rate_percent,
                              });
                              setIsTaxModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTaxSlab(slab.id)}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                      No tax slabs configured for this category. Click "Add Slab" to establish brackets.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3: Statutory Compliance (BLA 2006 & PF) */}
      {section === "statutory" && (
        <form
          onSubmit={handleSaveStatutorySettings}
          className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-6"
        >
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Bangladesh Labour Act 2006 & Statutory Benefits
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Provident Fund contributions, minimum tax thresholds, and statutory gratuity entitlements
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Provident Fund Box */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Recognized Provident Fund (RPF)
                  </h4>
                  <p className="text-[11px] text-slate-500">Equal employee and employer matching contribution</p>
                </div>
                <input
                  type="checkbox"
                  checked={statutoryForm.enable_provident_fund}
                  onChange={(e) =>
                    setStatutoryForm({ ...statutoryForm, enable_provident_fund: e.target.checked })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="font-semibold text-slate-700 block text-xs mb-1">
                    Employee Contribution (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={statutoryForm.pf_employee_percent || ""}
                    onChange={(e) =>
                      setStatutoryForm({
                        ...statutoryForm,
                        pf_employee_percent: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block text-xs mb-1">
                    Employer Contribution (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={statutoryForm.pf_employer_percent || ""}
                    onChange={(e) =>
                      setStatutoryForm({
                        ...statutoryForm,
                        pf_employer_percent: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Income Tax & Gratuity Box */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Income Tax (AIT) Auto-Deduction
                  </h4>
                  <p className="text-[11px] text-slate-500">Automatically calculate TDS from monthly payslips</p>
                </div>
                <input
                  type="checkbox"
                  checked={statutoryForm.enable_tax_auto_deduction}
                  onChange={(e) =>
                    setStatutoryForm({
                      ...statutoryForm,
                      enable_tax_auto_deduction: e.target.checked,
                    })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="font-semibold text-slate-700 block text-xs mb-1">
                    Minimum Annual Tax (৳)
                  </label>
                  <input
                    type="number"
                    value={statutoryForm.minimum_tax_amount || ""}
                    onChange={(e) =>
                      setStatutoryForm({
                        ...statutoryForm,
                        minimum_tax_amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="5000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block text-xs mb-1">
                    Gratuity Qualifying Years
                  </label>
                  <input
                    type="number"
                    value={statutoryForm.gratuity_qualifying_years || 5}
                    onChange={(e) =>
                      setStatutoryForm({
                        ...statutoryForm,
                        gratuity_qualifying_years: parseInt(e.target.value, 10) || 5,
                      })
                    }
                    placeholder="5"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Statutory Settings"}
            </button>
          </div>
        </form>
      )}

      {/* Bank Account Modal */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingBankAccount ? "Edit Bank Account" : "Add Corporate Bank Account"}
              </h3>
              <button
                type="button"
                onClick={() => setIsBankModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBankAccount} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Bank Name *</label>
                <input
                  type="text"
                  required
                  value={bankForm.bank_name}
                  onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                  placeholder="e.g. City Bank PLC, BRAC Bank, Dutch-Bangla Bank"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Branch Name *</label>
                <input
                  type="text"
                  required
                  value={bankForm.branch_name}
                  onChange={(e) => setBankForm({ ...bankForm, branch_name: e.target.value })}
                  placeholder="e.g. Gulshan Branch, Motijheel Corporate Branch"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Account Title *</label>
                <input
                  type="text"
                  required
                  value={bankForm.account_title}
                  onChange={(e) => setBankForm({ ...bankForm, account_title: e.target.value })}
                  placeholder="e.g. ProERP Technologies Ltd - Payroll Account"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={bankForm.account_number}
                    onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                    placeholder="13 or 16 digit no."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Routing Number (9-digit) *
                  </label>
                  <input
                    type="text"
                    required
                    value={bankForm.routing_number}
                    onChange={(e) => setBankForm({ ...bankForm, routing_number: e.target.value })}
                    placeholder="e.g. 225272635"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bankForm.is_default}
                    onChange={(e) => setBankForm({ ...bankForm, is_default: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium text-slate-700">Set as Default Debit Account</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bankForm.is_active}
                    onChange={(e) => setBankForm({ ...bankForm, is_active: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium text-slate-700">Active</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tax Slab Modal */}
      {isTaxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingTaxSlab ? "Edit Tax Slab" : "Add Tax Slab"}
              </h3>
              <button
                type="button"
                onClick={() => setIsTaxModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTaxSlab} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Fiscal Year</label>
                <input
                  type="text"
                  required
                  value={taxForm.fiscal_year}
                  onChange={(e) => setTaxForm({ ...taxForm, fiscal_year: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Slab Tier Order</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={taxForm.slab_order}
                  onChange={(e) =>
                    setTaxForm({ ...taxForm, slab_order: parseInt(e.target.value, 10) || 1 })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Min Income (৳)</label>
                  <input
                    type="number"
                    required
                    value={taxForm.min_income}
                    onChange={(e) =>
                      setTaxForm({ ...taxForm, min_income: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Max Income (৳ / Blank)
                  </label>
                  <input
                    type="number"
                    value={taxForm.max_income ?? ""}
                    onChange={(e) =>
                      setTaxForm({
                        ...taxForm,
                        max_income: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    placeholder="Leave blank for above"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tax Rate (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  max="100"
                  value={taxForm.tax_rate_percent}
                  onChange={(e) =>
                    setTaxForm({
                      ...taxForm,
                      tax_rate_percent: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTaxModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Slab"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
