import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import CatalogBrowsePage from "@/app/ecommerce/catalog/page";
import { apiClient } from "@/lib/api-client";
import MockAdapter from "axios-mock-adapter";
import { SearchResult } from "@/types";

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

const mockSearchResult: SearchResult = {
  total: 2,
  page: 1,
  page_size: 12,
  total_pages: 1,
  has_next: false,
  has_prev: false,
  facets: [],
  items: [
    {
      id: "prod-1",
      title: "Omni-Directional Laser Scanner",
      slug: "omni-directional-laser-scanner",
      brand: "ApexTech",
      description: "Fast multi-grid retail counter barcode scanner.",
      status: "active",
      min_price: 249.99,
      max_price: 249.99,
      average_rating: 4.8,
      review_count: 24,
      sold_count: 150,
      is_featured: true,
      primary_image_url: "https://example.com/scanner.jpg",
    },
    {
      id: "prod-2",
      title: "Impact Dot Matrix Printer",
      slug: "impact-dot-matrix-printer",
      brand: "LogiPrint",
      description: "Standard dual-ply kitchen and receipt printer.",
      status: "active",
      min_price: 189.5,
      max_price: 189.5,
      average_rating: 3.5,
      review_count: 8,
      sold_count: 42,
      is_featured: false,
      primary_image_url: null,
    },
  ],
};

describe("Ecommerce Catalog Faceted Showcase In-Place Filtering Audit", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it("renders catalog cards correctly after initial search query", async () => {
    mock.onGet(/\/categories/).reply(200, []);
    mock.onGet(/\/brands/).reply(200, []);
    mock.onGet(/\/search/).reply(200, mockSearchResult);

    await act(async () => {
      render(<CatalogBrowsePage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading catalog products...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Omni-Directional Laser Scanner")).toBeInTheDocument();
    expect(screen.getByText("Impact Dot Matrix Printer")).toBeInTheDocument();
    expect(screen.getByText("ApexTech")).toBeInTheDocument();
    expect(screen.getByText("LogiPrint")).toBeInTheDocument();
  });

  it("opens quick view modal when clicking Details or Quick View", async () => {
    mock.onGet(/\/categories/).reply(200, []);
    mock.onGet(/\/brands/).reply(200, []);
    mock.onGet(/\/search/).reply(200, mockSearchResult);

    await act(async () => {
      render(<CatalogBrowsePage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading catalog products...")).not.toBeInTheDocument();
    });

    const detailsButtons = screen.getAllByRole("button", { name: "Details" });
    await act(async () => {
      fireEvent.click(detailsButtons[0]);
    });

    expect(screen.getByText("Product Quick View")).toBeInTheDocument();
    expect(screen.getByText("Fast multi-grid retail counter barcode scanner.")).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByRole("button", { name: "Close" });
    await act(async () => {
      fireEvent.click(closeBtn);
    });

    expect(screen.queryByText("Product Quick View")).not.toBeInTheDocument();
  });
});
