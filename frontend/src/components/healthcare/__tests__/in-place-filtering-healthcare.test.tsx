import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PatientsRegistryPage from '@/app/healthcare/patients/page';
import { apiClient } from '@/lib/api-client';
import MockAdapter from 'axios-mock-adapter';
import { PatientOut } from '@/types';

// Mock DashboardLayout to avoid router dependencies
vi.mock('@/components/layout/dashboard-layout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

const mockPatients: PatientOut[] = [
  {
    id: 'pat-1',
    business_id: 1,
    uhid: 'UHID-1-2026-0001',
    full_name: 'Mohammad Rahim',
    phone: '01711223344',
    email: 'rahim@test.com',
    gender: 'male',
    blood_group: 'B+',
    address: 'Dhanmondi, Dhaka',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'pat-2',
    business_id: 1,
    uhid: 'UHID-1-2026-0002',
    full_name: 'Fatima Begum',
    phone: '01811223344',
    email: 'fatima@test.com',
    gender: 'female',
    blood_group: 'O+',
    address: 'Mirpur, Dhaka',
    is_active: true,
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  },
];

describe('Healthcare In-Place Non-Destructive Filtering Audit', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it('renders initial loading state then displays patient table without unmounting structure', async () => {
    mock.onGet('/healthcare/patients').reply(200, mockPatients);

    await act(async () => {
      render(<PatientsRegistryPage />);
    });

    // Verify header elements
    expect(screen.getByText('Patient Registry')).toBeInTheDocument();
    expect(screen.getByText('Master Patient Index (MPI)')).toBeInTheDocument();

    // Table elements are rendered
    await waitFor(() => {
      expect(screen.getByText('Mohammad Rahim')).toBeInTheDocument();
      expect(screen.getByText('Fatima Begum')).toBeInTheDocument();
      expect(screen.getByText('UHID-1-2026-0001')).toBeInTheDocument();
    });

    expect(screen.getByText('Total records:')).toBeInTheDocument();
  });

  it('performs non-destructive in-place filtering when typing search query', async () => {
    mock.onGet(/\/healthcare\/patients/).reply((config) => {
      const search = config.params?.search;
      if (search === 'Fatima') {
        return [200, [mockPatients[1]]];
      }
      return [200, mockPatients];
    });

    await act(async () => {
      render(<PatientsRegistryPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Mohammad Rahim')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by UHID, patient name, or phone...');

    // Type filter query
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Fatima' } });
    });

    // In-place filtered list updates while table structure remains intact
    await waitFor(() => {
      expect(screen.getByText('Fatima Begum')).toBeInTheDocument();
      expect(screen.queryByText('Mohammad Rahim')).not.toBeInTheDocument();
    });

    // Check count updated
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders empty state in-place when search returns zero results without unmounting table header', async () => {
    mock.onGet(/\/healthcare\/patients/).reply((config) => {
      const search = config.params?.search;
      if (search === 'NonExistent') {
        return [200, []];
      }
      return [200, mockPatients];
    });

    await act(async () => {
      render(<PatientsRegistryPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Mohammad Rahim')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by UHID, patient name, or phone...');

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'NonExistent' } });
    });

    await waitFor(() => {
      expect(screen.getByText('No patients found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search criteria')).toBeInTheDocument();
    });

    // Table header remains mounted in-place
    expect(screen.getByText('UHID')).toBeInTheDocument();
    expect(screen.getByText('Demographics')).toBeInTheDocument();
  });
});
