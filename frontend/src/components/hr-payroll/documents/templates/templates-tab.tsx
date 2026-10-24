"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import {
  DocumentTemplate,
  DocumentCategory,
  EmployeeOut,
} from "@/types";
import { SearchableEmployeeCombobox } from "@/components/common/searchable-employee-combobox";
import {
  FileCode,
  Plus,
  RefreshCw,
  Search,
  Eye,
  Tag,
  Edit2,
} from "lucide-react";

interface TemplatesTabProps {
  currentBusinessId: number;
  employees: EmployeeOut[];
}

const AVAILABLE_MERGE_TOKENS = [
  { token: "{{employee_name}}", label: "Full Name" },
  { token: "{{employee_code}}", label: "Employee Code" },
  { token: "{{designation}}", label: "Designation" },
  { token: "{{department}}", label: "Department" },
  { token: "{{joining_date}}", label: "Joining Date" },
  { token: "{{effective_date}}", label: "Effective Date" },
  { token: "{{gross_salary}}", label: "Gross Salary" },
  { token: "{{basic_salary}}", label: "Basic Salary" },
  { token: "{{reference_no}}", label: "Reference Number" },
  { token: "{{current_date}}", label: "Issue Date" },
  { token: "{{company_name}}", label: "Company Name" },
  { token: "{{work_email}}", label: "Work Email" },
  { token: "{{work_location}}", label: "Location" },
];

