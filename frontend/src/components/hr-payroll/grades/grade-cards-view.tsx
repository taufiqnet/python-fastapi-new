"use client";

import React from "react";
import { SalaryGradeOut, JobTitleOut, EmployeeOut } from "@/types";
import { Award, DollarSign, Eye, Edit, Trash2, CheckCircle2, XCircle, Briefcase, Users } from "lucide-react";

interface GradeCardsViewProps {
  grades: SalaryGradeOut[];
  jobTitles: JobTitleOut[];
  employees: EmployeeOut[];
  onView: (grade: SalaryGradeOut) => void;
  onEdit: (grade: SalaryGradeOut) => void;
  onDelete: (grade: SalaryGradeOut) => void;
  onToggleActive: (grade: SalaryGradeOut) => void;
}

export function GradeCardsView({
  grades,
  jobTitles,
  employees,
  onView,
  onEdit,
  onDelete,
  onToggleActive,
}: GradeCardsViewProps) {
  if (grades.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-slate-500">
        <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h4 className="text-base font-bold text-slate-700">No salary grades found</h4>
        <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters, or load a preset template.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {grades.map((grade) => {
        const titleCount = jobTitles.filter((jt) => jt.salary_grade_id === grade.id).length;
        const empCount = employees.filter((e) => e.salary_grade_id === grade.id).length;
        const minGross = grade.min_gross_salary ? Number(grade.min_gross_salary) : null;
        const maxGross = grade.max_gross_salary ? Number(grade.max_gross_salary) : null;

        return (
          <div
            key={grade.id}
            className="bg-white rounded-3xl border border-slate-200/80 hover:border-emerald-300 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-900 text-white font-mono text-[10px] font-bold">
                        {grade.code}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[10px]">
                        Rank {grade.level_rank}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1 line-clamp-1">{grade.name}</h4>
                  </div>
                </div>

                {/* Active switch */}
                <button
                  onClick={() => onToggleActive(grade)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors flex items-center gap-1 ${
                    grade.is_active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                  }`}
                  title="Click to toggle status"
                >
                  {grade.is_active ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                  {grade.is_active ? "Active" : "Inactive"}
                </button>
              </div>

              {/* Salary Bracket */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 mb-3 text-xs">
                <div className="flex items-center justify-between text-slate-600 mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-emerald-600" /> Gross Band
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Basic: {grade.default_basic_percent || 50}%
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  {minGross !== null ? `৳${minGross.toLocaleString()}` : "Open"}
                  {" — "}
                  {maxGross !== null ? `৳${maxGross.toLocaleString()}` : "Open"}
                </div>
              </div>

              {/* Counts */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="p-2 bg-white rounded-xl border border-slate-200/70 flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <div>
                    <span className="text-[10px] text-slate-400 block leading-tight">Titles</span>
                    <span className="font-bold text-slate-800">{titleCount} Mapped</span>
                  </div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200/70 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <div>
                    <span className="text-[10px] text-slate-400 block leading-tight">Staff</span>
                    <span className="font-bold text-slate-800">{empCount} Active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => onView(grade)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" /> Details
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEdit(grade)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                  title="Edit Grade"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(grade)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Delete Grade"
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
