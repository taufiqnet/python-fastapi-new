"use client";

import React, { forwardRef } from "react";

export interface Mushak63Data {
  registered_person: {
    name: string;
    bin: string;
    address: string;
    issue_venue?: string | null;
  };
  header: {
    mushak_form?: string;
    title?: string;
    rule_note?: string;
    mushak_number: string;
    invoice_number: string;
    issue_date: string;
    issue_time: string;
    so_number?: string | null;
    bill_number?: string | null;
  };
  buyer: {
    name: string;
    bin?: string | null;
    address?: string | null;
    delivery_destination?: string | null;
    vehicle_nature_number?: string | null;
  };
  lines: Array<{
    sl_no: number;
    description: string;
    hs_code?: string | null;
    uom: string;
    quantity: number | string;
    unit_price: number | string;
    total_price: number | string;
    sd_rate: number | string;
    sd_amount: number | string;
    vat_rate: number | string;
    vat_amount: number | string;
    price_incl_duties_taxes: number | string;
    remarks?: string | null;
  }>;
  summary: {
    total_quantity?: number | string;
    total_price: number | string;
    total_sd: number | string;
    total_vat: number | string;
    total_payable: number | string;
    total_in_words?: string;
  };
  footer?: {
    authorized_person_name?: string;
    designation?: string;
    signature_note?: string;
  };
}

interface Mushak63PrintableProps {
  data: Mushak63Data;
}

