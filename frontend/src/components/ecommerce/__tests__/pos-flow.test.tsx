import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import POSRegistersPage from "@/app/ecommerce/pos/registers/page";
import POSTerminalPage from "@/app/ecommerce/pos/page";
import { apiClient } from "@/lib/api-client";
import MockAdapter from "axios-mock-adapter";
import { POSRegisterOut, POSSessionOut, POSProductSearchOut } from "@/types";

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

const mockRegisters: POSRegisterOut[] = [
  {
    id: "reg-1",
    name: "Front Counter Register 1",
    code: "REG-01",
    warehouse_id: "wh-1",
    warehouse_name: "Central Distribution",
    is_active: true,
    business_id: 1,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "reg-2",
    name: "Kiosk Register 2",
    code: "REG-02",
    warehouse_id: "wh-1",
    warehouse_name: "Central Distribution",
    is_active: false,
    business_id: 1,
    created_at: "2026-01-02T00:00:00Z",
  },
];

const mockSession: POSSessionOut = {
  id: "sess-1",
  register_id: "reg-1",
  register_name: "Front Counter Register 1",
  user_id: "usr-1",
  cashier_name: "admin",
  status: "open",
  opening_cash: 100,
  opened_at: "2026-02-01T09:00:00Z",
};

const mockPOSProducts: POSProductSearchOut[] = [
  {
    id: "prod-1",
    variant_id: "var-1",
    title: "USB Laser Barcode Scanner",
    sku: "SCAN-USB-01",
    barcode: "8901234567890",
    price: 45.0,
    stock_quantity: 120,
    category_name: "Hardware",
  },
];

describe("Ecommerce POS Terminal & Registers In-Place Audit", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it("renders POS registers list with in-place search", async () => {
    mock.onGet(/\/pos\/registers/).reply(200, mockRegisters);
    mock.onGet(/\/pos\/sessions\/current/).reply(200, mockSession);

    await act(async () => {
      render(<POSRegistersPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading POS registers...")).not.toBeInTheDocument();
    });

    expect(screen.getAllByText("Front Counter Register 1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Kiosk Register 2")).toBeInTheDocument();
    expect(screen.getByText("REG-01")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText("Search registers by name or code...");
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "Counter" } });
    });

    expect(screen.getAllByText("Front Counter Register 1").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Kiosk Register 2")).not.toBeInTheDocument();
  });

  it("renders POS terminal with active shift and adds item to cart", async () => {
    mock.onGet(/\/pos\/sessions\/current/).reply(200, mockSession);
    mock.onGet(/\/categories/).reply(200, []);
    mock.onGet(/\/pos\/products\/search/).reply(200, mockPOSProducts);

    await act(async () => {
      render(<POSTerminalPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("USB Laser Barcode Scanner")).toBeInTheDocument();
    });

    expect(screen.getByText("Shift Active")).toBeInTheDocument();

    // Click product to add to cart
    const productCard = screen.getByText("USB Laser Barcode Scanner");
    await act(async () => {
      fireEvent.click(productCard);
    });

    // Check cart item and subtotal
    expect(screen.getAllByText("USB Laser Barcode Scanner").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Pay & Tender $47.25")).toBeInTheDocument(); // 45 + 5% VAT
  });
});
