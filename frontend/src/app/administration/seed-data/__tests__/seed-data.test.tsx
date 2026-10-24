import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SeedDataAdministrationPage from "../page";
import { apiClient } from "@/lib/api-client";

// Mock apiClient
vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("Administration - Seed Data Management Console", () => {
  const mockStatus = {
    business_id: 1,
    counts: {
      hrm: 35,
      vehicles: 18,
      ecommerce: 24,
      finance: 28,
      total: 105,
    },
    recent_batches: [
      {
        id: "batch-1",
        batch_code: "BATCH-HRM-1A2B3C",
        module: "hrm",
        status: "completed",
        record_count: 35,
        created_at: "2026-10-24T18:00:00Z",
        metadata_info: { employees: 5, departments: 5 },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders seed statistics, module cards, and batch history", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockStatus });

    render(<SeedDataAdministrationPage />);

    expect(screen.getByText("Test & Demo Seed Data Management")).toBeInTheDocument();
    expect(screen.getByText("Total Seed Records")).toBeInTheDocument();
    expect(screen.getByText("HR & Payroll Records")).toBeInTheDocument();
    expect(screen.getByText("Vehicles & Fleet Records")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("105")).toBeInTheDocument();
      expect(screen.getByText("BATCH-HRM-1A2B3C")).toBeInTheDocument();
      expect(screen.getByText("35 Active Seed Records")).toBeInTheDocument();
      expect(screen.getByText("18 Active Seed Records")).toBeInTheDocument();
    });

    expect(screen.getByText("HR & Payroll")).toBeInTheDocument();
    expect(screen.getByText("Vehicle & Fleet Management")).toBeInTheDocument();
    expect(screen.getByText("E-Commerce & Retail / POS")).toBeInTheDocument();
    expect(screen.getByText("Finance & Accounts")).toBeInTheDocument();
  });

  it("opens confirmation dialog and executes seed generation", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockStatus });
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        message: "Successfully generated seed data for vehicles",
        total_records: 18,
      },
    });

    render(<SeedDataAdministrationPage />);

    await waitFor(() => {
      expect(screen.getByText("BATCH-HRM-1A2B3C")).toBeInTheDocument();
    });

    // Click on "Generate All Modules"
    const generateAllBtn = screen.getByText("Generate All Modules");
    fireEvent.click(generateAllBtn);

    // Modal should be open
    expect(screen.getByText("Confirm Seed Generation")).toBeInTheDocument();
    expect(screen.queryByText("Proceed Purge")).not.toBeInTheDocument();

    // Confirm button inside modal
    const confirmBtn = screen.getByRole("button", { name: "Proceed Generate" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/api/v1/system/seed-data/generate", {
        module: "all",
      });
      expect(screen.getByText("Successfully generated seed data for vehicles")).toBeInTheDocument();
    });
  });

  it("opens purge confirmation dialog and executes purge", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockStatus });
    vi.mocked(apiClient.delete).mockResolvedValueOnce({
      data: {
        message: "Successfully purged seed data for all",
        total_purged: 105,
      },
    });

    render(<SeedDataAdministrationPage />);

    await waitFor(() => {
      expect(screen.getByText("BATCH-HRM-1A2B3C")).toBeInTheDocument();
    });

    // Click on "Purge All Seed Data"
    const purgeAllBtn = screen.getByText("Purge All Seed Data");
    fireEvent.click(purgeAllBtn);

    // Modal should be open with warning
    expect(screen.getByText("Confirm Data Purge")).toBeInTheDocument();
    expect(screen.getByText(/Real tenant production records will NOT be touched/i)).toBeInTheDocument();

    const proceedPurgeBtn = screen.getByRole("button", { name: "Proceed Purge" });
    fireEvent.click(proceedPurgeBtn);

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/system/seed-data/purge?module=all");
      expect(screen.getByText("Successfully purged seed data for all")).toBeInTheDocument();
    });
  });
});
