"use client";

import React, { useMemo } from "react";
import { JobTitleOut } from "@/types";
import { Award, Briefcase, Users, Eye, Edit2, Trash2, Layers } from "lucide-react";
import { LEVEL_RANK_DESCRIPTIONS } from "./job-title-modal";

interface JobTitleCareerMatrixViewProps {
  jobTitles: JobTitleOut[];
  searchQuery: string;
  onView: (jobTitle: JobTitleOut) => void;
  onEdit: (jobTitle: JobTitleOut) => void;
  onDelete: (jobTitle: JobTitleOut) => void;
}

export function JobTitleCareerMatrixView({
  jobTitles,
  searchQuery,
  onView,
  onEdit,
  onDelete,
}: JobTitleCareerMatrixViewProps) {
  // Group job titles by level_rank
  const groupedByRank = useMemo(() => {
    const groups: Record<number, JobTitleOut[]> = {};
    for (let r = 1; r <= 10; r++) {
      groups[r] = [];
    }
    jobTitles.forEach((j) => {
      const rank = j.level_rank || 5;
      if (!groups[rank]) groups[rank] = [];
      groups[rank].push(j);
    });
    return groups;
  }, [jobTitles]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <Award className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-900 text-sm">Career Ladder & Hierarchy Matrix</h3>
        </div>
        <p className="text-xs text-slate-500 max-w-3xl">
          Visual corporate progression framework mapping functional designations from Executive Leadership down to Entry Level and Trainees.
        </p>
      </div>

      {/* Ranks 1 through 10 */}
      <div className="space-y-4">
        {Object.entries(LEVEL_RANK_DESCRIPTIONS).map(([lvlStr, info]) => {
          const lvl = Number(lvlStr);
          const titlesInLvl = groupedByRank[lvl] || [];

          if (titlesInLvl.length === 0) return null;

          return (
            <div key={lvl} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              {/* Level Tier Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${info.badgeColor}`}>
                    Level {lvl}
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{info.label}</h4>
                    <p className="text-[11px] text-slate-400">Seniority tier: {info.tier}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {titlesInLvl.length} {titlesInLvl.length === 1 ? "designation" : "designations"}
                </span>
              </div>

              {/* Grid of Titles in this rank */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {titlesInLvl.map((j) => {
                  const isHighlighted =
                    Boolean(searchQuery) &&
                    (j.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (j.short_name && j.short_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                      (j.department_name && j.department_name.toLowerCase().includes(searchQuery.toLowerCase())));

                  return (
                    <div
                      key={j.id}
                      onClick={() => onView(j)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer group bg-white hover:shadow-md ${
                        isHighlighted
                          ? "ring-2 ring-amber-400 border-amber-400 bg-amber-50/20"
                          : "border-slate-200 hover:border-indigo-400"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs group-hover:text-indigo-600 transition-colors truncate">
                              {j.name}
                            </span>
                            {j.short_name && (
                              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold">
                                {j.short_name}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{j.department_name || "Company-Wide"}</span>
                          </p>
                        </div>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                          <Users className="w-2.5 h-2.5 text-indigo-500" />
                          {j.employee_count || 0}
                        </span>
                      </div>

                      {/* Card Bottom Actions */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        {j.is_active ? (
                          <span className="text-[10px] font-semibold text-emerald-600">Active</span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400">Inactive</span>
                        )}

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onView(j)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                            title="Inspect Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEdit(j)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDelete(j)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