export const Mushak63Printable = forwardRef<HTMLDivElement, Mushak63PrintableProps>(
  ({ data }, ref) => {
    const { registered_person, header, buyer, lines, summary, footer } = data;

    const formatNum = (val: number | string | undefined): string => {
      if (val === undefined || val === null) return "0.00";
      const num = typeof val === "string" ? parseFloat(val) : val;
      return isNaN(num) ? "0.00" : num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
      <div
        ref={ref}
        className="mushak-printable bg-white text-slate-900 p-8 max-w-[210mm] mx-auto text-xs leading-tight font-sans selection:bg-slate-200"
        style={{ minHeight: "297mm", boxSizing: "border-box" }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .mushak-printable {
              padding: 10mm !important;
              max-width: 100% !important;
              box-shadow: none !important;
              border: none !important;
              font-size: 10pt !important;
            }
            .no-print {
              display: none !important;
            }
            table {
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
          }
        `}} />

        {/* NBR Statutory Header */}
        <div className="text-center pb-3 border-b-2 border-slate-900">
          <p className="font-bold text-sm tracking-wide text-slate-800">
            গণপ্রজাতন্ত্রী বাংলাদেশ সরকার
          </p>
          <p className="text-[11px] text-slate-700">
            Government of the People&apos;s Republic of Bangladesh
          </p>
          <p className="font-extrabold text-base text-slate-950 mt-0.5">
            জাতীয় রাজস্ব বোর্ড
          </p>
          <p className="text-[11px] text-slate-700">
            National Board of Revenue (NBR)
          </p>
          
          <div className="mt-2 inline-block px-4 py-1 border border-slate-900 rounded font-black text-sm uppercase tracking-wider bg-slate-50">
            কর চালানপত্র (মূসক-৬.৩)
            <span className="block text-[10px] font-normal tracking-normal text-slate-700">
              [TAX INVOICE]
            </span>
          </div>

          <p className="text-[10px] text-slate-600 mt-1 font-medium">
            [বিধি ৪০ এর উপ-বিধি (১) এর দফা (গ) ও দফা (চ) দ্রষ্টব্য / See clauses (c) &amp; (f) of sub-rule (1) of rule 40]
          </p>
        </div>

        {/* Business & Challan Metadata Grid */}
        <div className="grid grid-cols-2 gap-4 my-3 text-[11px] border border-slate-300 p-2.5 rounded bg-slate-50/50">
          {/* Registered Person Details */}
          <div className="space-y-1 border-r border-slate-300 pr-3">
            <p className="font-bold text-slate-950 text-xs">
              নিবন্ধিত ব্যক্তির নাম (Registered Person):{" "}
              <span className="font-normal text-slate-800">{registered_person.name}</span>
            </p>
            <p className="font-bold text-slate-950">
              নিবন্ধিত ব্যক্তির বিআইএন (BIN):{" "}
              <span className="font-mono font-bold tracking-wider text-slate-900 bg-white px-1.5 py-0.5 border border-slate-300 rounded">
                {registered_person.bin || "N/A"}
              </span>
            </p>
            <p className="text-slate-700">
              <span className="font-semibold text-slate-900">চালানপত্র প্রদানের স্থান ও ঠিকানা:</span>{" "}
              {registered_person.address}
            </p>
          </div>

          {/* Challan Serial & Date */}
          <div className="space-y-1 pl-1">
            <p className="font-bold text-slate-950">
              চালানপত্র নম্বর (Challan No):{" "}
              <span className="font-mono font-extrabold text-indigo-900 bg-indigo-50 px-2 py-0.5 border border-indigo-200 rounded">
                {header.mushak_number}
              </span>
            </p>
            <p className="text-slate-800">
              <span className="font-semibold text-slate-950">ইস্যুর তারিখ (Issue Date):</span>{" "}
              {header.issue_date}
            </p>
            <p className="text-slate-800">
              <span className="font-semibold text-slate-950">ইস্যুর সময় (Issue Time):</span>{" "}
              {header.issue_time}
            </p>
            <p className="text-slate-800">
              <span className="font-semibold text-slate-950">ইনভয়েস রেফারেন্স (Invoice Ref):</span>{" "}
              <span className="font-mono">{header.invoice_number}</span>
            </p>
          </div>
        </div>

        {/* Buyer Details Box */}
        <div className="border border-slate-300 p-2.5 rounded mb-3 text-[11px] space-y-1 bg-white">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-bold text-slate-950">
                ক্রেতার নাম (Buyer Name):{" "}
                <span className="font-semibold text-slate-900">{buyer.name || "Walk-in Retail Buyer"}</span>
              </p>
              <p className="text-slate-800">
                <span className="font-semibold text-slate-950">ক্রেতার বিআইএন / এনআইডি (BIN/NID):</span>{" "}
                <span className="font-mono">{buyer.bin || "Unregistered Retail Consumer"}</span>
              </p>
              <p className="text-slate-700">
                <span className="font-semibold text-slate-950">ক্রেতার ঠিকানা (Buyer Address):</span>{" "}
                {buyer.address || "Dhaka, Bangladesh"}
              </p>
            </div>
            <div>
              <p className="text-slate-800">
                <span className="font-semibold text-slate-950">সরবরাহের গন্তব্যস্থল (Destination):</span>{" "}
                {buyer.delivery_destination || buyer.address || "Premises Delivery"}
              </p>
              <p className="text-slate-800">
                <span className="font-semibold text-slate-950">যানবাহনের প্রকৃতি ও নম্বর (Vehicle Details):</span>{" "}
                {buyer.vehicle_nature_number || "Direct Handover / Courier"}
              </p>
            </div>
          </div>
        </div>

        {/* Statutory 11-Column Table */}
        <div className="overflow-x-auto border border-slate-900 rounded-xs mb-3">
          <table className="w-full border-collapse text-[10px] text-left">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-900 text-slate-950 font-bold text-center divide-x divide-slate-400">
                <th className="p-1.5 w-7">১<br/><span className="text-[8px] font-normal">ক্রমিক</span></th>
                <th className="p-1.5 text-left min-w-[130px]">২<br/><span className="text-[8px] font-normal">পণ্য বা সেবার বর্ণনা</span></th>
                <th className="p-1.5 w-16">৩<br/><span className="text-[8px] font-normal">এইচ.এস. কোড</span></th>
                <th className="p-1.5 w-10">৪<br/><span className="text-[8px] font-normal">একক</span></th>
                <th className="p-1.5 w-12 text-right">৫<br/><span className="text-[8px] font-normal">পরিমাণ</span></th>
                <th className="p-1.5 w-16 text-right">৬<br/><span className="text-[8px] font-normal">একক মূল্য (টাকা)</span></th>
                <th className="p-1.5 w-18 text-right">৭<br/><span className="text-[8px] font-normal">মোট মূল্য (টাকা)</span></th>
                <th className="p-1.5 w-16 text-right">৮<br/><span className="text-[8px] font-normal">সম্পূরক শুল্ক</span></th>
                <th className="p-1.5 w-18 text-right">৯<br/><span className="text-[8px] font-normal">মূসক (VAT)</span></th>
                <th className="p-1.5 w-20 text-right">১০<br/><span className="text-[8px] font-normal">করসহ মূল্য</span></th>
                <th className="p-1.5 w-14">১১<br/><span className="text-[8px] font-normal">মন্তব্য</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {lines.map((line, idx) => (
                <tr key={idx} className="divide-x divide-slate-300 hover:bg-slate-50/50">
                  <td className="p-1.5 text-center font-mono text-[9px]">{line.sl_no}</td>
                  <td className="p-1.5 text-left font-medium text-slate-900">{line.description}</td>
                  <td className="p-1.5 text-center font-mono text-[9px] text-slate-600">
                    {line.hs_code || "9900.00.00"}
                  </td>
                  <td className="p-1.5 text-center uppercase text-[9px] text-slate-600">{line.uom}</td>
                  <td className="p-1.5 text-right font-mono">{formatNum(line.quantity)}</td>
                  <td className="p-1.5 text-right font-mono">{formatNum(line.unit_price)}</td>
                  <td className="p-1.5 text-right font-mono font-semibold">{formatNum(line.total_price)}</td>
                  <td className="p-1.5 text-right font-mono">
                    <span className="text-[8px] text-slate-500 block">{formatNum(line.sd_rate)}%</span>
                    {formatNum(line.sd_amount)}
                  </td>
                  <td className="p-1.5 text-right font-mono">
                    <span className="text-[8px] text-slate-500 block">{formatNum(line.vat_rate)}%</span>
                    {formatNum(line.vat_amount)}
                  </td>
                  <td className="p-1.5 text-right font-mono font-bold text-slate-950">
                    {formatNum(line.price_incl_duties_taxes)}
                  </td>
                  <td className="p-1.5 text-center text-[9px] text-slate-500">{line.remarks || "-"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-900 font-bold text-slate-950 divide-x divide-slate-400">
                <td colSpan={6} className="p-2 text-right uppercase tracking-wider text-[11px]">
                  সর্বমোট (Total):
                </td>
                <td className="p-2 text-right font-mono text-[11px]">
                  {formatNum(summary.total_price)}
                </td>
                <td className="p-2 text-right font-mono text-[11px]">
                  {formatNum(summary.total_sd)}
                </td>
                <td className="p-2 text-right font-mono text-[11px]">
                  {formatNum(summary.total_vat)}
                </td>
                <td className="p-2 text-right font-mono text-xs font-black text-slate-950">
                  {formatNum(summary.total_payable)}
                </td>
                <td className="p-2 text-center text-[9px] text-slate-500">BDT</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Amount in words */}
        <div className="p-2 border border-slate-300 rounded bg-slate-50/75 mb-6 text-[11px]">
          <span className="font-bold text-slate-950">কথায় (In Words):</span>{" "}
          <span className="font-semibold text-slate-900 capitalize">
            {summary.total_in_words || "Zero Taka Only"}
          </span>
        </div>

        {/* Footer & Signature Section */}
        <div className="pt-8 grid grid-cols-2 gap-8 text-[11px]">
          <div>
            <p className="text-[10px] text-slate-500 italic leading-relaxed">
              * বিশেষ দ্রষ্টব্য: মূল্য সংযোজন কর ও সম্পূরক শুল্ক আইন, ২০১২ এবং মূল্য সংযোজন কর ও সম্পূরক শুল্ক বিধিমালা, ২০১৬ মোতাবেক ইস্যুকৃত বিধিবদ্ধ কর চালানপত্র। ইহা কর রেয়াত গ্রহণের জন্য ব্যবহারযোগ্য।
            </p>
            <p className="text-[9px] text-slate-400 mt-2 font-mono">
              System Generated • ProERP Bangladesh Statutory VAT Compliance Module
            </p>
          </div>

          <div className="text-center space-y-1 flex flex-col items-center justify-end">
            <div className="w-48 border-b border-slate-900 pb-1"></div>
            <p className="font-bold text-slate-950">
              {footer?.authorized_person_name || "দায়িত্বপ্রাপ্ত কর্মকর্তার স্বাক্ষর ও নাম"}
            </p>
            <p className="text-slate-600 text-[10px]">
              {footer?.designation || "Authorized Officer Signature & Seal"}
            </p>
          </div>
        </div>
      </div>
    );
  }
);

Mushak63Printable.displayName = "Mushak63Printable";
