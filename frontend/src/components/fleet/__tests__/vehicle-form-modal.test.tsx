import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VehicleFormModal } from '../vehicle-form-modal';
import { apiClient } from '@/lib/api-client';
import MockAdapter from 'axios-mock-adapter';
import { Vehicle } from '@/types';

describe('VehicleFormModal Component & BRTA Registration Audit', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it('renders null when isOpen is false', () => {
    const { container } = render(
      <VehicleFormModal
        isOpen={false}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('validates required BRTA registration number and brand make', async () => {
    const onSuccess = vi.fn();
    const postSpy = vi.spyOn(apiClient, 'post');

    await act(async () => {
      render(
        <VehicleFormModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={onSuccess}
        />
      );
    });

    expect(screen.getByText('Register New Fleet Vehicle')).toBeInTheDocument();

    // Submit with empty inputs
    const submitBtn = screen.getByText('Register Vehicle');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(
      screen.getByText(/Vehicle registration number is required/i)
    ).toBeInTheDocument();
    expect(postSpy).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('submits valid BRTA registration and vehicle specifications successfully', async () => {
    const onSuccess = vi.fn();

    mock.onPost('/fleet/vehicles').reply(201, {
      id: 'v-101',
      business_id: 1,
      vehicle_number: 'Dhaka Metro-Ga 23-4567',
      vehicle_type: 'sedan',
      brand_make: 'Toyota',
      model_name: 'Corolla Axio',
      current_odometer_km: 12000,
      status: 'available',
    });

    await act(async () => {
      render(
        <VehicleFormModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={onSuccess}
        />
      );
    });

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/e.g. Dhaka Metro-Ga 23-4567/i), {
      target: { value: 'Dhaka Metro-Ga 23-4567' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Toyota, Mitsubishi, Tata/i), {
      target: { value: 'Toyota' },
    });
    fireEvent.change(screen.getByPlaceholderText(/HiAce Super GL, Corolla Axio/i), {
      target: { value: 'Corolla Axio' },
    });

    const submitBtn = screen.getByText('Register Vehicle');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('pre-populates existing vehicle attributes when vehicleToEdit is passed', async () => {
    const existingVehicle: Vehicle = {
      id: 'v-202',
      business_id: 1,
      vehicle_number: 'Dhaka Metro-Cha 54-1122',
      vehicle_type: 'microbus',
      brand_make: 'Toyota',
      model_name: 'HiAce Super GL',
      model_year: 2021,
      chassis_number: 'TRH200-8899',
      seating_capacity: 12,
      fuel_type: 'cng',
      current_odometer_km: 75000,
      ownership_type: 'company_owned',
      status: 'available',
      brta_fitness_expiry_date: '2026-12-31',
      brta_tax_token_expiry_date: '2026-11-30',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    await act(async () => {
      render(
        <VehicleFormModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          vehicleToEdit={existingVehicle}
        />
      );
    });

    expect(screen.getByText('Edit Fleet Vehicle')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Dhaka Metro-Cha 54-1122')).toBeInTheDocument();
    expect(screen.getByDisplayValue('HiAce Super GL')).toBeInTheDocument();
  });
});
