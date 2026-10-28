"use client";

import React from "react";
import { CustomerOut } from "@/types";
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Award,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  Coins,
  Edit,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

interface CustomerDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerOut | null;
  onEdit: (customer: CustomerOut) => void;
}

export function CustomerDetailDrawer({
  isOpen,
  onClose,
  customer,
  onEdit,
}: CustomerDetailDrawerProps) {
  if (!isOpen || !customer) return null;

  const getTierColor = (tier?: string) => {
    switch (tier?.toLowerCase()) {
      case "vip":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "gold":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "silver":
        return "bg-slate-200 text-slate-800 border-slate-300";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-base">
              {customer.first_name.charAt(0)}
              {customer.last_name ? customer.last_name.charAt(0) : ""}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">{customer.full_name}</h2>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${getTierColor(
                  customer.membership_tier
                )}`}
              >
                <Award className="w-3 h-3" /> {customer.membership_tier || "Regular"} Member
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(customer)}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-700 transition"
              title="Edit Profile"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status & Wallets */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-indigo-950 space-y-0.5">
              <span className="text-[10px] font-bold text-indigo-500 uppercase flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" /> Loyalty Balance
              </span>
              <p className="text-xl font-extrabold text-indigo-700">
                {customer.loyalty_points || 0} pts
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-emerald-950 space-y-0.5">
              <span className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" /> Store Credit
              </span>
              <p className="text-xl font-extrabold text-emerald-700">
                {formatCurrency(Number(customer.store_credit || 0))}
              </p>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Contact & Location
            </h3>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 text-xs">
              <div className="flex items-center gap-2.5 text-slate-700">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-mono font-medium">{customer.phone}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{customer.email || "No email on file"}</span>
              </div>
              <div className="flex items-start gap-2.5 text-slate-700">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>{customer.address || "No delivery address on file"}</span>
              </div>
            </div>
          </div>

          {/* Account Metadata */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Account Status & Registration
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-white">
                <span className="text-slate-500">Status</span>
                {customer.is_active ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    <XCircle className="w-3 h-3" /> Inactive
                  </span>
                )}
              </div>
              {customer.created_at && (
                <div className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-white">
                  <span className="text-slate-500">Member Since</span>
                  <span className="font-medium text-slate-800">{formatDate(customer.created_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
