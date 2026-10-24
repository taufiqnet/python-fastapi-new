import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ProductsPage from '@/app/ecommerce/products/page';
import { apiClient } from '@/lib/api-client';
import MockAdapter from 'axios-mock-adapter';
import { ProductListItem } from '@/types';

// Mock DashboardLayout
vi.mock('@/components/layout/dashboard-layout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

// Mock Toast Context
vi.mock('@/context/toast-context', () => ({
  useToast: () => ({
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }),
}));

const mockProducts: ProductListItem[] = [
  {
    id: 'prod-1',
    business_id: 1,
    title: 'Industrial Barcode Scanner',
    slug: 'industrial-barcode-scanner',
    sku: 'SKU-SCAN-001',
    status: 'active',
    brand: 'ApexTech',
    brand_id: 'brand-1',
    min_price: 120.0,
    is_featured: true,
  },
  {
    id: 'prod-2',
    business_id: 1,
    title: 'Thermal Receipt Printer',
    slug: 'thermal-receipt-printer',
    sku: 'SKU-PRN-002',
    status: 'active',
    brand: 'LogiPrint',
    brand_id: 'brand-2',
    min_price: 180.0,
    is_featured: false,
  },
  {
    id: 'prod-3',
    business_id: 1,
    title: 'RFID Handheld Terminal',
    slug: 'rfid-handheld-terminal',
    sku: 'SKU-RFID-003',
    status: 'draft',
    brand: 'ApexTech',
    brand_id: 'brand-1',
    min_price: 350.0,
    is_featured: false,
  },
];

describe('Ecommerce Products & Inventory In-Place Non-Destructive Filtering Audit', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it('renders products table without flickering after initial load', async () => {
    mock.onGet(/\/products\//).reply(200, mockProducts);
    mock.onGet(/\/categories\//).reply(200, []);
    mock.onGet(/\/brands\//).reply(200, [
      { id: 'brand-1', name: 'ApexTech' },
      { id: 'brand-2', name: 'LogiPrint' },
    ]);

    await act(async () => {
      render(<ProductsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Industrial Barcode Scanner')).toBeInTheDocument();
      expect(screen.getByText('Thermal Receipt Printer')).toBeInTheDocument();
      expect(screen.getByText('RFID Handheld Terminal')).toBeInTheDocument();
    });

    expect(screen.getByText('SKU-SCAN-001')).toBeInTheDocument();
    expect(screen.getAllByText(/showing/i).length).toBeGreaterThan(0);
  });

  it('performs non-destructive in-place filtering when typing search keywords', async () => {
    mock.onGet(/\/products\//).reply(200, mockProducts);
    mock.onGet(/\/categories\//).reply(200, []);
    mock.onGet(/\/brands\//).reply(200, []);

    await act(async () => {
      render(<ProductsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Industrial Barcode Scanner')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search products by title, SKU, brand, or slug...');

    // Type "Printer"
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Printer' } });
    });

    expect(screen.getByText('Thermal Receipt Printer')).toBeInTheDocument();
    expect(screen.queryByText('Industrial Barcode Scanner')).not.toBeInTheDocument();
    expect(screen.queryByText('RFID Handheld Terminal')).not.toBeInTheDocument();
    expect(screen.getAllByText(/showing/i).length).toBeGreaterThan(0);
  });

  it('filters by status in-place', async () => {
    mock.onGet(/\/products\//).reply(200, mockProducts);
    mock.onGet(/\/categories\//).reply(200, []);
    mock.onGet(/\/brands\//).reply(200, []);

    await act(async () => {
      render(<ProductsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Industrial Barcode Scanner')).toBeInTheDocument();
    });

    const draftTab = screen.getByRole('button', { name: 'Draft' });

    await act(async () => {
      fireEvent.click(draftTab);
    });

    expect(screen.getByText('RFID Handheld Terminal')).toBeInTheDocument();
    expect(screen.queryByText('Industrial Barcode Scanner')).not.toBeInTheDocument();
    expect(screen.queryByText('Thermal Receipt Printer')).not.toBeInTheDocument();
    expect(screen.getAllByText(/showing/i).length).toBeGreaterThan(0);
  });

  it('displays empty state in-place when search yields no matches and allows reset', async () => {
    mock.onGet(/\/products\//).reply(200, mockProducts);
    mock.onGet(/\/categories\//).reply(200, []);
    mock.onGet(/\/brands\//).reply(200, []);

    await act(async () => {
      render(<ProductsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Industrial Barcode Scanner')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search products by title, SKU, brand, or slug...');

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'NonExistentProductQuery' } });
    });

    expect(screen.getByText('No products match your criteria')).toBeInTheDocument();
    expect(screen.getByText('Clear All Filters')).toBeInTheDocument();

    // Click Clear All Filters
    const clearBtn = screen.getByText('Clear All Filters');
    await act(async () => {
      fireEvent.click(clearBtn);
    });

    // Restores table with all products
    expect(screen.getByText('Industrial Barcode Scanner')).toBeInTheDocument();
    expect(screen.getByText('Thermal Receipt Printer')).toBeInTheDocument();
  });
});
