"use client";

import React, { useState, useRef, useEffect, useMemo, useId } from "react";
import { CustomerOut } from "@/types";
import {
  User,
  Search,
  ChevronDown,
  X,
  Check,
  Phone,
  Mail,
  MapPin,
  UserPlus,
} from "lucide-react";

export interface SearchableCustomerComboboxProps {
  customers: CustomerOut[];
  value?: string | null;
  onChange: (customerId: string) => void;
  onOpenCreateCustomer?: () => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function SearchableCustomerCombobox({
  customers,
  value,
  onChange,
  onOpenCreateCustomer,
  placeholder = "Search and select customer by name, phone number, or email...",
  allowClear = true,
  disabled = false,
  id,
  className = "",
}: SearchableCustomerComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const comboboxId = id || generatedId;

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    if (!value) return null;
    return customers.find((c) => String(c.id) === String(value)) || null;
  }, [customers, value]);

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

  // When dropdown opens, focus search input and clear search term
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(-1);
      setTimeout(() => searchInputRef.current?.focus(), 40);
    } else {
      setSearchTerm("");
    }
  }, [isOpen]);

  // Filter customers by name, phone, email, and address
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const term = searchTerm.toLowerCase().trim();
    return customers.filter((cust) => {
      const fullName = (cust.full_name || `${cust.first_name} ${cust.last_name || ""}`).toLowerCase();
      const phone = (cust.phone || "").toLowerCase();
      const email = (cust.email || "").toLowerCase();
      const address = (cust.address || "").toLowerCase();
      return (
        fullName.includes(term) ||
        phone.includes(term) ||
        email.includes(term) ||
        address.includes(term)
      );
    });
  }, [customers, searchTerm]);

  // Scroll active item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      if (items[highlightedIndex] && typeof items[highlightedIndex].scrollIntoView === "function") {
        items[highlightedIndex].scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredCustomers.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredCustomers.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (
        highlightedIndex >= 0 &&
        highlightedIndex < filteredCustomers.length
      ) {
        const chosen = filteredCustomers[highlightedIndex];
        onChange(chosen.id);
        setIsOpen(false);
      } else if (filteredCustomers.length === 1) {
        onChange(filteredCustomers[0].id);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  // Helper for initials
  const getInitials = (cust: CustomerOut) => {
    const name = cust.full_name || `${cust.first_name} ${cust.last_name || ""}`.trim();
    if (!name) return "CU";
    const parts = name.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full text-left select-none ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Combobox Trigger Button */}
      <button
        id={comboboxId}
        type="button"
        disabled={disabled}
        aria-label="Search and select customer"
        data-testid="customer-combobox-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full min-h-[46px] px-3.5 py-2 flex items-center justify-between gap-2 bg-white border rounded-xl text-xs font-medium transition-all shadow-2xs outline-none ${
          disabled
            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
            : isOpen
            ? "border-indigo-600 ring-2 ring-indigo-500/20 text-slate-900 bg-white"
            : selectedCustomer
            ? "border-slate-300 text-slate-900 hover:border-slate-400 bg-slate-50/40"
            : "border-slate-200 text-slate-500 hover:border-slate-300 bg-slate-50/70 hover:bg-white"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectedCustomer ? (
            <>
              {/* Initials Avatar */}
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-200">
                {getInitials(selectedCustomer)}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 truncate">
                <span className="font-bold text-slate-900 truncate">
                  {selectedCustomer.full_name ||
                    `${selectedCustomer.first_name} ${selectedCustomer.last_name || ""}`.trim()}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                  <Phone className="w-2.5 h-2.5 text-indigo-500" />
                  {selectedCustomer.phone}
                </span>
                {selectedCustomer.address && (
                  <span className="text-[11px] text-slate-400 truncate hidden md:inline">
                    — {selectedCustomer.address}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 truncate">
              <Search className="w-4 h-4 shrink-0 text-slate-400" />
              <span className="truncate">{placeholder}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Quick-clear button */}
          {allowClear && selectedCustomer && !disabled && (
            <span
              role="button"
              tabIndex={0}
              title="Clear customer selection"
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
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
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

      {/* Floating Search & Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-1 duration-150 max-h-80">
          {/* Search Box Header */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/75 flex items-center gap-2">
            <Search className="w-4 h-4 text-indigo-600 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by customer name, phone number, address, or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHighlightedIndex(0);
              }}
              className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none py-1"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Customer Items List */}
          <div
            ref={listRef}
            role="listbox"
            className="overflow-y-auto divide-y divide-slate-100/60 p-1 flex-1"
          >
            {filteredCustomers.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <User className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">
                  No matching customer found
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  No customer matches &ldquo;{searchTerm}&rdquo;. You can register them right now.
                </p>
                {onOpenCreateCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenCreateCustomer();
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs transition border border-indigo-200"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    + Register New Customer
                  </button>
                )}
              </div>
            ) : (
              filteredCustomers.map((cust, index) => {
                const isSelected = selectedCustomer?.id === cust.id;
                const isHighlighted = highlightedIndex === index;
                const name =
                  cust.full_name ||
                  `${cust.first_name} ${cust.last_name || ""}`.trim();

                return (
                  <div
                    key={cust.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(cust.id);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-3 py-2.5 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs ${
                      isSelected
                        ? "bg-indigo-50/80 text-indigo-900 font-medium"
                        : isHighlighted
                        ? "bg-slate-100/80 text-slate-900"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-700"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {getInitials(cust)}
                      </div>

                      {/* Info details */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 truncate">
                            {name}
                          </span>
                          <span className="font-mono text-[11px] font-semibold px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded border border-slate-200 shrink-0">
                            {cust.phone}
                          </span>
                          {cust.membership_tier && (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 bg-amber-50 text-amber-700 rounded border border-amber-200 shrink-0">
                              {cust.membership_tier}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 truncate">
                          {cust.address && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{cust.address}</span>
                            </span>
                          )}
                          {cust.email && (
                            <span className="flex items-center gap-1 truncate hidden sm:inline-flex">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{cust.email}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Selected Checkmark */}
                    {isSelected && (
                      <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Popover Footer */}
          <div className="px-3.5 py-2 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Showing {filteredCustomers.length} of {customers.length} registered customers
            </span>
            {onOpenCreateCustomer && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenCreateCustomer();
                }}
                className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 hover:underline"
              >
                <UserPlus className="w-3 h-3" />
                Add New Customer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
