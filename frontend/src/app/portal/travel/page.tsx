"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { TravelRequest } from "@/types";
import { useToast } from "@/context/toast-context";
import {
  Plane,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Banknote,
  MapPin,
  ArrowRight,
  X,
  Calendar,
  Receipt,
} from "lucide-react";

export default function PortalTravelDeskPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<TravelRequest[]>([]);

  // Apply modal
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [formPurpose, setFormPurpose] = useState("");
  const [formTravelType, setFormTravelType] = useState<"domestic" | "international">("domestic");
  const [formOrigin, setFormOrigin] = useState("Dhaka Head Office");
  const [formDestination, setFormDestination] = useState("");
  const [formDeparture, setFormDeparture] = useState(new Date().toISOString().slice(0, 10));
  const [formReturn, setFormReturn] = useState(new Date().toISOString().slice(0, 10));
  const [formCost, setFormCost] = useState("");
  const [formAdvanceRequired, setFormAdvanceRequired] = useState(false);
  const [formAdvanceAmount, setFormAdvanceAmount] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<TravelRequest[]>("/travel/requests");
      setRequests(res.data || []);
    } catch (err: any) {
      toast.error("Error Loading Travel", err.message || "Failed to load your travel requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmitTravel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPurpose || !formOrigin || !formDestination) {
      toast.error("Validation Error", "Purpose, origin and destination are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post("/travel/requests", {
        purpose: formPurpose,
        travel_type: formTravelType,
        origin: formOrigin,
        destination: formDestination,
        departure_date: formDeparture,
        return_date: formReturn,
        estimated_cost: formCost ? parseFloat(formCost) : 0,
        advance_required: formAdvanceRequired,
        advance_amount_requested: formAdvanceRequired && formAdvanceAmount ? parseFloat(formAdvanceAmount) : 0,
        notes: formNotes || null,
      });
      toast.success(
        "Travel Request Submitted",
        "Your requisition has been dispatched to management for approval."
      );
      setIsApplyModalOpen(false);
      setFormPurpose("");
      setFormDestination("");
      setFormCost("");
      setFormAdvanceRequired(false);
      setFormAdvanceAmount("");
      setFormNotes("");
      loadData();
    } catch (err: any) {
      toast.error("Submission Failed", err.response?.data?.detail || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase">
            <Plane className="w-4 h-4" />
            <span>Employee Travel Desk</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Business Travel & Advance Requests</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit domestic and international official trip applications, apply for cash advances, and track approval status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 text-slate-500 hover:text-indigo-600 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
          <button
            onClick={() => setIsApplyModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Travel Requisition</span>
          </button>
        </div>
      </div>

      {/* Travel Requests List */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
          <p className="text-xs">Loading travel records...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
          <Plane className="w-10 h-10 text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-600">No travel requisitions found</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Planning an official trip or field duty? Click &ldquo;New Travel Requisition&rdquo; above.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {requests.map((req) => {
            const isApproved = req.status === "approved";
            const isPending = req.status === "pending_approval";
            const isRejected = req.status === "rejected";

            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-indigo-200 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Plane className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">{req.request_number}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-500 px-2 py-0.5 rounded-md bg-slate-100">
                          {req.travel_type}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 mt-0.5">{req.purpose}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                        isApproved
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : isPending
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : isRejected
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isApproved && <CheckCircle2 className="w-3 h-3" />}
                      {isPending && <Clock className="w-3 h-3" />}
                      {isRejected && <XCircle className="w-3 h-3" />}
                      <span>{req.status.replace("_", " ")}</span>
                    </span>

                    {isApproved && (
                      <Link
                        href="/portal/finance"
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                      >
                        <Receipt className="w-3 h-3" />
                        <span>Submit Claim</span>
                      </Link>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Route</span>
                    <div className="flex items-center gap-1 font-medium text-slate-800 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{req.origin}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span>{req.destination}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Travel Dates</span>
                    <div className="font-medium text-slate-800 mt-0.5">
                      {req.departure_date} to {req.return_date}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Estimated Budget</span>
                    <div className="font-mono font-medium text-slate-800 mt-0.5">
                      BDT {Number(req.estimated_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Advance Application</span>
                    <div className="font-mono font-semibold text-indigo-600 mt-0.5">
                      {req.advance_required ? (
                        <>BDT {Number(req.advance_amount_requested).toLocaleString(undefined, { minimumFractionDigits: 2 })}</>
                      ) : (
                        <span className="text-slate-400 italic">None requested</span>
                      )}
                    </div>
                  </div>
                </div>

                {req.rejection_reason && (
                  <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-800">
                    <strong>Rejection Reason:</strong> {req.rejection_reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: New Travel Requisition */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 relative">
            <button
              onClick={() => setIsApplyModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase">
              <Plane className="w-4 h-4" />
              <span>Business Travel Application</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">Submit Travel Requisition</h2>
            <p className="text-xs text-slate-500">Official business trip details, flight/transit, and advance application.</p>

            <form onSubmit={handleSubmitTravel} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase">Trip Purpose *</label>
                <input
                  type="text"
                  required
                  value={formPurpose}
                  onChange={(e) => setFormPurpose(e.target.value)}
                  placeholder="e.g. Client Onboarding Workshop, Regional Outlet Audit"
                  className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Travel Type</label>
                  <select
                    value={formTravelType}
                    onChange={(e: any) => setFormTravelType(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="domestic">Domestic (Bangladesh)</option>
                    <option value="international">International Overseas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Estimated Budget (BDT)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    placeholder="15000.00"
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Origin *</label>
                  <input
                    type="text"
                    required
                    value={formOrigin}
                    onChange={(e) => setFormOrigin(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Destination *</label>
                  <input
                    type="text"
                    required
                    value={formDestination}
                    onChange={(e) => setFormDestination(e.target.value)}
                    placeholder="e.g. Chittagong, Sylhet, Singapore"
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Departure Date *</label>
                  <input
                    type="date"
                    required
                    value={formDeparture}
                    onChange={(e) => setFormDeparture(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Return Date *</label>
                  <input
                    type="date"
                    required
                    value={formReturn}
                    onChange={(e) => setFormReturn(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              {/* Advance Toggle */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAdvanceRequired}
                    onChange={(e) => setFormAdvanceRequired(e.target.checked)}
                    className="w-4 h-4 rounded-sm text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-semibold text-slate-800">Request Pre-Trip Cash/Bank Advance</span>
                </label>

                {formAdvanceRequired && (
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase">
                      Advance Amount Requested (BDT) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formAdvanceAmount}
                      onChange={(e) => setFormAdvanceAmount(e.target.value)}
                      placeholder="e.g. 10000.00"
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase">Notes / Itinerary</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Flight preferences, hotel accommodation notes..."
                  className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  {isSubmitting ? "Submitting..." : "Submit Requisition"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
