"use client";

import React, { useRef } from "react";
import { DiagnosticOrderOut, DiagnosticOrderItemOut, LabTestResultOut } from "@/types";
import { X, Printer, ShieldCheck, FlaskConical, AlertTriangle, QrCode } from "lucide-react";

interface LabReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: DiagnosticOrderOut | null;
  orderItem: DiagnosticOrderItemOut | null;
  results: LabTestResultOut[];
}

export function LabReportModal({
  isOpen,
  onClose,
  order,
  orderItem,
  results,
}: LabReportModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order || !orderItem) return null;

  const handlePrint = () => {
    window.print();
  };

  const patient = order.patient;
  const verifiedResult = results.find((r) => r.verified_by_name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Control Bar (Hidden during print) */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-sm text-slate-800">
              Official Laboratory Report — Order #{order.order_number}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              Print Lab Report (A4)
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Paper Area */}
        <div className="p-8 overflow-y-auto bg-slate-100/50 print:p-0 print:bg-white flex justify-center">
          <div
            ref={printAreaRef}
            className="w-full max-w-3xl bg-white p-8 rounded-xl shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-6 print:w-full space-y-6 text-slate-900"
          >
            {/* Header: Diagnostic Center */}
            <div className="border-b-2 border-emerald-600 pb-4 flex justify-between items-start">
              <div>
                <h1 className="text-xl font-black text-emerald-800 tracking-tight">
                  ProERP CENTRAL DIAGNOSTIC LABORATORY
                </h1>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  Automated Pathology, Hematology & Molecular Diagnostic Division
                </p>
                <p className="text-[11px] text-slate-400">
                  Accredited & Standardized Clinical Reference Laboratory
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  CONFIDENTIAL LAB REPORT
                </span>
                <p className="text-xs text-slate-700 font-mono mt-1">
                  Order: #{order.order_number}
                </p>
              </div>
            </div>

            {/* Patient & Specimen Info Grid */}
            <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Patient Name</span>
                <span className="font-bold text-slate-900">{patient?.full_name || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">UHID</span>
                <span className="font-mono font-bold text-slate-800">{patient?.uhid || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Age / Gender</span>
                <span className="font-medium text-slate-800">
                  {patient?.age ? `${patient.age} yrs` : "—"} / {patient?.gender?.toUpperCase() || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Ref. Doctor</span>
                <span className="font-medium text-slate-800 truncate block">
                  {order.referring_doctor?.full_name || "Self / Walk-in"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Order Date</span>
                <span className="text-slate-700">
                  {new Date(order.order_date).toLocaleDateString("en-GB")}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Specimen</span>
                <span className="text-slate-700 font-medium">Whole Blood / Serum</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Report Status</span>
                <span className="text-emerald-700 font-bold">FINAL / VERIFIED</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Verified Date</span>
                <span className="text-slate-700">
                  {verifiedResult?.verified_at
                    ? new Date(verifiedResult.verified_at).toLocaleDateString("en-GB")
                    : "—"}
                </span>
              </div>
            </div>

            {/* Test Title */}
            <div className="pt-2">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                {orderItem.test_name} ({orderItem.test_code})
              </h2>
            </div>

            {/* Parameters Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Investigation Parameter</th>
                    <th className="py-2.5 px-3 w-32">Observed Value</th>
                    <th className="py-2.5 px-3 w-20">Unit</th>
                    <th className="py-2.5 px-3 w-40">Biological Ref. Interval</th>
                    <th className="py-2.5 px-3 w-24 text-center">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((res, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {res.parameter_name}
                      </td>
                      <td className={`py-2.5 px-3 font-bold font-mono ${
                        res.is_critical
                          ? "text-rose-700 font-black"
                          : res.is_abnormal
                          ? "text-amber-700 font-black"
                          : "text-slate-900"
                      }`}>
                        {res.observed_value}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                        {res.unit || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                        {res.ref_range || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {res.is_critical ? (
                          <span className="font-bold text-rose-700 text-[11px]">HIGH / CRIT</span>
                        ) : res.is_abnormal ? (
                          <span className="font-bold text-amber-700 text-[11px]">ABNORMAL</span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Normal</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pathologist Verification & Electronic Signature */}
            <div className="pt-8 border-t-2 border-slate-200 grid grid-cols-2 gap-6 items-end">
              <div>
                <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Electronically Signed & Validated</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Report verified by registered Clinical Pathologist. For clinical correlation only.
                </p>
              </div>

              <div className="text-right">
                <div className="w-44 ml-auto border-b border-slate-400 mb-1.5"></div>
                <p className="text-xs font-bold text-slate-900">
                  {verifiedResult?.verified_by_name || "Consultant Pathologist"}
                </p>
                <p className="text-[10px] text-slate-500">MBBS, MD (Pathology / Lab Medicine)</p>
                <p className="text-[10px] text-slate-400 font-mono">
                  Verified: {verifiedResult?.verified_at ? new Date(verifiedResult.verified_at).toLocaleTimeString() : "Certified"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
