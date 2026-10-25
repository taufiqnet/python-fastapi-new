import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import PricingPage from "@/app/ecommerce/pricing/page";
import { apiClient } from "@/lib/api-client";
import MockAdapter from "axios-mock-adapter";
import { CouponOut, DiscountRuleOut } from "@/types";

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

const mockDiscountRules: DiscountRuleOut[] = [
  {
    id: "rule-1",
    business_id: 1,
    name: "Black Friday 20% Discount",
    code: "BF20",
    discount_type: "percentage",
    discount_value: 20,
    min_order_amount: 50,
    is_active: true,
  },
  {
    id: "rule-2",
    business_id: 1,
    name: "VIP Flat $15 Deduction",
    code: "VIP15",
    discount_type: "fixed",
    discount_value: 15,
    min_order_amount: 100,
    is_active: false,
  },
];

const mockCoupons: CouponOut[] = [
  {
    id: "cpn-1",
    business_id: 1,
    code: "SAVE20NOW",
    discount_rule_id: "rule-1",
    max_uses: 200,
    used_count: 45,
    valid_from: "2026-01-01T00:00:00Z",
    valid_to: "2026-12-31T23:59:59Z",
    is_active: true,
    discount_rule: mockDiscountRules[0],
  },
  {
    id: "cpn-2",
    business_id: 1,
    code: "EXPIRED10",
    discount_rule_id: "rule-2",
    max_uses: 50,
    used_count: 50,
    valid_from: "2025-01-01T00:00:00Z",
    valid_to: "2025-06-01T23:59:59Z",
    is_active: false,
    discount_rule: mockDiscountRules[1],
  },
];

describe("Ecommerce Pricing & Coupons In-Place Non-Destructive Filtering Audit", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it("renders coupons table correctly after initial load", async () => {
    mock.onGet(/\/pricing\/coupons/).reply(200, mockCoupons);
    mock.onGet(/\/pricing\/discount-rules/).reply(200, mockDiscountRules);
    mock.onGet(/\/pricing\/tax-rules/).reply(200, []);
    mock.onGet(/\/pricing\/currency-rates/).reply(200, []);

    await act(async () => {
      render(<PricingPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading pricing configurations...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("SAVE20NOW")).toBeInTheDocument();
    expect(screen.getByText("EXPIRED10")).toBeInTheDocument();
    expect(screen.getByText("Black Friday 20% Discount")).toBeInTheDocument();
  });

  it("performs in-place search on coupons", async () => {
    mock.onGet(/\/pricing\/coupons/).reply(200, mockCoupons);
    mock.onGet(/\/pricing\/discount-rules/).reply(200, mockDiscountRules);
    mock.onGet(/\/pricing\/tax-rules/).reply(200, []);
    mock.onGet(/\/pricing\/currency-rates/).reply(200, []);

    await act(async () => {
      render(<PricingPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading pricing configurations...")).not.toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search coupons by promo code...");
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "SAVE20" } });
    });

    expect(screen.getByText("SAVE20NOW")).toBeInTheDocument();
    expect(screen.queryByText("EXPIRED10")).not.toBeInTheDocument();
  });

  it("switches to Discount Rules tab and shows rules", async () => {
    mock.onGet(/\/pricing\/coupons/).reply(200, mockCoupons);
    mock.onGet(/\/pricing\/discount-rules/).reply(200, mockDiscountRules);
    mock.onGet(/\/pricing\/tax-rules/).reply(200, []);
    mock.onGet(/\/pricing\/currency-rates/).reply(200, []);

    await act(async () => {
      render(<PricingPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading pricing configurations...")).not.toBeInTheDocument();
    });

    const rulesTab = screen.getByRole("button", { name: /Discount Rules/i });
    await act(async () => {
      fireEvent.click(rulesTab);
    });

    expect(screen.getByText("Black Friday 20% Discount")).toBeInTheDocument();
    expect(screen.getByText("VIP Flat $15 Deduction")).toBeInTheDocument();
  });

  it("simulates coupon validation with live validator tester", async () => {
    mock.onGet(/\/pricing\/coupons/).reply(200, mockCoupons);
    mock.onGet(/\/pricing\/discount-rules/).reply(200, mockDiscountRules);
    mock.onGet(/\/pricing\/tax-rules/).reply(200, []);
    mock.onGet(/\/pricing\/currency-rates/).reply(200, []);
    mock.onPost(/\/pricing\/coupons\/validate/).reply(200, {
      is_valid: true,
      message: "Coupon applied successfully. 20% discount calculated.",
      discount_amount: 20.0,
    });

    await act(async () => {
      render(<PricingPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading pricing configurations...")).not.toBeInTheDocument();
    });

    const codeInput = screen.getByPlaceholderText("Code (e.g. SAVE20)");
    const testBtn = screen.getByRole("button", { name: "Test Code" });

    await act(async () => {
      fireEvent.change(codeInput, { target: { value: "SAVE20NOW" } });
      fireEvent.click(testBtn);
    });

    await waitFor(() => {
      expect(screen.getByText(/Coupon applied successfully/i)).toBeInTheDocument();
      expect(screen.getByText(/Deduction: -\$20.00/i)).toBeInTheDocument();
    });
  });
});
