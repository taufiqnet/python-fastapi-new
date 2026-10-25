import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import CategoriesPage from "@/app/ecommerce/categories/page";
import { apiClient } from "@/lib/api-client";
import MockAdapter from "axios-mock-adapter";
import { CategoryOut } from "@/types";

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

const mockCategories: CategoryOut[] = [
  {
    id: "cat-1",
    name: "Electronics & Gadgets",
    slug: "electronics-gadgets",
    is_active: true,
    parent_id: null,
    business_id: 1,
    attribute_templates: [
      { attribute_name: "Warranty", attribute_type: "text", is_required: true },
    ],
  },
  {
    id: "cat-2",
    name: "Smartphones & Mobile",
    slug: "smartphones-mobile",
    is_active: true,
    parent_id: "cat-1",
    business_id: 1,
    attribute_templates: [],
  },
  {
    id: "cat-3",
    name: "Archived Clearance",
    slug: "archived-clearance",
    is_active: false,
    parent_id: null,
    business_id: 1,
    attribute_templates: [],
  },
];

describe("Ecommerce Categories In-Place Non-Destructive Filtering Audit", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it("renders categories table after initial load with hierarchy", async () => {
    mock.onGet(/\/categories/).reply((config) => {
      return [200, mockCategories];
    });

    await act(async () => {
      render(<CategoriesPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading category hierarchy...")).not.toBeInTheDocument();
    });

    expect(screen.getAllByText("Electronics & Gadgets").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Smartphones & Mobile")).toBeInTheDocument();
    expect(screen.getByText("Archived Clearance")).toBeInTheDocument();
    expect(screen.getByText("/electronics-gadgets")).toBeInTheDocument();
  });

  it("performs in-place search without unmounting table", async () => {
    mock.onGet(/\/categories/).reply(200, mockCategories);

    await act(async () => {
      render(<CategoriesPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading category hierarchy...")).not.toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      "Search categories by name, slug, or keywords..."
    );

    // Type "Smartphones"
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "Smartphones" } });
    });

    expect(screen.getByText("Smartphones & Mobile")).toBeInTheDocument();
    expect(screen.queryByText("Archived Clearance")).not.toBeInTheDocument();
  });

  it("filters by active/inactive status in-place", async () => {
    mock.onGet(/\/categories/).reply(200, mockCategories);

    await act(async () => {
      render(<CategoriesPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading category hierarchy...")).not.toBeInTheDocument();
    });

    const inactiveTab = screen.getByRole("button", { name: "Inactive" });

    await act(async () => {
      fireEvent.click(inactiveTab);
    });

    expect(screen.getByText("Archived Clearance")).toBeInTheDocument();
    expect(screen.queryByText("Smartphones & Mobile")).not.toBeInTheDocument();
  });
});
