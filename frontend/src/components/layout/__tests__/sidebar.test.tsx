import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Sidebar } from "../sidebar";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/hr-payroll/organization"),
}));

// Mock auth context
vi.mock("@/context/auth-context", () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 1,
      username: "admin",
      is_superuser: true,
      business_id: 101,
      business: { legal_name: "ProERP Enterprise" },
    },
    hasPermission: vi.fn(() => true),
    hasModuleAccess: vi.fn(() => true),
  })),
}));

describe("Sidebar Navigation Hierarchy & Sub-Grouping Audit", () => {
  it("renders HR & Payroll with all 6 functional sub-group category headers", () => {
    render(<Sidebar />);

    // Verify all 6 sub-group headers exist in the document
    expect(screen.getByText("Core HR & Workforce")).toBeInTheDocument();
    expect(screen.getByText("Time & Attendance")).toBeInTheDocument();
    expect(screen.getByText("Payroll & Compensation")).toBeInTheDocument();
    expect(screen.getByText("Letters & Onboarding")).toBeInTheDocument();
    expect(screen.getByText("Talent & Performance")).toBeInTheDocument();
    expect(screen.getByText("Lifecycle & Disciplinary")).toBeInTheDocument();
  });

  it("places Organization before Employees under Core HR", () => {
    render(<Sidebar />);

    const orgLink = screen.getByRole("link", { name: "Organization" });
    const empLink = screen.getByRole("link", { name: "Employees" });
    const docLink = screen.getByRole("link", { name: "Document Management" });

    expect(orgLink).toBeInTheDocument();
    expect(empLink).toBeInTheDocument();
    expect(docLink).toBeInTheDocument();

    expect(orgLink.getAttribute("href")).toBe("/hr-payroll/organization");
    expect(empLink.getAttribute("href")).toBe("/hr-payroll/employees");
    expect(docLink.getAttribute("href")).toBe("/hr-payroll/documents");
  });

  it("renders Travel & Expenses and Vehicle & Fleet as dedicated top-level modules", () => {
    render(<Sidebar />);

    // Travel & Expenses top module
    expect(screen.getByText("Travel & Expenses")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Travel Requests" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Expense Claims" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "DA & Conveyance Policies" })).toBeInTheDocument();

    // Vehicle & Fleet top module
    expect(screen.getByText("Vehicle & Fleet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fleet Overview" })).toHaveAttribute("href", "/fleet");
  });
});
