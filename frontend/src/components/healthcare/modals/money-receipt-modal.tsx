"use client";

import React from "react";
import { DiagnosticOrderOut } from "@/types";
import { X, Printer, CheckCircle2, QrCode, Barcode, Building2, User, Stethoscope } from "lucide-react";

interface MoneyReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: DiagnosticOrderOut | null;
}

export function MoneyReceiptModal({ isOpen, onClose, order }: MoneyReceiptModalProps) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = order.order_date
    ? new Date(order.order_date).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Control Bar (Hidden during print) */}
        <div className="px-6 py-3 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-xs">Diagnostic Invoice & Money Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="p-8 overflow-y-auto space-y-6 text-slate-900 print:p-0 print:m-0" id="money-receipt-print">
          {/* Header Banner */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-indigo-600 print:text-black" />
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                  METRO DIAGNOSTIC & CLINICAL COMPLEX
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Modern Pathology, Biochemistry, Radiology & OPD Consultation Center
              </p>
              <p className="text-[11px] text-slate-400">
                Hotline: +880 1700-000000 • Email: info@metrodiagnostic.com
              </p>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 text-[11px] font-black uppercase rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                MONEY RECEIPT
              </span>
              <p className="text-xs font-mono font-bold mt-2 text-slate-900">{order.order_number}</p>
              <p className="text-[11px] text-slate-500">{formattedDate}</p>
            </div>
          </div>

          {/* Patient & Doctor Demographics */}
          <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Patient Dossier
              </p>
              <p className="font-extrabold text-sm text-slate-900">
                {order.patient?.full_name || "Walk-In Patient"}
              </p>
              <div className="flex items-center gap-3 text-slate-600 text-[11px]">
                <span className="font-mono font-bold text-indigo-700">{order.patient?.uhid}</span>
                <span>•</span>
                <span>{order.patient?.phone}</span>
                {order.patient?.gender && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{order.patient.gender}</span>
                  </>
                )}
                {order.patient?.blood_group && (
                  <>
                    <span>•</span>
                    <span className="font-bold text-rose-600">{order.patient.blood_group}</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-1 text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Referring Doctor
              </p>
              <p className="font-bold text-slate-800">
                {order.referring_doctor?.full_name || "Self / Counter Request"}
              </p>
              <p className="text-[11px] text-slate-500">
                {order.referring_doctor?.specialization || "General Consultation"}
              </p>
            </div>
          </div>

          {/* Ordered Investigations Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 w-8">#</th>
                  <th className="py-2.5 px-3">Test Code</th>
                  <th className="py-2.5 px-3">Investigation Name</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Discount</th>
                  <th className="py-2.5 px-3 text-right">Net Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {order.items?.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-3 font-mono font-bold text-indigo-900">{item.test_code}</td>
                    <td className="py-2 px-3 text-slate-800">{item.test_name}</td>
                    <td className="py-2 px-3 text-right">৳{Number(item.unit_price).toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-slate-500">
                      {Number(item.discount) > 0 ? `৳${Number(item.discount).toLocaleString()}` : "-"}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      ৳{Number(item.net_price).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment Financial Summary */}
          <div className="flex items-start justify-between pt-2">
            <div className="text-xs text-slate-500 space-y-1">
              <p>Payment Method: <span className="font-bold uppercase text-slate-800">{order.payment_method}</span></p>
              {order.notes && <p>Notes: <span className="italic">{order.notes}</span></p>}
              <p className="text-[11px] text-slate-400 mt-2">
                * Please bring this receipt during sample collection and report delivery.
              </p>
            </div>

            <div className="w-56 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Gross):</span>
                <span>৳{Number(order.total_bill).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Total Discount:</span>
                <span>-৳{Number(order.discount_amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1">
                <span>Net Payable:</span>
                <span>৳{Number(order.net_amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Paid Amount:</span>
                <span>৳{Number(order.paid_amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-700 font-extrabold border-t border-dashed border-slate-300 pt-1">
                <span>Due Balance:</span>
                <span>৳{Number(order.due_amount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Phlebotomy Barcode Tube Labels */}
          {order.samples && order.samples.length > 0 && (
            <div className="pt-4 border-t-2 border-dashed border-slate-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-slate-700" />
                  Phlebotomy Specimen Tube Barcodes (Cut & Paste on Vial)
                </span>
                <span className="text-[10px] text-slate-400">
                  {order.samples.length} specimen tube(s) required
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {order.samples.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 border-2 border-slate-800 rounded-lg flex items-center justify-between bg-white text-xs"
                  >
                    <div>
                      <p className="font-extrabold text-[12px] text-slate-900 leading-tight">
                        {order.patient?.full_name}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">UHID: {order.patient?.uhid}</p>
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        {s.sample_type}
                      </span>
                    </div>

                    <div className="text-right">
                      {/* Barcode visual representation */}
                      <div className="h-6 w-24 bg-slate-900 rounded-xs flex items-center justify-center text-[10px] text-white font-mono tracking-widest">
                        ||||| ||| ||
                      </div>
                      <p className="text-[10px] font-mono font-bold mt-1 text-slate-800">{s.barcode}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Signature */}
          <div className="pt-10 flex items-end justify-between text-xs text-slate-500">
            <div className="text-center">
              <div className="w-36 border-t border-slate-400 pt-1">Patient / Attendant</div>
            </div>
            <div className="text-center">
              <div className="w-36 border-t border-slate-400 pt-1">Authorized Cashier</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
