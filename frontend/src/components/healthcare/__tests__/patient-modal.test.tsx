import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PatientModal } from '../modals/patient-modal';
import { apiClient } from '@/lib/api-client';
import MockAdapter from 'axios-mock-adapter';
import { PatientOut } from '@/types';

describe('PatientModal Component & Form Validation Audit', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it('renders null when isOpen is false', () => {
    const { container } = render(
      <PatientModal
        isOpen={false}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('blocks submission and displays error when required fields are empty', async () => {
    const onSuccess = vi.fn();
    const postSpy = vi.spyOn(apiClient, 'post');

    await act(async () => {
      render(
        <PatientModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={onSuccess}
        />
      );
    });

    expect(screen.getByText('Register New Patient (MPI)')).toBeInTheDocument();

    // Submit form with empty inputs
    const form = screen.getByText('Create Patient & Generate UHID').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(
      screen.getByText('Patient full name and contact phone number are required.')
    ).toBeInTheDocument();
    expect(postSpy).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('successfully submits valid patient data and triggers onSuccess', async () => {
    const mockCreatedPatient: PatientOut = {
      id: 'pat-101',
      business_id: 1,
      uhid: 'UHID-1-2026-0001',
      full_name: 'Shamsur Rahman',
      phone: '+8801712345678',
      email: 'shamsur@gmail.com',
      date_of_birth: '1985-04-12',
      gender: 'male',
      blood_group: 'O+',
      is_active: true,
      created_at: '2026-06-20T10:00:00Z',
      updated_at: '2026-06-20T10:00:00Z',
    };

    mock.onPost('/healthcare/patients').reply(201, mockCreatedPatient);

    const onSuccess = vi.fn();

    await act(async () => {
      render(
        <PatientModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={onSuccess}
        />
      );
    });

    // Fill in required fields
    const nameInput = screen.getByPlaceholderText('e.g. Mohammad Karim');
    const phoneInput = screen.getByPlaceholderText('e.g. 01711223344');

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Shamsur Rahman' } });
      fireEvent.change(phoneInput, { target: { value: '+8801712345678' } });
    });

    const submitBtn = screen.getByText('Create Patient & Generate UHID');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockCreatedPatient);
    });
  });

  it('pre-populates fields in edit mode and sends PUT request', async () => {
    const patientToEdit: PatientOut = {
      id: 'pat-102',
      business_id: 1,
      uhid: 'UHID-1-2026-0002',
      full_name: 'Begum Rokeya',
      phone: '+8801812345678',
      email: 'rokeya@gmail.com',
      gender: 'female',
      blood_group: 'A+',
      is_active: true,
      created_at: '2026-06-20T10:00:00Z',
      updated_at: '2026-06-20T10:00:00Z',
    };

    mock.onPut('/healthcare/patients/pat-102').reply(200, {
      ...patientToEdit,
      full_name: 'Begum Rokeya Edited',
    });

    const onSuccess = vi.fn();

    await act(async () => {
      render(
        <PatientModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={onSuccess}
          patientToEdit={patientToEdit}
        />
      );
    });

    expect(screen.getByText('Edit Patient Information')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Begum Rokeya')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+8801812345678')).toBeInTheDocument();

    const updateBtn = screen.getByText('Update Patient');
    await act(async () => {
      fireEvent.click(updateBtn);
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
