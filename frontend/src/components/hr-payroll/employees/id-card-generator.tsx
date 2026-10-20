"use client";

import React, { useState, useEffect } from "react";
import {
  Printer,
  RotateCw,
  QrCode,
  Shield,
  Building,
  Phone,
  Droplet,
  Barcode as BarcodeIcon,
  CreditCard,
  CheckCircle2,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { IDCardDataOut, EmployeeOut } from "@/types";
import { apiClient } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

interface IDCardGeneratorProps {
  employee: EmployeeOut;
}

export function IDCardGenerator({ employee }: IDCardGeneratorProps) {
  const [cardData, setCardData] = useState<IDCardDataOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [currentSide, setCurrentSide] = useState<"front" | "back">("front");

  useEffect(() => {
    async function fetchCard() {
      setLoading(true);
      try {
        const res = await apiClient.get<IDCardDataOut>(`/employees/${employee.id}/id-card`);
        setCardData(res.data);
      } catch (err) {
        console.error("Failed to load ID card data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCard();
  }, [employee.id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
        <p className="text-xs font-semibold text-slate-600 mt-2">Loading Smart ID Badge data...</p>
      </div>
    );
  }

  const data = cardData || {
    employee_id: employee.employee_id,
    full_name: employee.full_name,
    bangla_name: employee.bangla_name,
    photo_url: employee.photo_url,
    job_title: employee.job_title_name,
    department: employee.department_name,
    branch: employee.branch_name,
    blood_group: employee.blood_group,
    emergency_contact_phone: employee.emergency_contact_phone || employee.phone,
    joining_date: employee.start_date,
    biometric_user_id: employee.biometric_user_id,
    rfid_card_number: employee.rfid_card_number,
    company_name: "Onoda Conglomerate Group Ltd.",
    company_address: "Gulshan-2, Dhaka-1212, Bangladesh",
    company_logo_url: null,
    verification_url: `/verify/emp/${employee.employee_id}`,
  };

  return (
    <div className="space-y-6">
      {/* Control Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            CR80 Smart Employee ID Card Generator
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Standard ISO/IEC 7810 CR80 PVC specification (85.60 × 53.98 mm) with dynamic QR security & turnstile barcode.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Orientation Toggle */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setOrientation("portrait")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                orientation === "portrait"
                  ? "bg-white text-indigo-600 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Portrait (Lanyard)
            </button>
            <button
              onClick={() => setOrientation("landscape")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                orientation === "landscape"
                  ? "bg-white text-indigo-600 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Landscape (Pocket)
            </button>
          </div>

          {/* Front / Back Side Flip */}
          <button
            onClick={() => setCurrentSide(currentSide === "front" ? "back" : "front")}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Flip to {currentSide === "front" ? "Back" : "Front"}
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition"
          >
            <Printer className="w-4 h-4" /> Print Badge
          </button>
        </div>
      </div>

      {/* Live Badge Preview Area */}
      <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-3xl min-h-[440px]">
        {/* Printable Card Wrapper */}
        <div id="print-area" className="relative transition-all duration-300">
          {orientation === "portrait" ? (
            /* ── CR80 PORTRAIT TEMPLATE (54mm x 86mm ratio) ───────────────────────── */
            <div
              className={`w-[320px] h-[510px] rounded-[22px] shadow-2xl border border-slate-300/80 bg-white overflow-hidden flex flex-col justify-between relative transition-transform ${
                currentSide === "front" ? "block" : "hidden"
              }`}
            >
              {/* Card Top Brand Banner */}
              <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 text-white p-5 pt-6 text-center relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-2 font-black text-sm tracking-wider border border-white/30 shadow-inner">
                  {data.company_name.substring(0, 2).toUpperCase()}
                </div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-100 truncate">
                  {data.company_name}
                </h4>
                <p className="text-[10px] text-indigo-200 font-medium tracking-wide">
                  {data.branch || "Corporate Headquarters"}
                </p>
              </div>

              {/* Photo & Identity */}
              <div className="flex-1 flex flex-col items-center justify-center px-5 py-4 text-center">
                <div className="relative mb-3">
                  <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-indigo-600/30 p-1 shadow-md overflow-hidden flex items-center justify-center">
                    {data.photo_url ? (
                      <img
                        src={data.photo_url}
                        alt={data.full_name}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-gradient-to-br from-indigo-100 to-slate-200 flex items-center justify-center text-indigo-800 text-2xl font-black">
                        {data.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {data.blood_group && (
                    <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-md border-2 border-white flex items-center gap-0.5">
                      <Droplet className="w-2.5 h-2.5 fill-white" /> {data.blood_group}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  {data.full_name}
                </h3>
                {data.bangla_name && (
                  <p className="text-xs font-semibold text-slate-600 font-bengali mt-0.5">
                    {data.bangla_name}
                  </p>
                )}

                <p className="text-xs font-bold text-indigo-600 mt-1">
                  {data.job_title || "Designation"}
                </p>
                <p className="text-[11px] font-semibold text-slate-500">
                  {data.department || "Department"}
                </p>

                {/* ID & Issue Meta */}
                <div className="mt-4 w-full bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-slate-600 block">Employee Code:</span>
                    <span className="font-mono font-bold text-slate-900 text-[11px]">
                      {data.employee_id}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 block">Joining Date:</span>
                    <span className="font-semibold text-slate-800">
                      {formatDate(data.joining_date)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer with Hologram & Access Strip */}
              <div className="bg-slate-100 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1 font-mono text-slate-600">
                  <BarcodeIcon className="w-4 h-4 text-slate-700" />
                  <span>BIO-{data.biometric_user_id || data.employee_id}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800">
                  Authorized
                </span>
              </div>
            </div>
          ) : (
            /* ── CR80 LANDSCAPE TEMPLATE (86mm x 54mm ratio) ──────────────────────── */
            <div
              className={`w-[510px] h-[320px] rounded-[22px] shadow-2xl border border-slate-300/80 bg-white overflow-hidden flex flex-col justify-between relative transition-transform ${
                currentSide === "front" ? "block" : "hidden"
              }`}
            >
              {/* Header Bar */}
              <div className="bg-gradient-to-r from-indigo-800 via-indigo-700 to-slate-900 text-white px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xs text-white">
                    {data.company_name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider">
                      {data.company_name}
                    </h4>
                    <p className="text-[10px] text-indigo-200">{data.branch || "Factory Plant / Depot"}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                  Smart Access Pass
                </span>
              </div>

              {/* Body */}
              <div className="flex-1 px-6 py-4 flex items-center gap-5">
                <div className="relative shrink-0">
                  <div className="w-24 h-28 rounded-2xl bg-slate-100 border-2 border-indigo-600/30 p-1 shadow-md overflow-hidden flex items-center justify-center">
                    {data.photo_url ? (
                      <img
                        src={data.photo_url}
                        alt={data.full_name}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-gradient-to-br from-indigo-100 to-slate-200 flex items-center justify-center text-indigo-800 text-3xl font-black">
                        {data.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {data.blood_group && (
                    <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-md border-2 border-white">
                      {data.blood_group}
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    {data.full_name}
                  </h3>
                  {data.bangla_name && (
                    <p className="text-xs font-semibold text-slate-600 font-bengali">
                      {data.bangla_name}
                    </p>
                  )}
                  <p className="text-xs font-bold text-indigo-600">
                    {data.job_title || "Designation"}
                  </p>
                  <p className="text-[11px] font-medium text-slate-500">
                    {data.department || "Department"}
                  </p>

                  <div className="pt-2 grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-600 block text-[10px]">Employee ID:</span>
                      <span className="font-mono font-bold text-slate-900">{data.employee_id}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 block text-[10px]">Biometric ID:</span>
                      <span className="font-mono font-semibold text-slate-800">{data.biometric_user_id || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Strip */}
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-2.5 flex items-center justify-between text-[10px]">
                <span className="font-mono text-slate-600">RFID: {data.rfid_card_number || "MIFARE-EM"}</span>
                <span className="text-slate-600">Joined: {formatDate(data.joining_date)}</span>
              </div>
            </div>
          )}

          {/* ── CARD BACK SIDE (Both Orientations) ─────────────────────────────────── */}
          <div
            className={`${
              orientation === "portrait" ? "w-[320px] h-[510px]" : "w-[510px] h-[320px]"
            } rounded-[22px] shadow-2xl border border-slate-300/80 bg-white p-6 flex flex-col justify-between text-center relative ${
              currentSide === "back" ? "block" : "hidden"
            }`}
          >
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Terms of Card Issuance
              </h4>
              <p className="text-[10px] text-slate-600 leading-relaxed text-justify px-2">
                This card is the property of <span className="font-bold">{data.company_name}</span>. It must be displayed while on premises and surrendered upon cessation of employment. If found, please return to the corporate address below.
              </p>
            </div>

            {/* Dynamic QR Verification Box */}
            <div className="my-auto flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="w-24 h-24 bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex items-center justify-center">
                {/* SVG QR Code Simulation */}
                <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                  <rect x="0" y="0" width="30" height="30" fill="currentColor" />
                  <rect x="5" y="5" width="20" height="20" fill="white" />
                  <rect x="10" y="10" width="10" height="10" fill="currentColor" />

                  <rect x="70" y="0" width="30" height="30" fill="currentColor" />
                  <rect x="75" y="5" width="20" height="20" fill="white" />
                  <rect x="80" y="10" width="10" height="10" fill="currentColor" />

                  <rect x="0" y="70" width="30" height="30" fill="currentColor" />
                  <rect x="5" y="75" width="20" height="20" fill="white" />
                  <rect x="10" y="80" width="10" height="10" fill="currentColor" />

                  <rect x="40" y="20" width="10" height="10" fill="currentColor" />
                  <rect x="55" y="20" width="10" height="10" fill="currentColor" />
                  <rect x="40" y="40" width="20" height="20" fill="currentColor" />
                  <rect x="70" y="50" width="10" height="20" fill="currentColor" />
                  <rect x="40" y="70" width="10" height="20" fill="currentColor" />
                  <rect x="60" y="80" width="20" height="10" fill="currentColor" />
                </svg>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-700 mt-2">
                Scan to Verify Employment
              </span>
              <span className="text-[9px] text-slate-600 font-mono">
                {data.verification_url}
              </span>
            </div>

            {/* Emergency & Address Footer */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[10px] text-slate-600">
              <p className="flex items-center justify-center gap-1 font-semibold text-rose-700">
                <Phone className="w-3 h-3 text-rose-600" />
                Emergency Hotline: {data.emergency_contact_phone || "01700000000"}
              </p>
              <p className="truncate text-slate-600">{data.company_address}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Stylesheet Hook */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: fixed;
            left: 0;
            top: 0;
            margin: 0;
            padding: 0;
            box-shadow: none;
            border: none;
          }
        }
      `}</style>
    </div>
  );
}
