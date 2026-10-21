"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import {
  PatientOut,
  DoctorProfileOut,
  DiagnosticTestOut,
  DiagnosticOrderOut,
} from "@/types";
import { PatientModal } from "@/components/healthcare/modals/patient-modal";
import { MoneyReceiptModal } from "@/components/healthcare/modals/money-receipt-modal";
import {
  CreditCard,
  Search,
  User,
  Plus,
  Trash2,
  Stethoscope,
  FlaskConical,
  Clock,
  Printer,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  DollarSign,
  Tag,
} from "lucide-react";

interface BasketItem {
  test: DiagnosticTestOut;
  discount: number;
}

export default function DiagnosticBillingPage() {
  const [patients, setPatients] = useState<PatientOut[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfileOut[]>([]);
  const [availableTests, setAvailableTests] = useState<DiagnosticTestOut[]>([]);

  // Search & Form States
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientOut | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");

  const [testSearch, setTestSearch] = useState("");
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [paidAmount, setPaidAmount] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<DiagnosticOrderOut | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [pRes, dRes, tRes] = await Promise.allSettled([
          apiClient.get<PatientOut[]>("/healthcare/patients?limit=500"),
          apiClient.get<DoctorProfileOut[]>("/healthcare/doctors?limit=200&is_active=true"),
          apiClient.get<DiagnosticTestOut[]>("/healthcare/diagnostic-tests?limit=500&is_active=true"),
        ]);
        if (pRes.status === "fulfilled") setPatients(pRes.value.data || []);
        if (dRes.status === "fulfilled") setDoctors(dRes.value.data || []);
        if (tRes.status === "fulfilled") setAvailableTests(tRes.value.data || []);
      } catch {
        setError("Failed to load billing dependencies.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filtered Patients Search Dropdown
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return [];
    const q = patientSearch.toLowerCase();
    return patients
      .filter(
        (p) =>
          p.full_name.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          p.uhid.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [patients, patientSearch]);

  // Filtered Tests Search Dropdown
  const filteredTests = useMemo(() => {
    if (!testSearch.trim()) return [];
    const q = testSearch.toLowerCase();
    const inBasketIds = new Set(basket.map((b) => b.test.id));
    return availableTests
      .filter(
        (t) =>
          !inBasketIds.has(t.id) &&
          (t.name.toLowerCase().includes(q) || t.test_code.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [availableTests, testSearch, basket]);

  // Add Test to Basket
  const handleAddTest = (test: DiagnosticTestOut) => {
    setBasket([...basket, { test, discount: 0 }]);
    setTestSearch("");
  };

  const handleRemoveTest = (testId: string) => {
    setBasket(basket.filter((b) => b.test.id !== testId));
  };

  const handleDiscountChange = (testId: string, val: string) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setBasket(
      basket.map((item) =>
        item.test.id === testId ? { ...item, discount: Math.min(num, Number(item.test.sale_price)) } : item
      )
    );
  };

  // Calculations
  const totalBill = useMemo(() => {
    return basket.reduce((sum, item) => sum + Number(item.test.sale_price || 0), 0);
  }, [basket]);

  const totalDiscount = useMemo(() => {
    return basket.reduce((sum, item) => sum + Number(item.discount || 0), 0);
  }, [basket]);

  const netPayable = useMemo(() => {
    return Math.max(0, totalBill - totalDiscount);
  }, [totalBill, totalDiscount]);

  // Auto-fill paid amount when basket changes if paidAmount equals previous net
  useEffect(() => {
    setPaidAmount(String(netPayable));
  }, [netPayable]);

  const dueAmount = useMemo(() => {
    const paid = parseFloat(paidAmount) || 0;
    return Math.max(0, netPayable - paid);
  }, [netPayable, paidAmount]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setError("Please search and select a patient, or click '+ Register Patient'.");
      return;
    }
    if (basket.length === 0) {
      setError("Please add at least one diagnostic investigation to the bill.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      business_id: 1,
      patient_id: selectedPatient.id,
      referring_doctor_id: selectedDoctorId ? selectedDoctorId : null,
      items: basket.map((item) => ({
        test_id: item.test.id,
        discount: item.discount,
      })),
      paid_amount: parseFloat(paidAmount) || 0.0,
      payment_method: paymentMethod,
      notes: notes.trim() || null,
    };

    try {
      const res = await apiClient.post<DiagnosticOrderOut>("/healthcare/orders/checkout", payload);
      setCompletedOrder(res.data);
      setIsReceiptModalOpen(true);

      // Reset Form for next patient
      setBasket([]);
      setSelectedPatient(null);
      setPatientSearch("");
      setNotes("");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Checkout failed. Please check inputs.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full min-w-0 max-w-full space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/healthcare"
              className="p-2 border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Diagnostic Counter Billing (POS)
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate diagnostic money receipts, discount calculation, and phlebotomy barcode stickers.
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="font-bold text-rose-700 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Columns (2 Cols): Patient Selection & Investigation Basket */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Patient Dossier Picker */}
            <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>1. Patient Selection</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPatientModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Patient
                </button>
              </div>

              {selectedPatient ? (
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-sm text-slate-900">
                        {selectedPatient.full_name}
                      </p>
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-200/70 text-emerald-800 rounded-md">
                        {selectedPatient.uhid}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Phone: <span className="font-bold">{selectedPatient.phone}</span> • Gender:{" "}
                      <span className="capitalize">{selectedPatient.gender}</span>
                      {selectedPatient.blood_group && (
                        <span> • Blood: <strong className="text-rose-600">{selectedPatient.blood_group}</strong></span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPatient(null)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline"
                  >
                    Change Patient
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type patient phone, name, or UHID (e.g. 017... or UHID-1...)"
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  {filteredPatients.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                      {filteredPatients.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedPatient(p);
                            setPatientSearch("");
                          }}
                          className="p-3 hover:bg-emerald-50 cursor-pointer transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-xs text-slate-900">{p.full_name}</p>
                            <p className="text-[11px] text-slate-500">
                              {p.phone} • UHID: <span className="font-mono text-emerald-700">{p.uhid}</span>
                            </p>
                          </div>
                          <span className="text-[10px] text-emerald-600 font-bold">Select &rarr;</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Referring Doctor Selector */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Referring Doctor (Optional)
                </label>
                <div className="relative">
                  <Stethoscope className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    <option value="">Self / Counter Walk-in (No referral doctor)</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name} ({d.specialization}) - {Number(d.referral_commission_rate)}% ref.
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: Diagnostic Test Basket */}
            <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <FlaskConical className="w-4 h-4 text-emerald-600" />
                  <span>2. Select Investigations</span>
                </div>
                <span className="text-xs text-slate-400">
                  {basket.length} test(s) added
                </span>
              </div>

              {/* Search Test Catalog */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search test by name or code (e.g. CBC, Lipid, USG, RBS, Urine...)"
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />

                {filteredTests.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                    {filteredTests.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleAddTest(t)}
                        className="p-3 hover:bg-emerald-50 cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800">
                              {t.test_code}
                            </span>
                            <p className="font-bold text-xs text-slate-900">{t.name}</p>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Dept: <span className="capitalize">{t.department}</span> • Sample:{" "}
                            {t.sample_type || "None"} • {t.default_turnaround_hours}h delivery
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-xs text-emerald-700">৳{Number(t.sale_price).toLocaleString()}</p>
                          <span className="text-[10px] text-emerald-600 font-bold">+ Add</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Basket Table */}
              <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Investigation</th>
                      <th className="py-2.5 px-3">Sample Specimen</th>
                      <th className="py-2.5 px-3 text-right">Standard Fee</th>
                      <th className="py-2.5 px-3 text-right w-28">Discount (৳)</th>
                      <th className="py-2.5 px-3 text-right">Net Price</th>
                      <th className="py-2.5 px-3 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {basket.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Search and add diagnostic tests above to generate a bill.
                        </td>
                      </tr>
                    ) : (
                      basket.map((item) => {
                        const netItemPrice = Math.max(0, Number(item.test.sale_price) - Number(item.discount));
                        return (
                          <tr key={item.test.id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3">
                              <p className="font-bold text-slate-900">{item.test.name}</p>
                              <span className="font-mono text-[10px] text-indigo-700">
                                {item.test.test_code}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                {item.test.sample_type || "No Specimen"}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600">
                              ৳{Number(item.test.sale_price).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                max={Number(item.test.sale_price)}
                                step="10"
                                value={item.discount === 0 ? "" : item.discount}
                                placeholder="0"
                                onChange={(e) => handleDiscountChange(item.test.id, e.target.value)}
                                className="w-20 px-2 py-1 text-xs text-right border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900">
                              ৳{netItemPrice.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveTest(item.test.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Financial Breakdown & Final Settlement */}
          <div className="space-y-6">
            <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>3. Financial Settlement</span>
              </div>

              {/* Bill Details */}
              <div className="space-y-2.5 text-xs pt-1 border-b border-slate-100 pb-4">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Total (Subtotal):</span>
                  <span className="font-semibold">৳{totalBill.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Total Discount:</span>
                  <span className="font-semibold">-৳{totalDiscount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-extrabold text-sm border-t border-slate-200 pt-2">
                  <span>Net Payable Amount:</span>
                  <span className="text-emerald-700">৳{netPayable.toLocaleString()}</span>
                </div>
              </div>

              {/* Paid Amount Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Received / Paid Amount (BDT) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">৳</span>
                  <input
                    type="number"
                    min="0"
                    max={netPayable}
                    step="10"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 text-sm font-extrabold text-slate-900 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Due Amount Highlight */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600">Outstanding Due:</span>
                <span className={`text-sm font-black ${dueAmount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  ৳{dueAmount.toLocaleString()}
                </span>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                >
                  <option value="cash">Cash Counter</option>
                  <option value="bkash">bKash Merchant</option>
                  <option value="nagad">Nagad Merchant</option>
                  <option value="card">Visa / Mastercard / POS</option>
                  <option value="bank_transfer">Bank Wire</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Special Instructions / Clinical History
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Urgent reporting, fasting status confirmed..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Checkout Submit */}
              <button
                type="submit"
                disabled={submitting || basket.length === 0}
                className="w-full py-3 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all mt-4"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Checkout...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    <span>Confirm Order & Print Receipt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Modals */}
        <PatientModal
          isOpen={isPatientModalOpen}
          onClose={() => setIsPatientModalOpen(false)}
          onSuccess={(newPatient) => {
            if (newPatient) {
              setPatients([newPatient, ...patients]);
              setSelectedPatient(newPatient);
            }
          }}
        />

        <MoneyReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          order={completedOrder}
        />
      </div>
    </DashboardLayout>
  );
}
