# Prompt: HRMS AI Assistant Chat Widget

Build a floating **AI Assistant chat widget** for the HRMS application, matching 
our existing app's design system (colors, fonts, spacing — follow current 
layout, do not introduce a new style).

**Trigger:** A round floating chat icon fixed at the bottom-right corner of 
every page, always visible while scrolling. Clicking it opens/closes the chat 
panel (X icon replaces the chat icon when open).

**Chat panel:**
- Slides in as a fixed-position modal/panel anchored bottom-right, not full 
  page, with its own internal scroll (header and input stay fixed, message 
  list scrolls).
- Header: "HRMS Assistant" title, short subtitle ("Ask about your leave, 
  payroll or HR policy."), a menu icon and a refresh/reset icon.
- Greeting message personalized with the logged-in employee's first name 
  ("Hi {name}! What can we help you with?").
- Below the greeting, show a list of quick-reply suggestion pills/buttons 
  (rounded, outlined, green accent) for common questions — e.g. "Apply for 
  leave", "How many leave days do I have left?", "What is the status of my 
  leave request?", "How do I renew my Iqama?", "What training have I done?", 
  "Show me everything you can answer". This list must be easy to extend later 
  with new categories (attendance, payroll, policies, etc.) without redesign.
- Free-text input at the bottom with placeholder "Type your question..." and 
  a send button (circular, green, arrow icon).
- Each employee sees their own conversation and reply thread; messages persist 
  per employee session.

**Scope for this build:**
- This is a UI/interaction feature only — optional, not mandatory, does not 
  block any existing workflow.
- Wire the quick-reply pills and free-text input to a single message-handling 
  function/endpoint that can be expanded later with more topics (leave, 
  attendance, payroll, policy, training, Iqama/document renewal, etc.) without 
  changing the widget's structure.
- Responsive: works on desktop and mobile, panel adapts to smaller screens 
  (e.g. near-fullscreen on mobile).

**Reference:** Follow the attached screenshot (`Screenshot_2026-09-13_105029.png`) 
for exact layout, spacing, colors, and component style — replicate this look 
inside our app's existing design system.

Deliver the component, wire it into the main app layout so it appears on all 
authenticated pages, and confirm the message-handling function is easily 
pluggable with additional intents later.
