# Roadmap: BanChee (บัญชี)

## Overview

BanChee extends TaxHacker's existing AI receipt scanning foundation with a complete Thai tax compliance layer. The roadmap follows tax obligation frequency: monthly obligations first (VAT, then WHT), annual obligations second (CIT), and export/interoperability last (depends on all calculations being correct). This is a brownfield project -- TaxHacker already provides auth, file management, AI scanning pipeline, dashboard, and Docker deployment.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Thai Foundation + VAT Compliance** - Business profile, Thai localization, AI Thai extraction, and complete VAT tracking with PP30 generation
- [x] **Phase 2: WHT + Tax Invoices + Filing Deadlines** - Withholding tax management, tax invoice creation, contact management, and filing calendar (completed 2026-03-23)
- [ ] **Phase 3: CIT + Tax Intelligence + Dashboard** - Corporate income tax helpers, Section 65 Tri flagging, credit note workflow, and tax summary dashboard
- [ ] **Phase 4: Export + Interoperability** - Revenue Department XML, FlowAccount CSV, and Thai accountant Excel formats

## Phase Details

### Phase 1: Thai Foundation + VAT Compliance
**Goal**: A Thai SME owner can set up their business profile, upload receipts in Thai, and track VAT input/output with monthly PP30 report generation
**Depends on**: Nothing (first phase -- builds on existing TaxHacker foundation)
**Requirements**: I18N-01, I18N-02, I18N-03, I18N-04, SCAN-01, SCAN-02, SCAN-03, VAT-01, VAT-02, VAT-03, VAT-04, VAT-05, VAT-06, VAT-07, BIZ-01, BIZ-02, BIZ-03, BIZ-04
**Success Criteria** (what must be TRUE):
  1. User can configure their business profile (company name, Tax ID, branch, VAT status) and the app displays correctly in Thai with official Revenue Department terminology
  2. User can upload a Thai receipt/invoice photo and the AI extracts Thai-specific fields (vendor name, Tax ID, branch number, VAT amount) and auto-categorizes the expense
  3. User can view input VAT and output VAT tracked per transaction with correct 7% calculation (including pre-VAT extraction from VAT-inclusive amounts)
  4. User can generate a Purchase Tax Report, Sales Tax Report, and PP30 monthly VAT return data for any given month
  5. User receives a warning when input tax invoices approach the 6-month expiry for VAT credit claims, and gets notified when revenue approaches the 1.8M VAT registration threshold
**Plans**: 5 plans

Plans:
- [x] 01-01-PLAN.md -- Schema foundation, Thai localization, business profile model, tax calculator
- [x] 01-02-PLAN.md -- Setup wizard and THSarabunNew PDF font infrastructure
- [x] 01-03-PLAN.md -- AI Thai receipt scanning with Section 86/4 validation
- [x] 01-04-PLAN.md -- VAT dashboard widgets, expiry warnings, threshold alerts
- [x] 01-05-PLAN.md -- PP30 + tax report PDF generation, settings, transaction edit

### Phase 2: WHT + Tax Invoices + Filing Deadlines
**Goal**: A Thai SME owner can manage withholding tax on payments, create and issue tax invoices, and never miss a filing deadline
**Depends on**: Phase 1 (requires business profile, Thai localization, and contact/vendor foundation)
**Requirements**: SCAN-04, WHT-01, WHT-02, WHT-03, WHT-04, WHT-05, INV-01, INV-02, INV-04, FILE-01, FILE-02, FILE-03, FILE-04
**Success Criteria** (what must be TRUE):
  1. User can select a WHT rate per payment type (1-5%) and the system auto-calculates WHT on the pre-VAT amount (not total), generating a correct 50 Tawi certificate PDF
  2. User can generate PND3 (individuals) and PND53 (companies) monthly WHT filing reports
  3. User can create Thai tax invoices with all 8 required fields per Section 86/4, with sequential document numbering, and manage contacts with Tax ID and branch storage
  4. User can view a Thai tax calendar showing all filing deadlines (adjusted for public holidays) with visual dashboard alerts and per-form filing status tracking
  5. AI auto-suggests WHT rate based on payment/service type when scanning receipts
**Plans**: 5 plans

Plans:
- [x] 02-01-PLAN.md -- Schema foundation, WHT calculator, contact model, filing deadline services
- [x] 02-02-PLAN.md -- AI WHT rate suggestion and transaction WHT field integration
- [x] 02-03-PLAN.md -- 50 Tawi certificate, PND3/PND53 report generation, batch download
- [x] 02-04-PLAN.md -- Tax invoice creation with Section 86/4 enforcement, contact management
- [x] 02-05-PLAN.md -- Filing deadline dashboard alerts, status tracking, WHT summary widget

### Phase 3: CIT + Tax Intelligence + Dashboard
**Goal**: A Thai SME owner can estimate corporate income tax, get intelligent flags on non-deductible expenses, and see a unified tax summary dashboard
**Depends on**: Phase 2 (requires WHT data, invoice workflow, and filing status for complete dashboard)
**Requirements**: SCAN-05, CIT-01, CIT-02, CIT-03, INV-03, RPT-01, RPT-02
**Success Criteria** (what must be TRUE):
  1. User can view estimated CIT using SME tiered rates (0% on first 300K, 15% on 300K-3M, 20% above) with helpers for annual PND50 and half-year PND51 calculations
  2. AI flags non-deductible expenses (Section 65 Tri) with explanation when scanning receipts, helping users understand which expenses reduce taxable income
  3. User can create credit notes and debit notes for invoice corrections
  4. User can view a monthly tax summary dashboard showing VAT payable, WHT withheld, upcoming deadlines, and income/expense summary with profit calculation
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md -- Schema + CIT calculator + AI 65 tri flagging + non-deductible validator + business profile capital
- [x] 03-02-PLAN.md -- CIT report app (PND50/PND51) + credit/debit note app
- [x] 03-03-PLAN.md -- Monthly tax summary dashboard + non-deductible summary widgets

### Phase 4: Export + Interoperability
**Goal**: A Thai SME owner can export all tax data in formats ready for Revenue Department e-filing, FlowAccount import, or handoff to an accountant
**Depends on**: Phase 3 (requires all tax calculations -- VAT, WHT, CIT -- to be complete and correct)
**Requirements**: RPT-03, RPT-04, RPT-05
**Success Criteria** (what must be TRUE):
  1. User can export PP30, PND3, and PND53 data in Revenue Department-compatible format ready for upload to rd.go.th e-filing system
  2. User can export transaction data in FlowAccount-compatible CSV format for import into FlowAccount
  3. User can export data in standard Thai accountant Excel format suitable for handoff to an external accountant
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Thai Foundation + VAT Compliance | 5/5 | Complete | 2026-03-23 |
| 2. WHT + Tax Invoices + Filing Deadlines | 5/5 | Complete   | 2026-03-23 |
| 3. CIT + Tax Intelligence + Dashboard | 0/3 | Not started | - |
| 4. Export + Interoperability | 0/1 | Not started | - |
