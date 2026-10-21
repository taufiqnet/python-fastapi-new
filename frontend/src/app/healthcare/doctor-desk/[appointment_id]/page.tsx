"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import {
  AppointmentOut,
  DiagnosticTestOut,
  MedicineItem,
  PrescriptionCreatePayload,
  PrescriptionOut,
  VitalsData,
} from "@/types";
import { PrescriptionModal } from "@/components/healthcare/modals/prescription-modal";
import {
  Stethoscope,
  Users,
  HeartPulse,
  Plus,
  Trash2,
  Save,
  Printer,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Activity,
  FileText,
  Search,
  Sparkles,
  Loader2,
} from "lucide-react";

const COMMON_DOSAGES = ["1+0+1", "1+1+1", "0+0+1", "1+0+0", "1+1+1+1", "0+1+0", "1 SOS"];
const COMMON_DURATIONS = ["3 Days", "5 Days", "7 Days", "14 Days", "1 Month", "Continue"];
const COMMON_TIMINGS = ["After food", "Before food", "With food", "At bedtime", "Empty stomach"];

export default function DoctorDeskEMRPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.appointment_id as string;

  const [appointment, setAppointment] = useState<AppointmentOut | null>(null);
  const [catalogTests, setCatalogTests] = useState<DiagnosticTestOut[]>([]);
  const [existingPrescription, setExistingPrescription] = useState<PrescriptionOut | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Vitals State
  const [vitals, setVitals] = useState<VitalsData>({
    bp_systolic: 120,
    bp_diastolic: 80,
    pulse: 76,
    temperature: 98.4,
    spo2: 99,
    weight_kg: 68,
    height_cm: 172,
    bmi: 23.0,
  });

  // Clinical Findings & Diagnosis
  const [chiefComplaints, setChiefComplaints] = useState("");
  const [clinicalFindings, setClinicalFindings] = useState("");
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState("");

  // Rx Medicines
  const [medicines, setMedicines] = useState<MedicineItem[]>([
    {
      drug_name: "Paracetamol",
      dosage_form: "Tab",
      strength: "500 mg",
      frequency: "1+0+1",
      timing: "After food",
      duration: "5 Days",
      instructions: "Take with a glass of water",
    },
  ]);

  // Advised Investigations
  const [advisedTests, setAdvisedTests] = useState<string[]>([]);
  const [testSearch, setTestSearch] = useState("");

  // Advice & Follow up
  const [specialAdvice, setSpecialAdvice] = useState(
    "Drink plenty of fluids. Rest well. Avoid oily & spicy foods."
  );
  const [followUpDate, setFollowUpDate] = useState("");

  // Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Auto calculate BMI
  useEffect(() => {
    if (vitals.weight_kg && vitals.height_cm && vitals.height_cm > 0) {
      const heightInMeters = vitals.height_cm / 100;
      const bmiVal = Number((vitals.weight_kg / (heightInMeters * heightInMeters)).toFixed(1));
      setVitals((prev) => ({ ...prev, bmi: bmiVal }));
    }
  }, [vitals.weight_kg, vitals.height_cm]);

  // Load Data
  useEffect(() => {
    if (!appointmentId) return;

    const loadAppointmentAndCatalog = async () => {
      setLoading(true);
      setError(null);
      try {
        const [appRes, catRes, rxRes] = await Promise.allSettled([
          apiClient.get<AppointmentOut>(`/healthcare/appointments/${appointmentId}`),
          apiClient.get<DiagnosticTestOut[]>("/healthcare/diagnostic-tests?limit=150"),
          apiClient.get<PrescriptionOut[]>(
            `/healthcare/prescriptions?appointment_id=${appointmentId}`
          ),
        ]);

        if (appRes.status === "fulfilled") {
          const app = appRes.value.data;
          setAppointment(app);
          if (app.chief_complaints) {
            setChiefComplaints(app.chief_complaints);
          }
        } else {
          setError("Failed to load appointment details.");
        }

        if (catRes.status === "fulfilled") {
          setCatalogTests(catRes.value.data || []);
        }

        if (rxRes.status === "fulfilled" && rxRes.value.data && rxRes.value.data.length > 0) {
          const rx = rxRes.value.data[0];
          setExistingPrescription(rx);
          if (rx.vitals) setVitals(rx.vitals);
          if (rx.clinical_findings) setClinicalFindings(rx.clinical_findings);
          if (rx.provisional_diagnosis) setProvisionalDiagnosis(rx.provisional_diagnosis);
          if (rx.medicines && rx.medicines.length > 0) setMedicines(rx.medicines);
          if (rx.advised_investigations) setAdvisedTests(rx.advised_investigations);
          if (rx.special_advice) setSpecialAdvice(rx.special_advice);
          if (rx.follow_up_date) setFollowUpDate(rx.follow_up_date);
        }
      } catch {
        setError("Error fetching EMR records.");
      } finally {
        setLoading(false);
      }
    };

    loadAppointmentAndCatalog();
  }, [appointmentId]);

  // Medicine Table Handlers
  const handleAddMedicine = () => {
    setMedicines((prev) => [
      ...prev,
      {
        drug_name: "",
        dosage_form: "Tab",
        strength: "",
        frequency: "1+0+1",
        timing: "After food",
        duration: "5 Days",
        instructions: "",
      },
    ]);
  };

  const handleRemoveMedicine = (idx: number) => {
    setMedicines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateMedicine = (idx: number, field: keyof MedicineItem, val: string) => {
    setMedicines((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  // Advised Tests Handlers
  const handleAddTest = (testName: string) => {
    if (!advisedTests.includes(testName)) {
      setAdvisedTests((prev) => [...prev, testName]);
    }
    setTestSearch("");
  };

  const handleRemoveTest = (testName: string) => {
    setAdvisedTests((prev) => prev.filter((t) => t !== testName));
  };

  // Save Prescription
  const handleSavePrescription = async (markComplete = false) => {
    if (!appointment) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload: PrescriptionCreatePayload = {
        business_id: 1,
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        vitals: vitals,
        clinical_findings: clinicalFindings.trim() || undefined,
        provisional_diagnosis: provisionalDiagnosis.trim() || undefined,
        medicines: medicines.filter((m) => m.drug_name.trim().length > 0),
        advised_investigations: advisedTests,
        special_advice: specialAdvice.trim() || undefined,
        follow_up_date: followUpDate || undefined,
      };

      const res = await apiClient.post<PrescriptionOut>("/healthcare/prescriptions", payload);
      setExistingPrescription(res.data);

      if (markComplete) {
        await apiClient.patch<AppointmentOut>(`/healthcare/appointments/${appointment.id}`, {
          status: "completed",
        });
        setAppointment((prev) => (prev ? { ...prev, status: "completed" } : prev));
      }

      setSuccessMsg("Prescription saved and recorded successfully!");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to save prescription.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const filteredTests = useMemo(() => {
    if (!testSearch.trim()) return [];
    const q = testSearch.toLowerCase();
    return catalogTests
      .filter((t) => t.test_name.toLowerCase().includes(q) || t.test_code.toLowerCase().includes(q))
      .slice(0, 8);
  }, [catalogTests, testSearch]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm font-bold">Loading Clinical Consultation EMR...</p>
        </div>
      </DashboardLayout>
    );
  }

  const patient = appointment?.patient;
  const doctor = appointment?.doctor;

  return (
    <DashboardLayout>
      <div className="w-full min-w-0 max-w-full space-y-5">
        {/* Top Navigation & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/healthcare/opd-chambers"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-600" />
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Doctor Consultation Desk & EMR
                </h1>
                {appointment && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800">
                    Token #{appointment.serial_number}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Doctor: <strong className="text-slate-800">{doctor?.full_name}</strong> (
                {doctor?.specialization})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {existingPrescription && (
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Printer className="w-4 h-4 text-emerald-600" />
                <span>Print Prescription</span>
              </button>
            )}

            <button
              onClick={() => handleSavePrescription(false)}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-60 rounded-xl shadow-2xs flex items-center gap-1.5 transition-all"
            >
              <Save className="w-4 h-4 text-emerald-600" />
              <span>Save Draft</span>
            </button>

            <button
              onClick={() => handleSavePrescription(true)}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finalize & Complete</span>
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Patient Demographics Banner */}
        <div className="p-4 bg-linear-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center font-bold text-emerald-400 text-lg">
              {patient?.full_name ? patient.full_name[0] : "P"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base">{patient?.full_name}</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-500/20 text-emerald-300 font-bold">
                  {patient?.uhid}
                </span>
                <span className="capitalize px-2 py-0.5 rounded-md text-[10px] bg-slate-700 text-slate-300">
                  {appointment?.visit_type.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Age: <strong className="text-white">{patient?.age || "—"} yrs</strong> • Sex:{" "}
                <strong className="text-white capitalize">{patient?.gender || "—"}</strong> • Phone:{" "}
                <strong className="text-white">{patient?.phone}</strong> • Blood:{" "}
                <strong className="text-emerald-400 font-bold">{patient?.blood_group || "—"}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase">Token Serial</span>
              <span className="text-xl font-black text-emerald-400">
                #{appointment?.serial_number}
              </span>
            </div>
          </div>
        </div>

        {/* Clinical Workspace (2-Column Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Vitals, Findings & Advised Tests */}
          <div className="space-y-5">
            {/* Vitals Box */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-emerald-600" />
                  Patient Vitals
                </span>
                {vitals.bmi && (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    BMI: {vitals.bmi}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* BP */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    BP (mmHg)
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      placeholder="Sys"
                      value={vitals.bp_systolic || ""}
                      onChange={(e) =>
                        setVitals((p) => ({ ...p, bp_systolic: Number(e.target.value) || null }))
                      }
                      className="w-16 px-2 py-1.5 font-bold border border-slate-200 rounded-lg text-center"
                    />
                    <span className="text-slate-400">/</span>
                    <input
                      type="number"
                      placeholder="Dia"
                      value={vitals.bp_diastolic || ""}
                      onChange={(e) =>
                        setVitals((p) => ({ ...p, bp_diastolic: Number(e.target.value) || null }))
                      }
                      className="w-16 px-2 py-1.5 font-bold border border-slate-200 rounded-lg text-center"
                    />
                  </div>
                </div>

                {/* Pulse */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Pulse (bpm)
                  </label>
                  <input
                    type="number"
                    value={vitals.pulse || ""}
                    onChange={(e) =>
                      setVitals((p) => ({ ...p, pulse: Number(e.target.value) || null }))
                    }
                    className="w-full px-2.5 py-1.5 font-bold border border-slate-200 rounded-lg"
                  />
                </div>

                {/* Temp */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Temp (°F)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitals.temperature || ""}
                    onChange={(e) =>
                      setVitals((p) => ({ ...p, temperature: Number(e.target.value) || null }))
                    }
                    className="w-full px-2.5 py-1.5 font-bold border border-slate-200 rounded-lg"
                  />
                </div>

                {/* SpO2 */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    SpO2 (%)
                  </label>
                  <input
                    type="number"
                    value={vitals.spo2 || ""}
                    onChange={(e) =>
                      setVitals((p) => ({ ...p, spo2: Number(e.target.value) || null }))
                    }
                    className="w-full px-2.5 py-1.5 font-bold border border-slate-200 rounded-lg"
                  />
                </div>

                {/* Weight */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={vitals.weight_kg || ""}
                    onChange={(e) =>
                      setVitals((p) => ({ ...p, weight_kg: Number(e.target.value) || null }))
                    }
                    className="w-full px-2.5 py-1.5 font-bold border border-slate-200 rounded-lg"
                  />
                </div>

                {/* Height */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    value={vitals.height_cm || ""}
                    onChange={(e) =>
                      setVitals((p) => ({ ...p, height_cm: Number(e.target.value) || null }))
                    }
                    className="w-full px-2.5 py-1.5 font-bold border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Chief Complaints & Clinical Findings */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Clinical Examination
              </span>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Chief Complaints
                </label>
                <textarea
                  rows={2}
                  value={chiefComplaints}
                  onChange={(e) => setChiefComplaints(e.target.value)}
                  placeholder="e.g. Chest pain for 2 days, Dyspnea on exertion..."
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  On-Examination (O/E) & Notes
                </label>
                <textarea
                  rows={3}
                  value={clinicalFindings}
                  onChange={(e) => setClinicalFindings(e.target.value)}
                  placeholder="Heart sounds S1 S2 normal, Chest clear, Bilateral wheeze..."
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Provisional / Final Diagnosis
                </label>
                <input
                  type="text"
                  value={provisionalDiagnosis}
                  onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                  placeholder="e.g. Essential Hypertension with Stable Angina"
                  className="w-full px-3 py-2 text-xs font-bold text-slate-900 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Advised Diagnostic Investigations */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Advised Investigations
              </span>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search catalog (e.g. CBC, Lipid, ECG, X-Ray)..."
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />

                {filteredTests.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {filteredTests.map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => handleAddTest(t.test_name)}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-emerald-50 flex items-center justify-between"
                      >
                        <span className="font-semibold text-slate-900">{t.test_name}</span>
                        <span className="font-mono text-slate-400">{t.test_code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Tests Pill List */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {advisedTests.map((t, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
                  >
                    <span>{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTest(t)}
                      className="hover:text-rose-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {advisedTests.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No investigations advised yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Medicine Rx Builder & Advice */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-serif font-black text-emerald-800">℞</span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Digital Medicine Rx</h2>
                    <p className="text-xs text-slate-500">
                      Add prescribed medications, frequencies, and durations
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddMedicine}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-1 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Medicine
                </button>
              </div>

              {/* Medicine Table */}
              <div className="space-y-3">
                {medicines.map((med, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3 hover:border-emerald-400 transition-all"
                  >
                    {/* Top Row: Type, Drug Name, Strength */}
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-2">
                        <select
                          value={med.dosage_form}
                          onChange={(e) => handleUpdateMedicine(idx, "dosage_form", e.target.value)}
                          className="w-full px-2 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-white"
                        >
                          <option value="Tab">Tab</option>
                          <option value="Cap">Cap</option>
                          <option value="Syp">Syp</option>
                          <option value="Inj">Inj</option>
                          <option value="Drop">Drop</option>
                          <option value="Oint">Oint</option>
                        </select>
                      </div>

                      <div className="col-span-7">
                        <input
                          type="text"
                          placeholder="Drug name / Brand..."
                          value={med.drug_name}
                          onChange={(e) => handleUpdateMedicine(idx, "drug_name", e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                          required
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="e.g. 500mg"
                          value={med.strength || ""}
                          onChange={(e) => handleUpdateMedicine(idx, "strength", e.target.value)}
                          className="w-full px-2 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white"
                        />
                      </div>

                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicine(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Row: Frequency, Timing, Duration, Instructions */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                      {/* Frequency */}
                      <div>
                        <input
                          type="text"
                          placeholder="1+0+1"
                          value={med.frequency}
                          onChange={(e) => handleUpdateMedicine(idx, "frequency", e.target.value)}
                          className="w-full px-2.5 py-1.5 font-bold font-mono border border-slate-200 rounded-lg bg-white"
                        />
                        <div className="flex gap-1 mt-1 overflow-x-auto">
                          {COMMON_DOSAGES.slice(0, 3).map((d) => (
                            <button
                              type="button"
                              key={d}
                              onClick={() => handleUpdateMedicine(idx, "frequency", d)}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 hover:bg-slate-300 font-mono"
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Timing */}
                      <div>
                        <select
                          value={med.timing}
                          onChange={(e) => handleUpdateMedicine(idx, "timing", e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        >
                          {COMMON_TIMINGS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Duration */}
                      <div>
                        <input
                          type="text"
                          placeholder="7 Days"
                          value={med.duration}
                          onChange={(e) => handleUpdateMedicine(idx, "duration", e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        />
                        <div className="flex gap-1 mt-1 overflow-x-auto">
                          {COMMON_DURATIONS.slice(0, 3).map((dur) => (
                            <button
                              type="button"
                              key={dur}
                              onClick={() => handleUpdateMedicine(idx, "duration", dur)}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 hover:bg-slate-300"
                            >
                              {dur}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Special instructions */}
                      <div>
                        <input
                          type="text"
                          placeholder="e.g. In lukewarm water"
                          value={med.instructions || ""}
                          onChange={(e) => handleUpdateMedicine(idx, "instructions", e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Special Advice & Follow-Up Date */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Doctor Advice & Follow-Up
              </span>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Dietary / Lifestyle Advice & Instructions
                </label>
                <textarea
                  rows={3}
                  value={specialAdvice}
                  onChange={(e) => setSpecialAdvice(e.target.value)}
                  placeholder="Drink 3 liters of water daily. Walk 30 minutes in the morning..."
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="w-full sm:w-64">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Next Follow-Up Visit
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Prescription Print Modal */}
        <PrescriptionModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          prescription={existingPrescription}
        />
      </div>
    </DashboardLayout>
  );
}
