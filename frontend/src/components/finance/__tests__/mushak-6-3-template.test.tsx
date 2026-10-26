import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Mushak63Printable, Mushak63Data } from "../mushak-6-3-printable";

const mockMushakData: Mushak63Data = {
  registered_person: {
    name: "WBSOFT TECH LTD",
    bin: "001234567-0101",
    address: "Gulshan-2, Dhaka-1212, Bangladesh",
    issue_venue: "Dhaka",
  },
  header: {
    mushak_number: "M6.3-001234567-0101-20262027-000042",
    invoice_number: "INV-202610-00003",
    issue_date: "26.10.2026",
    issue_time: "11:30 AM",
    so_number: "SO-2026-9021",
    bill_number: "BILL-9021",
  },
  buyer: {
    name: "Rahim Chowdhury",
    bin: "9988776655-0202",
    address: "House 14, Road 5, Dhanmondi, Dhaka",
    delivery_destination: "Dhanmondi, Dhaka",
    vehicle_nature_number: "Covered Van - DHA-11-2024",
  },
  lines: [
    {
      sl_no: 1,
      description: "Premium Leather Office Chair",
      uom: "Pcs",
      quantity: 2,
      unit_price: 15000,
      total_price: 30000,
      sd_rate: "",
      sd_amount: "",
      vat_rate: 15,
      vat_amount: 4500,
      price_incl_duties_taxes: 34500,
    },
    {
      sl_no: 2,
      description: "Executive Wooden Desk",
      uom: "Pcs",
      quantity: 1,
      unit_price: 25000,
      total_price: 25000,
      sd_rate: 5,
      sd_amount: 1250,
      vat_rate: 15,
      vat_amount: 3937.5,
      price_incl_duties_taxes: 30187.5,
    },
  ],
  summary: {
    total_quantity: 3,
    total_price: 55000,
    total_sd: 1250,
    total_vat: 8437.5,
    total_payable: 64687.5,
    total_in_words: "Sixty-four thousand six hundred eighty-seven Taka and fifty Paisa only",
  },
  footer: {
    authorized_person_name: "Tanvir Ahmed",
    designation: "Head of Accounts & Taxation",
  },
};

describe("Mushak 6.3 Statutory Layout & 11-Column Table Conformance", () => {
  it("renders the exact statutory header and NBR references from the reference template", () => {
    render(<Mushak63Printable data={mockMushakData} />);

    // Top Header & Reference Note
    expect(screen.getByText("Government of the People's Republic of Bangladesh")).toBeInTheDocument();
    expect(screen.getByText("National Board of Revenue")).toBeInTheDocument();
    expect(screen.getByText("Tax Invoice")).toBeInTheDocument();
    expect(
      screen.getByText("[Note clause (c) and clause (f) of sub-rule (1) of rule 40]")
    ).toBeInTheDocument();

    // Musak 6.3 Box
    expect(screen.getByText(/Musak -/i)).toBeInTheDocument();
  });

  it("renders registered person details and buyer & invoice metadata in exact format", () => {
    render(<Mushak63Printable data={mockMushakData} />);

    // Registered Person
    expect(screen.getByText("Name of the registered person:")).toBeInTheDocument();
    expect(screen.getByText(/WBSOFT TECH LTD/)).toBeInTheDocument();
    expect(screen.getByText("BIN of the registered person:")).toBeInTheDocument();
    expect(screen.getAllByText(/001234567-0101/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Invoice Issue Address:")).toBeInTheDocument();
    expect(screen.getByText(/Gulshan-2, Dhaka-1212, Bangladesh/)).toBeInTheDocument();

    // Buyer Information
    expect(screen.getByText("Buyer's Name")).toBeInTheDocument();
    expect(screen.getByText("Rahim Chowdhury")).toBeInTheDocument();
    expect(screen.getByText("Buyer's BIN (If Applicable)")).toBeInTheDocument();
    expect(screen.getByText("9988776655-0202")).toBeInTheDocument();
    expect(screen.getByText("Delivery destination")).toBeInTheDocument();
    expect(screen.getByText("Dhanmondi, Dhaka")).toBeInTheDocument();
    expect(screen.getByText("Nature and number of vehicles")).toBeInTheDocument();
    expect(screen.getByText("Covered Van - DHA-11-2024")).toBeInTheDocument();

    // Invoice Header Metadata
    expect(screen.getByText("Invoice No")).toBeInTheDocument();
    expect(screen.getByText("M6.3-001234567-0101-20262027-000042")).toBeInTheDocument();
    expect(screen.getByText("Date of issue")).toBeInTheDocument();
    expect(screen.getByText("26.10.2026")).toBeInTheDocument();
    expect(screen.getByText("Time of issue")).toBeInTheDocument();
    expect(screen.getByText("11:30 AM")).toBeInTheDocument();
    expect(screen.getByText("SO No")).toBeInTheDocument();
    expect(screen.getByText("SO-2026-9021")).toBeInTheDocument();
    expect(screen.getByText("Bill No")).toBeInTheDocument();
    expect(screen.getByText("BILL-9021")).toBeInTheDocument();
  });

  it("renders the exact statutory 11 columns, headers, and column numbering 1 to 11", () => {
    render(<Mushak63Printable data={mockMushakData} />);

    // Column Headers
    expect(screen.getByText(/SL/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Description of the product or service/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Unit of supply")).toBeInTheDocument();
    expect(screen.getByText("Quantity")).toBeInTheDocument();
    expect(screen.getByText(/Unit Price/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Total Price/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Supplementary duty rate")).toBeInTheDocument();
    expect(screen.getByText(/Amount of Supplementary Duty/i)).toBeInTheDocument();
    expect(screen.getByText("Value Added Tax")).toBeInTheDocument();
    expect(screen.getByText(/Rate of Value Added Tax \/ Specific Tax/i)).toBeInTheDocument();
    expect(screen.getByText(/Amount of Value Added Tax \/ Specific Tax/i)).toBeInTheDocument();
    expect(screen.getByText("Price inclusive of all duties and taxes")).toBeInTheDocument();

    // Numbering row 1 to 11
    for (let i = 1; i <= 11; i++) {
      expect(screen.getAllByText(String(i)).length).toBeGreaterThanOrEqual(1);
    }

    // Line Items Data
    expect(screen.getByText("Premium Leather Office Chair")).toBeInTheDocument();
    expect(screen.getByText("Executive Wooden Desk")).toBeInTheDocument();

    // Summary Totals
    expect(screen.getByText("Total:")).toBeInTheDocument();
    expect(screen.getAllByText(/55000.00/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/8437.50/)).toBeInTheDocument();
    expect(screen.getByText(/64687.50/)).toBeInTheDocument();

    // Total in words
    expect(
      screen.getByText(/Total \(in word\): Sixty-four thousand six hundred eighty-seven Taka/i)
    ).toBeInTheDocument();

    // Footer & Signature
    expect(
      screen.getByText("Name of the person in charge of the organization authority:")
    ).toBeInTheDocument();
    expect(screen.getByText(/Tanvir Ahmed/)).toBeInTheDocument();
    expect(screen.getByText("Designation:")).toBeInTheDocument();
    expect(screen.getByText(/Head of Accounts & Taxation/)).toBeInTheDocument();
    expect(screen.getByText("Signature:")).toBeInTheDocument();
    expect(screen.getByText("Seal:")).toBeInTheDocument();
    expect(screen.getByText("Total Price without vat summary:")).toBeInTheDocument();
    expect(screen.getByText("* Price excluding all taxes")).toBeInTheDocument();
  });
});
