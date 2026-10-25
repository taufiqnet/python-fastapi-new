import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import CustomersPage from "@/app/ecommerce/customers/page";
import { apiClient } from "@/lib/api-client";
import MockAdapter from "axios-mock-adapter";
import { CustomerOut } from "@/types";

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

const mockCustomers: CustomerOut[] = [
  {
    id: "cust-1",
    first_name: "Sarah",
    last_name: "Connor",
    full_name: "Sarah Connor",
    phone: "+1-555-0101",
    email: "sarah.connor@example.com",
    address: "742 Cyberdyne Blvd, Los Angeles, CA",
    membership_tier: "VIP",
    loyalty_points: 1250,
    store_credit: 85.5,
    is_active: true,
    business_id: 1,
    created_at: "2026-01-15T00:00:00Z",
    updated_at: "2026-01-15T00:00:00Z",
  },
  {
    id: "cust-2",
    first_name: "Miles",
    last_name: "Dyson",
    full_name: "Miles Dyson",
    phone: "+1-555-0102",
    email: "miles.dyson@example.com",
    address: "123 Tech Way, Pasadena, CA",
    membership_tier: "Regular",
    loyalty_points: 100,
    store_credit: 0,
    is_active: false,
    business_id: 1,
    created_at: "2026-01-20T00:00:00Z",
    updated_at: "2026-01-20T00:00:00Z",
  },
];

describe("Ecommerce Customer Directory In-Place Non-Destructive Filtering Audit", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it("renders customer accounts correctly after initial load", async () => {
    mock.onGet(/\/customers/).reply(200, mockCustomers);

    await act(async () => {
      render(<CustomersPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading customer profiles...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Sarah Connor")).toBeInTheDocument();
    expect(screen.getByText("Miles Dyson")).toBeInTheDocument();
    expect(screen.getByText("+1-555-0101")).toBeInTheDocument();
    expect(screen.getByText("1250 pts")).toBeInTheDocument();
  });

  it("performs in-place search without table flickering", async () => {
    mock.onGet(/\/customers/).reply(200, mockCustomers);

    await act(async () => {
      render(<CustomersPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading customer profiles...")).not.toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      "Search customers by name, phone number, or email..."
    );
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "Sarah" } });
    });

    expect(screen.getByText("Sarah Connor")).toBeInTheDocument();
    expect(screen.queryByText("Miles Dyson")).not.toBeInTheDocument();
  });

  it("opens customer detail slide-over drawer with profile and balance details", async () => {
    mock.onGet(/\/customers/).reply(200, mockCustomers);

    await act(async () => {
      render(<CustomersPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading customer profiles...")).not.toBeInTheDocument();
    });

    const nameBtn = screen.getByRole("button", { name: "Sarah Connor" });
    await act(async () => {
      fireEvent.click(nameBtn);
    });

    expect(screen.getByText("Loyalty Balance")).toBeInTheDocument();
    expect(screen.getByText("742 Cyberdyne Blvd, Los Angeles, CA")).toBeInTheDocument();
    expect(screen.getByText("VIP Member")).toBeInTheDocument();
  });
});
