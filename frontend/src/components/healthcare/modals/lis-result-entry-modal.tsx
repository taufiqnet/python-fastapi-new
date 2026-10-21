"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import {
  DiagnosticOrderItemOut,
  DiagnosticTestOut,
  DiagnosticTestParameter,
  LabResultBatchEntryItem,
  LabResultBatchPayload,
  LabTestResultOut,
} from "@/types";
import {
  X,
  FlaskConical,
  AlertTriangle,
  CheckCircle2,
  Save,
  Loader2,
  User,
  Activity,
  AlertCircle,
} from "lucide-react";

interface LISResultEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderItem: DiagnosticOrderItemOut | null;
  onSuccess: () => void;
}

interface ParameterRowState {
  parameter_id?: string;
  parameter_name: string;
  observed_value: string;
  unit?: string;
  ref_range?: string;
  min_ref_value?: number;
  max_ref_value?: number;
  critical_low?: number;
  critical_high?: number;
  is_abnormal: boolean;
  is_critical: boolean;
  remarks: string;
}

export function LISResultEntryModal({
  isOpen,
  onClose,
  orderItem,
  onSuccess,
}: LISResultEntryModalProps) {
  const [loadingTest, setLoadingTest] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [technicianName, setTechnicianName] = useState("Technician");
  const [rows, setRows] = useState<ParameterRowState[]>([]);

  // Fetch test details & parameters when modal opens
  useEffect(() => {
    if (!isOpen || !orderItem) return;

    const fetchTestDetails = async () => {
      setLoadingTest(true);
      setError(null);
      try {
        const res = await apiClient.get<DiagnosticTestOut>(
          `/healthcare/diagnostic-tests/${orderItem.test_id}`
        );
        const test = res.data;

        if (test.parameters && test.parameters.length > 0) {
          const initialRows: ParameterRowState[] = test.parameters.map((p) => ({
            parameter_id: p.id,
            parameter_name: p.parameter_name,
            observed_value: p.default_value || "",
            unit: p.unit || "",
            ref_range:
              p.min_ref_value !== null && p.max_ref_value !== null
                ? `${p.min_ref_value} - ${p.max_ref_value}`
                : undefined,
            min_ref_value: p.min_ref_value ?? undefined,
            max_ref_value: p.max_ref_value ?? undefined,
            critical_low: p.critical_low ?? undefined,
            critical_high: p.critical_high ?? undefined,
            is_abnormal: false,
            is_critical: false,
            remarks: "",
          }));
          setRows(initialRows);
        } else {
          // Default single row if no sub-parameters defined
          setRows([
            {
              parameter_name: orderItem.test_name,
              observed_value: "",
              unit: "",
              ref_range: "",
              is_abnormal: false,
              is_critical: false,
              remarks: "",
            },
          ]);
        }
      } catch {
        setError("Failed to load test parameters.");
      } finally {
        setLoadingTest(false);
      }
    };

    fetchTestDetails();
  }, [isOpen, orderItem]);

  if (!isOpen || !orderItem) return null;

  const handleValueChange = (index: number, val: string) => {
    setRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[index], observed_value: val };

      // Auto-evaluate reference range if numeric
      const numVal = parseFloat(val);
      if (!isNaN(numVal)) {
        let isAbnormal = false;
        let isCritical = false;

        if (row.min_ref_value !== undefined && numVal < row.min_ref_value) {
          isAbnormal = true;
        }
        if (row.max_ref_value !== undefined && numVal > row.max_ref_value) {
          isAbnormal = true;
        }
        if (row.critical_low !== undefined && numVal < row.critical_low) {
          isCritical = true;
        }
        if (row.critical_high !== undefined && numVal > row.critical_high) {
          isCritical = true;
        }

        row.is_abnormal = isAbnormal;
        row.is_critical = isCritical;
      }

      updated[index] = row;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderItem) return;

    setSaving(true);
    setError(null);

    try {
      const resultItems: LabResultBatchEntryItem[] = rows.map((r) => ({
        parameter_id: r.parameter_id,
        parameter_name: r.parameter_name,
        observed_value: r.observed_value,
        unit: r.unit || undefined,
        ref_range: r.ref_range || undefined,
        is_abnormal: r.is_abnormal,
        is_critical: r.is_critical,
        remarks: r.remarks || undefined,
      }));

      const payload: LabResultBatchPayload = {
        business_id: 1,
        order_item_id: orderItem.id,
        technician_name: technicianName.trim() || undefined,
        results: resultItems,
      };

      await apiClient.post<LabTestResultOut[]>("/healthcare/lis/results/batch", payload);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to save lab results.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                LIS Result Entry Console
              </h2>
              <p className="text-xs text-slate-500">
                Test: <strong className="text-slate-800">{orderItem.test_name}</strong> (
                {orderItem.test_code})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Technician Info Bar */}
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <User className="w-4 h-4 text-slate-400" />
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase">
                Performing Technologist
              </label>
              <input
                type="text"
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                placeholder="Technologist name..."
                className="w-full text-xs font-bold text-slate-900 bg-transparent border-none p-0 focus:outline-hidden"
                required
              />
            </div>
          </div>

          {/* Parameters Table */}
          {loadingTest ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs">Loading laboratory parameters & reference ranges...</span>
            </div>
          ) : (
            <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Parameter Name</th>
                    <th className="py-2.5 px-3 w-40">Observed Value</th>
                    <th className="py-2.5 px-3 w-20">Unit</th>
                    <th className="py-2.5 px-3 w-32">Reference Range</th>
                    <th className="py-2.5 px-3 w-28 text-center">Status Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, index) => (
                    <tr key={index} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {row.parameter_name}
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={row.observed_value}
                          onChange={(e) => handleValueChange(index, e.target.value)}
                          placeholder="Enter value"
                          className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border focus:outline-hidden focus:ring-2 ${
                            row.is_critical
                              ? "border-rose-400 bg-rose-50 text-rose-800 focus:ring-rose-400/20"
                              : row.is_abnormal
                              ? "border-amber-400 bg-amber-50 text-amber-800 focus:ring-amber-400/20"
                              : "border-slate-200 bg-white text-slate-900 focus:ring-emerald-500/20 focus:border-emerald-600"
                          }`}
                          required
                        />
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                        {row.unit || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                        {row.ref_range || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {row.is_critical ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            CRITICAL
                          </span>
                        ) : row.is_abnormal ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <Activity className="w-3 h-3 text-amber-600" />
                            ABNORMAL
                          </span>
                        ) : row.observed_value ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            NORMAL
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[10px]">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loadingTest}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save & Submit Results
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
