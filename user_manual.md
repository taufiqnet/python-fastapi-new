Create a single, self-contained one-page HTML user manual (workflow_guide.html) 
for non-technical business users, based on the module/endpoint structure in 
`Business_Profile_API_postman_collection.json` (attached — read it before writing 
anything, do not guess the module list).

Show TWO separate step-by-step workflows, in real dependency order, not the 
Postman folder order:

1. HR & Payroll setup cycle:
   Business Setup -> Department -> Job Title -> (optional: Candidate -> 
   Interview -> Appointment Letter) -> Employee -> Compensation (Salary 
   Structure) -> Attendance & Leave (ongoing, not one-time) -> Payroll 
   Settings -> Payroll Period -> Generate Period Payroll -> Payroll Record 
   -> Salary Certificate.

2. Inventory & Ecommerce setup cycle:
   Business Setup -> Category -> Brand/Model -> Product -> Warehouse -> 
   Inventory Item -> Pricing & Tax -> (Cart -> Order -> Payment -> Shipment).

For each cycle, render a top-of-page visual flow diagram (plain SVG or 
CSS flexbox boxes with arrows, no external chart libraries) linking down 
to matching step sections below.

Each step section must include: module name, one-sentence plain-language 
purpose, what it depends on ("you must complete X first"), and what 
happens if it's skipped. No API/technical jargon, no code samples — this 
is for end users, not developers.

Constraints: single HTML file, inline CSS and vanilla JS only (for 
collapsible sections and smooth-scroll nav), no external dependencies, 
must open correctly by double-clicking the file with no server. Include 
a fixed sidebar or top nav with jump links to each module. Mobile-responsive.

Output the file and a short summary of the section order you used.