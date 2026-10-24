"use client";

import React, { useState, useRef, useEffect, useMemo, useId } from "react";
import { EmployeeOut } from "@/types";
import {
  User,
  Search,
  ChevronDown,
  X,
  Check,
  Briefcase,
  Building,
} from "lucide-react";

export interface SearchableEmployeeComboboxProps {
  employees: EmployeeOut[];
  value?: string | null;
  onChange: (employeeId: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  emptyUnassignedLabel?: string;
}

export function SearchableEmployeeCombobox({
  employees,
  value,
  onChange,
  placeholder = "Select employee...",
  allowClear = true,
  disabled = false,
  id,
  className = "",
  emptyUnassignedLabel = "-- No Branch Manager Assigned --",
}: SearchableEmployeeComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const comboboxId = id || generatedId;

  // Find currently selected employee
  const selectedEmployee = useMemo(() => {
    if (!value) return null;
    return employees.find((emp) => String(emp.id) === String(value)) || null;
  }, [employees, value]);

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

  // When opening, reset search and focus input
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 40);
    } else {
      setSearchTerm("");
    }
  }, [isOpen]);

  // Live filter employees across name, employee_id, email, job title, and department
  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees;
    const term = searchTerm.toLowerCase().trim();
    return employees.filter((emp) => {
      const name = (emp.full_name || "").toLowerCase();
      const code = (emp.employee_id || "").toLowerCase();
      const email = (emp.work_email || "").toLowerCase();
      const job = (emp.job_title_name || "").toLowerCase();
      const dept = (emp.department_name || "").toLowerCase();
      return (
        name.includes(term) ||
        code.includes(term) ||
        email.includes(term) ||
        job.includes(term) ||
        dept.includes(term)
      );
    });
  }, [employees, searchTerm]);

  // Auto-scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    // When popover is open
    const totalOptions = (allowClear ? 1 : 0) + filteredEmployees.length;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < totalOptions ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalOptions - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allowClear && highlightedIndex === 0) {
        onChange("");
        setIsOpen(false);
      } else {
        const empIndex = allowClear ? highlightedIndex - 1 : highlightedIndex;
        if (empIndex >= 0 && empIndex < filteredEmployees.length) {
          onChange(filteredEmployees[empIndex].id);
          setIsOpen(false);
        } else if (filteredEmployees.length === 1) {
          // If user typed search and pressed enter with only 1 match
          onChange(filteredEmployees[0].id);
          setIsOpen(false);
        }
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  // Helper for avatar/initials
  const getInitials = (name?: string) => {
    if (!name) return "EM";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full text-left select-none ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        id={comboboxId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full min-h-[42px] px-3.5 py-2 flex items-center justify-between gap-2 bg-white border rounded-xl text-xs font-medium transition-all shadow-2xs outline-none ${
          disabled
            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
            : isOpen
            ? "border-indigo-600 ring-2 ring-indigo-500/20 text-slate-900"
            : selectedEmployee
            ? "border-slate-300 text-slate-900 hover:border-slate-400"
            : "border-slate-200 text-slate-500 hover:border-slate-300"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectedEmployee ? (
            <>
              {/* Initials Avatar */}
              <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0 border border-indigo-200">
                {getInitials(selectedEmployee.full_name)}
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-semibold text-slate-900 truncate">
                  {selectedEmployee.full_name}
                </span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                  {selectedEmployee.employee_id}
                </span>
                {selectedEmployee.job_title_name && (
                  <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                    — {selectedEmployee.job_title_name}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 truncate">
              <User className="w-4 h-4 shrink-0 text-slate-300" />
              <span className="truncate">{placeholder}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Quick-clear button */}
          {allowClear && selectedEmployee && !disabled && (
            <span
              role="button"
              tabIndex={0}
              title="Clear selection"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onChange("");
                }
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-indigo-600" : ""
            }`}
          />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Search Input Header */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, ID, title, or email..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors text-slate-900 placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    inputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List Options */}
          <div
            ref={listRef}
            className="max-h-64 overflow-y-auto p-1.5 space-y-1 scrollbar-thin"
          >
            {/* Unassign / Clear Option */}
            {allowClear && !searchTerm && (
              <button
                type="button"
                role="option"
                aria-selected={!value}
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  !value
                    ? "bg-slate-100 text-slate-800"
                    : highlightedIndex === 0
                    ? "bg-slate-50 text-slate-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="italic font-normal">{emptyUnassignedLabel}</span>
                </div>
                {!value && <Check className="w-3.5 h-3.5 text-indigo-600" />}
              </button>
            )}

            {/* Empty Search Results */}
            {filteredEmployees.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                <User className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                <p className="font-semibold text-slate-600">
                  No employees found matching &ldquo;{searchTerm}&rdquo;
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Try searching by full name, ID, or designation
                </p>
              </div>
            ) : (
              filteredEmployees.map((emp, index) => {
                const isSelected = String(emp.id) === String(value);
                const actualIndex = allowClear && !searchTerm ? index + 1 : index;
                const isHighlighted = highlightedIndex === actualIndex;

                return (
                  <button
                    key={emp.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(emp.id);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setHighlightedIndex(actualIndex)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                      isSelected
                        ? "bg-indigo-50 border border-indigo-200/60 text-indigo-950 font-semibold"
                        : isHighlighted
                        ? "bg-slate-100/80 text-slate-900"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Initials Avatar */}
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {getInitials(emp.full_name)}
                      </span>

                      {/* Name & Details */}
                      <div className="text-left min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-900 truncate">
                            {emp.full_name}
                          </span>
                          <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {emp.employee_id}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-normal truncate mt-0.5">
                          {emp.job_title_name && (
                            <span className="flex items-center gap-1 truncate">
                              <Briefcase className="w-2.5 h-2.5 shrink-0 opacity-70" />
                              <span className="truncate">{emp.job_title_name}</span>
                            </span>
                          )}
                          {emp.department_name && (
                            <span className="flex items-center gap-1 truncate">
                              <Building className="w-2.5 h-2.5 shrink-0 opacity-70" />
                              <span className="truncate">{emp.department_name}</span>
                            </span>
                          )}
                          {!emp.job_title_name && !emp.department_name && emp.work_email && (
                            <span className="truncate text-slate-400">{emp.work_email}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Checkmark when selected */}
                    {isSelected && (
                      <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-2" />
                    )}
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
