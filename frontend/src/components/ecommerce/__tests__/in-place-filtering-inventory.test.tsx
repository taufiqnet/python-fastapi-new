import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import InventoryStockPage from "@/app/ecommerce/inventory/page";
import { apiClient } from "@/lib/api-client";
import MockAdapter from "axios-mock-adapter";
import { InventoryStockOut, WarehouseOut } from "@/types";

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

const mockWarehouses: WarehouseOut[] = [
  {
    id: "wh-1",
    name: "Central Logistics Hub",
    code: "WH-CENTRAL",
    is_active: true,
    business_id: 1,
  },
  {
    id: "wh-2",
    name: "East Coast Depot",
    code: "WH-EAST",
    is_active: true,
    business_id: 1,
  },
];

const mockItems: InventoryStockOut[] = [
  {
    id: "inv-1",
    variant_id: "var-1",
    item_title: "Heavy Duty Thermal Barcode Printer",
    sku: "PRN-THERM-01",
    barcode: "890123456701",
    warehouse_id: "wh-1",
    warehouse_name: "Central Logistics Hub",
    quantity_on_hand: 85,
    quantity_reserved: 5,
    quantity_available: 80,
    reorder_level: 15,
    unit_cost: 120.0,
    total_value: 10200.0,
  },
  {
    id: "inv-2",
    variant_id: "var-2",
    item_title: "Ergonomic Bluetooth 2D Scanner",
    sku: "SCN-BT-02",
    barcode: "890123456702",
    warehouse_id: "wh-2",
    warehouse_name: "East Coast Depot",
    quantity_on_hand: 4,
    quantity_reserved: 0,
    quantity_available: 4,
    reorder_level: 10,
    unit_cost: 55.0,
    total_value: 220.0,
  },
];

describe("Ecommerce Inventory Stock In-Place Filtering & Management", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it("renders stock inventory table with metrics without unmounting", async () => {
    mock.onGet(/\/inventory\/warehouses/).reply(200, mockWarehouses);
    mock.onGet(/\/inventory\/items/).reply(200, mockItems);

    await act(async () => {
      render(<InventoryStockPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading inventory items...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Heavy Duty Thermal Barcode Printer")).toBeInTheDocument();
    expect(screen.getByText("Ergonomic Bluetooth 2D Scanner")).toBeInTheDocument();
    expect(screen.getByText("PRN-THERM-01")).toBeInTheDocument();
  });

  it("filters stock items in-place via search input", async () => {
    mock.onGet(/\/inventory\/warehouses/).reply(200, mockWarehouses);
    mock.onGet(/\/inventory\/items/).reply(200, mockItems);

    await act(async () => {
      render(<InventoryStockPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Heavy Duty Thermal Barcode Printer")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search items by SKU, name, or barcode...");
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "Bluetooth" } });
    });

    expect(screen.getByText("Ergonomic Bluetooth 2D Scanner")).toBeInTheDocument();
    expect(screen.queryByText("Heavy Duty Thermal Barcode Printer")).not.toBeInTheDocument();
  });

  it("toggles low stock filter in-place", async () => {
    mock.onGet(/\/inventory\/warehouses/).reply(200, mockWarehouses);
    mock.onGet(/\/inventory\/items/).reply(200, mockItems);

    await act(async () => {
      render(<InventoryStockPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Heavy Duty Thermal Barcode Printer")).toBeInTheDocument();
    });

    const lowStockBtn = screen.getByRole("button", { name: /low stock only/i });
    await act(async () => {
      fireEvent.click(lowStockBtn);
    });

    // Scanner has 4 units on hand with reorder level 10, so it should stay
    expect(screen.getByText("Ergonomic Bluetooth 2D Scanner")).toBeInTheDocument();
    expect(screen.queryByText("Heavy Duty Thermal Barcode Printer")).not.toBeInTheDocument();
  });
});
