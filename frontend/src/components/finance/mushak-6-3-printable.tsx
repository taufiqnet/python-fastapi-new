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
  showPrintButton?: boolean;
}

export const Mushak63Printable = forwardRef<HTMLDivElement, Mushak63PrintableProps>(
  ({ data, showPrintButton = false }, ref) => {
    const { registered_person, header, buyer, lines, summary, footer } = data;

    const formatPrice = (val: number | string | undefined | null): string => {
      if (val === undefined || val === null || val === "") return "";
      const num = typeof val === "string" ? parseFloat(val) : Number(val);
      return isNaN(num) ? "0.00" : num.toFixed(2);
    };

    const formatQty = (val: number | string | undefined | null): string => {
      if (val === undefined || val === null || val === "") return "0";
      const num = typeof val === "string" ? parseFloat(val) : Number(val);
      if (isNaN(num)) return "0";
      return Number.isInteger(num) ? num.toFixed(0) : num.toFixed(2);
    };

    const formatRate = (val: number | string | undefined | null): string => {
      if (val === undefined || val === null || val === "") return "";
      const num = typeof val === "string" ? parseFloat(val) : Number(val);
      if (isNaN(num)) return "";
      return Number.isInteger(num) ? num.toFixed(0) : num.toFixed(2);
    };

    return (
      <div
        ref={ref}
        className="mushak-template-container bg-white text-black p-4 sm:p-6 mx-auto"
        style={{
          fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
          fontSize: "11px",
          color: "#000",
          backgroundColor: "#fff",
          maxWidth: "800px",
          lineHeight: "1.4",
          boxSizing: "border-box",
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @page {
            size: A4 portrait;
            margin: 12mm 10mm 12mm 10mm;
          }
          @media print {
            body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .mushak-template-container {
              max-width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
              font-size: 11px !important;
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

        {/* Optional Action Bar */}
        {showPrintButton && (
          <div className="no-print mb-4 text-right">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition shadow-xs"
            >
              Print / Save PDF
            </button>
          </div>
        )}

        {/* Top Header Table */}
        <table className="w-full border-collapse mb-2" style={{ borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ width: "20%", verticalAlign: "top", textAlign: "left", fontWeight: "bold", fontSize: "12px" }}>
                BD Logo
              </td>
              <td style={{ width: "60%", verticalAlign: "top", textAlign: "center" }}>
                <div style={{ fontWeight: "bold", fontSize: "13px" }}>
                  Government of the People&apos;s Republic of Bangladesh
                </div>
                <div style={{ fontWeight: "bold", fontSize: "12px" }}>
                  National Board of Revenue
                </div>
                <div style={{ fontWeight: "bold", fontSize: "15px", marginTop: "4px" }}>
                  Tax Invoice
                </div>
                <div style={{ fontWeight: "bold", fontSize: "11px", marginTop: "2px" }}>
                  [Note clause (c) and clause (f) of sub-rule (1) of rule 40]
                </div>
              </td>
              <td style={{ width: "20%", verticalAlign: "top", textAlign: "right" }}>
                <div
                  style={{
                    border: "2px solid #000",
                    padding: "4px 10px",
                    fontWeight: "bold",
                    fontSize: "13px",
                    textAlign: "center",
                    display: "inline-block",
                    lineHeight: "1.2",
                  }}
                >
                  Musak -<br />6.3
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Registered Person Info */}
        <div style={{ textAlign: "center", fontSize: "12px", marginBottom: "15px", lineHeight: "1.5" }}>
          <div><strong>Name of the registered person:</strong> {registered_person.name}</div>
          <div><strong>BIN of the registered person:</strong> {registered_person.bin}</div>
          <div><strong>Invoice Issue Address:</strong> {registered_person.address}</div>
        </div>

        {/* Buyer & Invoice Info Table */}
        <table className="w-full border-collapse mb-3.5" style={{ borderCollapse: "collapse", fontSize: "11px", lineHeight: "1.6" }}>
          <tbody>
            <tr>
              <td style={{ width: "55%", verticalAlign: "top", padding: "2px 0" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "42%", verticalAlign: "top", padding: "1px 0" }}>
                        <strong>Buyer&apos;s Name</strong>
                      </td>
                      <td style={{ width: "5%", verticalAlign: "top", padding: "1px 0" }}>:</td>
                      <td style={{ width: "53%", verticalAlign: "top", padding: "1px 0" }}>
                        <strong>{buyer.name}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>
                        <strong>Buyer&apos;s BIN (If Applicable)</strong>
                      </td>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>:</td>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>
                        {buyer.bin || ""}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>
                        <strong>Buyer&apos;s address</strong>
                      </td>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>:</td>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>
                        {buyer.address || "-"}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>
                        <strong>Delivery destination</strong>
                      </td>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>:</td>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>
                        {buyer.delivery_destination || "-"}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>
                        <strong>Nature and number of vehicles</strong>
                      </td>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>:</td>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>
                        <strong>{buyer.vehicle_nature_number || "-"}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>

              <td style={{ width: "45%", verticalAlign: "top", padding: "2px 0" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "35%", verticalAlign: "top", padding: "1px 0" }}>
                        <strong>Invoice No</strong>
                      </td>
                      <td style={{ width: "5%", verticalAlign: "top", padding: "1px 0" }}>:</td>
                      <td style={{ width: "60%", verticalAlign: "top", padding: "1px 0" }}>
                        <strong>{header.mushak_number || header.invoice_number}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>
                        <strong>Date of issue</strong>
                      </td>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>:</td>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>
                        <strong>{header.issue_date}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>
                        <strong>Time of issue</strong>
                      </td>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>:</td>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>
                        <strong>{header.issue_time}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>
                        <strong>SO No</strong>
                      </td>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>:</td>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>
                        <strong>{header.so_number || "-"}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>
                        <strong>Bill No</strong>
                      </td>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>:</td>
                      <td style={{ verticalAlign: "top", padding: "1px 0" }}>
                        <strong>{header.bill_number || header.so_number || "-"}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Statutory 11-Column Items Table */}
        <table
          className="w-full border-collapse mb-4"
          style={{ width: "100%", borderCollapse: "collapse", marginBottom: "15px" }}
        >
          <thead>
            <tr>
              <th
                rowSpan={2}
                style={{
                  width: "4%",
                  border: "1px solid #000",
                  padding: "4px 5px",
                  fontSize: "10px",
                  fontWeight: "bold",
                  textAlign: "center",
                  verticalAlign: "middle",
                  backgroundColor: "#fff",
                }}
              >
                SL<br />No.
              </th>
              <th
                rowSpan={2}
                style={{
                  width: "22%",
                  border: "1px solid #000",
                  padding: "4px 5px",
                  fontSize: "10px",
                  fontWeight: "bold",
                  textAlign: "center",
                  verticalAlign: "middle",
                  backgroundColor: "#fff",
                }}
              >
                Description of the product or service<br />(including brand name as applicable)
              </th>
              <th
                rowSpan={2}
                style={{
                  width: "7%",
                  border: "1px solid #000",
                  padding: "4px 5px",
                  fontSize: "10px",
                  fontWeight: "bold",
                  textAlign: "center",
                  verticalAlign: "middle",
                  backgroundColor: "#fff",
                }}
              >
                Unit of supply
              </th>
              <th
                rowSpan={2}
                style={{
                  width: "6%",
                  border: "1px solid #000",
                  padding: "4px 5px",
                  fontSize: "10px",
                  fontWeight: "bold",
                  textAlign: "center",
                  verticalAlign: "middle",
                  backgroundColor: "#fff",
                }}
              >
                Quantity
              </th>
              <th
                rowSpan={2}
                style={{
                  width: "9%",
                  border: "1px solid #000",
                  padding: "4px 5px",
                  fontSize: "10px",
                  fontWeight: "bold",
                  textAlign: "center",
                  verticalAlign: "middle",
                  backgroundColor: "#fff",
                }}
              >
                Unit Price<br />(In Taka)
              </th>
              <th
                rowSpan={2}
                style={{
                  width: "10%",
                  border: "1px solid #000",
                  padding: "4px 5px",
                  fontSize: "10px",
                  fontWeight: "bold",
                  textAlign: "center",
                  verticalAlign: "middle",
                  backgroundColor: "#fff",
                }}
              >
                Total Price<br />(In Taka)
              </th>
              <th
                rowSpan={2}
                style={{
                  width: "8%",
                  border: "1px solid #000",
                  padding: "4px 5px",
                  fontSize: "10px",
                  fontWeight: "bold",
                  textAlign: "center",
                  verticalAlign: "middle",
                  backgroundColor: "#fff",
                }}
              >
                Supplementary duty rate
              </th>
              <th
                rowSpan={2}
                style={{
                  width: "9%",
                  border: "1px solid #000",
                  padding: "4px 5px",
                  fontSize: "10px",
                  fontWeight: "bold",
                  textAlign: "center",
                  verticalAlign: "middle",
                  backgroundColor: "#fff",
                }}
              >
                Amount of Supplementary Duty<br />(in taka)
              </th>
              <th
                colSpan={2}
                style={{
                  width: "15%",
                  border: "1px solid #000",
                  padding: "4px 5px",
                  fontSize: "10px",
                  fontWeight: "bold",
                  textAlign: "center",
                  verticalAlign: "middle",
                  backgroundColor: "#fff",
                }}
              >
                Value Added Tax
              </th>
              <th
                rowSpan={2}
                style={{
                  width: "10%",
                  border: "1px solid #000",
                  padding: "4px 5px",
                  fontSize: "10px",
                  fontWeight: "bold",
                  textAlign: "center",
                  verticalAlign: "middle",
                  backgroundColor: "#fff",
                }}
              >
                Price inclusive of all duties and taxes
              </th>
            </tr>
            <tr>
              <th
                style={{
                  width: "7%",
                  border: "1px solid #000",
                  padding: "4px 5px",
                  fontSize: "10px",
                  fontWeight: "bold",
                  textAlign: "center",
                  verticalAlign: "middle",
                  backgroundColor: "#fff",
                }}
              >
                Rate of Value Added Tax / Specific Tax
              </th>
              <th
                style={{
                  width: "8%",
                  border: "1px solid #000",
                  padding: "4px 5px",
                  fontSize: "10px",
                  fontWeight: "bold",
                  textAlign: "center",
                  verticalAlign: "middle",
                  backgroundColor: "#fff",
                }}
              >
                Amount of Value Added Tax / Specific Tax<br />(in taka)
              </th>
            </tr>
            <tr>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((colNum) => (
                <th
                  key={colNum}
                  style={{
                    border: "1px solid #000",
                    padding: "3px 4px",
                    fontSize: "10px",
                    fontWeight: "bold",
                    textAlign: "center",
                    backgroundColor: "#fff",
                  }}
                >
                  {colNum}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((item, idx) => (
              <tr key={idx}>
                <td style={{ border: "1px solid #000", padding: "4px 5px", fontSize: "10px", textAlign: "center" }}>
                  {item.sl_no}
                </td>
                <td style={{ border: "1px solid #000", padding: "4px 5px", fontSize: "10px", fontWeight: "bold" }}>
                  {item.description}
                </td>
                <td style={{ border: "1px solid #000", padding: "4px 5px", fontSize: "10px", textAlign: "center" }}>
                  {item.uom}
                </td>
                <td style={{ border: "1px solid #000", padding: "4px 5px", fontSize: "10px", textAlign: "center" }}>
                  {formatQty(item.quantity)}
                </td>
                <td style={{ border: "1px solid #000", padding: "4px 5px", fontSize: "10px", textAlign: "right" }}>
                  {formatPrice(item.unit_price)}
                </td>
                <td style={{ border: "1px solid #000", padding: "4px 5px", fontSize: "10px", textAlign: "right" }}>
                  {formatPrice(item.total_price)}
                </td>
                <td style={{ border: "1px solid #000", padding: "4px 5px", fontSize: "10px", textAlign: "center" }}>
                  {item.sd_rate ? formatRate(item.sd_rate) : ""}
                </td>
                <td style={{ border: "1px solid #000", padding: "4px 5px", fontSize: "10px", textAlign: "right" }}>
                  {item.sd_amount ? formatPrice(item.sd_amount) : ""}
                </td>
                <td style={{ border: "1px solid #000", padding: "4px 5px", fontSize: "10px", textAlign: "center" }}>
                  {item.vat_rate ? formatRate(item.vat_rate) : ""}
                </td>
                <td style={{ border: "1px solid #000", padding: "4px 5px", fontSize: "10px", textAlign: "right" }}>
                  {formatPrice(item.vat_amount)}
                </td>
                <td style={{ border: "1px solid #000", padding: "4px 5px", fontSize: "10px", textAlign: "right", fontWeight: "bold" }}>
                  {formatPrice(item.price_incl_duties_taxes)}
                </td>
              </tr>
            ))}
            <tr style={{ fontWeight: "bold" }}>
              <td colSpan={3} style={{ border: "1px solid #000", padding: "4px 5px", fontSize: "10px", textAlign: "right" }}>
                Total:
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 5px", fontSize: "10px", textAlign: "center" }}>
                {formatQty(summary.total_quantity)}
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 5px", fontSize: "10px" }}></td>
              <td style={{ border: "1px solid #000", padding: "4px 5px", fontSize: "10px", textAlign: "right" }}>
                {formatPrice(summary.total_price)}
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 5px", fontSize: "10px" }}></td>
              <td style={{ border: "1px solid #000", padding: "4px 5px", fontSize: "10px", textAlign: "right" }}>
                {summary.total_sd ? formatPrice(summary.total_sd) : ""}
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 5px", fontSize: "10px" }}></td>
              <td style={{ border: "1px solid #000", padding: "4px 5px", fontSize: "10px", textAlign: "right" }}>
                {formatPrice(summary.total_vat)}
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 5px", fontSize: "10px", textAlign: "right" }}>
                {formatPrice(summary.total_payable)}
              </td>
            </tr>
            <tr>
              <td
                colSpan={11}
                style={{
                  border: "1px solid #000",
                  padding: "6px 10px",
                  fontSize: "10px",
                  fontWeight: "bold",
                  textAlign: "right",
                }}
              >
                Total (in word): {summary.total_in_words || ""}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Footer Grid */}
        <div
          style={{
            marginTop: "25px",
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            fontSize: "11px",
            lineHeight: "1.6",
          }}
        >
          <div>
            <div>
              <strong>Name of the person in charge of the organization authority:</strong>{" "}
              {footer?.authorized_person_name || "Authorized Officer"}
            </div>
            <div>
              <strong>Designation:</strong> {footer?.designation || "Executive"}
            </div>
            <div>
              <strong>Signature:</strong>
            </div>
            <div>
              <strong>Seal:</strong>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div>
              <strong>Total Price without vat summary:</strong> {formatPrice(summary.total_price)}
            </div>
          </div>
        </div>

        <div style={{ marginTop: "25px", fontSize: "10px", fontStyle: "italic" }}>
          * Price excluding all taxes
        </div>
      </div>
    );
  }
);

Mushak63Printable.displayName = "Mushak63Printable";
