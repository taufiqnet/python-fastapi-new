import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SystemBackupsPage from "../page";
import { apiClient } from "@/lib/api-client";

// Mock apiClient
vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("Administration - System Backups Dashboard Audit", () => {
  const mockBackups = [
    {
      id: 1,
      filename: "proerp_backup_20261024_180000.dump",
      file_size_bytes: 5242880,
      checksum_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      backup_type: "manual_admin",
      status: "completed",
      error_message: null,
      created_at: "2026-10-24T18:00:00Z",
      human_size: "5.00 MB",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders backup snapshots and stat cards properly", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockBackups });

    render(<SystemBackupsPage />);

    expect(screen.getByText("Loading database snapshots...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("proerp_backup_20261024_180000.dump")).toBeInTheDocument();
    });

    expect(screen.getByText("PostgreSQL System Backups")).toBeInTheDocument();
    expect(screen.getByText("Total Snapshots")).toBeInTheDocument();
    expect(screen.getByText("SHA-256 Verified")).toBeInTheDocument();
    expect(screen.getAllByText("5.00 MB").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("triggers instant backup snapshot on button click", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockBackups });
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        message: "Database backup created successfully",
        backup: {
          id: 2,
          filename: "proerp_backup_20261024_183000.dump",
          file_size_bytes: 1048576,
          checksum_sha256: "abc123",
          backup_type: "manual_admin",
          status: "completed",
          created_at: "2026-10-24T18:30:00Z",
          human_size: "1.00 MB",
        },
      },
    });

    render(<SystemBackupsPage />);

    await waitFor(() => {
      expect(screen.getByText("proerp_backup_20261024_180000.dump")).toBeInTheDocument();
    });

    const createBtn = screen.getByRole("button", { name: /Create Instant Backup/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/api/v1/system/backups", {
        backup_type: "manual_admin",
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText("Instant database backup snapshot created successfully!")
      ).toBeInTheDocument();
    });
  });
});
