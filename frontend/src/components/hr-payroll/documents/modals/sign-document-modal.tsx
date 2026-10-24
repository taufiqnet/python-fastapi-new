"use client";

import React, { useState, useRef, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import { DocumentAcknowledgement, SignatureMode } from "@/types";
import {
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Lock,
} from "lucide-react";

interface SignDocumentModalProps {
  currentBusinessId: number;
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  contentToSign: string;
  employeeId: string;
  documentId?: string;
  agreementId?: string;
  letterItemId?: string;
  defaultSignerName?: string;
  defaultSignerEmail?: string;
  onSignedSuccess: (acknowledgement: DocumentAcknowledgement) => void;
}

export function SignDocumentModal({
  currentBusinessId,
  isOpen,
  onClose,
  documentTitle,
  contentToSign,
  employeeId,
  documentId,
  agreementId,
  letterItemId,
  defaultSignerName = "",
  defaultSignerEmail = "",
  onSignedSuccess,
}: SignDocumentModalProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const [signatureMode, setSignatureMode] = useState<SignatureMode>("drawn_canvas");
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [signerEmail, setSignerEmail] = useState(defaultSignerEmail);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completedAck, setCompletedAck] = useState<DocumentAcknowledgement | null>(null);

  useEffect(() => {
    if (defaultSignerName) {
      setSignerName(defaultSignerName);
    }
    if (defaultSignerEmail) {
      setSignerEmail(defaultSignerEmail);
    }
  }, [defaultSignerName, defaultSignerEmail]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e293b";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim()) {
      toast.error("Name Required", "Please enter your legal name.");
      return;
    }
    if (!agreeTerms) {
      toast.error("Consent Required", "You must acknowledge and agree to the statutory electronic signature terms.");
      return;
    }

    let signatureImageBase64 = "";
    if (signatureMode === "drawn_canvas") {
      if (!hasDrawn || !canvasRef.current) {
        toast.error("Signature Missing", "Please draw your signature in the box provided.");
        return;
      }
      signatureImageBase64 = canvasRef.current.toDataURL("image/png");
    }

    setSubmitting(true);
    try {
      const payload = {
        business_id: currentBusinessId,
        employee_id: employeeId,
        document_id: documentId || null,
        agreement_id: agreementId || null,
        letter_item_id: letterItemId || null,
        document_content_to_hash: contentToSign,
        signature_mode: signatureMode,
        signature_image_base64_or_url: signatureImageBase64 || null,
        signer_full_name: signerName.trim(),
        signer_email: signerEmail.trim() || null,
        acknowledgement_text:
          "I hereby confirm that I have reviewed the contents of this document. By executing this electronic signature, I intend to legally bind myself under the Information & Communication Technology (ICT) Act 2006.",
      };

      const res = await apiClient.post<DocumentAcknowledgement>(
        `/documents/signatures/sign?business_id=${currentBusinessId}`,
        payload
      );

      const ack = res.data;
      toast.success(
        "Document Signed",
        `Legally executed under ICT Act 2006. Certificate: ${ack.audit_certificate_no}`
      );
      setCompletedAck(ack);
      onSignedSuccess(ack);
    } catch (err: any) {
      toast.error("Signing Failed", err.message || "Failed to execute digital signature");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col animate-scaleUp">
        <div className="flex justify-between items-start pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Statutory e-Signature & Acknowledgment
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Compliant with Bangladesh Information & Communication Technology Act 2006
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {completedAck ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                Document Successfully Executed!
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                A tamper-evident SHA-256 cryptographic stamp has been generated and appended to the audit dossier.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-left text-xs font-mono space-y-2 max-w-lg mx-auto">
              <div className="flex justify-between">
                <span className="text-slate-400">Certificate No:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {completedAck.audit_certificate_no}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Signer Legal Name:</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">
                  {completedAck.signer_full_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Timestamp:</span>
                <span className="text-slate-800 dark:text-slate-200">
                  {completedAck.signed_at}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">SHA-256 Hash:</span>
                <span className="text-slate-600 dark:text-slate-400 truncate max-w-[200px]" title={completedAck.document_checksum_sha256}>
                  {completedAck.document_checksum_sha256}
                </span>
              </div>
            </div>

            <div className="pt-4 flex justify-center">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSignSubmit} className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{documentTitle}</p>
                <p className="text-[11px] text-slate-400">Legally binding electronic signature</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold uppercase text-[10px]">
                ICT ACT 2006
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="e.g. Tariqul Islam"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Signer Email
                </label>
                <input
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="e.g. tariqul@company.com"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Signature Input Mode Selection */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Signature Method:
                </label>
                <div className="flex bg-slate-100 dark:bg-slate-700/60 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setSignatureMode("drawn_canvas")}
                    className={`px-3 py-1 rounded font-medium transition ${
                      signatureMode === "drawn_canvas"
                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Draw Pad
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignatureMode("typed_signature")}
                    className={`px-3 py-1 rounded font-medium transition ${
                      signatureMode === "typed_signature"
                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Type Name
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignatureMode("clickwrap_acknowledge")}
                    className={`px-3 py-1 rounded font-medium transition ${
                      signatureMode === "clickwrap_acknowledge"
                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Clickwrap
                  </button>
                </div>
              </div>

              {signatureMode === "drawn_canvas" ? (
                <div>
                  <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      width={580}
                      height={140}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-36 cursor-crosshair touch-none"
                    />
                    {!hasDrawn && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs italic">
                        Draw your signature here with mouse or touch screen
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end mt-1.5">
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-600 font-semibold"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Clear Signature
                    </button>
                  </div>
                </div>
              ) : signatureMode === "typed_signature" ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                  <p className="text-xs text-slate-400 mb-2">Electronic Typed Signature Preview:</p>
                  <p className="font-serif italic text-2xl text-slate-800 dark:text-slate-200 font-bold">
                    {signerName || "Your Signature"}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                  <p className="text-xs text-slate-500">
                    Clickwrap verification: Your identity, timestamp, IP address, and user agent will be cryptographically bound upon agreement.
                  </p>
                </div>
              )}
            </div>

            {/* Clickwrap Statutory Consent */}
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/50 text-xs space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 mt-0.5"
                />
                <span className="text-slate-700 dark:text-slate-300 leading-snug">
                  I hereby confirm that I have reviewed the contents of this document. By checking this box and providing my signature, I intend to legally bind myself to the terms contained herein in full accordance with the Information & Communication Technology (ICT) Act 2006.
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !agreeTerms}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                {submitting ? "Signing & Encrypting..." : "Execute & Sign Document"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