export function TemplatesTab({ currentBusinessId, employees }: TemplatesTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Create / Edit Modal
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    subject: "",
    category_id: "",
    content_html: "",
    header_content: "",
    footer_content: "Confidential - For Addressee Only",
    is_active: true,
  });

  // Preview Drawer
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [previewTemplate, setPreviewTemplate] = useState<DocumentTemplate | null>(null);
  const [previewEmpId, setPreviewEmpId] = useState<string>(employees[0]?.id || "");
  const [renderedContent, setRenderedContent] = useState<string>("");
  const [tokensUsed, setTokensUsed] = useState<Record<string, any>>({});
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);

  const fetchTemplates = useCallback(
    async (showBackgroundFetching: boolean = true) => {
      if (showBackgroundFetching) setIsFetching(true);
      try {
        const res = await apiClient.get<DocumentTemplate[]>(
          `/documents/templates?business_id=${currentBusinessId}`
        );
        setTemplates(res.data || []);
      } catch (err: any) {
        console.error("Failed to load templates:", err);
        toast.error("Error", err.message || "Could not fetch templates");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [currentBusinessId, toast]
  );

  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiClient.get<DocumentCategory[]>(
        `/documents/categories?business_id=${currentBusinessId}`
      );
      setCategories(res.data || []);
    } catch (err: any) {
      console.error("Failed to load categories:", err);
    }
  }, [currentBusinessId]);

  useEffect(() => {
    fetchTemplates(false);
    fetchCategories();
  }, [fetchTemplates, fetchCategories]);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: "",
      subject: "Official Letter of Employment",
      category_id: categories[0]?.id || "",
      content_html: `REF: {{reference_no}}\nDate: {{current_date}}\n\nTo,\n{{employee_name}}\n{{designation}}\nDepartment of {{department}}\n\nSUBJECT: Letter of Official Communication\n\nDear {{employee_name}},\n\nWe are pleased to notify you that effective {{effective_date}}, your revised compensation is BDT {{gross_salary}} per month.\n\nAll other terms and conditions of your employment contract remain in full force.\n\nSincerely,\nHuman Resources Department\n{{company_name}}`,
      header_content: "",
      footer_content: "Confidential - For Addressee Only",
      is_active: true,
    });
    setIsEditorOpen(true);
  };

  const openEditModal = (tpl: DocumentTemplate) => {
    setEditingTemplate(tpl);
    setTemplateForm({
      name: tpl.name,
      subject: tpl.subject,
      category_id: tpl.category_id || (categories[0]?.id || ""),
      content_html: tpl.content_html,
      header_content: tpl.header_content || "",
      footer_content: tpl.footer_content || "",
      is_active: tpl.is_active,
    });
    setIsEditorOpen(true);
  };

  const handleInsertToken = (token: string) => {
    setTemplateForm((prev) => ({
      ...prev,
      content_html: prev.content_html + " " + token + " ",
    }));
    toast.success("Token Inserted", `Appended ${token} to template editor.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name || !templateForm.subject || !templateForm.content_html) {
      toast.error("Missing Fields", "Please complete all required template fields.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        business_id: currentBusinessId,
        name: templateForm.name,
        subject: templateForm.subject,
        category_id: templateForm.category_id || null,
        content_html: templateForm.content_html,
        header_content: templateForm.header_content,
        footer_content: templateForm.footer_content,
        is_active: templateForm.is_active,
      };

      if (editingTemplate) {
        await apiClient.put(
          `/documents/templates/${editingTemplate.id}?business_id=${currentBusinessId}`,
          payload
        );
        toast.success("Template Updated", `Saved changes to ${templateForm.name}.`);
      } else {
        await apiClient.post(
          `/documents/templates?business_id=${currentBusinessId}`,
          payload
        );
        toast.success("Template Created", `New template ${templateForm.name} created.`);
      }
      setIsEditorOpen(false);
      fetchTemplates(true);
    } catch (err: any) {
      toast.error("Save Failed", err.message || "Failed to save template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPreview = async (tpl: DocumentTemplate, empId?: string) => {
    setPreviewTemplate(tpl);
    const targetEmpId = empId || previewEmpId || employees[0]?.id || "";
    setPreviewEmpId(targetEmpId);
    setIsPreviewOpen(true);
    setLoadingPreview(true);

    try {
      const res = await apiClient.post<{
        rendered_subject: string;
        rendered_html: string;
        sample_tokens_used: Record<string, any>;
      }>(
        `/documents/templates/preview?business_id=${currentBusinessId}`,
        {
          template_id: tpl.id,
          employee_id: targetEmpId,
          custom_tokens: {
            reference_no: "REF/HR/PREVIEW/2026/001",
            effective_date: "2026-11-01",
            bonus_amount: "50,000",
          },
        }
      );
      setRenderedContent(res.data?.rendered_html || "");
      setTokensUsed(res.data?.sample_tokens_used || {});
    } catch (err: any) {
      toast.error("Preview Failed", err.message || "Could not render template preview");
    } finally {
      setLoadingPreview(false);
    }
  };

  const filteredTemplates = templates.filter((tpl) => {
    if (categoryFilter !== "all" && tpl.category_id !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        tpl.name.toLowerCase().includes(q) ||
        tpl.subject.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Template Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all rounded-lg shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Document Template
          </button>

          <button
            onClick={() => fetchTemplates(true)}
            className="p-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
            title="Refresh templates"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Templates Catalog Grid */}
      <div className="relative">
        {(isPending || isFetching) && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-100 overflow-hidden z-10 rounded-t-xl">
            <div className="w-full h-full bg-blue-600 origin-left animate-indeterminate"></div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-400">
              <FileCode className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                No Document Templates Configured
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Create reusable letter and agreement templates with smart token replacement.
              </p>
            </div>
          ) : (
            filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col justify-between hover:border-blue-400 dark:hover:border-blue-600 transition group"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded">
                      {tpl.template_type}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                    {tpl.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {tpl.subject}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs flex items-center justify-between text-slate-400">
                    <span>
                      Category:{" "}
                      <strong className="text-slate-700 dark:text-slate-300 font-medium">
                        {tpl.category_name || "General"}
                      </strong>
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                        tpl.is_active
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                      }`}
                    >
                      {tpl.is_active ? "Active" : "Archived"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => handleOpenPreview(tpl)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Live Preview
                  </button>

                  <button
                    onClick={() => openEditModal(tpl)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    title="Edit Template"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col animate-scaleUp">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingTemplate ? `Edit Template: ${editingTemplate.name}` : "New Document Template"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure layout content and embed standard merge tags.
                </p>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="e.g. Salary Increment Letter"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={templateForm.category_id}
                    onChange={(e) =>
                      setTemplateForm({ ...templateForm, category_id: e.target.value })
                    }
                    className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">General (No Category)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Line *
                </label>
                <input
                  type="text"
                  required
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  placeholder="e.g. Notice of Revised Compensation"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Clickable Merge Tag Palette */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-500" />
                  Click to Insert Dynamic Merge Tags:
                </label>
                <div className="flex flex-wrap gap-1.5 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  {AVAILABLE_MERGE_TOKENS.map((item) => (
                    <button
                      key={item.token}
                      type="button"
                      onClick={() => handleInsertToken(item.token)}
                      className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-slate-200 dark:border-slate-700 hover:border-blue-300 rounded text-[11px] font-mono text-slate-700 dark:text-slate-300 transition flex items-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-2.5 h-2.5 text-blue-500" />
                      {item.token}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body Content Editor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Template Content HTML / Markdown *
                </label>
                <textarea
                  rows={10}
                  required
                  value={templateForm.content_html}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, content_html: e.target.value })
                  }
                  className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Custom Header Content
                  </label>
                  <input
                    type="text"
                    value={templateForm.header_content}
                    onChange={(e) =>
                      setTemplateForm({ ...templateForm, header_content: e.target.value })
                    }
                    placeholder="e.g. Official Letterhead / Logo"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Custom Footer Content
                  </label>
                  <input
                    type="text"
                    value={templateForm.footer_content}
                    onChange={(e) =>
                      setTemplateForm({ ...templateForm, footer_content: e.target.value })
                    }
                    placeholder="e.g. Registered in Bangladesh • Confidentially Handled"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="tpl_active"
                  checked={templateForm.is_active}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, is_active: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600"
                />
                <label
                  htmlFor="tpl_active"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Template is Active & Available for Generation
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Preview Drawer */}
      {isPreviewOpen && previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[85vh] flex flex-col animate-scaleUp">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-500" />
                  Live Preview: {previewTemplate.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rendered with real employee profile variables & token replacement
                </p>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="py-3 flex flex-wrap items-center gap-3 border-b border-slate-100 dark:border-slate-700">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                Test with Employee:
              </label>
              <div className="w-64 sm:w-72">
                <SearchableEmployeeCombobox
                  employees={employees}
                  value={previewEmpId}
                  onChange={(id) => {
                    setPreviewEmpId(id);
                    handleOpenPreview(previewTemplate, id);
                  }}
                  placeholder="Select test employee..."
                  allowClear={false}
                />
              </div>

              <div className="ml-auto flex items-center gap-1 text-[11px] text-slate-400">
                <span>Tokens replaced:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">
                  {Object.keys(tokensUsed).length}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {loadingPreview ? (
                <div className="py-20 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                  <p className="text-xs">Rendering dynamic tokens...</p>
                </div>
              ) : (
                <div className="p-8 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-serif text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed shadow-inner">
                  {renderedContent}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
