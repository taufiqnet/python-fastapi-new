import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import OrdersPage from "@/app/ecommerce/orders/page";
import { apiClient } from "@/lib/api-client";
import MockAdapter from "axios-mock-adapter";
import { OrderSummary, OrderDetail } from "@/types";

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

const mockOrders: OrderSummary[] = [
  {
    id: "ord-1",
    business_id: 1,
    order_number: "ORD-2026-0001",
    payment_status: "paid",
    fulfillment_status: "shipped",
    subtotal_amount: 500,
    tax_amount: 25,
    shipping_amount: 15,
    discount_amount: 0,
    other_charges: 0,
    total_amount: 540,
    currency: "USD",
    courier_company: "DHL Express",
    tracking_id: "DHL-987654321",
    created_at: "2026-02-01T10:00:00Z",
  },
  {
    id: "ord-2",
    business_id: 1,
    order_number: "ORD-2026-0002",
    payment_status: "pending",
    fulfillment_status: "unfulfilled",
    subtotal_amount: 150,
    tax_amount: 7.5,
    shipping_amount: 10,
    discount_amount: 15,
    other_charges: 0,
    total_amount: 152.5,
    currency: "USD",
    courier_company: null,
    tracking_id: null,
    created_at: "2026-02-02T12:00:00Z",
  },
];

const mockOrderDetail: OrderDetail = {
  ...mockOrders[0],
  items: [
    {
      id: "item-1",
      order_id: "ord-1",
      variant_id: "var-1",
      product_title: "Barcode Scanner Handheld 2D",
      sku: "BC-2D-001",
      quantity: 2,
      unit_price: 250,
      subtotal: 500,
    },
  ],
  addresses: [
    {
      id: "addr-1",
      order_id: "ord-1",
      address_type: "shipping",
      recipient_name: "Acme Industrial Logistics",
      phone: "+1-555-0199",
      street: "742 Evergreen Terrace",
      city: "Springfield",
      state: "IL",
      zip_code: "62704",
      country: "USA",
    },
  ],
  status_history: [
    {
      id: "hist-1",
      status_type: "payment",
      status_value: "paid",
      note: "Card transaction settled",
      created_at: "2026-02-01T10:05:00Z",
    },
  ],
};

describe("Ecommerce Orders In-Place Non-Destructive Filtering Audit", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it("renders orders table correctly after initial load", async () => {
    mock.onGet(/\/orders/).reply(200, mockOrders);

    await act(async () => {
      render(<OrdersPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading order records...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("ORD-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("ORD-2026-0002")).toBeInTheDocument();
    expect(screen.getByText("DHL Express")).toBeInTheDocument();
  });

  it("performs in-place search without unmounting table", async () => {
    mock.onGet(/\/orders/).reply(200, mockOrders);

    await act(async () => {
      render(<OrdersPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading order records...")).not.toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by order #/i);
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "0001" } });
    });

    expect(screen.getByText("ORD-2026-0001")).toBeInTheDocument();
    expect(screen.queryByText("ORD-2026-0002")).not.toBeInTheDocument();
  });

  it("opens order detail drawer with line items and customer information", async () => {
    mock.onGet().reply((config) => {
      if (config.url?.includes("ord-1")) {
        return [200, mockOrderDetail];
      }
      return [200, mockOrders];
    });

    await act(async () => {
      render(<OrdersPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading order records...")).not.toBeInTheDocument();
    });

    const orderNumberLink = screen.getByRole("button", { name: "ORD-2026-0001" });
    await act(async () => {
      fireEvent.click(orderNumberLink);
    });

    await waitFor(() => {
      expect(screen.getByText("Barcode Scanner Handheld 2D")).toBeInTheDocument();
      expect(screen.getAllByText("Acme Industrial Logistics").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("742 Evergreen Terrace").length).toBeGreaterThanOrEqual(1);
    });
  });
});
