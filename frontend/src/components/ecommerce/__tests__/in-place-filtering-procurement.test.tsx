import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ProcurementPage from "@/app/ecommerce/procurement/page";
import StockTransfersPage from "@/app/ecommerce/inventory/transfers/page";
import { apiClient } from "@/lib/api-client";
import MockAdapter from "axios-mock-adapter";
import { PurchaseOrderOut, SupplierOut, StockTransferOut } from "@/types";

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

const mockSuppliers: SupplierOut[] = [
  {
    id: "sup-1",
    name: "Acme Industrial Supplies",
    code: "SUP-ACME",
    contact_name: "Robert Vance",
    email: "robert@acme.com",
    phone: "+1 555-0192",
    payment_terms: "Net 30",
    is_active: true,
    business_id: 1,
  },
];

const mockPOs: PurchaseOrderOut[] = [
  {
    id: "po-1",
    po_number: "PO-2026-001",
    supplier_id: "sup-1",
    supplier_name: "Acme Industrial Supplies",
    total_amount: 1450.0,
    status: "submitted",
    order_date: "2026-02-01T00:00:00Z",
  },
  {
    id: "po-2",
    po_number: "PO-2026-002",
    supplier_id: "sup-1",
    supplier_name: "Acme Industrial Supplies",
    total_amount: 890.0,
    status: "draft",
    order_date: "2026-02-02T00:00:00Z",
  },
];

const mockTransfers: StockTransferOut[] = [
  {
    id: "tr-1",
    transfer_number: "TR-2026-0001",
    source_warehouse_id: "wh-1",
    source_warehouse_name: "Central Logistics Hub",
    destination_warehouse_id: "wh-2",
    destination_warehouse_name: "East Coast Depot",
    status: "in_transit",
    items_count: 5,
    created_at: "2026-02-01T10:00:00Z",
  },
];

describe("Ecommerce Procurement & Transfers In-Place Filtering", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it("renders procurement purchase orders and filters in-place", async () => {
    mock.onGet(/\/procurement\/suppliers/).reply(200, mockSuppliers);
    mock.onGet(/\/procurement\/purchase-orders/).reply(200, mockPOs);

    await act(async () => {
      render(<ProcurementPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading purchase orders...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("PO-2026-001")).toBeInTheDocument();
    expect(screen.getByText("PO-2026-002")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText("Search PO # or vendor...");
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "PO-2026-001" } });
    });

    expect(screen.getByText("PO-2026-001")).toBeInTheDocument();
    expect(screen.queryByText("PO-2026-002")).not.toBeInTheDocument();
  });

  it("renders stock transfers and updates in-place", async () => {
    mock.onGet(/\/inventory\/warehouses/).reply(200, []);
    mock.onGet(/\/inventory\/transfers/).reply(200, mockTransfers);

    await act(async () => {
      render(<StockTransfersPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading transfers...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("TR-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("Central Logistics Hub")).toBeInTheDocument();
    expect(screen.getByText("East Coast Depot")).toBeInTheDocument();
  });
});
