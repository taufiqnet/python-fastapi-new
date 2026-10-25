import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_presentation():
    prs = Presentation()
    # Set 16:9 widescreen dimensions
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Color Palette Definitions
    DARK_BG = RGBColor(15, 23, 42)        # #0F172A Slate 900
    DARK_CARD = RGBColor(30, 41, 59)      # #1E293B Slate 800
    LIGHT_BG = RGBColor(248, 250, 252)    # #F8FAFC Slate 50
    CARD_BG = RGBColor(255, 255, 255)     # Pure White
    BORDER_COLOR = RGBColor(226, 232, 240)# #E2E8F0 Slate 200

    TEXT_DARK = RGBColor(15, 23, 42)      # Deep Charcoal
    TEXT_MUTED = RGBColor(100, 116, 139)  # Slate 500
    TEXT_LIGHT = RGBColor(248, 250, 252)  # Off White
    TEXT_LIGHT_MUTED = RGBColor(148, 163, 184) # Slate 400

    PRIMARY_BLUE = RGBColor(29, 78, 216)  # Royal Blue #1D4ED8
    PRIMARY_LIGHT = RGBColor(219, 234, 254) # Blue 100
    EMERALD_GREEN = RGBColor(4, 120, 87)  # #047857 Emerald 700
    EMERALD_LIGHT = RGBColor(209, 250, 229) # Emerald 100
    AMBER_GOLD = RGBColor(180, 83, 9)     # Amber 700
    AMBER_LIGHT = RGBColor(254, 243, 199) # Amber 100
    ACCENT_PURPLE = RGBColor(109, 40, 217)# Purple 700

    FONT_HEADING = "Segoe UI"
    FONT_BODY = "Segoe UI"

    def add_background(slide, color):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = color
        bg.line.fill.background()
        return bg

    def add_header(slide, category, title, subtitle, dark_mode=False):
        # Badge
        badge = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.45), Inches(2.8), Inches(0.35))
        badge.fill.solid()
        badge.fill.fore_color.rgb = PRIMARY_BLUE if dark_mode else PRIMARY_LIGHT
        badge.line.fill.background()
        btf = badge.text_frame
        btf.word_wrap = True
        bp = btf.paragraphs[0]
        bp.text = category.upper()
        bp.font.name = FONT_HEADING
        bp.font.size = Pt(10)
        bp.font.bold = True
        bp.font.color.rgb = RGBColor(255, 255, 255) if dark_mode else PRIMARY_BLUE
        bp.alignment = PP_ALIGN.CENTER

        # Title & Subtitle Box
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.85), Inches(11.7), Inches(1.1))
        tf = title_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p1 = tf.paragraphs[0]
        p1.text = title
        p1.font.name = FONT_HEADING
        p1.font.size = Pt(24)
        p1.font.bold = True
        p1.font.color.rgb = TEXT_LIGHT if dark_mode else TEXT_DARK

        p2 = tf.add_paragraph()
        p2.text = subtitle
        p2.font.name = FONT_BODY
        p2.font.size = Pt(13)
        p2.font.color.rgb = TEXT_LIGHT_MUTED if dark_mode else TEXT_MUTED
        p2.space_before = Pt(4)

    def add_card(slide, left, top, width, height, bg_color=CARD_BG, border_color=BORDER_COLOR):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
        card.fill.solid()
        card.fill.fore_color.rgb = bg_color
        if border_color:
            card.line.color.rgb = border_color
            card.line.width = Pt(1)
        else:
            card.line.fill.background()
        return card

    def add_footer(slide, current_slide, total_slides=18, dark_mode=False):
        footer_box = slide.shapes.add_textbox(Inches(0.8), Inches(7.0), Inches(11.7), Inches(0.4))
        ftf = footer_box.text_frame
        ftf.word_wrap = True
        ftf.margin_left = ftf.margin_top = ftf.margin_right = ftf.margin_bottom = 0
        p = ftf.paragraphs[0]
        p.text = f"ProERP SaaS Platform  •  Enterprise HR & Payroll Client Presentation  •  Slide {current_slide} of {total_slides}"
        p.font.name = FONT_BODY
        p.font.size = Pt(10)
        p.font.color.rgb = RGBColor(100, 116, 139) if dark_mode else RGBColor(148, 163, 184)

    # =========================================================================
    # SLIDE 1: Title Slide (Dark Theme)
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    add_background(s1, DARK_BG)

    # Accent top stripe
    stripe = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.15))
    stripe.fill.solid()
    stripe.fill.fore_color.rgb = PRIMARY_BLUE
    stripe.line.fill.background()

    # Hero Title Box
    tbox = s1.shapes.add_textbox(Inches(1.2), Inches(1.8), Inches(11.0), Inches(3.2))
    ttf = tbox.text_frame
    ttf.word_wrap = True

    p = ttf.paragraphs[0]
    p.text = "PROERP ENTERPRISE SUITE"
    p.font.name = FONT_HEADING
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = PRIMARY_BLUE

    p = ttf.add_paragraph()
    p.text = "Next-Generation HR & Payroll Platform"
    p.font.name = FONT_HEADING
    p.font.size = Pt(36)
    p.font.bold = True
    p.font.color.rgb = TEXT_LIGHT
    p.space_before = Pt(8)

    p = ttf.add_paragraph()
    p.text = "Automated, Fully Compliant, Cloud-Native Human Resource Management for Bangladesh & Global Enterprises"
    p.font.name = FONT_BODY
    p.font.size = Pt(16)
    p.font.color.rgb = TEXT_LIGHT_MUTED
    p.space_before = Pt(12)

    # 3 Stat Badges at bottom of Title
    stats = [
        ("100% BLA 2006", "Statutory Labor Law Compliant"),
        ("1-Click Payroll", "Automated Attendance & Tax Engine"),
        ("BEFTN & MFS", "Direct Corporate Bank Advice")
    ]
    for i, (title, desc) in enumerate(stats):
        cx = 1.2 + i * 3.7
        card = add_card(s1, cx, 5.2, 3.5, 1.2, bg_color=DARK_CARD, border_color=PRIMARY_BLUE)
        ctf = card.text_frame
        ctf.word_wrap = True
        ctf.margin_left = ctf.margin_top = Inches(0.2)
        cp1 = ctf.paragraphs[0]
        cp1.text = title
        cp1.font.name = FONT_HEADING
        cp1.font.size = Pt(16)
        cp1.font.bold = True
        cp1.font.color.rgb = RGBColor(56, 189, 248)
        cp2 = ctf.add_paragraph()
        cp2.text = desc
        cp2.font.name = FONT_BODY
        cp2.font.size = Pt(11)
        cp2.font.color.rgb = TEXT_LIGHT_MUTED
        cp2.space_before = Pt(4)

    add_footer(s1, 1, dark_mode=True)

    # =========================================================================
    # SLIDE 2: Executive Summary & Challenges Solved
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    add_background(s2, LIGHT_BG)
    add_header(s2, "Executive Briefing", "Transforming Modern Workforce Operations", "Bridging the critical gap between manual spreadsheet chaos and statutory compliance")

    # Left Column: The Problem (Red/Amber tone)
    card_l = add_card(s2, 0.8, 2.1, 5.6, 4.6, bg_color=CARD_BG)
    ltf = card_l.text_frame
    ltf.word_wrap = True
    ltf.margin_left = ltf.margin_top = ltf.margin_right = Inches(0.3)
    p = ltf.paragraphs[0]
    p.text = "Current Industry Pain Points"
    p.font.name = FONT_HEADING
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = AMBER_GOLD

    pain_points = [
        ("Manual Payroll Processing: ", "HR & Accounts waste 5 to 7 working days each month wrestling with Excel formulas, prone to human calculation leaks."),
        ("Biometric & Roster Mismatch: ", "Physical fingerprint logs fail to reconcile with late-in grace periods, shifting day/night rosters, and overtime."),
        ("Compliance Risks (BLA 2006): ", "Statutory errors in Casual/Sick/Maternity leave rules, leave carry-forward, and encashment lead to labor court fines."),
        ("Tax & Bank Bottlenecks: ", "Complex income tax withholding (ITA 2023) and manual writing of disbursement checks create security and delay risks.")
    ]
    for b_title, b_desc in pain_points:
        p = ltf.add_paragraph()
        p.space_before = Pt(10)
        run1 = p.add_run()
        run1.text = "• " + b_title
        run1.font.name = FONT_HEADING
        run1.font.size = Pt(12)
        run1.font.bold = True
        run1.font.color.rgb = TEXT_DARK
        run2 = p.add_run()
        run2.text = b_desc
        run2.font.name = FONT_BODY
        run2.font.size = Pt(11)
        run2.font.color.rgb = TEXT_MUTED

    # Right Column: The ProERP Solution (Blue/Green tone)
    card_r = add_card(s2, 6.9, 2.1, 5.6, 4.6, bg_color=CARD_BG)
    rtf = card_r.text_frame
    rtf.word_wrap = True
    rtf.margin_left = rtf.margin_top = rtf.margin_right = Inches(0.3)
    p = rtf.paragraphs[0]
    p.text = "The ProERP Advantage"
    p.font.name = FONT_HEADING
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = EMERALD_GREEN

    solutions = [
        ("Unified Single Source of Truth: ", "Attendance, leave, loans, salary adjustments, and taxes flow directly into the automated calculation pipeline."),
        ("Full Bangladesh Statutory Engine: ", "Built-in statutory algorithms for BLA 2006 (leaves, encashment, gratuity) and NBR progressive tax slabs (ITA 2023)."),
        ("1-Click Corporate Banking: ", "Automated BEFTN Excel generation pre-filled with 9-digit routing codes, plus corporate bKash, Nagad & Rocket files."),
        ("Employee Self-Service (ESS): ", "Encrypted digital payslips, live attendance calendars, instant leave applications, and mobile transparency.")
    ]
    for b_title, b_desc in solutions:
        p = rtf.add_paragraph()
        p.space_before = Pt(10)
        run1 = p.add_run()
        run1.text = "• " + b_title
        run1.font.name = FONT_HEADING
        run1.font.size = Pt(12)
        run1.font.bold = True
        run1.font.color.rgb = TEXT_DARK
        run2 = p.add_run()
        run2.text = b_desc
        run2.font.name = FONT_BODY
        run2.font.size = Pt(11)
        run2.font.color.rgb = TEXT_MUTED

    add_footer(s2, 2)

    # =========================================================================
    # SLIDE 3: System Architecture & 18 Submodules
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    add_background(s3, LIGHT_BG)
    add_header(s3, "Modular Ecosystem", "Complete HR & Payroll Functional Architecture", "An interconnected suite of 18 submodules covering every stage of the employee journey")

    modules = [
        ("Core HR & Org", "Branches, Depts, Designations, Grades & 360° Profiles", PRIMARY_BLUE),
        ("Talent Acquisition", "Job Requisitions, Candidate Tracking & Digital Onboarding", PRIMARY_BLUE),
        ("Digital Letters", "Offer, Appointment (Form 6), Salary & NOC Certificates", PRIMARY_BLUE),
        ("Time & Biometrics", "Device Sync, Geo-fencing, Grace Rules & Overtime Calculation", EMERALD_GREEN),
        ("Roster Management", "Day/Evening/Night Shift Scheduling & Off-Day Matrices", EMERALD_GREEN),
        ("Statutory Leave", "BLA 2006 Quotas, Multi-Tier Approvals & Encashment Engine", EMERALD_GREEN),
        ("Payroll Engine", "Draft to Paid Pipeline, Hold/Release & Bulk PDF Payslips", ACCENT_PURPLE),
        ("Taxation (ITA 2023)", "Progressive Slabs, Exemptions & Withholding Certificates", ACCENT_PURPLE),
        ("Disbursement", "BEFTN Bank Advice (60+ BD Banks) & MFS Bulk Payouts", ACCENT_PURPLE),
        ("Loans & Advances", "Multi-Month EMI Setup & Hands-off Salary Auto-Deductions", AMBER_GOLD),
        ("Bonus & Increments", "Festival (Eid/Puja) Runs, Performance Bonuses & Arrears", AMBER_GOLD),
        ("Provident Fund & Gratuity", "Dual 8.33% RPF Contribution & 5-Year Gratuity Entitlement", AMBER_GOLD),
        ("Appraisals & KPIs", "Goal Setting, 360° Feedback & Performance Matrices", PRIMARY_BLUE),
        ("Disciplinary & Inquiry", "BLA Sec 23/24 Show-Cause Notices & Formal Hearings", PRIMARY_BLUE),
        ("Travel & Claims", "Per-diem Policies, Multi-Level Approvals & Reimbursements", PRIMARY_BLUE),
        ("Separation & Settlement", "Resignation, Clearances, Gratuity & Release Certificate", EMERALD_GREEN),
        ("Self-Service Portal", "Mobile ESS: Payslips, Attendance, Leaves & Request Vault", EMERALD_GREEN),
        ("Security & RBAC", "Multi-Tenant Data Isolation, Audit Trail & Export Engines", EMERALD_GREEN),
    ]

    for i, (m_title, m_desc, m_color) in enumerate(modules):
        row = i // 6
        col = i % 6
        cx = 0.8 + col * 1.95
        cy = 2.1 + row * 1.5
        c = add_card(s3, cx, cy, 1.85, 1.35, bg_color=CARD_BG)
        ctf = c.text_frame
        ctf.word_wrap = True
        ctf.margin_left = ctf.margin_top = ctf.margin_right = Inches(0.12)
        cp1 = ctf.paragraphs[0]
        cp1.text = m_title
        cp1.font.name = FONT_HEADING
        cp1.font.size = Pt(11)
        cp1.font.bold = True
        cp1.font.color.rgb = m_color
        cp2 = ctf.add_paragraph()
        cp2.text = m_desc
        cp2.font.name = FONT_BODY
        cp2.font.size = Pt(9)
        cp2.font.color.rgb = TEXT_MUTED
        cp2.space_before = Pt(3)

    add_footer(s3, 3)

    # =========================================================================
    # SLIDE 4: Core HR & Organizational Hierarchy
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    add_background(s4, LIGHT_BG)
    add_header(s4, "Organization Setup", "Enterprise Structure & Employee 360° Master", "Multi-branch organizational modeling with granular salary grade and payscale matrices")

    c1 = add_card(s4, 0.8, 2.1, 5.6, 4.6)
    c1tf = c1.text_frame
    c1tf.word_wrap = True
    c1tf.margin_left = c1tf.margin_top = c1tf.margin_right = Inches(0.3)
    p = c1tf.paragraphs[0]
    p.text = "Multi-Tier Organization Hierarchy"
    p.font.name = FONT_HEADING
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = PRIMARY_BLUE

    points_c1 = [
        ("Multi-Branch Scalability: ", "Centralize Head Office and remote factory/warehouse branches under single corporate tenancy with isolated cost centers."),
        ("Department & Designation Mapping: ", "Strict departmental boundaries with reporting lines and supervisor hierarchies for approval routing."),
        ("Salary Grade & Payscale Matrix: ", "Configure structured salary grades (e.g. Grade 1 to 7) with granular step matrices (Step 1 Basic 25k, Step 2 Basic 27.5k)."),
        ("Automated Step Progression: ", "Seamlessly step employees up salary scales during annual appraisals without manual formula rework.")
    ]
    for b_title, b_desc in points_c1:
        p = c1tf.add_paragraph()
        p.space_before = Pt(12)
        r1 = p.add_run()
        r1.text = "• " + b_title
        r1.font.bold = True
        r1.font.size = Pt(12)
        r1.font.color.rgb = TEXT_DARK
        r2 = p.add_run()
        r2.text = b_desc
        r2.font.size = Pt(11)
        r2.font.color.rgb = TEXT_MUTED

    c2 = add_card(s4, 6.9, 2.1, 5.6, 4.6)
    c2tf = c2.text_frame
    c2tf.word_wrap = True
    c2tf.margin_left = c2tf.margin_top = c2tf.margin_right = Inches(0.3)
    p = c2tf.paragraphs[0]
    p.text = "Comprehensive Digital Employee Record"
    p.font.name = FONT_HEADING
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = EMERALD_GREEN

    points_c2 = [
        ("Statutory Identification: ", "Stores verified 10/17-digit National ID (NID), Tax Identification Number (TIN), e-TIN certificates, and passport details."),
        ("Banking & MFS Details: ", "Captures corporate bank account numbers, 9-digit routing codes, and bKash/Nagad wallet numbers for disbursement."),
        ("Medical & Emergency Contacts: ", "Blood group, emergency nominee declarations, kin contacts, and medical fitness certificates."),
        ("Encrypted Document Vault: ", "Centralized digital storage for academic certificates, resume, signed contracts, and background verification records.")
    ]
    for b_title, b_desc in points_c2:
        p = c2tf.add_paragraph()
        p.space_before = Pt(12)
        r1 = p.add_run()
        r1.text = "• " + b_title
        r1.font.bold = True
        r1.font.size = Pt(12)
        r1.font.color.rgb = TEXT_DARK
        r2 = p.add_run()
        r2.text = b_desc
        r2.font.size = Pt(11)
        r2.font.color.rgb = TEXT_MUTED

    add_footer(s4, 4)

    # =========================================================================
    # SLIDE 5: Recruitment & Statutory Document Generation
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    add_background(s5, LIGHT_BG)
    add_header(s5, "Talent Lifecycle", "Recruitment & Statutory Document Generation", "From job requisition to BLA 2006 Form 6 compliant appointment letters")

    cards5 = [
        ("Job Requisition & Tracking", "Manage headcount budgets, opening approvals, candidate pipelines, and interview scoring matrices in one place.", PRIMARY_BLUE),
        ("BLA 2006 Form 6 Letters", "Generate legally binding statutory Appointment Letters with mandatory terms prescribed under Bangladesh Labour Act.", EMERALD_GREEN),
        ("Dynamic Offer Letters", "Generate professional offer packages with merged compensation breakdowns, probation terms, and digital acceptance.", PRIMARY_BLUE),
        ("Certificates on Demand", "1-Click generation of verified Salary Certificates for bank loans, Service/Experience Letters, and travel NOCs.", AMBER_GOLD)
    ]
    for i, (ctitle, cdesc, ccolor) in enumerate(cards5):
        cx = 0.8 + i * 2.95
        c = add_card(s5, cx, 2.1, 2.8, 4.6)
        ctf = c.text_frame
        ctf.word_wrap = True
        ctf.margin_left = ctf.margin_top = ctf.margin_right = Inches(0.25)
        p = ctf.paragraphs[0]
        p.text = ctitle
        p.font.name = FONT_HEADING
        p.font.size = Pt(15)
        p.font.bold = True
        p.font.color.rgb = ccolor
        p = ctf.add_paragraph()
        p.text = cdesc
        p.font.name = FONT_BODY
        p.font.size = Pt(12)
        p.font.color.rgb = TEXT_MUTED
        p.space_before = Pt(14)

    add_footer(s5, 5)

    # =========================================================================
    # SLIDE 6: Time, Attendance & Multi-Shift Rostering
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    add_background(s6, LIGHT_BG)
    add_header(s6, "Time & Attendance", "Biometrics, Intelligent Grace Rules & Shift Rosters", "Eliminating time theft, attendance disputes, and manual reconciliation overhead")

    c1 = add_card(s6, 0.8, 2.1, 5.6, 4.6)
    c1tf = c1.text_frame
    c1tf.word_wrap = True
    c1tf.margin_left = c1tf.margin_top = c1tf.margin_right = Inches(0.3)
    p = c1tf.paragraphs[0]
    p.text = "Hardware Integration & Intelligent Rules"
    p.font.name = FONT_HEADING
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = PRIMARY_BLUE

    points_att = [
        ("Direct Biometric Integration: ", "Seamless API sync with ZKTeco, Realtime, and major biometric fingerprint/facial recognition terminals."),
        ("Geo-Fenced Mobile Check-ins: ", "GPS-bound and IP-restricted check-ins for field agents, remote employees, and branch offices."),
        ("Configurable Grace Periods: ", "Define late-in grace periods (e.g. 15 minutes) and automated late deduction rules (e.g. 3 consecutive lates = 1 day pay deduct)."),
        ("Automated Overtime Tracking: ", "Automatic identification of early arrivals, late departures, and weekend/holiday overtime with double-rate calculation.")
    ]
    for b_title, b_desc in points_att:
        p = c1tf.add_paragraph()
        p.space_before = Pt(10)
        r1 = p.add_run()
        r1.text = "• " + b_title
        r1.font.bold = True
        r1.font.size = Pt(12)
        r1.font.color.rgb = TEXT_DARK
        r2 = p.add_run()
        r2.text = b_desc
        r2.font.size = Pt(11)
        r2.font.color.rgb = TEXT_MUTED

    c2 = add_card(s6, 6.9, 2.1, 5.6, 4.6)
    c2tf = c2.text_frame
    c2tf.word_wrap = True
    c2tf.margin_left = c2tf.margin_top = c2tf.margin_right = Inches(0.3)
    p = c2tf.paragraphs[0]
    p.text = "Enterprise Multi-Shift Rostering"
    p.font.name = FONT_HEADING
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = EMERALD_GREEN

    points_roster = [
        ("Multi-Shift Matrix: ", "Configure standard morning, evening, and overnight rotating shifts with designated break intervals."),
        ("Shift Rotation Cycles: ", "Automated weekly/monthly shift rotations with visual department roster scheduling calendars."),
        ("Night Shift Allowance: ", "Automatic computation of statutory night allowances for manufacturing and customer support staff."),
        ("Flexible Off-Day Swapping: ", "Manager-approved weekend and weekly off-day duty exchanges without breaking attendance logic.")
    ]
    for b_title, b_desc in points_roster:
        p = c2tf.add_paragraph()
        p.space_before = Pt(10)
        r1 = p.add_run()
        r1.text = "• " + b_title
        r1.font.bold = True
        r1.font.size = Pt(12)
        r1.font.color.rgb = TEXT_DARK
        r2 = p.add_run()
        r2.text = b_desc
        r2.font.size = Pt(11)
        r2.font.color.rgb = TEXT_MUTED

    add_footer(s6, 6)

    # =========================================================================
    # SLIDE 7: BLA 2006 Compliant Leave Management & Encashment
    # =========================================================================
    s7 = prs.slides.add_slide(blank_layout)
    add_background(s7, LIGHT_BG)
    add_header(s7, "Statutory Compliance", "BLA 2006 Compliant Leave & Encashment Engine", "Enforcing Bangladesh statutory quotas, carryover rules, and financial encashment")

    leave_types = [
        ("Casual Leave (CL)", "10 Days", "Section 115", "Full-pay non-cumulative leave for urgent personal affairs. Cannot be combined with sick leave."),
        ("Sick Leave (SL)", "14 Days", "Section 116", "Full-pay medical leave requiring registered practitioner certificate for absences beyond 3 days."),
        ("Earned / Annual (EL)", "1 per 18 Days", "Section 117", "Accrued on actual working days. Eligible for annual carry-forward and cash encashment."),
        ("Maternity Leave", "16 Weeks (112 Days)", "Section 46-50", "8 weeks pre-natal and 8 weeks post-natal with statutory daily average wage calculation."),
        ("Festival Holidays", "11 Days", "Section 118", "Mandatory paid national and religious holidays declared by the government.")
    ]
    for i, (ltitle, lquota, lsec, ldesc) in enumerate(leave_types):
        cx = 0.8 + i * 2.38
        c = add_card(s7, cx, 2.1, 2.25, 4.6)
        ctf = c.text_frame
        ctf.word_wrap = True
        ctf.margin_left = ctf.margin_top = ctf.margin_right = Inches(0.18)
        p = ctf.paragraphs[0]
        p.text = ltitle
        p.font.name = FONT_HEADING
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = PRIMARY_BLUE

        p = ctf.add_paragraph()
        p.text = lquota
        p.font.name = FONT_HEADING
        p.font.size = Pt(16)
        p.font.bold = True
        p.font.color.rgb = EMERALD_GREEN
        p.space_before = Pt(6)

        p = ctf.add_paragraph()
        p.text = lsec
        p.font.name = FONT_BODY
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = AMBER_GOLD

        p = ctf.add_paragraph()
        p.text = ldesc
        p.font.name = FONT_BODY
        p.font.size = Pt(10)
        p.font.color.rgb = TEXT_MUTED
        p.space_before = Pt(8)

    add_footer(s7, 7)

    # =========================================================================
    # SLIDE 8: The Automated Payroll Engine
    # =========================================================================
    s8 = prs.slides.add_slide(blank_layout)
    add_background(s8, LIGHT_BG)
    add_header(s8, "Payroll Engine", "End-to-End Automated Payroll Processing", "Guaranteed data integrity with a 4-stage protected payroll lifecycle")

    steps = [
        ("1. Create Period", "Define payroll cycle (e.g. Oct 2026), working day boundary, and disbursement target date.", PRIMARY_BLUE),
        ("2. Auto-Compute", "Ingest live biometric attendance, leave deductions, overtime hours, active loan EMIs & tax slabs.", EMERALD_GREEN),
        ("3. Audit & Adjust", "Review individual payslips, apply retroactive arrears or bonus adjustments, and hold salaries with notes.", AMBER_GOLD),
        ("4. Lock & Disburse", "Lock period to freeze figures, export corporate BEFTN/MFS advice, and release encrypted PDF payslips.", PRIMARY_BLUE)
    ]
    for i, (stitle, sdesc, scolor) in enumerate(steps):
        cx = 0.8 + i * 2.95
        c = add_card(s8, cx, 2.1, 2.8, 2.3)
        ctf = c.text_frame
        ctf.word_wrap = True
        ctf.margin_left = ctf.margin_top = ctf.margin_right = Inches(0.2)
        p = ctf.paragraphs[0]
        p.text = stitle
        p.font.name = FONT_HEADING
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = scolor
        p = ctf.add_paragraph()
        p.text = sdesc
        p.font.name = FONT_BODY
        p.font.size = Pt(11)
        p.font.color.rgb = TEXT_MUTED
        p.space_before = Pt(6)

    # Bottom Highlight Card: Safety Controls
    bot_card = add_card(s8, 0.8, 4.7, 11.7, 2.0, bg_color=CARD_BG)
    btf = bot_card.text_frame
    btf.word_wrap = True
    btf.margin_left = btf.margin_top = btf.margin_right = Inches(0.3)
    p = btf.paragraphs[0]
    p.text = "Built-in Audit & Safeguard Controls"
    p.font.name = FONT_HEADING
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK

    features = [
        "Salary Hold & Release: Temporarily withhold an employee's salary during pending clearance without stopping batch payroll.",
        "Immutable Lock: Once marked 'Locked', calculations cannot be altered, ensuring full audit readiness for internal and external auditors.",
        "Zero Double-Disbursement: System prevents duplicate payslip generation for the same employee within the same payroll period."
    ]
    for f in features:
        p = btf.add_paragraph()
        p.text = "✔  " + f
        p.font.name = FONT_BODY
        p.font.size = Pt(11)
        p.font.color.rgb = TEXT_MUTED
        p.space_before = Pt(4)

    add_footer(s8, 8)

    # =========================================================================
    # SLIDE 9: Compensation Structure & Deductions
    # =========================================================================
    s9 = prs.slides.add_slide(blank_layout)
    add_background(s9, LIGHT_BG)
    add_header(s9, "Compensation Breakdown", "Earnings, Deductions & Net Salary Computation", "Transparent, granular breakdown of every monetary component per payslip")

    c1 = add_card(s9, 0.8, 2.1, 5.6, 4.6)
    c1tf = c1.text_frame
    c1tf.word_wrap = True
    c1tf.margin_left = c1tf.margin_top = c1tf.margin_right = Inches(0.3)
    p = c1tf.paragraphs[0]
    p.text = "Earnings Components (Gross Salary)"
    p.font.name = FONT_HEADING
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = PRIMARY_BLUE

    earnings = [
        ("Basic Salary: ", "50% to 60% of Gross as per industry standard and minimum wage gazette."),
        ("House Rent Allowance: ", "25% to 50% of Basic as per Bangladesh corporate compensation rules."),
        ("Medical & Transport: ", "Statutory tax-free threshold limits applied per Income Tax regulations."),
        ("Food & Special Allowance: ", "Customizable recurring allowances mapped to employee grades."),
        ("Statutory Overtime: ", "Calculated at double basic rate: (Basic ÷ 208 hrs) × 2 × OT Hours."),
        ("Festival & Performance Bonuses: ", "Eid-ul-Fitr, Eid-ul-Adha, Puja, and annual KPI bonus runs.")
    ]
    for b_title, b_desc in earnings:
        p = c1tf.add_paragraph()
        p.space_before = Pt(6)
        r1 = p.add_run()
        r1.text = "• " + b_title
        r1.font.bold = True
        r1.font.size = Pt(11)
        r1.font.color.rgb = TEXT_DARK
        r2 = p.add_run()
        r2.text = b_desc
        r2.font.size = Pt(10)
        r2.font.color.rgb = TEXT_MUTED

    c2 = add_card(s9, 6.9, 2.1, 5.6, 4.6)
    c2tf = c2.text_frame
    c2tf.word_wrap = True
    c2tf.margin_left = c2tf.margin_top = c2tf.margin_right = Inches(0.3)
    p = c2tf.paragraphs[0]
    p.text = "Deductions & Net Disbursable"
    p.font.name = FONT_HEADING
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = AMBER_GOLD

    deductions = [
        ("Withholding Tax (AIT): ", "Automated progressive income tax deduction based on annual taxable earnings."),
        ("Provident Fund (RPF): ", "8.33% employee deduction matched with 8.33% employer contribution."),
        ("Unpaid Leave (LWP): ", "Calculated on exact calendar workdays: (Basic ÷ Total Working Days) × LWP."),
        ("Loan & Advance EMIs: ", "Direct deduction of active loan monthly installments."),
        ("Damage & Recovery: ", "Authorized asset damage or disciplinary penalty deductions."),
        ("Net Disbursable Salary: ", "Gross Salary − Total Deductions, automatically verified before payout.")
    ]
    for b_title, b_desc in deductions:
        p = c2tf.add_paragraph()
        p.space_before = Pt(6)
        r1 = p.add_run()
        r1.text = "• " + b_title
        r1.font.bold = True
        r1.font.size = Pt(11)
        r1.font.color.rgb = TEXT_DARK
        r2 = p.add_run()
        r2.text = b_desc
        r2.font.size = Pt(10)
        r2.font.color.rgb = TEXT_MUTED

    add_footer(s9, 9)

    # =========================================================================
    # SLIDE 10: Income Tax (ITA 2023) & Provident Fund Compliance
    # =========================================================================
    s10 = prs.slides.add_slide(blank_layout)
    add_background(s10, LIGHT_BG)
    add_header(s10, "Tax & Funds", "Statutory Income Tax (ITA 2023) & Provident Fund", "Seamless alignment with National Board of Revenue (NBR) individual income tax rules")

    c1 = add_card(s10, 0.8, 2.1, 5.6, 4.6)
    c1tf = c1.text_frame
    c1tf.word_wrap = True
    c1tf.margin_left = c1tf.margin_top = c1tf.margin_right = Inches(0.3)
    p = c1tf.paragraphs[0]
    p.text = "Income Tax Act 2023 Progressive Slabs"
    p.font.name = FONT_HEADING
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = PRIMARY_BLUE

    tax_slabs = [
        ("First 3,50,000 BDT: ", "0% Tax (General Male Threshold)"),
        ("First 4,00,000 BDT: ", "0% Tax (Female & Senior Citizens 65+)"),
        ("First 4,75,000 BDT: ", "0% Tax (Third Gender & Physically Challenged)"),
        ("Next 1,00,000 BDT: ", "5% Tax Rate"),
        ("Next 3,00,000 BDT: ", "10% Tax Rate"),
        ("Next 4,00,000 BDT: ", "15% Tax Rate"),
        ("Next 5,00,000 BDT: ", "20% Tax Rate"),
        ("Remaining Balance: ", "25% Maximum Tax Rate"),
        ("Dhaka CC Minimum Tax: ", "5,000 BDT statutory annual minimum tax")
    ]
    for b_title, b_desc in tax_slabs:
        p = c1tf.add_paragraph()
        p.space_before = Pt(3)
        r1 = p.add_run()
        r1.text = "• " + b_title
        r1.font.bold = True
        r1.font.size = Pt(10)
        r1.font.color.rgb = TEXT_DARK
        r2 = p.add_run()
        r2.text = b_desc
        r2.font.size = Pt(10)
        r2.font.color.rgb = TEXT_MUTED

    c2 = add_card(s10, 6.9, 2.1, 5.6, 4.6)
    c2tf = c2.text_frame
    c2tf.word_wrap = True
    c2tf.margin_left = c2tf.margin_top = c2tf.margin_right = Inches(0.3)
    p = c2tf.paragraphs[0]
    p.text = "Provident Fund & Gratuity Governance"
    p.font.name = FONT_HEADING
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = EMERALD_GREEN

    funds = [
        ("Dual Matching Contribution: ", "Recognized Provident Fund (RPF) rules with equal 8.33% employee deduction and 8.33% employer corporate matching."),
        ("Member Ledger Tracking: ", "Live employee PF balance showing cumulative contributions, profit/interest allocations, and loan advances."),
        ("Gratuity Eligibility (BLA Sec 27): ", "Qualifying tenure of 5 continuous years. Generates 30 days basic pay per completed year of service."),
        ("Automated Tax Certificates: ", "Annual NBR Salary Certificate with tax deducted at source, ready for individual income tax return submission.")
    ]
    for b_title, b_desc in funds:
        p = c2tf.add_paragraph()
        p.space_before = Pt(10)
        r1 = p.add_run()
        r1.text = "• " + b_title
        r1.font.bold = True
        r1.font.size = Pt(11)
        r1.font.color.rgb = TEXT_DARK
        r2 = p.add_run()
        r2.text = b_desc
        r2.font.size = Pt(10)
        r2.font.color.rgb = TEXT_MUTED

    add_footer(s10, 10)

    # =========================================================================
    # SLIDE 11: Corporate Banking & MFS Salary Disbursement
    # =========================================================================
    s11 = prs.slides.add_slide(blank_layout)
    add_background(s11, LIGHT_BG)
    add_header(s11, "Salary Disbursement", "Direct Corporate Banking & MFS Advice Files", "Zero check-writing and elimination of cash handling risks")

    c1 = add_card(s11, 0.8, 2.1, 5.6, 4.6)
    c1tf = c1.text_frame
    c1tf.word_wrap = True
    c1tf.margin_left = c1tf.margin_top = c1tf.margin_right = Inches(0.3)
    p = c1tf.paragraphs[0]
    p.text = "BEFTN / EFT Corporate Bank Advice"
    p.font.name = FONT_HEADING
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = PRIMARY_BLUE

    points_bank = [
        ("Universal Compatibility: ", "Pre-formatted Excel advice compatible with all 60+ scheduled commercial banks in Bangladesh."),
        ("9-Digit Routing Codes: ", "Automatically verifies and includes branch-specific 9-digit routing numbers for BEFTN and RTGS processing."),
        ("Direct Portal Upload: ", "Ready for instant upload to City Bank CityLive, BRAC Bank CorpNet, Dutch-Bangla Corporate, Eastern Bank EBL Skybanking, etc."),
        ("Audit Reconciliation: ", "Matched with bank debit advice to confirm salary credit and maintain a clean audit trail.")
    ]
    for b_title, b_desc in points_bank:
        p = c1tf.add_paragraph()
        p.space_before = Pt(10)
        r1 = p.add_run()
        r1.text = "• " + b_title
        r1.font.bold = True
        r1.font.size = Pt(12)
        r1.font.color.rgb = TEXT_DARK
        r2 = p.add_run()
        r2.text = b_desc
        r2.font.size = Pt(11)
        r2.font.color.rgb = TEXT_MUTED

    c2 = add_card(s11, 6.9, 2.1, 5.6, 4.6)
    c2tf = c2.text_frame
    c2tf.word_wrap = True
    c2tf.margin_left = c2tf.margin_top = c2tf.margin_right = Inches(0.3)
    p = c2tf.paragraphs[0]
    p.text = "Mobile Financial Services (MFS) Payouts"
    p.font.name = FONT_HEADING
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = EMERALD_GREEN

    points_mfs = [
        ("bKash Corporate Payroll: ", "One-click export tailored for the bKash Corporate B2C bulk disbursement portal."),
        ("Nagad Corporate Disbursement: ", "Pre-formatted CSV for instant Nagad employee wallet transfers."),
        ("Rocket (DBBL MFS): ", "Full support for Rocket 12-digit account numbers and batch payouts."),
        ("Factory / Field Staff Friendly: ", "Ideal for retail staff, manufacturing shifts, and unbanked employees without physical bank accounts.")
    ]
    for b_title, b_desc in points_mfs:
        p = c2tf.add_paragraph()
        p.space_before = Pt(10)
        r1 = p.add_run()
        r1.text = "• " + b_title
        r1.font.bold = True
        r1.font.size = Pt(12)
        r1.font.color.rgb = TEXT_DARK
        r2 = p.add_run()
        r2.text = b_desc
        r2.font.size = Pt(11)
        r2.font.color.rgb = TEXT_MUTED

    add_footer(s11, 11)

    # =========================================================================
    # SLIDE 12: Loans, Salary Advances & EMI Auto-Deductions
    # =========================================================================
    s12 = prs.slides.add_slide(blank_layout)
    add_background(s12, LIGHT_BG)
    add_header(s12, "Employee Welfare", "Loans, Advances & Hands-Off EMI Recovery", "Managing employee financial assistance with automated monthly payroll deductions")

    cards12 = [
        ("1. Application Workflow", "Employees apply via ESS specifying loan purpose, requested principal, and preferred tenure in months.", PRIMARY_BLUE),
        ("2. Approval & Schedule", "Finance/HR approves terms and system automatically creates a month-by-month EMI repayment schedule.", EMERALD_GREEN),
        ("3. Automated Payroll EMI", "When running monthly payroll, the engine automatically checks active schedules and deducts the exact installment.", AMBER_GOLD),
        ("4. Pause, Waive or Prepay", "Flexible management controls to pause installments during hardship, record prepayments, or waive balances.", ACCENT_PURPLE)
    ]
    for i, (ctitle, cdesc, ccolor) in enumerate(cards12):
        cx = 0.8 + i * 2.95
        c = add_card(s12, cx, 2.1, 2.8, 4.6)
        ctf = c.text_frame
        ctf.word_wrap = True
        ctf.margin_left = ctf.margin_top = ctf.margin_right = Inches(0.25)
        p = ctf.paragraphs[0]
        p.text = ctitle
        p.font.name = FONT_HEADING
        p.font.size = Pt(15)
        p.font.bold = True
        p.font.color.rgb = ccolor
        p = ctf.add_paragraph()
        p.text = cdesc
        p.font.name = FONT_BODY
        p.font.size = Pt(12)
        p.font.color.rgb = TEXT_MUTED
        p.space_before = Pt(14)

    add_footer(s12, 12)

    # =========================================================================
    # SLIDE 13: Employee Lifecycle, Appraisals & Disciplinary Actions
    # =========================================================================
    s13 = prs.slides.add_slide(blank_layout)
    add_background(s13, LIGHT_BG)
    add_header(s13, "People Governance", "Lifecycle Milestones & Disciplinary Proceedings", "Managing promotions, salary increments, and BLA Section 23/24 legal procedures")

    c1 = add_card(s13, 0.8, 2.1, 5.6, 4.6)
    c1tf = c1.text_frame
    c1tf.word_wrap = True
    c1tf.margin_left = c1tf.margin_top = c1tf.margin_right = Inches(0.3)
    p = c1tf.paragraphs[0]
    p.text = "Lifecycle Events & Performance Appraisals"
    p.font.name = FONT_HEADING
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = PRIMARY_BLUE

    points_life = [
        ("Probation to Confirmation: ", "Automated evaluation reminders, supervisor review forms, and instant confirmation letter issuance."),
        ("Promotions & Transfers: ", "Departmental, branch, and designation transfers with complete salary revision tracking."),
        ("Increments & Retroactive Arrears: ", "Apply annual percentage or step increments with automated calculation of retrospective arrears."),
        ("Performance Management (KPI): ", "Goal setting, self-assessment ratings, manager reviews, and 360° feedback integration.")
    ]
    for b_title, b_desc in points_life:
        p = c1tf.add_paragraph()
        p.space_before = Pt(10)
        r1 = p.add_run()
        r1.text = "• " + b_title
        r1.font.bold = True
        r1.font.size = Pt(12)
        r1.font.color.rgb = TEXT_DARK
        r2 = p.add_run()
        r2.text = b_desc
        r2.font.size = Pt(11)
        r2.font.color.rgb = TEXT_MUTED

    c2 = add_card(s13, 6.9, 2.1, 5.6, 4.6)
    c2tf = c2.text_frame
    c2tf.word_wrap = True
    c2tf.margin_left = c2tf.margin_top = c2tf.margin_right = Inches(0.3)
    p = c2tf.paragraphs[0]
    p.text = "Statutory Disciplinary Actions (BLA Sec 23/24)"
    p.font.name = FONT_HEADING
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = AMBER_GOLD

    points_disc = [
        ("Formal Show-Cause Notice: ", "Issue official notice detailing misconduct charges with mandatory statutory response deadlines."),
        ("Inquiry Committee Proceedings: ", "Record inquiry committee appointments, witness statements, hearing transcripts, and findings."),
        ("Warnings & Suspensions: ", "Log formal written warnings, suspension pending inquiry (with subsistence allowance), or dismissal."),
        ("Court-Proof Audit Trail: ", "Maintain complete documentation to protect the organization against unfair dismissal claims in labor court.")
    ]
    for b_title, b_desc in points_disc:
        p = c2tf.add_paragraph()
        p.space_before = Pt(10)
        r1 = p.add_run()
        r1.text = "• " + b_title
        r1.font.bold = True
        r1.font.size = Pt(12)
        r1.font.color.rgb = TEXT_DARK
        r2 = p.add_run()
        r2.text = b_desc
        r2.font.size = Pt(11)
        r2.font.color.rgb = TEXT_MUTED

    add_footer(s13, 13)

    # =========================================================================
    # SLIDE 14: Employee Self-Service (ESS) Portal & Mobile Access
    # =========================================================================
    s14 = prs.slides.add_slide(blank_layout)
    add_background(s14, LIGHT_BG)
    add_header(s14, "Employee Experience", "Employee Self-Service (ESS) & Mobile Access", "Empowering staff with 24/7 self-service and eliminating repetitive HR inquiries")

    ess_cards = [
        ("Digital Payslips", "Encrypted PDF payslip viewing & download with full earnings, tax, and PF breakdowns.", PRIMARY_BLUE),
        ("Leave Management", "Check real-time leave balances, submit leave applications, and track manager approval.", EMERALD_GREEN),
        ("Attendance & Overtime", "View daily check-in/out logs, late flags, approved overtime hours, and shift roster.", PRIMARY_BLUE),
        ("Loans & Advances", "Apply for financial assistance, check outstanding loan balances, and view EMI schedules.", AMBER_GOLD),
        ("Travel & Expenses", "Submit expense claim bills, attach receipts via camera, and track reimbursements.", ACCENT_PURPLE),
        ("Company Notice Board", "Receive official circulars, holiday announcements, and policy updates in real time.", PRIMARY_BLUE),
    ]
    for i, (etitle, edesc, ecolor) in enumerate(ess_cards):
        row = i // 3
        col = i % 3
        cx = 0.8 + col * 3.95
        cy = 2.1 + row * 2.3
        c = add_card(s14, cx, cy, 3.8, 2.1)
        ctf = c.text_frame
        ctf.word_wrap = True
        ctf.margin_left = ctf.margin_top = ctf.margin_right = Inches(0.25)
        p = ctf.paragraphs[0]
        p.text = etitle
        p.font.name = FONT_HEADING
        p.font.size = Pt(15)
        p.font.bold = True
        p.font.color.rgb = ecolor
        p = ctf.add_paragraph()
        p.text = edesc
        p.font.name = FONT_BODY
        p.font.size = Pt(12)
        p.font.color.rgb = TEXT_MUTED
        p.space_before = Pt(8)

    add_footer(s14, 14)

    # =========================================================================
    # SLIDE 15: Separation Management & Final Settlement
    # =========================================================================
    s15 = prs.slides.add_slide(blank_layout)
    add_background(s15, LIGHT_BG)
    add_header(s15, "Exit & Offboarding", "Separation Workflows & Final Settlement Engine", "Automated calculation of gratuity, leave encashment, and department clearances")

    c1 = add_card(s15, 0.8, 2.1, 5.6, 4.6)
    c1tf = c1.text_frame
    c1tf.word_wrap = True
    c1tf.margin_left = c1tf.margin_top = c1tf.margin_right = Inches(0.3)
    p = c1tf.paragraphs[0]
    p.text = "Multi-Department Clearance Matrix"
    p.font.name = FONT_HEADING
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = PRIMARY_BLUE

    points_clear = [
        ("IT Department Clearance: ", "Revoke email, VPN, ERP credentials; return assigned laptop, phone, and tokens."),
        ("Admin & Security: ", "Recover office access badges, company keys, parking permits, and uniform/safety gear."),
        ("Departmental Handover: ", "Sign-off on active project file handovers, task transfer, and documentation."),
        ("Finance & Accounts: ", "Audit petty cash advances, credit cards, outstanding loans, and travel claims.")
    ]
    for b_title, b_desc in points_clear:
        p = c1tf.add_paragraph()
        p.space_before = Pt(10)
        r1 = p.add_run()
        r1.text = "• " + b_title
        r1.font.bold = True
        r1.font.size = Pt(12)
        r1.font.color.rgb = TEXT_DARK
        r2 = p.add_run()
        r2.text = b_desc
        r2.font.size = Pt(11)
        r2.font.color.rgb = TEXT_MUTED

    c2 = add_card(s15, 6.9, 2.1, 5.6, 4.6)
    c2tf = c2.text_frame
    c2tf.word_wrap = True
    c2tf.margin_left = c2tf.margin_top = c2tf.margin_right = Inches(0.3)
    p = c2tf.paragraphs[0]
    p.text = "Automated Final Settlement Formula"
    p.font.name = FONT_HEADING
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = EMERALD_GREEN

    points_settle = [
        ("Unpaid Salary Balance: ", "Pro-rated salary for active days served during the final exit month."),
        ("Earned Leave Encashment: ", "Cash payment for unspent accrued annual leave: (Basic ÷ 30) × Unused EL."),
        ("Statutory Gratuity Entitlement: ", "30 days basic pay per completed year of service (for 5+ years of continuous service)."),
        ("Deduction of Loan Balances: ", "Automatic recovery of remaining loan principal or notice period shortfall penalty."),
        ("Official Settlement Sheet & Release: ", "Generates signed Final Settlement Voucher and formal Experience & Release Certificate.")
    ]
    for b_title, b_desc in points_settle:
        p = c2tf.add_paragraph()
        p.space_before = Pt(8)
        r1 = p.add_run()
        r1.text = "• " + b_title
        r1.font.bold = True
        r1.font.size = Pt(11)
        r1.font.color.rgb = TEXT_DARK
        r2 = p.add_run()
        r2.text = b_desc
        r2.font.size = Pt(10)
        r2.font.color.rgb = TEXT_MUTED

    add_footer(s15, 15)

    # =========================================================================
    # SLIDE 16: Security, Multi-Tenancy & Audit Trail
    # =========================================================================
    s16 = prs.slides.add_slide(blank_layout)
    add_background(s16, LIGHT_BG)
    add_header(s16, "Enterprise Security", "Multi-Tenancy Isolation, RBAC & Audit Trails", "Banking-grade data protection, confidentiality, and governance")

    sec_cards = [
        ("Multi-Tenancy Isolation", "Strict business_id database scoping guarantees complete data isolation between sister concerns and clients.", PRIMARY_BLUE),
        ("Role-Based Access (RBAC)", "Granular permissions for Super Admin, HR Manager, Payroll Officer, Dept Head, and Staff with least-privilege security.", EMERALD_GREEN),
        ("Immutable Audit Trail", "Every salary revision, status change, and payment execution is logged with timestamp, user ID, and IP address.", AMBER_GOLD),
        ("Data Protection & Backups", "Database encryption at rest and in transit (TLS 1.3), automated daily backups, and disaster recovery.", ACCENT_PURPLE)
    ]
    for i, (stitle, sdesc, scolor) in enumerate(sec_cards):
        cx = 0.8 + i * 2.95
        c = add_card(s16, cx, 2.1, 2.8, 4.6)
        ctf = c.text_frame
        ctf.word_wrap = True
        ctf.margin_left = ctf.margin_top = ctf.margin_right = Inches(0.25)
        p = ctf.paragraphs[0]
        p.text = stitle
        p.font.name = FONT_HEADING
        p.font.size = Pt(15)
        p.font.bold = True
        p.font.color.rgb = scolor
        p = ctf.add_paragraph()
        p.text = sdesc
        p.font.name = FONT_BODY
        p.font.size = Pt(12)
        p.font.color.rgb = TEXT_MUTED
        p.space_before = Pt(14)

    add_footer(s16, 16)

    # =========================================================================
    # SLIDE 17: Tangible Client ROI & Business Value
    # =========================================================================
    s17 = prs.slides.add_slide(blank_layout)
    add_background(s17, DARK_BG)
    add_header(s17, "Measurable Impact", "Tangible Return on Investment (ROI)", "How ProERP delivers rapid payback and financial returns from Month 1", dark_mode=True)

    roi_stats = [
        ("85%", "Payroll Time Reduction", "Cut payroll processing from 5 days to 30 minutes with 1-click batch calculation."),
        ("100%", "Statutory Compliance", "Zero labor court fines, zero tax audit penalties under BLA 2006 and ITA 2023."),
        ("Zero", "Calculation Leakage", "Eliminate ghost overtime, improper leave deductions, and unrecovered loan defaults."),
        ("90%", "Fewer HR Inquiries", "Employees access digital payslips, balances, and certificates via self-service portal.")
    ]
    for i, (stat, stitle, sdesc) in enumerate(roi_stats):
        cx = 0.8 + i * 2.95
        c = add_card(s17, cx, 2.1, 2.8, 4.6, bg_color=DARK_CARD, border_color=PRIMARY_BLUE)
        ctf = c.text_frame
        ctf.word_wrap = True
        ctf.margin_left = ctf.margin_top = ctf.margin_right = Inches(0.25)
        p = ctf.paragraphs[0]
        p.text = stat
        p.font.name = FONT_HEADING
        p.font.size = Pt(36)
        p.font.bold = True
        p.font.color.rgb = RGBColor(56, 189, 248)

        p = ctf.add_paragraph()
        p.text = stitle
        p.font.name = FONT_HEADING
        p.font.size = Pt(15)
        p.font.bold = True
        p.font.color.rgb = TEXT_LIGHT
        p.space_before = Pt(8)

        p = ctf.add_paragraph()
        p.text = sdesc
        p.font.name = FONT_BODY
        p.font.size = Pt(11)
        p.font.color.rgb = TEXT_LIGHT_MUTED
        p.space_before = Pt(12)

    add_footer(s17, 17, dark_mode=True)

    # =========================================================================
    # SLIDE 18: Implementation Roadmap & Next Steps
    # =========================================================================
    s18 = prs.slides.add_slide(blank_layout)
    add_background(s18, DARK_BG)
    add_header(s18, "Next Steps", "4-Week Rapid Deployment Roadmap & Kickoff", "A smooth, structured onboarding methodology with dedicated training and parallel run validation", dark_mode=True)

    weeks = [
        ("Week 1: Setup & Import", "Configure organization hierarchy, branches, salary grades, and import historical employee data.", PRIMARY_BLUE),
        ("Week 2: Attendance & Leave", "Integrate biometric devices, map shift rosters, and configure BLA 2006 statutory leave policies.", EMERALD_GREEN),
        ("Week 3: Parallel Payroll Run", "Run parallel payroll alongside legacy spreadsheets to validate numbers to 100% precision.", AMBER_GOLD),
        ("Week 4: Go-Live & ESS", "Live disbursement via BEFTN/MFS, employee mobile portal rollout, and HR team certification.", PRIMARY_BLUE)
    ]
    for i, (wtitle, wdesc, wcolor) in enumerate(weeks):
        cx = 0.8 + i * 2.95
        c = add_card(s18, cx, 2.1, 2.8, 2.8, bg_color=DARK_CARD, border_color=wcolor)
        ctf = c.text_frame
        ctf.word_wrap = True
        ctf.margin_left = ctf.margin_top = ctf.margin_right = Inches(0.2)
        p = ctf.paragraphs[0]
        p.text = wtitle
        p.font.name = FONT_HEADING
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = wcolor
        p = ctf.add_paragraph()
        p.text = wdesc
        p.font.name = FONT_BODY
        p.font.size = Pt(11)
        p.font.color.rgb = TEXT_LIGHT_MUTED
        p.space_before = Pt(8)

    # Call to Action Card
    cta = add_card(s18, 0.8, 5.2, 11.7, 1.5, bg_color=DARK_CARD, border_color=EMERALD_GREEN)
    ctf = cta.text_frame
    ctf.word_wrap = True
    ctf.margin_left = ctf.margin_top = ctf.margin_right = Inches(0.3)
    p = ctf.paragraphs[0]
    p.text = "Ready to Modernize Your HR & Payroll Operations?"
    p.font.name = FONT_HEADING
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = RGBColor(56, 189, 248)

    p = ctf.add_paragraph()
    p.text = "Let's schedule a live interactive system walkthrough and launch your pilot onboarding. Contact our solutions team to begin."
    p.font.name = FONT_BODY
    p.font.size = Pt(12)
    p.font.color.rgb = TEXT_LIGHT_MUTED
    p.space_before = Pt(4)

    add_footer(s18, 18, dark_mode=True)

    # Save presentation
    output_filename = "ProERP_HR_Payroll_Enterprise_Presentation.pptx"
    prs.save(output_filename)
    print(f"Presentation successfully generated and saved to {output_filename} ({len(prs.slides)} slides)")

if __name__ == "__main__":
    create_presentation()
