import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import BrandsPage from "@/app/ecommerce/brands/page";
import { apiClient } from "@/lib/api-client";
import MockAdapter from "axios-mock-adapter";
import { BrandOut } from "@/types";

// Mock DashboardLayout
vi.mock("@/components/layout/dashboard-layout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

// Mock Auth Context
vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "usr-1",
      username: "admin",
      is_superuser: true,
      business_id: 1,
    },
  }),
}));

// Mock Toast Context
vi.mock("@/context/toast-context", () => ({
  useToast: () => ({
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }),
}));

const mockBrands: BrandOut[] = [
  {
    id: "brand-1",
    name: "ApexTech Hardware",
    slug: "apextech-hardware",
    description: "Industrial hardware manufacturers",
    is_active: true,
    logo_url: "https://example.com/apex.png",
    website_url: "https://apextech.example.com",
    created_at: "2026-01-01T00:00:00Z",
    models: [
      {
        id: "model-1",
        brand_id: "brand-1",
        name: "Apex Scanner Pro 2000",
        slug: "apex-scanner-pro-2000",
        description: "Heavy duty barcode reader",
        is_active: true,
        created_at: "2026-01-02T00:00:00Z",
      },
      {
        id: "model-2",
        brand_id: "brand-1",
        name: "Apex RFID Sentinel",
        slug: "apex-rfid-sentinel",
        description: "Handheld long range RFID reader",
        is_active: true,
        created_at: "2026-01-03T00:00:00Z",
      },
    ],
  },
  {
    id: "brand-2",
    name: "Legacy Dynamics",
    slug: "legacy-dynamics",
    description: "Discontinued legacy supplier",
    is_active: false,
    logo_url: null,
    website_url: null,
    created_at: "2025-06-01T00:00:00Z",
    models: [
      {
        id: "model-3",
        brand_id: "brand-2",
        name: "Legacy Dot Matrix 90",
        slug: "legacy-dot-matrix-90",
        description: "Discontinued thermal impact head",
        is_active: false,
        created_at: "2025-06-02T00:00:00Z",
      },
    ],
  },
];

describe("Ecommerce Brands & Models In-Place Non-Destructive Filtering Audit", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it("renders brands table correctly after initial load", async () => {
    mock.onGet(/\/brands/).reply(200, mockBrands);

    await act(async () => {
      render(<BrandsPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading catalog brands...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("ApexTech Hardware")).toBeInTheDocument();
    expect(screen.getByText("Legacy Dynamics")).toBeInTheDocument();
    expect(screen.getByText("/apextech-hardware")).toBeInTheDocument();
    expect(screen.getByText("2 Models")).toBeInTheDocument();
  });

  it("performs in-place search on brands tab without table flicker", async () => {
    mock.onGet(/\/brands/).reply(200, mockBrands);

    await act(async () => {
      render(<BrandsPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading catalog brands...")).not.toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      "Search brands by name, slug, or keywords..."
    );

    // Search for "ApexTech"
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "ApexTech" } });
    });

    expect(screen.getByText("ApexTech Hardware")).toBeInTheDocument();
    expect(screen.queryByText("Legacy Dynamics")).not.toBeInTheDocument();
  });

  it("switches to Models tab and filters models in-place", async () => {
    mock.onGet(/\/brands/).reply(200, mockBrands);

    await act(async () => {
      render(<BrandsPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading catalog brands...")).not.toBeInTheDocument();
    });

    // Switch to Models tab
    const modelsTab = screen.getByRole("button", { name: /Product Models/i });
    await act(async () => {
      fireEvent.click(modelsTab);
    });

    // Check models rendered
    expect(screen.getByText("Apex Scanner Pro 2000")).toBeInTheDocument();
    expect(screen.getByText("Apex RFID Sentinel")).toBeInTheDocument();
    expect(screen.getByText("Legacy Dot Matrix 90")).toBeInTheDocument();

    // In-place search in models
    const modelSearchInput = screen.getByPlaceholderText(
      "Search models by name, slug, or specification..."
    );
    await act(async () => {
      fireEvent.change(modelSearchInput, { target: { value: "Sentinel" } });
    });

    expect(screen.getByText("Apex RFID Sentinel")).toBeInTheDocument();
    expect(screen.queryByText("Apex Scanner Pro 2000")).not.toBeInTheDocument();
    expect(screen.queryByText("Legacy Dot Matrix 90")).not.toBeInTheDocument();
  });
});
