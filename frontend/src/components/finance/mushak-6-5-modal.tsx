"use client";

import React, { useRef } from "react";
import { X, Printer, ArrowRightLeft, Building2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

export interface Mushak65TransferData {
  transferNumber: string;
  transferDate: string;
  sourceWarehouse: string;
  destWarehouse: string;
  itemsCount: number;
  vehicleDetails?: string;
  driverName?: string;
  notes?: string;
}

interface Mushak65ModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Mushak65TransferData | null;
}

export function Mushak65Modal({ isOpen, onClose, data }: Mushak65ModalProps) {
  const printableRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Controls Bar */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                পণ্য স্থানান্তর চালানপত্র (মূসক-৬.৫)
                <span className="text-[11px] font-normal text-slate-400">NBR Transfer Chalan</span>
              </h3>
              <p className="text-[11px] font-mono text-emerald-300">
                Challan #{data.transferNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs transition shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Chalan</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Mushak 6.5 Document */}
        <div
          ref={printableRef}
          className="p-8 overflow-y-auto space-y-4 text-xs font-sans text-slate-900 bg-white print:p-4"
        >
          {/* Statutory Header */}
          <div className="text-center pb-3 border-b-2 border-slate-900">
            <p className="font-bold text-sm tracking-wide text-slate-800">
              গণপ্রজাতন্ত্রী বাংলাদেশ সরকার, জাতীয় রাজস্ব বোর্ড
            </p>
            <p className="text-[11px] text-slate-600">
              Government of the People&apos;s Republic of Bangladesh, National Board of Revenue
            </p>
            <div className="mt-2 inline-block px-4 py-1 border border-slate-900 rounded font-black text-sm uppercase tracking-wider bg-slate-50">
              নির্দিষ্ট স্থান/শাখা/গুদাম হইতে পণ্য স্থানান্তর কর চালানপত্র (মূসক-৬.৫)
            </div>
            <p className="text-[10px] text-slate-600 mt-1 font-medium">
              [মূল্য সংযোজন কর ও সম্পূরক শুল্ক বিধিমালা, ২০১৬ এর বিধি ৪০ এর উপ-বিধি (১) এর দফা (গ) দ্রষ্টব্য]
            </p>
          </div>

          {/* Business & BIN details */}
          <div className="grid grid-cols-2 gap-4 border border-slate-300 p-3 rounded bg-slate-50/50 text-[11px]">
            <div className="space-y-1 border-r border-slate-300 pr-3">
              <p className="font-bold text-slate-950">
                নিবন্ধিত প্রতিষ্ঠানের নাম: <span className="font-normal">ProERP Global Enterprise Ltd.</span>
              </p>
              <p className="font-bold text-slate-950">
                কেন্দ্রীয় বিআইএন (BIN):{" "}
                <span className="font-mono bg-white px-1.5 py-0.5 border border-slate-300 rounded">
                  001234567-0101
                </span>
              </p>
              <p className="text-slate-700">
                <span className="font-semibold text-slate-900">প্রেরক গুদাম / শাখা (Origin):</span>{" "}
                {data.sourceWarehouse}
              </p>
            </div>

            <div className="space-y-1 pl-1">
              <p className="font-bold text-slate-950">
                স্থানান্তর চালান নং:{" "}
                <span className="font-mono font-bold text-emerald-900 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200 rounded">
                  M6.5-{data.transferNumber}
                </span>
              </p>
              <p className="text-slate-800">
                <span className="font-semibold text-slate-950">ইস্যুর তারিখ ও সময়:</span>{" "}
                {formatDate(data.transferDate)}
              </p>
              <p className="text-slate-700">
                <span className="font-semibold text-slate-900">প্রাপক গুদাম / শাখা (Destination):</span>{" "}
                {data.destWarehouse}
              </p>
            </div>
          </div>

          {/* Transport Info */}
          <div className="border border-slate-300 p-2.5 rounded bg-white text-[11px] flex justify-between">
            <div>
              <span className="font-bold text-slate-950">পরিবহনের মাধ্যম ও গাড়ির নম্বর:</span>{" "}
              {data.vehicleDetails || "Covered Van (ঢাকা মেট্রো-উ ১১-২৪৬৭)"}
            </div>
            <div>
              <span className="font-bold text-slate-950">চালকের নাম:</span>{" "}
              {data.driverName || "Md. Rafiqul Islam"}
            </div>
          </div>

          {/* Itemized Table */}
          <div className="border border-slate-900 rounded-xs overflow-hidden">
            <table className="w-full border-collapse text-[10px] text-left">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-900 text-slate-950 font-bold text-center divide-x divide-slate-400">
                  <th className="p-2 w-8">ক্রমিক</th>
                  <th className="p-2 text-left">পণ্য বা দ্রব্যের বর্ণনা</th>
                  <th className="p-2 w-20">এইচ.এস. কোড</th>
                  <th className="p-2 w-16">একক</th>
                  <th className="p-2 w-20 text-right">পরিমাণ</th>
                  <th className="p-2 w-28 text-right">প্রাক্কলিত মূল্য (টাকায়)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                <tr className="divide-x divide-slate-300">
                  <td className="p-2 text-center font-mono">১</td>
                  <td className="p-2 font-medium text-slate-900">
                    স্থানান্তরিত বাণিজ্যিক পণ্যসম্ভার (Batch Inter-Branch Goods)
                  </td>
                  <td className="p-2 text-center font-mono">9900.00.00</td>
                  <td className="p-2 text-center uppercase font-mono">PCS</td>
                  <td className="p-2 text-right font-mono font-bold">{data.itemsCount}</td>
                  <td className="p-2 text-right font-mono text-slate-800">Internal Stock Movement</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legal Note & Signatures */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-[11px]">
            <div>
              <p className="text-[10px] text-slate-500 italic leading-relaxed">
                * মূসক ও সম্পূরক শুল্ক আইন, ২০১২ এর ধারা ৩২ এবং বিধিমালা ২০১৬ এর বিধি ৪০(১)(গ) অনুসারে এক শাখা/গুদাম হইতে অন্য শাখা/গুদামে পণ্য পরিবহনের সময় এই চালানপত্র সঙ্গে রাখা বাধ্যতামূলক।
              </p>
            </div>

            <div className="text-center space-y-1 flex flex-col items-center justify-end">
              <div className="w-48 border-b border-slate-900 pb-1"></div>
              <p className="font-bold text-slate-950">গুদাম কর্মকর্তা / প্রেরণকারী প্রতিনিধির স্বাক্ষর ও সিল</p>
              <p className="text-slate-600 text-[10px]">Authorized Dispatcher Signature &amp; Date</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
