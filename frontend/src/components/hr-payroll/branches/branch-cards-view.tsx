"use client";

import React from "react";
import { BranchOut } from "@/types";
import { Crown, Users, Edit2, Trash2, Eye, MapPin, Phone, Mail } from "lucide-react";

interface BranchCardsViewProps {
  branches: BranchOut[];
  searchQuery: string;
  onView: (branch: BranchOut) => void;
  onEdit: (branch: BranchOut) => void;
  onDelete: (branch: BranchOut) => void;
}

export function BranchCardsView({
  branches,
  searchQuery,
  onView,
  onEdit,
  onDelete,
}: BranchCardsViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {branches.map((b) => {
        const isHighlighted =
          Boolean(searchQuery) &&
          (b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (b.city && b.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (b.manager_name && b.manager_name.toLowerCase().includes(searchQuery.toLowerCase())));

        return (
          <div
            key={b.id}
            onClick={() => onView(b)}
            className={`bg-white border rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group ${
              isHighlighted
                ? "ring-2 ring-amber-400 border-amber-400 bg-amber-50/20"
                : "border-slate-200 hover:border-indigo-400"
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0 group-hover:scale-105 transition-transform">
                    {b.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-indigo-600 transition-colors">
                      {b.name}
                    </h3>
                    <span className="font-mono text-[10px] text-slate-500 font-semibold">{b.code}</span>
                  </div>
                </div>

                {b.is_head_office && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                    <Crown className="w-3 h-3 text-amber-500" /> Head Office
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Type</span>
                  <span className="capitalize font-medium text-slate-800">{b.branch_type.replace("_", " ")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Manager</span>
                  <span className="font-semibold text-slate-800">{b.manager_name || "Unassigned"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Location</span>
                  <span className="font-medium text-slate-800">{b.city || "Dhaka"}, {b.country || "Bangladesh"}</span>
                </div>
                {b.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Phone</span>
                    <span className="font-mono text-slate-800">{b.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Users className="w-3 h-3 text-indigo-500" /> {b.employee_count || 0} Staff
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onView(b)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Inspect Details"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onEdit(b)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Edit Branch"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(b)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  title="Delete Branch"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
