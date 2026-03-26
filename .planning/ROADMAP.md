# Roadmap: BanChee (บัญชี)

## Milestones

- ✅ **v1.0 Thai Tax MVP** — Phases 1-4 (shipped 2026-03-25) — [archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Document Workflow** — Phases 5-8 (in progress)

## Phases

<details>
<summary>✅ v1.0 Thai Tax MVP (Phases 1-4) — SHIPPED 2026-03-25</summary>

- [x] Phase 1: Thai Foundation + VAT Compliance (5/5 plans) — completed 2026-03-24
- [x] Phase 2: WHT + Tax Invoices + Filing Deadlines (5/5 plans) — completed 2026-03-24
- [x] Phase 3: CIT + Tax Intelligence + Dashboard (3/3 plans) — completed 2026-03-24
- [x] Phase 4: Export + Interoperability (2/2 plans) — completed 2026-03-24

Full details: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

### v1.1 Document Workflow

- [ ] **Phase 5: Document Model + Quotation System** - Establish the Document Prisma model and build quotation CRUD as the pattern setter for all business document types
- [ ] **Phase 6: Document Workflow Chain + Conversions** - Enable document-to-document conversion flows and unified document management
- [ ] **Phase 7: Bank Reconciliation** - Import bank statements and match entries against BanChee transactions
- [ ] **Phase 8: Ship-Ready Polish** - README rebrand, Docker verification, and visual QA with real Thai receipts

## Phase Details

### Phase 5: Document Model + Quotation System
**Goal**: Users can create, manage, and print professional Thai quotations with sequential numbering, status tracking, and PDF generation
**Depends on**: Phase 4 (v1.0 complete)
**Requirements**: QUOT-01, QUOT-02, QUOT-03, QUOT-04, QUOT-05, DOC-01, DOC-07
**Success Criteria** (what must be TRUE):
  1. User can create a quotation with line items, select a contact, and save it with auto-generated sequential number (QT-YYMM-NNN)
  2. User can download a quotation PDF rendered in THSarabunNew with company header, line items table, totals, validity period, and signature area
  3. User can view all quotations in a list with status badges (draft/sent/accepted/expired/converted) and see validity/expiry at a glance
  4. Quotation status transitions follow an explicit state machine -- a converted quotation cannot be edited, an expired quotation cannot be sent
  5. Document model stores line items, seller/buyer data snapshots, and supports chain linking via sourceDocumentId
**Plans:** 4 plans

Plans:
- [x] 05-01-PLAN.md — Document model schema + migration + status workflow + CRUD (TDD)
- [x] 05-02-PLAN.md — Zod schema + server actions (create, updateStatus, list)
- [x] 05-03-PLAN.md — Quotation PDF template + StatusBadge component
- [ ] 05-04-PLAN.md — Quotation form, list, detail pages + visual verification

### Phase 6: Document Workflow Chain + Conversions
**Goal**: Users can convert documents along the Thai business chain -- quotation to invoice to receipt -- filling in data once and flowing it through the entire chain
**Depends on**: Phase 5
**Requirements**: QUOT-06, DOC-02, DOC-03, DOC-04, DOC-05, DOC-06, DOC-08
**Success Criteria** (what must be TRUE):
  1. User can convert an accepted quotation to an invoice with one click -- all line items, contact data, and amounts pre-fill from the source quotation
  2. User can create a receipt linked to an invoice, recording payment date and method, and the invoice status automatically updates to paid
  3. User can create a delivery note linked to a quotation or invoice
  4. Every conversion creates a new document record -- the source document is never mutated, only its status changes
  5. User can view all documents (quotations, invoices, receipts, delivery notes) in a unified list with type and status filters, and each document shows its chain links
**Plans:** 5 plans

Plans:
- [x] 06-01-PLAN.md — Schema migration + status machines + conversion model functions (TDD)
- [x] 06-02-PLAN.md — Invoice CRUD: form, actions, list, detail page, PDF
- [x] 06-03-PLAN.md — Receipt + delivery note apps with one-click creation and PDFs
- [x] 06-04-PLAN.md — Unified document list + quotation conversion buttons + payment progress
- [ ] 06-05-PLAN.md — Visual verification of full document workflow chain

### Phase 7: Bank Reconciliation
**Goal**: Users can import bank statements and match bank entries against BanChee transactions to verify that recorded income/expenses match actual bank activity
**Depends on**: Phase 5 (Document model for documentId on transactions)
**Requirements**: BANK-01, BANK-02, BANK-03, BANK-04, BANK-05, BANK-06
**Success Criteria** (what must be TRUE):
  1. User can import a CSV or Excel bank statement and map columns to the expected fields via a configuration UI
  2. System correctly handles Thai bank CSV variations -- TIS-620 encoding, Buddhist Era dates, and Thai-language column headers
  3. System suggests matches between bank entries and BanChee transactions using amount, date proximity, and description similarity scoring
  4. User can review matched pairs side-by-side, confirm or reject each match, and manually match unmatched entries
  5. Unmatched bank entries can create new transactions directly from the reconciliation view
**Plans:** 4 plans

Plans:
- [x] 07-01-PLAN.md — Prisma schema + bank statement parser + matching algorithm (TDD)
- [x] 07-02-PLAN.md — Model layer + Zod schemas + server actions + app manifest
- [x] 07-03-PLAN.md — Import UI: file upload, bank presets, column mapping
- [x] 07-04-PLAN.md — Review UI: statement list, match review table, progress tracking + visual verification

### Phase 8: Ship-Ready Polish
**Goal**: BanChee is presentable to the public -- README tells the story, Docker build works end-to-end, and real Thai receipt workflows render correctly
**Depends on**: Phase 6, Phase 7
**Requirements**: SHIP-01, SHIP-02, SHIP-03
**Success Criteria** (what must be TRUE):
  1. README.md is rewritten from TaxHacker to BanChee with Thai + English sections, installation guide, feature overview, and screenshots
  2. Docker production build completes the full cycle: build image, run migrations, seed data, serve the app -- all without errors
  3. Visual QA confirms AI extraction accuracy on real Thai receipts, PDF fonts render correctly with THSarabunNew, and all report downloads produce valid files
**Plans:** 2 plans

Plans:
- [ ] 08-01-PLAN.md — README rebrand + Docker build verification
- [x] 08-02-PLAN.md — Visual QA: route smoke test + human verification

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|---------------|--------|-----------|
| 1. Thai Foundation + VAT Compliance | v1.0 | 5/5 | Complete | 2026-03-24 |
| 2. WHT + Tax Invoices + Filing Deadlines | v1.0 | 5/5 | Complete | 2026-03-24 |
| 3. CIT + Tax Intelligence + Dashboard | v1.0 | 3/3 | Complete | 2026-03-24 |
| 4. Export + Interoperability | v1.0 | 2/2 | Complete | 2026-03-24 |
| 5. Document Model + Quotation System | v1.1 | 0/4 | Planning complete | - |
| 6. Document Workflow Chain + Conversions | v1.1 | 0/5 | Planning complete | - |
| 7. Bank Reconciliation | v1.1 | 0/4 | Planning complete | - |
| 8. Ship-Ready Polish | v1.1 | 0/2 | Planning complete | - |

---
*Last updated: 2026-03-26 after Phase 8 planning complete*
