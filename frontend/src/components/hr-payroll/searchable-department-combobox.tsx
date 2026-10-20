"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { DepartmentOut } from "@/types";
import {
  Building2,
  Search,
  ChevronDown,
  X,
  Check,
  Building,
} from "lucide-react";

interface SearchableDepartmentComboboxProps {
  departments: DepartmentOut[];
  selectedDepartmentId: string;
  onSelect: (deptId: string) => void;
  employeeCountsByDept?: Record<string, number>;
  totalAllEmployees?: number;
}

export function SearchableDepartmentCombobox({
  departments,
  selectedDepartmentId,
  onSelect,
  employeeCountsByDept = {},
  totalAllEmployees,
}: SearchableDepartmentComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchTerm("");
    }
  }, [isOpen]);

  // Active departments only
  const activeDepartments = useMemo(() => {
    return departments.filter((d) => d.is_active !== false);
  }, [departments]);

  // Filtered active departments by search term
  const filteredDepartments = useMemo(() => {
    if (!searchTerm.trim()) return activeDepartments;
    const q = searchTerm.toLowerCase();
    return activeDepartments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.code && d.code.toLowerCase().includes(q))
    );
  }, [activeDepartments, searchTerm]);

  const selectedDepartment = useMemo(() => {
    if (selectedDepartmentId === "all") return null;
    return activeDepartments.find((d) => d.id === selectedDepartmentId) || null;
  }, [activeDepartments, selectedDepartmentId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredDepartments.length > 0) {
        onSelect(filteredDepartments[0].id);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Trigger Button */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-2 bg-slate-50 border rounded-xl text-xs font-semibold transition-all shadow-2xs ${
            isOpen
              ? "border-indigo-600 bg-white ring-2 ring-indigo-500/20 text-indigo-700"
              : selectedDepartment
              ? "border-indigo-200 bg-indigo-50/50 text-indigo-900 hover:bg-indigo-50"
              : "border-slate-200 text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Building2
            className={`w-3.5 h-3.5 shrink-0 ${
              selectedDepartment ? "text-indigo-600" : "text-slate-400"
            }`}
          />
          <span className="truncate max-w-[150px] sm:max-w-[200px]">
            {selectedDepartment ? selectedDepartment.name : "All Departments"}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${
              isOpen ? "rotate-180 text-indigo-600" : ""
            }`}
          />
        </button>

        {/* Clear selection button */}
        {selectedDepartment && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect("all");
              setIsOpen(false);
            }}
            title="Clear department filter"
            className="ml-1 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search active departments..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Department List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin">
            {/* "All Departments" option */}
            {!searchTerm && (
              <button
                type="button"
                onClick={() => {
                  onSelect("all");
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  selectedDepartmentId === "all"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  <span className="truncate">All Departments</span>
                </div>
                {totalAllEmployees !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      selectedDepartmentId === "all"
                        ? "bg-white/20 text-white"
                        : "bg-slate-200/70 text-slate-600"
                    }`}
                  >
                    {totalAllEmployees}
                  </span>
                )}
              </button>
            )}

            {filteredDepartments.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                <Building2 className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                <p className="font-semibold text-slate-600">No active departments match &ldquo;{searchTerm}&rdquo;</p>
                <p className="text-[10px] mt-0.5">Try a different keyword</p>
              </div>
            ) : (
              filteredDepartments.map((d) => {
                const isSelected = selectedDepartmentId === d.id;
                const empCount = employeeCountsByDept[d.id];

                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      onSelect(d.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-600 border border-slate-200/60"
                        }`}
                      >
                        {d.code || d.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="text-left min-w-0">
                        <span className="block truncate font-bold">{d.name}</span>
                        {d.parent_department_name && (
                          <span
                            className={`block truncate text-[10px] font-normal ${
                              isSelected ? "text-indigo-100" : "text-slate-400"
                            }`}
                          >
                            Under: {d.parent_department_name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {empCount !== undefined && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-slate-100 text-slate-600 border border-slate-200/60"
                          }`}
                        >
                          {empCount}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
