"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { PortalMe, ProfileUpdateRequest } from "@/types";
import { useToast } from "@/context/toast-context";
import {
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Building,
  Shield,
  Clock,
  Edit,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  X,
  FileText,
} from "lucide-react";

export default function PortalProfilePage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<PortalMe | null>(null);
  const [requests, setRequests] = useState<ProfileUpdateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [phone, setPhone] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [presentAddress, setPresentAddress] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankRouting, setBankRouting] = useState("");
  const [mfsProvider, setMfsProvider] = useState("");
  const [mfsNumber, setMfsNumber] = useState("");
  const [reason, setReason] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, rRes] = await Promise.allSettled([
        apiClient.get<PortalMe>("/portal/me"),
        apiClient.get<ProfileUpdateRequest[]>("/portal/profile-update-requests"),
      ]);
      if (pRes.status === "fulfilled") {
        setProfile(pRes.value.data);
        // Pre-fill form
        const p = pRes.value.data;
        setPhone(p.phone || "");
        setPersonalEmail(p.personal_email || "");
        setPresentAddress(p.present_address || "");
        setPermanentAddress(p.permanent_address || "");
        setEmergencyName(p.emergency_contact_name || "");
        setEmergencyRelation(p.emergency_contact_relation || "");
        setEmergencyPhone(p.emergency_contact_phone || "");
        setBankName(p.bank_name || "");
        setBankBranch(p.bank_branch || "");
        setBankAccountNo(p.bank_account_no || "");
        setBankRouting(p.bank_routing_number || "");
        setMfsProvider(p.mfs_provider || "");
        setMfsNumber(p.mfs_number || "");
      }
      if (rRes.status === "fulfilled") {
        setRequests(rRes.value.data || []);
      }
    } catch {
      toast.error("Failed", "Unable to load profile information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const changes: Record<string, string> = {};
      if (phone !== profile?.phone) changes.phone = phone;
      if (personalEmail !== profile?.personal_email) changes.personal_email = personalEmail;
      if (presentAddress !== profile?.present_address) changes.present_address = presentAddress;
      if (permanentAddress !== profile?.permanent_address) changes.permanent_address = permanentAddress;
      if (emergencyName !== profile?.emergency_contact_name) changes.emergency_contact_name = emergencyName;
      if (emergencyRelation !== profile?.emergency_contact_relation) changes.emergency_contact_relation = emergencyRelation;
      if (emergencyPhone !== profile?.emergency_contact_phone) changes.emergency_contact_phone = emergencyPhone;
      if (bankName !== profile?.bank_name) changes.bank_name = bankName;
      if (bankBranch !== profile?.bank_branch) changes.bank_branch = bankBranch;
      if (bankAccountNo !== profile?.bank_account_no) changes.bank_account_no = bankAccountNo;
      if (bankRouting !== profile?.bank_routing_number) changes.bank_routing_number = bankRouting;
      if (mfsProvider !== profile?.mfs_provider) changes.mfs_provider = mfsProvider;
      if (mfsNumber !== profile?.mfs_number) changes.mfs_number = mfsNumber;

      if (Object.keys(changes).length === 0) {
        toast.info("No Changes Detected", "You have not modified any information.");
        setIsSubmitting(false);
        return;
      }

      await apiClient.post("/portal/profile-update-requests", {
        requested_changes: changes,
        reason: reason || "Employee self-service update request",
      });

      toast.success(
        "Request Submitted",
        "Your profile update request has been routed to HR for review."
      );
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(
        "Submission Failed",
        err.response?.data?.detail || "Unable to submit update request."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading profile records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white font-extrabold text-2xl flex items-center justify-center shadow-md shadow-indigo-600/20">
            {profile.first_name[0]}
            {profile.last_name ? profile.last_name[0] : ""}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{profile.full_name}</h2>
              {profile.bangla_name && (
                <span className="text-xs text-slate-500 font-medium font-serif">
                  ({profile.bangla_name})
                </span>
              )}
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {profile.job_title_name} • {profile.department_name} • {profile.branch_name || "Headquarters"}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition active:scale-95 self-start md:self-auto"
        >
          <Edit className="w-4 h-4" />
          <span>Request Profile Update</span>
        </button>
      </div>

      {/* Grid: 3 Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Employment & Statutory Information */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">Employment & Statutory</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block">Employee ID</span>
              <span className="font-mono font-semibold text-slate-800">{profile.employee_id}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Employment Category</span>
              <span className="font-semibold text-slate-800 capitalize">{profile.employee_category || "Management"}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Work Arrangement</span>
              <span className="font-semibold text-slate-800 capitalize">{profile.work_arrangement || "Onsite"}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Date of Joining</span>
              <span className="font-medium text-slate-800">{profile.start_date || "--"}</span>
            </div>
            <div>
              <span className="text-slate-400 block">National ID (NID)</span>
              <span className="font-mono font-semibold text-slate-800">{profile.national_id || "Unregistered"}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Tax Identification (e-TIN)</span>
              <span className="font-mono font-semibold text-slate-800">{profile.tin || "Not Provided"}</span>
            </div>
          </div>
        </div>

        {/* 2. Contact Information & Addresses */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <MapPin className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">Contact & Addresses</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block">Official Phone</span>
              <span className="font-mono font-semibold text-slate-800">{profile.phone || "--"}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Personal Email</span>
              <span className="font-medium text-slate-800">{profile.personal_email || "--"}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Present Address</span>
              <span className="font-medium text-slate-800">{profile.present_address || "Not Provided"}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Permanent Address</span>
              <span className="font-medium text-slate-800">{profile.permanent_address || "Not Provided"}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Emergency Contact</span>
              <span className="font-semibold text-slate-800 block">
                {profile.emergency_contact_name || "--"} ({profile.emergency_contact_relation || "--"})
              </span>
              <span className="font-mono text-slate-600">{profile.emergency_contact_phone || "--"}</span>
            </div>
          </div>
        </div>

        {/* 3. Salary Disbursement & Banking */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">Disbursement & Banking</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block">Disbursement Channel</span>
              <span className="font-semibold text-slate-800 uppercase tracking-wide">
                {profile.disbursement_method || "Bank Transfer"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Bank Name & Branch</span>
              <span className="font-medium text-slate-800">
                {profile.bank_name || "--"} • {profile.bank_branch || "--"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Account Number</span>
              <span className="font-mono font-semibold text-slate-800">
                {profile.bank_account_no || "--"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Bank Routing Number</span>
              <span className="font-mono text-slate-700">{profile.bank_routing_number || "--"}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Mobile Financial Service (MFS)</span>
              <span className="font-medium text-slate-800 uppercase">
                {profile.mfs_provider || "N/A"} : <span className="font-mono">{profile.mfs_number || "--"}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Update Requests History */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600" />
          <span>My Profile Update Request History</span>
        </h3>

        {requests.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">No update requests filed.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((r) => (
              <div key={r.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full ${
                        r.status === "approved"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : r.status === "rejected"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {r.status}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium">{r.reason || "Profile update submission"}</p>
                  <p className="text-[11px] text-slate-500">
                    Fields: {Object.keys(r.requested_changes).join(", ")}
                  </p>
                </div>

                {r.review_notes && (
                  <div className="text-right text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg max-w-xs">
                    <strong>HR Note:</strong> {r.review_notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Update Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Request Information Update</h3>
                <p className="text-xs text-slate-500">
                  Changes will be verified and approved by the HR department.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Personal Email</label>
                  <input
                    type="email"
                    value={personalEmail}
                    onChange={(e) => setPersonalEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Present Address</label>
                <textarea
                  rows={2}
                  value={presentAddress}
                  onChange={(e) => setPresentAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Relationship</label>
                  <input
                    type="text"
                    placeholder="Spouse / Parent"
                    value={emergencyRelation}
                    onChange={(e) => setEmergencyRelation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Emergency Phone</label>
                  <input
                    type="text"
                    placeholder="+8801..."
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Account Number</label>
                  <input
                    type="text"
                    value={bankAccountNo}
                    onChange={(e) => setBankAccountNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reason for Update</label>
                <input
                  type="text"
                  placeholder="e.g. Relocated residence or opened new salary account"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Send Request to HR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
