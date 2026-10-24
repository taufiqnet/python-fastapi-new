import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SignDocumentModal } from '../modals/sign-document-modal';
import { ToastProvider } from '@/context/toast-context';
import { apiClient } from '@/lib/api-client';
import MockAdapter from 'axios-mock-adapter';
import { DocumentAcknowledgement } from '@/types';

describe('SignDocumentModal Security & Statutory Validation Audit', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it('renders nothing when isOpen is false', () => {
    render(
      <ToastProvider>
        <SignDocumentModal
          currentBusinessId={1}
          isOpen={false}
          onClose={vi.fn()}
          documentTitle="Employment Agreement"
          contentToSign="Agreement content hashable"
          employeeId="emp-123"
          onSignedSuccess={vi.fn()}
        />
      </ToastProvider>
    );

    expect(
      screen.queryByText('Statutory e-Signature & Acknowledgment')
    ).not.toBeInTheDocument();
  });

  it('blocks submission when legal terms checkbox is not agreed', async () => {
    const onSignedSuccess = vi.fn();
    const postSpy = vi.spyOn(apiClient, 'post');

    await act(async () => {
      render(
        <ToastProvider>
          <SignDocumentModal
            currentBusinessId={1}
            isOpen={true}
            onClose={vi.fn()}
            documentTitle="Employment Contract"
            contentToSign="Standard BLA 2006 terms"
            employeeId="emp-123"
            defaultSignerName="Rahim Uddin"
            defaultSignerEmail="rahim@proerp.com"
            onSignedSuccess={onSignedSuccess}
          />
        </ToastProvider>
      );
    });

    expect(screen.getByText('Statutory e-Signature & Acknowledgment')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Rahim Uddin')).toBeInTheDocument();

    // Submit form without checking the legal agreement checkbox
    const submitBtn = screen.getByText('Execute & Sign Document');
    const form = submitBtn.closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    // API must NOT be called
    expect(postSpy).not.toHaveBeenCalled();
    expect(onSignedSuccess).not.toHaveBeenCalled();
  });

  it('submits digital signature successfully when valid and terms are agreed', async () => {
    const mockAck: DocumentAcknowledgement = {
      id: 'ack-999',
      business_id: 1,
      employee_id: 'emp-123',
      document_id: 'doc-456',
      signature_mode: 'typed_signature',
      signer_full_name: 'Rahim Uddin',
      signer_email: 'rahim@proerp.com',
      document_checksum_sha256: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      audit_certificate_no: 'CERT-2026-BD-0099',
      acknowledgement_text: 'Statutory ICT Act 2006 compliance confirmed',
      status: 'signed',
      signed_at: '2026-06-15T10:00:00Z',
      created_at: '2026-06-15T10:00:00Z',
    };

    mock
      .onPost('/documents/signatures/sign?business_id=1')
      .reply(200, mockAck);

    const onSignedSuccess = vi.fn();

    await act(async () => {
      render(
        <ToastProvider>
          <SignDocumentModal
            currentBusinessId={1}
            isOpen={true}
            onClose={vi.fn()}
            documentTitle="Employment Contract"
            contentToSign="Standard BLA 2006 terms"
            employeeId="emp-123"
            documentId="doc-456"
            defaultSignerName="Rahim Uddin"
            defaultSignerEmail="rahim@proerp.com"
            onSignedSuccess={onSignedSuccess}
          />
        </ToastProvider>
      );
    });

    // Switch mode to typed full name to test non-canvas signing
    const typeModeBtn = screen.getByText('Type Name');
    await act(async () => {
      fireEvent.click(typeModeBtn);
    });

    // Check legal agreement checkbox
    const checkbox = screen.getByRole('checkbox');
    await act(async () => {
      fireEvent.click(checkbox);
    });

    // Submit form
    const submitBtn = screen.getByText('Execute & Sign Document');
    const form = submitBtn.closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(onSignedSuccess).toHaveBeenCalledWith(mockAck);
      expect(screen.getByText('CERT-2026-BD-0099')).toBeInTheDocument();
      expect(screen.getByText('Document Successfully Executed!')).toBeInTheDocument();
    });
  });
});
