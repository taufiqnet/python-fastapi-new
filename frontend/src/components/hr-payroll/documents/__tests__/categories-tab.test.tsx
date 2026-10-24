import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CategoriesTab } from '../categories/categories-tab';
import { ToastProvider } from '@/context/toast-context';
import { apiClient } from '@/lib/api-client';
import MockAdapter from 'axios-mock-adapter';
import { DocumentCategory } from '@/types';

const mockCategories: DocumentCategory[] = [
  {
    id: 'cat-1',
    business_id: 1,
    name: 'National Identity Documents',
    code: 'NID_DOCS',
    description: 'NID, Smart Card, and Birth Certificates',
    is_mandatory: true,
    has_expiry: false,
    confidentiality_level: 'confidential',
    allowed_extensions: 'pdf,png,jpg',
    max_file_size_mb: 10,
    is_system: true,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cat-2',
    business_id: 1,
    name: 'Academic Certificates',
    code: 'ACADEMIC',
    description: 'Degrees, Diplomas, and Transcripts',
    is_mandatory: false,
    has_expiry: false,
    confidentiality_level: 'internal',
    allowed_extensions: 'pdf',
    max_file_size_mb: 15,
    is_system: false,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

describe('CategoriesTab Component & In-Place Filtering Audit', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it('renders categories in table without unmounting during search filtering', async () => {
    mock.onGet('/documents/categories?business_id=1').reply(200, mockCategories);

    await act(async () => {
      render(
        <ToastProvider>
          <CategoriesTab currentBusinessId={1} />
        </ToastProvider>
      );
    });

    // Wait for categories to appear
    await waitFor(() => {
      expect(screen.getByText('National Identity Documents')).toBeInTheDocument();
      expect(screen.getByText('Academic Certificates')).toBeInTheDocument();
    });

    // Verify search input filters in-place without table destruction
    const searchInput = screen.getByPlaceholderText('Search categories...');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Academic' } });
    });

    // 'Academic Certificates' should remain, 'National Identity Documents' should be filtered out
    expect(screen.getByText('Academic Certificates')).toBeInTheDocument();
    expect(screen.queryByText('National Identity Documents')).not.toBeInTheDocument();

    // Clear search
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: '' } });
    });

    expect(screen.getByText('National Identity Documents')).toBeInTheDocument();
    expect(screen.getByText('Academic Certificates')).toBeInTheDocument();
  });

  it('validates required fields on create modal submission', async () => {
    mock.onGet('/documents/categories?business_id=1').reply(200, mockCategories);

    await act(async () => {
      render(
        <ToastProvider>
          <CategoriesTab currentBusinessId={1} />
        </ToastProvider>
      );
    });

    // Open create modal
    const newBtn = screen.getByText('New Category');
    await act(async () => {
      fireEvent.click(newBtn);
    });

    expect(screen.getByText('New Document Category')).toBeInTheDocument();

    // Spy on post
    const postSpy = vi.spyOn(apiClient, 'post');

    // Click submit with empty fields
    const saveBtn = screen.getByText('Save Category');
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    // Should NOT have called API
    expect(postSpy).not.toHaveBeenCalled();
  });
});
