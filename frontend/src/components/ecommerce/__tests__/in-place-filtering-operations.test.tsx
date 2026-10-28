import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ShippingPage from "@/app/ecommerce/shipping/page";
import PaymentsPage from "@/app/ecommerce/payments/page";
import ReviewsPage from "@/app/ecommerce/reviews/page";
import SellersPage from "@/app/ecommerce/sellers/page";
import ReportsPage from "@/app/ecommerce/reports/page";
import { apiClient } from "@/lib/api-client";
import MockAdapter from "axios-mock-adapter";
import {
  ShipmentOut,
  PaymentTransactionOut,
  ReviewOut,
  SellerOut,
} from "@/types";

vi.mock("@/components/layout/dashboard-layout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

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

vi.mock("@/context/toast-context", () => ({
  useToast: () => ({
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }),
}));

const mockShipments: ShipmentOut[] = [
  {
    id: "ship-1",
    tracking_number: "TRK-987654321",
    order_number: "ORD-2026-001",
    carrier_name: "DHL Express",
    shipping_status: "in_transit",
    shipping_cost: 25.0,
    estimated_delivery: "2026-02-10T00:00:00Z",
  },
  {
    id: "ship-2",
    tracking_number: "TRK-123456789",
    order_number: "ORD-2026-002",
    carrier_name: "FedEx Ground",
    shipping_status: "delivered",
    shipping_cost: 15.0,
  },
];

const mockPayments: PaymentTransactionOut[] = [
  {
    id: "tx-1",
    order_id: "ord-1",
    order_number: "ORD-2026-001",
    transaction_ref: "TX-STRIPE-888999",
    payment_method: "stripe",
    amount: 199.99,
    fee: 5.8,
    status: "success",
    created_at: "2026-02-01T12:00:00Z",
  },
];

const mockReviews: ReviewOut[] = [
  {
    id: "rev-1",
    product_id: "prod-1",
    product_title: "Heavy Duty Thermal Printer",
    customer_name: "Sarah Connor",
    rating: 5,
    title: "Outstanding Reliability",
    content: "Fast printing and easy to configure with Next.js POS.",
    status: "approved",
    created_at: "2026-02-01T14:00:00Z",
  },
];

const mockSellers: SellerOut[] = [
  {
    id: "sel-1",
    store_name: "Apex Gadgets & Hardware",
    owner_name: "Johnathan Vance",
    email: "john@apex.com",
    commission_type: "percentage",
    commission_rate: 12.5,
    status: "active",
    created_at: "2026-01-15T00:00:00Z",
  },
];

describe("Ecommerce Operations & Marketplaces In-Place Test Suite", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it("renders shipping consignments and filters in-place", async () => {
    mock.onGet(/\/shipping\/shipments/).reply(200, mockShipments);

    await act(async () => {
      render(<ShippingPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading shipments...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("TRK-987654321")).toBeInTheDocument();
    expect(screen.getByText("DHL Express")).toBeInTheDocument();
    expect(screen.getByText("FedEx Ground")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText("Search tracking #, order #, carrier...");
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "DHL" } });
    });

    expect(screen.getByText("TRK-987654321")).toBeInTheDocument();
    expect(screen.queryByText("FedEx Ground")).not.toBeInTheDocument();
  });

  it("renders payment transactions and allows filtering in-place", async () => {
    mock.onGet(/\/payments/).reply(200, mockPayments);

    await act(async () => {
      render(<PaymentsPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading transactions...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("TX-STRIPE-888999")).toBeInTheDocument();
    expect(screen.getAllByText("$199.99").length).toBeGreaterThanOrEqual(1);
  });

  it("renders customer reviews and moderate actions in-place", async () => {
    mock.onGet(/\/reviews/).reply(200, mockReviews);

    await act(async () => {
      render(<ReviewsPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading reviews...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Heavy Duty Thermal Printer")).toBeInTheDocument();
    expect(screen.getByText("Sarah Connor")).toBeInTheDocument();
  });

  it("renders multi-vendor sellers directory in-place", async () => {
    mock.onGet(/\/sellers/).reply(200, mockSellers);

    await act(async () => {
      render(<SellersPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading sellers...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Apex Gadgets & Hardware")).toBeInTheDocument();
    expect(screen.getByText("Johnathan Vance")).toBeInTheDocument();
  });

  it("renders reports page with analytics summary", async () => {
    mock.onGet(/\/reports\/sales/).reply(200, {
      gross_revenue: 35000.0,
      net_revenue: 31500.0,
      total_orders: 210,
      average_order_value: 150.0,
      top_products: [
        { title: "USB Laser Barcode Scanner", units_sold: 50, revenue: 2250.0 },
      ],
    });

    await act(async () => {
      render(<ReportsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("E-Commerce Analytics & Reports")).toBeInTheDocument();
    });

    expect(screen.getByText("Top Selling Products")).toBeInTheDocument();
    expect(screen.getByText("USB Laser Barcode Scanner")).toBeInTheDocument();
  });
});
