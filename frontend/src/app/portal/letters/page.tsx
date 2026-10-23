"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { OfficialLetterRequest } from "@/types";
import { useToast } from "@/context/toast-context";
import {
  FileCheck,
  Plus,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  X,
  Loader2,
  Globe,
  Building,
} from "lucide-react";

export default function PortalLettersPage() {
  const { toast } = useToast();
  const [letters, setLetters] = useState<OfficialLetterRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [letterType, setLetterType] = useState<
    "noc_visa" | "noc_travel" | "salary_certificate" | "experience_letter" | "job_confirmation"
  >("noc_visa");
  const [purpose, setPurpose] = useState("");
  const [addressedTo, setAddressedTo] = useState("");
  const [country, setCountry] = useState("");
  const [travelStart, setTravelStart] = useState("");
  const [travelEnd, setTravelEnd] = useState("");

  const loadLetters = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<OfficialLetterRequest[]>("/portal/letter-requests");
      setLetters(res.data || []);
    } catch {
      toast.error("Failed", "Unable to load letter requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLetters();
  }, []);

  const handleRequestLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose) {
      toast.error("Validation Error", "Please provide a purpose for the request.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post("/portal/letter-requests", {
        letter_type: letterType,
        purpose,
        addressed_to: addressedTo || null,
        travel_country: country || null,
        travel_start_date: travelStart || null,
        travel_end_date: travelEnd || null,
      });
      toast.success(
        "Request Submitted",
        "Your official letter request has been forwarded to HR."
      );
      setIsModalOpen(false);
      setPurpose("");
      setAddressedTo("");
      setCountry("");
      loadLetters();
    } catch (err: any) {
      toast.error("Failed", err.response?.data?.detail || "Could not submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLetterTitle = (type: string) => {
    switch (type) {
      case "noc_visa":
        return "No Objection Certificate (Visa Application)";
      case "noc_travel":
        return "Leave & Travel NOC Letter";
      case "salary_certificate":
        return "Official Salary Certificate";
      case "experience_letter":
        return "Experience & Service Certificate";
      case "job_confirmation":
        return "Employment Confirmation Letter";
      default:
        return type.toUpperCase();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Official Letter Requests</h2>
          <p className="text-xs text-slate-500">
            Request embassy NOCs, salary certificates, and experience letters
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Request Official Letter</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs text-slate-500">Loading your letter requests...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Requested Letters Archive</h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {letters.length} Letters
            </span>
          </div>

          {letters.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No official letter requests submitted.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Document Type</th>
                    <th className="py-3 px-4">Purpose & Addressed To</th>
                    <th className="py-3 px-4">Date Filed</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {letters.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {getLetterTitle(l.letter_type)}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="font-medium text-slate-800 block truncate">{l.purpose}</span>
                        {l.addressed_to && (
                          <span className="text-[10px] text-slate-400 block truncate">
                            To: {l.addressed_to}
                          </span>
                        )}
                        {l.travel_country && (
                          <span className="text-[10px] text-indigo-600 font-medium">
                            Country: {l.travel_country}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {new Date(l.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            l.status === "generated"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : l.status === "approved"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : l.status === "rejected"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {l.generated_file_url ? (
                          <a
                            href={l.generated_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-xs hover:bg-emerald-100 transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download PDF</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Processing</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Official Letter Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Request Official Letter</h3>
                <p className="text-xs text-slate-500">HR will prepare official letterhead copy</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestLetter} className="space-y-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Letter Type</label>
                <select
                  value={letterType}
                  onChange={(e: any) => setLetterType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="noc_visa">No Objection Certificate (Visa Application)</option>
                  <option value="noc_travel">Leave & Travel NOC Letter</option>
                  <option value="salary_certificate">Official Salary Certificate</option>
                  <option value="experience_letter">Experience & Service Certificate</option>
                  <option value="job_confirmation">Employment Confirmation Letter</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Addressed To</label>
                <input
                  type="text"
                  placeholder="e.g. Visa Officer, Embassy of Japan in Dhaka / To Whom It May Concern"
                  value={addressedTo}
                  onChange={(e) => setAddressedTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {(letterType === "noc_visa" || letterType === "noc_travel") && (
                <>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Destination Country</label>
                    <input
                      type="text"
                      placeholder="e.g. Japan, Singapore, UAE"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Departure Date</label>
                      <input
                        type="date"
                        value={travelStart}
                        onChange={(e) => setTravelStart(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Return Date</label>
                      <input
                        type="date"
                        value={travelEnd}
                        onChange={(e) => setTravelEnd(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Detailed Purpose</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this certificate is required..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Letter Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
