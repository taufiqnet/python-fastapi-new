"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import {
  DiagnosticTestOut,
  DiagnosticDepartment,
  ReportTemplateType,
  DiagnosticTestParameterCreatePayload,
} from "@/types";
import {
  X,
  FlaskConical,
  Plus,
  Trash2,
  Clock,
  DollarSign,
  Layers,
  FileText,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface TestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  testToEdit?: DiagnosticTestOut | null;
}

export function TestModal({ isOpen, onClose, onSuccess, testToEdit }: TestModalProps) {
  const [department, setDepartment] = useState<DiagnosticDepartment>("pathology");
  const [testCode, setTestCode] = useState("");
  const [name, setName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [sampleType, setSampleType] = useState("EDTA Blood");
  const [costPrice, setCostPrice] = useState<string>("100");
  const [salePrice, setSalePrice] = useState<string>("400");
  const [turnaroundHours, setTurnaroundHours] = useState<string>("4");
  const [requiresFasting, setRequiresFasting] = useState(false);
  const [reportTemplateType, setReportTemplateType] = useState<ReportTemplateType>("structured_parameters");
  const [parameters, setParameters] = useState<DiagnosticTestParameterCreatePayload[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (testToEdit) {
      setDepartment(testToEdit.department || "pathology");
      setTestCode(testToEdit.test_code || "");
      setName(testToEdit.name || "");
      setCategoryName(testToEdit.category_name || "");
      setSampleType(testToEdit.sample_type || "");
      setCostPrice(String(testToEdit.cost_price ?? 0));
      setSalePrice(String(testToEdit.sale_price ?? 0));
      setTurnaroundHours(String(testToEdit.default_turnaround_hours ?? 4));
      setRequiresFasting(testToEdit.requires_fasting);
      setReportTemplateType(testToEdit.report_template_type || "structured_parameters");
      setParameters(
        testToEdit.parameters?.map((p) => ({
          parameter_name: p.parameter_name,
          unit: p.unit,
          male_ref_range: p.male_ref_range,
          female_ref_range: p.female_ref_range,
          child_ref_range: p.child_ref_range,
          default_formula: p.default_formula,
          display_order: p.display_order,
        })) || []
      );
    } else {
      setDepartment("pathology");
      setTestCode("");
      setName("");
      setCategoryName("");
      setSampleType("EDTA Blood");
      setCostPrice("100");
      setSalePrice("400");
      setTurnaroundHours("4");
      setRequiresFasting(false);
      setReportTemplateType("structured_parameters");
      setParameters([
        {
          parameter_name: "",
          unit: "",
          male_ref_range: "",
          female_ref_range: "",
          display_order: 1,
        },
      ]);
    }
    setError(null);
  }, [testToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddParameter = () => {
    setParameters([
      ...parameters,
      {
        parameter_name: "",
        unit: "",
        male_ref_range: "",
        female_ref_range: "",
        display_order: parameters.length + 1,
      },
    ]);
  };

  const handleRemoveParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const handleParamChange = (
    index: number,
    field: keyof DiagnosticTestParameterCreatePayload,
    value: string | number
  ) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: value };
    setParameters(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testCode.trim() || !name.trim()) {
      setError("Test code and investigation name are required.");
      return;
    }

    setLoading(true);
    setError(null);

    // Clean empty parameter rows
    const cleanedParams = parameters
      .filter((p) => p.parameter_name && p.parameter_name.trim())
      .map((p, idx) => ({
        parameter_name: p.parameter_name.trim(),
        unit: p.unit?.trim() || null,
        male_ref_range: p.male_ref_range?.trim() || null,
        female_ref_range: p.female_ref_range?.trim() || null,
        display_order: idx + 1,
      }));

    const payload = {
      business_id: 1,
      department,
      test_code: testCode.trim().toUpperCase(),
      name: name.trim(),
      category_name: categoryName.trim() || null,
      sample_type: sampleType.trim() || null,
      cost_price: parseFloat(costPrice) || 0.0,
      sale_price: parseFloat(salePrice) || 0.0,
      default_turnaround_hours: parseInt(turnaroundHours) || 4,
      requires_fasting: requiresFasting,
      report_template_type: reportTemplateType,
      is_active: true,
      parameters: cleanedParams,
    };

    try {
      if (testToEdit) {
        await apiClient.put(`/healthcare/diagnostic-tests/${testToEdit.id}`, payload);
      } else {
        await apiClient.post("/healthcare/diagnostic-tests", payload);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to save diagnostic test.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-teal-600 to-cyan-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {testToEdit ? "Edit Diagnostic Investigation" : "Add Diagnostic Test to Catalog"}
              </h3>
              <p className="text-xs text-teal-100 mt-0.5">
                Configure test code, department, specimen tube, and reference ranges
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* General Information */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Department */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as DiagnosticDepartment)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              >
                <option value="hematology">Hematology</option>
                <option value="biochemistry">Biochemistry</option>
                <option value="pathology">Pathology</option>
                <option value="microbiology">Microbiology</option>
                <option value="radiology_imaging">Radiology & Imaging</option>
                <option value="cardiology_ecg">Cardiology (ECG/Echo)</option>
                <option value="histopathology">Histopathology</option>
              </select>
            </div>

            {/* Test Code */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Test Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CBC, LFT, RBS"
                value={testCode}
                onChange={(e) => setTestCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs font-mono font-bold uppercase border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>

            {/* Test Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Investigation Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Complete Blood Count"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>

            {/* Specimen / Sample Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sample Specimen Type
              </label>
              <input
                type="text"
                placeholder="e.g. EDTA Blood, Serum, Urine, None"
                value={sampleType}
                onChange={(e) => setSampleType(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>

            {/* Turnaround Time */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Turnaround Time (Hours)
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="number"
                  min="1"
                  value={turnaroundHours}
                  onChange={(e) => setTurnaroundHours(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>
            </div>

            {/* Patient Price */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Patient Bill Price (BDT) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">৳</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="10"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-xs font-bold border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>
            </div>
          </div>

          {/* Fasting & Report Template */}
          <div className="flex flex-wrap items-center gap-6 py-2 px-3 bg-slate-50 border border-slate-100 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={requiresFasting}
                onChange={(e) => setRequiresFasting(e.target.checked)}
                className="rounded-sm border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="font-semibold">Requires Fasting (Overnight 8-12h)</span>
            </label>

            <div className="flex items-center gap-2 text-xs text-slate-700 ml-auto">
              <span className="font-semibold">Report Format:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="reportTemplate"
                  checked={reportTemplateType === "structured_parameters"}
                  onChange={() => setReportTemplateType("structured_parameters")}
                  className="text-teal-600 focus:ring-teal-500"
                />
                <span>LIS Parameter Table</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer ml-3">
                <input
                  type="radio"
                  name="reportTemplate"
                  checked={reportTemplateType === "radiology_text"}
                  onChange={() => setReportTemplateType("radiology_text")}
                  className="text-teal-600 focus:ring-teal-500"
                />
                <span>Radiology Rich-Text</span>
              </label>
            </div>
          </div>

          {/* Structured Parameter Table */}
          {reportTemplateType === "structured_parameters" && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-800">
                    LIS Report Analytes / Parameters
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Define biological reference ranges for abnormal value flagging
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddParameter}
                  className="px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Parameter
                </button>
              </div>

              <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Parameter Name</th>
                      <th className="py-2.5 px-3">Unit</th>
                      <th className="py-2.5 px-3">Male Ref. Range</th>
                      <th className="py-2.5 px-3">Female Ref. Range</th>
                      <th className="py-2.5 px-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parameters.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="e.g. Hemoglobin"
                            value={p.parameter_name}
                            onChange={(e) =>
                              handleParamChange(idx, "parameter_name", e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="e.g. g/dL"
                            value={p.unit || ""}
                            onChange={(e) => handleParamChange(idx, "unit", e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="e.g. 13.5 - 17.5"
                            value={p.male_ref_range || ""}
                            onChange={(e) =>
                              handleParamChange(idx, "male_ref_range", e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="e.g. 12.0 - 15.5"
                            value={p.female_ref_range || ""}
                            onChange={(e) =>
                              handleParamChange(idx, "female_ref_range", e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveParameter(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm shadow-teal-600/20 flex items-center gap-2 transition-all"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {testToEdit ? "Update Investigation" : "Add to Catalog"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TestModal;
