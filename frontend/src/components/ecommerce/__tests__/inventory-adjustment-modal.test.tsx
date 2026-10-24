import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InventoryAdjustmentModal } from '../inventory-adjustment-modal';
import { apiClient } from '@/lib/api-client';
import MockAdapter from 'axios-mock-adapter';

// Mock Toast Context
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};
vi.mock('@/context/toast-context', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('InventoryAdjustmentModal Component & Form Validation Audit', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    vi.clearAllMocks();
  });

  afterEach(() => {
    mock.restore();
  });

  it('renders null when isOpen is false', () => {
    const { container } = render(
      <InventoryAdjustmentModal
        isOpen={false}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('blocks submission and displays error when delta is empty or zero', async () => {
    const onSuccess = vi.fn();
    const postSpy = vi.spyOn(apiClient, 'post');

    await act(async () => {
      render(
        <InventoryAdjustmentModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={onSuccess}
        />
      );
    });

    expect(screen.getByText('Physical Stock Adjustment')).toBeInTheDocument();

    const form = screen.getByText('Post Stock Adjustment').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(
      screen.getByText(
        'Please specify a non-zero quantity adjustment (positive for surplus, negative for shrinkage).'
      )
    ).toBeInTheDocument();
    expect(postSpy).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('prevents negative deduction that exceeds on-hand stock', async () => {
    const onSuccess = vi.fn();
    const postSpy = vi.spyOn(apiClient, 'post');

    await act(async () => {
      render(
        <InventoryAdjustmentModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={onSuccess}
          currentStock={50}
        />
      );
    });

    const deltaInput = screen.getByPlaceholderText('e.g. +10 or -5');
    await act(async () => {
      fireEvent.change(deltaInput, { target: { value: '-75' } });
    });

    const form = screen.getByText('Post Stock Adjustment').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(
      screen.getByText('Cannot deduct 75 units. Current on-hand stock is only 50 units.')
    ).toBeInTheDocument();
    expect(postSpy).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('successfully posts valid stock adjustment payload and triggers callbacks', async () => {
    mock.onPost('/inventory/adjustments').reply(200, {
      id: 'mv-909',
      delta: -5,
      reason: 'damage',
      notes: 'Water damage during warehouse roof leak',
    });

    const onSuccess = vi.fn();
    const onClose = vi.fn();

    await act(async () => {
      render(
        <InventoryAdjustmentModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
          inventoryItemId="inv-item-123"
          sku="SKU-SCAN-001"
          currentStock={100}
        />
      );
    });

    const deltaInput = screen.getByPlaceholderText('e.g. +10 or -5');
    const notesInput = screen.getByPlaceholderText('Provide context for internal warehouse auditors...');

    await act(async () => {
      fireEvent.change(deltaInput, { target: { value: '-5' } });
      fireEvent.change(notesInput, { target: { value: 'Water damage during warehouse roof leak' } });
    });

    const form = screen.getByText('Post Stock Adjustment').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith(
        'Stock Adjusted Successfully',
        expect.any(String)
      );
    });
  });
});
