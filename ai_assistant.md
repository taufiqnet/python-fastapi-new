# Prompt: HRMS AI Assistant Chat Widget

Build a floating **AI Assistant chat widget** for the HRMS application, matching 
our existing app's design system (colors, fonts, spacing — follow current 
layout, do not copy any reference image's exact visuals). This prompt focuses 
on the **business logic and conversation flow**, not the visual design.

## Existing AI infrastructure — reuse, do not rebuild

We already have a working AI setup in the app under the existing menu 
**"AI Assistant and Report"**, using **OpenRouter free models**, managed via 
an MCP (Model Context Protocol) server at:

```
http://127.0.0.1:8000/mcp/manage
```

This chat widget must be built **on top of this existing setup**, not as a 
separate/parallel AI integration:

- Reuse the same OpenRouter connection/config (API key, model selection, 
  free-tier model list) already set up for "AI Assistant and Report" — do 
  not introduce a second LLM provider config or duplicate credentials.
- Route the assistant's tool-calling actions (fetch leave types, fetch 
  balance, create leave application, fetch leave status, and future 
  attendance/payroll/etc. actions) through the **existing MCP server** at 
  `/mcp/manage`, exposing each HR & Payroll action as an MCP tool the model 
  can call, rather than hardcoding request/response parsing in the frontend.
- If the current MCP server doesn't yet expose HR & Payroll data (leave 
  types, leave allocations, leave applications, approval routing) as 
  callable tools, extend it with new tools for these actions — keep them in 
  the same MCP server/registration pattern already used for "AI Assistant 
  and Report", not a separate service.
- Since OpenRouter's free models are being used, design prompts and tool 
  schemas to be concise and unambiguous (clear tool names, minimal required 
  parameters, explicit valid values for things like leave type and date 
  format) since free-tier models are more sensitive to prompt clarity and 
  may have lower reliability/rate limits than paid models. Include reasonable 
  fallbacks (e.g. re-ask the question, or degrade to a simpler rule-based 
  flow for the leave apply/status flows) if the model's response is 
  malformed, ambiguous, or a tool call fails.
- Confirm with the existing "AI Assistant and Report" implementation how 
  conversation/session state, authentication (which employee is asking), and 
  model selection are currently handled, and follow that same pattern for 
  this widget so both features share one consistent AI layer instead of two.

## Widget shell

- Floating chat icon, fixed bottom-right, visible on every authenticated page. 
  Clicking toggles an open chat panel (icon becomes a close/X icon when open).
- Panel has a fixed header ("HRMS Assistant" + short subtitle) and fixed input 
  bar, with the message list scrolling independently between them.
- Greeting is personalized with the logged-in employee's first name and shows 
  a set of quick-reply topic buttons (e.g. "Apply for leave", "Leave status", 
  "Attendance", "Payroll" — extensible list, more topics added later without 
  redesigning the widget).
- Every reply is generated from **live data for the logged-in employee only** 
  — never hardcoded or mocked. All values (leave types, balances, dates, 
  statuses, approver names) must come from the actual HR & Payroll database/API.
- This feature is optional and additive — it must not alter or replace any 
  existing form-based workflow (e.g. the existing "Add Leave" screen keeps 
  working independently; the assistant is just another way to reach the same 
  backend actions).

## Conversation flow 1 — Apply for Leave

Design this as a **step-by-step guided dialogue**, one question at a time, 
not a single form dumped into chat:

1. **Trigger**: employee selects "Apply for leave" (or types it).
2. **Leave type selection**: assistant fetches the employee's business's 
   configured leave types (from `leave_types`, filtered by the employee's 
   business/entitlement) and shows them as selectable options (e.g. Casual, 
   Sick, Annual, Half Day, etc.).
   - **Edge case**: if no leave types are configured for the business, reply 
     with something like "No leave types are available. Please contact your 
     administrator." and stop the flow there — do not proceed further.
3. **Date input**: after a type is chosen, assistant asks for the date(s), 
   explaining the accepted format clearly (e.g. a single date for a one-day 
   leave, or a start and end date for a range), matching the date format 
   used elsewhere in the HR & Payroll module.
   - Validate the input: reject malformed dates, end date before start date, 
     or dates that violate leave policy (e.g. exceeding available balance, 
     overlapping an existing approved/pending leave) — respond with a clear, 
     specific correction request rather than a generic error.
4. **Balance check**: before confirming, the assistant checks the employee's 
   remaining balance for that leave type (`leave_allocations` minus already 
   used/pending) and includes it in the confirmation summary.
5. **Confirmation step**: assistant summarizes the request (leave type, 
   date range, number of days, current balance) and asks for explicit 
   confirmation (e.g. a "Submit request" action) before creating anything — 
   nothing is written to the database until the employee confirms.
6. **Submission**: on confirmation, create the leave application record 
   (`leave_applications`) exactly as the existing "Apply Leave" flow would, 
   including routing to the correct approval chain/hierarchy for that 
   employee (same approver-resolution logic already used by the manual form 
   — do not build a separate approval routing mechanism).
7. **Result message**: assistant confirms the application number, updated 
   balance (before → after), and names/order of the approvers the request 
   was routed to.

## Conversation flow 2 — Check Leave Status

- Employee asks something like "What is my leave status?" (accept natural 
  variations, not just an exact quick-reply match).
- Assistant fetches the employee's own `leave_applications` records and 
  replies with each request's application number, leave type, date range, 
  number of days, and current status (Pending, Approved, Rejected, 
  Cancelled), including which approver/step it's currently pending at, if 
  applicable.
- If there are no leave requests, reply accordingly rather than an empty 
  or broken response.
- This is read-only — no data is modified by this flow.

## General rules for all future topics (attendance, payroll, training, etc.)

- Every workflow that creates or changes data (like leave application) must 
  follow the same pattern: **guided step-by-step questions → validate each 
  answer against real HR & Payroll data → show a confirmation summary → 
  require explicit user confirmation → submit through existing backend 
  logic → return a clear result.**
- Every workflow that only retrieves data (like status checks) is read-only 
  and must reflect the current database state at the time of asking, not a 
  cached or approximate value.
- The assistant must never guess or fabricate business data (leave types, 
  balances, approver names, statuses) — if data is missing or an action 
  isn't possible, it should say so plainly and, where relevant, direct the 
  employee to their administrator or the existing manual screen.
- Structure the assistant's backend logic so each topic (leave, attendance, 
  payroll, etc.) is a separate, pluggable conversation handler, so new 
  topics can be added later without modifying existing ones.

## Deliverables

- The chat widget UI (shell + message list + quick replies + input).
- A conversation-state manager that tracks each employee's in-progress 
  multi-step flow (e.g. "awaiting date input for Casual leave") per session.
- Backend integration for the Leave Apply and Leave Status flows described 
  above, using existing HR & Payroll data models and approval logic — no new 
  parallel data paths.
- Confirm the handler structure is extensible before wiring in the first two 
  topics (leave apply, leave status), since more topics (attendance, payroll, 
  Iqama renewal, training) will be added in future iterations.