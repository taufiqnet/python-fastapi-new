"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import {
  HelpCircle,
  Plus,
  Search,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Send,
  User,
  Shield,
  Paperclip,
  Tag,
  ArrowRight,
  Filter,
  Flame,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { HRTicket, HRTicketComment } from "@/types";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "payroll", label: "Payroll & Salary" },
  { value: "leave", label: "Leave & Attendance" },
  { value: "benefits", label: "Health & Benefits" },
  { value: "workplace", label: "Workplace & Grievance" },
  { value: "it", label: "IT & Hardware Equipment" },
  { value: "general", label: "General Admin" },
];

const STATUS_FILTERS = [
  { value: "all", label: "All Status" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export default function HelpdeskPage() {
  const [tickets, setTickets] = useState<HRTicket[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [, startTransition] = useTransition();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selected ticket for threaded drawer
  const [selectedTicket, setSelectedTicket] = useState<HRTicket | null>(null);
  const [commentMessage, setCommentMessage] = useState("");
  const [commentAttachment, setCommentAttachment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [closingTicket, setClosingTicket] = useState(false);

  // New Ticket Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({
    category: "payroll",
    priority: "medium",
    subject: "",
    description: "",
    attachment_url: "",
  });

  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchTickets = async () => {
    try {
      setIsFetching(true);
      const res = await apiClient.get<HRTicket[]>("/portal/tickets");
      const data = res.data;
      setTickets(data);
      // Refresh active ticket thread if currently selected
      if (selectedTicket) {
        const updated = data.find((t) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err) {
      console.error("Failed to load tickets", err);
    } finally {
      setIsFetching(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // In-place non-destructive filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchCat = categoryFilter === "all" || t.category === categoryFilter;
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      const matchQuery =
        !searchQuery.trim() ||
        t.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchStatus && matchQuery;
    });
  }, [tickets, categoryFilter, statusFilter, searchQuery]);

  // Handle new ticket submission
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.subject.trim() || !newTicket.description.trim()) return;
    setSubmittingTicket(true);
    try {
      const res = await apiClient.post<HRTicket>("/portal/tickets", {
        category: newTicket.category,
        priority: newTicket.priority,
        subject: newTicket.subject,
        description: newTicket.description,
        attachment_url: newTicket.attachment_url.trim() || null,
      });

      const created = res.data;
      setToastMessage({ type: "success", text: `Ticket ${created.ticket_number} created successfully.` });
      setModalOpen(false);
      setNewTicket({
        category: "payroll",
        priority: "medium",
        subject: "",
        description: "",
        attachment_url: "",
      });
      await fetchTickets();
      setSelectedTicket(created);
    } catch (err: any) {
      setToastMessage({ type: "error", text: err.response?.data?.detail || err.message || "Failed to create ticket." });
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Handle posting reply comment
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !commentMessage.trim()) return;
    setSendingComment(true);
    try {
      await apiClient.post(`/portal/tickets/${selectedTicket.id}/comments`, {
        message: commentMessage.trim(),
        attachment_url: commentAttachment.trim() || null,
      });

      setCommentMessage("");
      setCommentAttachment("");
      // Reload ticket details
      const ticketRes = await apiClient.get<HRTicket>(`/portal/tickets/${selectedTicket.id}`);
      setSelectedTicket(ticketRes.data);
      await fetchTickets();
    } catch (err: any) {
      setToastMessage({ type: "error", text: err.response?.data?.detail || err.message || "Failed to post comment." });
    } finally {
      setSendingComment(false);
    }
  };

  // Close ticket as resolved/satisfied
  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    setClosingTicket(true);
    try {
      const res = await apiClient.patch<HRTicket>(`/portal/tickets/${selectedTicket.id}/status`, {
        status: "closed",
        resolution_notes: "Ticket confirmed resolved and closed by employee.",
      });

      setToastMessage({ type: "success", text: "Ticket marked as closed." });
      setSelectedTicket(res.data);
      await fetchTickets();
    } catch (err: any) {
      setToastMessage({ type: "error", text: err.response?.data?.detail || err.message || "Failed to update ticket status." });
    } finally {
      setClosingTicket(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <Flame className="w-3 h-3" /> URGENT
          </span>
        );
      case "high":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
            High
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            Medium
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Low
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Open
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            In Progress
          </span>
        );
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Resolved
          </span>
        );
      case "closed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            Closed
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top indeterminate rim loader for in-place non-destructive filtering */}
      <div className="relative h-1 w-full overflow-hidden bg-transparent">
        {isFetching && !initialLoading && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-teal-500 animate-pulse" />
        )}
      </div>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <HelpCircle className="w-3.5 h-3.5" /> 24/7 Human Resources & Payroll Helpdesk
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            HR Helpdesk & Support Tickets
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            Submit service requests, resolve salary discrepancies, clarify tax withholdings, and
            collaborate directly with HR representatives in real-time threaded conversations.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-indigo-500/25 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Raise New Ticket
        </button>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl text-sm border ${
            toastMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ticket number, subject, description..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => startTransition(() => setCategoryFilter(e.target.value))}
            aria-label="Filter tickets by category"
            className="text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => startTransition(() => setStatusFilter(e.target.value))}
            aria-label="Filter tickets by status"
            className="text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Workspace: Split Ticket List & Live Thread Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Ticket Cards */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
            <span>My Support Tickets ({filteredTickets.length})</span>
            {isFetching && <span className="text-indigo-500 animate-pulse">Syncing...</span>}
          </div>

          {initialLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                No tickets matching criteria.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Click "Raise New Ticket" to create your first inquiry.
              </p>
            </div>
          ) : (
            <div
              className={`space-y-2.5 transition-opacity duration-200 ${
                isFetching ? "opacity-75" : "opacity-100"
              }`}
            >
              {filteredTickets.map((ticket) => {
                const isSelected = selectedTicket?.id === ticket.id;
                return (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-150 flex flex-col gap-2 relative ${
                      isSelected
                        ? "bg-indigo-50/70 border-indigo-400/80 shadow-sm dark:bg-indigo-950/40 dark:border-indigo-600"
                        : "bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          #{ticket.ticket_number}
                        </span>
                        {getPriorityBadge(ticket.priority)}
                      </div>
                      {getStatusBadge(ticket.status)}
                    </div>

                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1">
                      {ticket.subject}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {ticket.description}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {ticket.category.toUpperCase()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Active Discussion Thread */}
        <div className="lg:col-span-7">
          {selectedTicket ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col min-h-[580px] sticky top-6">
              {/* Ticket Thread Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      #{selectedTicket.ticket_number}
                    </span>
                    {getPriorityBadge(selectedTicket.priority)}
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                  {selectedTicket.status !== "closed" && (
                    <button
                      onClick={handleCloseTicket}
                      disabled={closingTicket}
                      className="text-xs font-semibold px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                    >
                      {closingTicket ? "Closing..." : "Mark as Closed"}
                    </button>
                  )}
                </div>

                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedTicket.subject}
                </h2>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed border border-slate-200/80 dark:border-slate-700/80">
                  <div className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider mb-1">
                    Initial Ticket Description
                  </div>
                  {selectedTicket.description}

                  {selectedTicket.attachment_url && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                      <Paperclip className="w-3.5 h-3.5" />
                      <a
                        href={selectedTicket.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline text-xs font-medium"
                      >
                        Attached File Document
                      </a>
                    </div>
                  )}
                </div>

                {selectedTicket.resolution_notes && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
                    <strong className="block font-semibold mb-0.5">Resolution Notes:</strong>
                    {selectedTicket.resolution_notes}
                  </div>
                )}
              </div>

              {/* Message Discussion Feed */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[380px]">
                {(!selectedTicket.comments || selectedTicket.comments.length === 0) ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No replies yet. The HR team will respond here shortly.
                  </div>
                ) : (
                  selectedTicket.comments.map((comm) => {
                    const isHr = comm.is_hr_staff;
                    return (
                      <div
                        key={comm.id}
                        className={`flex gap-3 ${isHr ? "justify-start" : "justify-end"}`}
                      >
                        {isHr && (
                          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 text-xs shadow-sm">
                            <Shield className="w-4 h-4" />
                          </div>
                        )}

                        <div
                          className={`max-w-[80%] rounded-2xl p-3.5 text-xs space-y-1 shadow-sm ${
                            isHr
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200/80 dark:border-slate-700/80"
                              : "bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-tr-none"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 text-[10px] opacity-75 pb-0.5">
                            <span className="font-semibold">
                              {isHr ? "HR Support Officer" : "You (Employee)"}
                            </span>
                            <span>{new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="leading-relaxed whitespace-pre-wrap">{comm.message}</p>

                          {comm.attachment_url && (
                            <a
                              href={comm.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className={`inline-flex items-center gap-1 text-[11px] mt-1 underline ${
                                isHr ? "text-indigo-600 dark:text-indigo-400" : "text-indigo-100"
                              }`}
                            >
                              <Paperclip className="w-3 h-3" /> View attachment
                            </a>
                          )}
                        </div>

                        {!isHr && (
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0 text-xs">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply Box */}
              {selectedTicket.status !== "closed" ? (
                <form
                  onSubmit={handleSendComment}
                  className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl space-y-2.5"
                >
                  <textarea
                    rows={2}
                    value={commentMessage}
                    onChange={(e) => setCommentMessage(e.target.value)}
                    placeholder="Type a response to the HR representative..."
                    className="w-full text-xs p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 resize-none"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                      <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="url"
                        value={commentAttachment}
                        onChange={(e) => setCommentAttachment(e.target.value)}
                        placeholder="Optional attachment URL..."
                        className="text-[11px] py-1 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!commentMessage.trim() || sendingComment}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                    >
                      {sendingComment ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      Send Reply
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-center text-xs text-slate-500 rounded-b-2xl">
                  This ticket has been marked closed. If you have a new request, please raise a new ticket.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 min-h-[400px] flex flex-col items-center justify-center">
              <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Select a ticket from the left to view the thread</p>
              <p className="text-xs text-slate-400 mt-1">Or raise a new ticket for HR assistance.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Raise New Support Ticket */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 mb-5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" /> Raise HR Support Ticket
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct your query to the appropriate HR operations or payroll specialist.
              </p>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Category *
                  </label>
                  <select
                    value={newTicket.category}
                    onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                  >
                    <option value="payroll">Payroll & Tax Deduction</option>
                    <option value="leave">Leave & Attendance</option>
                    <option value="benefits">Benefits & Health Insurance</option>
                    <option value="workplace">Workplace Grievance</option>
                    <option value="it">IT & System Access</option>
                    <option value="general">General Administrative</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Priority *
                  </label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                  >
                    <option value="low">Low (Standard SLA)</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent / Critical</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. October Tax Deduction Discrepancy on Payslip"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Detailed Description *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide complete context, amounts, dates, or relevant transaction references..."
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Attachment URL (Optional)</span>
                  <span className="text-[10px] text-slate-400">PDF, Screenshot, or Document Link</span>
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newTicket.attachment_url}
                  onChange={(e) => setNewTicket({ ...newTicket, attachment_url: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTicket}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  {submittingTicket ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting Ticket...
                    </>
                  ) : (
                    "Submit Ticket"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
