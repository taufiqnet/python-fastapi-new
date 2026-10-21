"use client";

import React, { useRef } from "react";
import { PrescriptionOut } from "@/types";
import { X, Printer, Stethoscope, HeartPulse, ShieldCheck, Calendar, Activity } from "lucide-react";

interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescription: PrescriptionOut | null;
}

export function PrescriptionModal({ isOpen, onClose, prescription }: PrescriptionModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !prescription) return null;

  const handlePrint = () => {
    window.print();
  };

  const doc = prescription.doctor;
  const pat = prescription.patient;
  const vitals = prescription.vitals || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Control Bar (Hidden during print) */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-sm text-slate-800">
              Prescription Preview #{prescription.prescription_number}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              Print Prescription (A4)
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Prescription Paper Area */}
        <div className="p-8 overflow-y-auto bg-slate-100/50 print:p-0 print:bg-white flex justify-center">
          <div
            ref={printAreaRef}
            className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-6 print:w-full space-y-6 text-slate-900"
          >
            {/* Header / Doctor Pad */}
            <div className="border-b-2 border-emerald-600 pb-4 flex justify-between items-start">
              <div>
                <h1 className="text-xl font-black text-emerald-800 tracking-tight">
                  {doc?.full_name || "Consultant Physician"}
                </h1>
                <p className="text-xs font-bold text-slate-700 mt-0.5">
                  {doc?.medical_degrees || "MBBS, FCPS"}
                </p>
                <p className="text-xs text-slate-500">{doc?.specialization || "Clinical Specialist"}</p>
                {doc?.bmdc_reg_number && (
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    BM&DC Reg No: {doc.bmdc_reg_number}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-xs font-black uppercase text-emerald-700 tracking-wider">
                  ProERP Healthcare Hub
                </span>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  {doc?.chamber_name || "Chamber / OPD Clinic"}
                </p>
                <p className="text-[11px] text-slate-500">OPD Consultation & Diagnostic Wing</p>
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  RX: {prescription.prescription_number}
                </p>
              </div>
            </div>

            {/* Patient Demographic Bar */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Patient</span>
                <span className="font-bold text-slate-900">{pat?.full_name || "Walk-in Patient"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">UHID</span>
                <span className="font-mono font-bold text-slate-800">{pat?.uhid || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Age / Gender</span>
                <span className="font-medium text-slate-800">
                  {pat?.age ? `${pat.age} yrs` : "N/A"} / {pat?.gender ? pat.gender.toUpperCase() : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Date</span>
                <span className="font-medium text-slate-800">
                  {new Date(prescription.created_at).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            {/* Main Prescription Body (Split View) */}
            <div className="grid grid-cols-3 gap-6 min-h-[350px]">
              {/* Left Column: Vitals, Findings & Investigations */}
              <div className="col-span-1 border-r border-slate-200 pr-4 space-y-4 text-xs">
                {/* Vitals Box */}
                {(vitals.bp_systolic || vitals.pulse || vitals.temperature || vitals.weight_kg) && (
                  <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 space-y-1">
                    <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                      <HeartPulse className="w-3.5 h-3.5 text-emerald-600" />
                      Vitals
                    </span>
                    {vitals.bp_systolic && (
                      <p className="text-[11px] text-slate-700">
                        BP: <span className="font-bold">{vitals.bp_systolic}/{vitals.bp_diastolic || 80} mmHg</span>
                      </p>
                    )}
                    {vitals.pulse && (
                      <p className="text-[11px] text-slate-700">
                        Pulse: <span className="font-bold">{vitals.pulse} bpm</span>
                      </p>
                    )}
                    {vitals.temperature && (
                      <p className="text-[11px] text-slate-700">
                        Temp: <span className="font-bold">{vitals.temperature} °F</span>
                      </p>
                    )}
                    {vitals.spo2 && (
                      <p className="text-[11px] text-slate-700">
                        SpO2: <span className="font-bold">{vitals.spo2}%</span>
                      </p>
                    )}
                    {vitals.weight_kg && (
                      <p className="text-[11px] text-slate-700">
                        Weight: <span className="font-bold">{vitals.weight_kg} kg</span>
                        {vitals.bmi ? ` (BMI: ${vitals.bmi})` : ""}
                      </p>
                    )}
                  </div>
                )}

                {/* Clinical Findings */}
                {prescription.clinical_findings && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Clinical Findings
                    </span>
                    <p className="text-slate-600 leading-relaxed text-[11px] whitespace-pre-wrap">
                      {prescription.clinical_findings}
                    </p>
                  </div>
                )}

                {/* Diagnosis */}
                {prescription.provisional_diagnosis && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Diagnosis
                    </span>
                    <p className="font-bold text-slate-800 text-[11px]">
                      {prescription.provisional_diagnosis}
                    </p>
                  </div>
                )}

                {/* Advised Investigations */}
                {prescription.advised_investigations && prescription.advised_investigations.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Advised Tests
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                      {prescription.advised_investigations.map((test, idx) => (
                        <li key={idx} className="font-medium text-slate-800">
                          {test}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right Column: Rx & Medicines */}
              <div className="col-span-2 space-y-4">
                <div className="text-2xl font-serif font-black text-emerald-800">
                  ℞
                </div>

                {prescription.medicines && prescription.medicines.length > 0 ? (
                  <div className="space-y-3.5">
                    {prescription.medicines.map((med, index) => (
                      <div key={index} className="space-y-1 pb-2 border-b border-slate-100 last:border-none">
                        <div className="flex items-baseline justify-between">
                          <p className="text-xs font-bold text-slate-900">
                            {index + 1}. {med.dosage_form} {med.drug_name}{" "}
                            {med.strength ? <span className="text-slate-500 font-normal">({med.strength})</span> : ""}
                          </p>
                          <span className="text-xs font-mono font-bold text-emerald-700">
                            {med.duration}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-600 pl-4">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md font-mono font-bold text-slate-800">
                            {med.frequency}
                          </span>
                          <span>{med.timing}</span>
                          {med.instructions && (
                            <span className="text-slate-500 italic">({med.instructions})</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No medicines prescribed.</p>
                )}

                {/* Advice / Instructions */}
                {prescription.special_advice && (
                  <div className="pt-4 border-t border-slate-100 space-y-1 text-xs">
                    <span className="font-bold text-slate-800 uppercase text-[11px] tracking-wider block">
                      Advice & Recommendations
                    </span>
                    <p className="text-slate-600 text-[11px] whitespace-pre-wrap leading-relaxed">
                      {prescription.special_advice}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Follow-up & Doctor Signature Block */}
            <div className="pt-6 border-t-2 border-slate-200 flex items-end justify-between">
              <div>
                {prescription.follow_up_date && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span>
                      Follow-up Visit:{" "}
                      <strong className="text-slate-900">
                        {new Date(prescription.follow_up_date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </strong>
                    </span>
                  </div>
                )}
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Digital Electronic Health Record
                </div>
              </div>

              <div className="text-right">
                <div className="w-40 border-b border-slate-400 mb-1.5"></div>
                <p className="text-xs font-bold text-slate-900">{doc?.full_name || "Doctor Signature"}</p>
                <p className="text-[10px] text-slate-500">{doc?.specialization || "Registered Medical Practitioner"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
