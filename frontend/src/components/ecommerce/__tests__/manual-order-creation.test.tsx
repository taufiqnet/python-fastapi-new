import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import CreateOrderPage from "@/app/ecommerce/orders/create/page";
import OrdersPage from "@/app/ecommerce/orders/page";
import { apiClient } from "@/lib/api-client";
import MockAdapter from "axios-mock-adapter";
import { CatalogProduct, CustomerOut, DeliveryServiceSettingOut, OrderSummary } from "@/types";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

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

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockToastWarning = vi.fn();

// Mock Toast Context
vi.mock("@/context/toast-context", () => ({
  useToast: () => ({
    toast: {
      success: mockToastSuccess,
      error: mockToastError,
      warning: mockToastWarning,
    },
  }),
}));

const mockCatalog: CatalogProduct[] = [
  {
    id: "prod-1",
    title: "Premium Cotton Polo Shirt",
    brand: "ProStyle",
    thumbnail_url: null,
    variants: [
      {
        id: "var-1",
        sku: "POLO-BLK-M",
        price: 1200,
        stock_qty: 25,
        attr_summary: "Color: Black, Size: M",
      },
      {
        id: "var-2",
        sku: "POLO-BLU-L",
        price: 1250,
        stock_qty: 4,
        attr_summary: "Color: Blue, Size: L",
      },
    ],
  },
];

const mockCustomers: CustomerOut[] = [
  {
    id: "cust-1",
    first_name: "Tanvir",
    last_name: "Ahmed",
    full_name: "Tanvir Ahmed",
    phone: "01711223344",
    email: "tanvir@example.com",
    address: "House 12, Road 4, Sector 7, Uttara",
    is_active: true,
    business_id: 1,
  },
];

