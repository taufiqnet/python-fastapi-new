import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FleetVehiclesPage from '@/app/fleet/page';
import { apiClient } from '@/lib/api-client';
import MockAdapter from 'axios-mock-adapter';
import { Vehicle } from '@/types';

const mockVehicles: Vehicle[] = [
  {
    id: 'v-1',
    business_id: 1,
    vehicle_number: 'Dhaka Metro-Ga 23-4567',
    vehicle_type: 'sedan',
    brand_make: 'Toyota',
    model_name: 'Corolla Axio',
    current_odometer_km: 15200,
    fuel_type: 'octane',
    seating_capacity: 4,
    ownership_type: 'company_owned',
    status: 'available',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'v-2',
    business_id: 1,
    vehicle_number: 'Dhaka Metro-Ta 15-4321',
    vehicle_type: 'heavy_truck',
    brand_make: 'Tata',
    model_name: 'LPT 407',
    current_odometer_km: 62000,
    fuel_type: 'diesel',
    seating_capacity: 3,
    ownership_type: 'company_owned',
    status: 'on_trip',
    is_active: true,
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  },
];

describe('Fleet In-Place Non-Destructive Filtering Audit', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    mock.onGet('/fleet/overview/stats').reply(200, {
      total_vehicles: 2,
      available_vehicles: 1,
      on_trip_vehicles: 1,
      in_maintenance_vehicles: 0,
      total_drivers: 2,
      active_drivers: 1,
      active_trips: 1,
      pending_requisitions: 0,
      expiring_documents_count: 0,
      monthly_fuel_cost_bdt: 12000,
      monthly_maintenance_cost_bdt: 5000,
      total_fleet_odometer_km: 77200,
    });
    mock.onGet(/\/fleet\/alerts\/expiring-documents.*/).reply(200, {
      total_alerts: 0,
      expired_count: 0,
      expiring_soon_count: 0,
      alerts: [],
    });
    mock.onGet('/fleet/vehicles').reply(200, mockVehicles);
  });

  afterEach(() => {
    mock.restore();
  });

  it('renders initial state with stats cards and populates table in-place', async () => {
    await act(async () => {
      render(<FleetVehiclesPage />);
    });

    // Check header and KPI stats
    expect(screen.getByText('Vehicle & Fleet Management')).toBeInTheDocument();
    expect(screen.getByText('Total Fleet')).toBeInTheDocument();

    // Verify vehicles are displayed
    await waitFor(() => {
      expect(screen.getByText('Dhaka Metro-Ga 23-4567')).toBeInTheDocument();
      expect(screen.getByText('Dhaka Metro-Ta 15-4321')).toBeInTheDocument();
    });

    // Table container and headers remain mounted
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Registration & Vehicle')).toBeInTheDocument();
    expect(screen.getByText('Odometer & Fuel')).toBeInTheDocument();
  });

  it('preserves table mounted state during status tab transitions (In-Place Invariant)', async () => {
    await act(async () => {
      render(<FleetVehiclesPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Dhaka Metro-Ga 23-4567')).toBeInTheDocument();
    });

    const tableElement = screen.getByRole('table');
    expect(tableElement).toBeInTheDocument();

    // Mock filtered response for 'Available'
    mock.onGet('/fleet/vehicles', { params: expect.objectContaining({ status: 'available' }) })
      .reply(200, [mockVehicles[0]]);

    // Click 'Available' tab
    const availableTab = screen.getByRole('button', { name: /^Available$/i });
    await act(async () => {
      fireEvent.click(availableTab);
    });

    // Verify table remains mounted throughout transition
    expect(screen.getByRole('table')).toBe(tableElement);
    await waitFor(() => {
      expect(screen.getByText('Dhaka Metro-Ga 23-4567')).toBeInTheDocument();
    });
  });

  it('updates search query without unmounting the data table container', async () => {
    await act(async () => {
      render(<FleetVehiclesPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Dhaka Metro-Ga 23-4567')).toBeInTheDocument();
    });

    const tableElement = screen.getByRole('table');
    const searchInput = screen.getByPlaceholderText(/Search plate, brand, model.../i);

    // Mock search API response
    mock.onGet('/fleet/vehicles', { params: expect.objectContaining({ search: 'Tata' }) })
      .reply(200, [mockVehicles[1]]);

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Tata' } });
    });

    // Table container never unmounted
    expect(screen.getByRole('table')).toBe(tableElement);
    await waitFor(() => {
      expect(screen.getByText('Dhaka Metro-Ta 15-4321')).toBeInTheDocument();
    });
  });

  it('renders empty state in-place when search yields no results', async () => {
    await act(async () => {
      render(<FleetVehiclesPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Dhaka Metro-Ga 23-4567')).toBeInTheDocument();
    });

    mock.onGet('/fleet/vehicles').reply(200, []);

    const searchInput = screen.getByPlaceholderText(/Search plate, brand, model.../i);
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'NonExistentPlate' } });
    });

    await waitFor(() => {
      expect(screen.getByText(/No vehicles found matching current criteria/i)).toBeInTheDocument();
    });

    // Table and headers still mounted
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Registration & Vehicle')).toBeInTheDocument();
  });
});
