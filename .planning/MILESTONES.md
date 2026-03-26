# Milestones

## v1.1 Document Workflow (Shipped: 2026-03-26)

**Phases completed:** 4 phases, 15 plans, 25 tasks

**Key accomplishments:**

- Document Prisma model with QUOTATION state machine (draft->sent->accepted->converted), QT-BBBB-NNNN sequential numbering, and CRUD layer -- 37 tests passing via TDD
- Zod schema validating quotation form fields with Thai messages, plus three server actions (create with baht-to-satang conversion and VAT computation, updateStatus via state machine, list filtered by QUOTATION type)
- QuotationPDF with THSarabunNew rendering 11-section A4 layout plus StatusBadge mapping 7 statuses to Thai labels with dark mode
- Invoice/receipt/delivery note status machines with lazy overdue detection, atomic document conversion, chain queries, and invoice Zod schema -- all via TDD
- Complete invoice CRUD with standalone create, quotation-to-invoice conversion, THSarabunNew PDF, overdue detection, payment status tracking, and conversion buttons to receipt/delivery note
- Receipt app with one-click creation, partial payment tracking, and editable payment fields; delivery note app with simplified PDF (items only, no financials)
- Unified /apps/documents page with chain badges, type/status/date filters, quotation conversion buttons, and invoice payment progress bar
- Prisma BankStatement/BankEntry models, CSV/Excel parser with TIS-620 encoding + B.E. date handling, and multi-factor matching algorithm with 40/30/30 scoring weights
- CRUD model layer for BankStatement/BankEntry, Zod column-mapping schemas, and 7 server actions wiring parser + matcher to Next.js action interface
- Drag-and-drop file upload with Thai bank preset selector, column mapping table with exclusive dropdowns and 3-row preview, and import submission with auto-redirect
- Statement list with status badges and progress bars, two-column match review table with confirm/reject/create/skip/undo actions, and reconciliation progress tracking
- README rebranded from TaxHacker to BanChee with Thai+English sections, Docker files updated to mingrath/banchee, production build verified with 3 type fixes
- All 8 app routes return HTTP 200, Thai text renders correctly with UTF-8 charset, THSarabunNew fonts present in public/fonts/ and referenced by 8 PDF components

---

## v1.0 Thai Tax MVP (Shipped: 2026-03-25)

**Phases completed:** 4 phases, 15 plans, 32 tasks

**Key accomplishments:**

- Prisma VAT schema migration, satang integer tax calculator with 23 passing tests, Thai locale/font/date utilities, business profile model with Zod validation, and Thai-localized defaults (categories, fields, AI prompt, THB currency)
- 7-step setup wizard at /setup with Thai business profile fields, THSarabunNew font registration for PDF generation, and shared Thai PDF styles for Revenue Department documents
- AI extraction pipeline extended with Section 86/4 post-extraction validator (11 fields), B.E. date correction, and analyze form with Thai labels, VAT fields, and per-field inline validation badges
- VAT dashboard with DB-aggregate summary cards, 6-month expiry warnings, 1.8M threshold alert, Thai labels, middleware setup gate, and VAT report manifest stub
- PP30, Purchase Tax Report, and Sales Tax Report PDFs with one-click download plus settings business profile form and transaction edit VAT fields
- WHT calculator with basis-point arithmetic, Contact/FilingStatus Prisma models, filing deadline computation with Thai 2026 holiday awareness
- AI receipt scanning now suggests WHT rate (1-10%) per service type, shown in analyze form with user-editable dropdown and auto-computed amount
- 50 Tawi certificate, PND3/PND53 monthly filing PDFs, and batch ZIP download via react-pdf and JSZip
- Tax invoice form with Section 86/4 enforcement, contact autocomplete/inline-create, sequential numbering (INV-YYYY-NNNN), auto-income-transaction, and PDF generation with THSarabunNew
- Filing deadline cards with green/amber/red urgency color-coding, mark-as-filed toggle, and WHT monthly summary widget wired into the BanChee dashboard
- CIT engine with SME tiered rates, non-deductible expense validator with heuristic overrides, and AI prompt extended for Section 65 tri flagging across 8 categories
- Status:
- 4-card tax summary grid (VAT, WHT, CIT, flagged expenses) with non-deductible cap tracking and parallel data fetching on dashboard
- RD pipe-delimited TXT (PP30/PND3/PND53), FlowAccount CSV, and Thai accountant Excel workbook generators with ExcelJS
- e-Filing export buttons on VAT/WHT report pages plus dedicated export data page with FlowAccount CSV and accountant Excel downloads

---