const mockDeliverySettings: DeliveryServiceSettingOut[] = [
  {
    id: "ds-1",
    business_id: 1,
    name: "Inside Dhaka City",
    charge: 70,
    region: "Dhaka City",
    estimated_days: "24-48 Hours",
    default_courier: null,
    is_active: true,
    is_default: true,
    sort_order: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "ds-2",
    business_id: 1,
    name: "Outside Dhaka City",
    charge: 150,
    region: "Outside Dhaka",
    estimated_days: "2-5 Days",
    default_courier: null,
    is_active: true,
    is_default: false,
    sort_order: 2,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const mockOrders: OrderSummary[] = [
  {
    id: "ord-1",
    business_id: 1,
    order_number: "ORD-2026-0001",
    payment_status: "paid",
    fulfillment_status: "shipped",
    payment_channel: "facebook",
    subtotal_amount: 1200,
    tax_amount: 180,
    shipping_amount: 70,
    discount_amount: 0,
    other_charges: 0,
    total_amount: 1450,
    currency: "BDT",
    courier_company: "Pathao",
    tracking_id: "PTH-10023",
    created_at: "2026-02-01T10:00:00Z",
  },
];

describe("Manual & Social Order Creation (CRUD)", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient as any);
    mockPush.mockClear();
    mockToastSuccess.mockClear();
    mockToastError.mockClear();
    mock.onGet(/\/shipping\/delivery-settings.*/).reply(200, mockDeliverySettings);
  });

  afterEach(() => {
    mock.restore();
  });

  it("renders CreateOrderPage with blank Courier Partner by default and dynamic Delivery Settings", async () => {
    mock.onGet(/\/orders\/catalog\/products.*/).reply(200, mockCatalog);
    mock.onGet(/\/customers.*/).reply(200, mockCustomers);
    mock.onGet(/\/shipping\/delivery-settings.*/).reply(200, mockDeliverySettings);

    render(<CreateOrderPage />);

    expect(screen.getByText("Create Sales Order")).toBeDefined();
    expect(screen.getByText("Facebook")).toBeDefined();
    expect(screen.getByText("WhatsApp")).toBeDefined();
    expect(screen.getByText(/Search & Select Customer/)).toBeDefined();

    // Verify dynamic delivery settings from API (Inside Dhaka City ৳70 and Outside Dhaka City ৳150)
    await waitFor(() => {
      expect(screen.getByText("Inside Dhaka City")).toBeDefined();
      expect(screen.getByText("Outside Dhaka City")).toBeDefined();
      expect(screen.getAllByText(/70\.00/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/150\.00/).length).toBeGreaterThanOrEqual(1);
    });

    // Verify Courier Partner select is BLANK by default
    const courierSelect = screen.getByLabelText(/courier partner/i) as HTMLSelectElement;
    expect(courierSelect.value).toBe("");
    expect(screen.getByText("-- Select Courier Partner (Optional) --")).toBeDefined();

    // Verify Configure Rates button opens Delivery Settings Modal
    const configBtn = screen.getByText("Configure Rates");
    fireEvent.click(configBtn);
    expect(screen.getByText("Delivery & Courier Service Settings")).toBeDefined();
  });

  it("selects customer via searchable dropdown combobox and populates shipping details", async () => {
    mock.onGet(/\/orders\/catalog\/products.*/).reply(200, mockCatalog);
    mock.onGet(/\/customers.*/).reply(200, mockCustomers);

    render(<CreateOrderPage />);

    // Click combobox trigger to open popover
    const trigger = await screen.findByRole("button", { name: /search and select customer/i });
    fireEvent.click(trigger);

    // Search input appears inside dropdown popover
    const searchInput = screen.getByPlaceholderText(/search by customer name, phone number/i);
    expect(searchInput).toBeDefined();

    // Type phone number to filter
    fireEvent.change(searchInput, { target: { value: "0171122" } });

    // Click customer row from search results
    const customerRow = screen.getByText("Tanvir Ahmed");
    fireEvent.click(customerRow);

    // Verify auto-fill of recipient inputs
    expect(screen.getByDisplayValue("Tanvir Ahmed")).toBeDefined();
    expect(screen.getByDisplayValue("01711223344")).toBeDefined();
    expect(screen.getByDisplayValue("House 12, Road 4, Sector 7, Uttara")).toBeDefined();
  });

  it("adds line items, calculates 15% VAT and grand total, then submits order", async () => {
    mock.onGet(/\/orders\/catalog\/products.*/).reply(200, mockCatalog);
    mock.onGet(/\/customers.*/).reply(200, mockCustomers);
    mock.onPost("/orders").reply(201, {
      id: "ord-new",
      order_number: "ORD-2026-9999",
    });

    render(<CreateOrderPage />);

    // Open combobox and select customer
    const trigger = await screen.findByRole("button", { name: /search and select customer/i });
    fireEvent.click(trigger);
    const customerRow = screen.getByText("Tanvir Ahmed");
    fireEvent.click(customerRow);

    // Click Add Line Item
    const addBtn = screen.getByText("Add Line Item");
    fireEvent.click(addBtn);

    // Verify item row added
    expect(screen.getByText(/Stock: 25 units/)).toBeDefined();

    // Click Confirm & Place Order
    const submitBtn = screen.getByText(/Confirm & Place Order/);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mock.history.post.length).toBe(1);
      const postData = JSON.parse(mock.history.post[0].data);
      expect(postData.business_id).toBe(1);
      expect(postData.user_id).toBe("cust-1");
      expect(postData.currency).toBe("BDT");
      expect(postData.items[0].variant_id).toBe("var-1");
      expect(postData.items[0].quantity).toBe(1);
      expect(mockPush).toHaveBeenCalledWith("/ecommerce/orders");
    });
  });

  it("renders orders page with + New Order button, social channel pill, and delete modal", async () => {
    mock.onGet(/\/orders.*/).reply(200, mockOrders);
    mock.onDelete(/\/orders\/ord-1.*/).reply(204);

    render(<OrdersPage />);

    await waitFor(() => {
      expect(screen.getByText("ORD-2026-0001")).toBeDefined();
    });

    // Check + New Order button
    expect(screen.getByText("New Order")).toBeDefined();

    // Check Facebook channel pill & filter option
    expect(screen.getAllByText("Facebook").length).toBeGreaterThanOrEqual(2);

    // Click delete button
    const deleteBtn = screen.getByTitle("Delete Order Record");
    fireEvent.click(deleteBtn);

    // Verify modal appeared
    expect(screen.getByText("Delete Order Record")).toBeDefined();
    expect(screen.getByText(/Are you sure you want to permanently delete/)).toBeDefined();

    // Click Confirm Delete
    const confirmDeleteBtn = screen.getByText("Confirm Delete");
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(mock.history.delete.length).toBe(1);
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Order Deleted",
        expect.stringContaining("ORD-2026-0001")
      );
    });
  });
});
