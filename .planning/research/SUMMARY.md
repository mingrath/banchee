# Project Research Summary

**Project:** BanChee v1.1 — Document Workflow & Bank Reconciliation
**Domain:** Thai SME accounting — quotation system, document chain, bank reconciliation
**Researched:** 2026-03-25
**Confidence:** HIGH

## Executive Summary

BanChee v1.1 adds three tightly related feature groups to the existing Thai tax accounting foundation: a quotation system (ใบเสนอราคา), a full Thai business document workflow chain (quotation → invoice → receipt → tax invoice), and bank reconciliation with CSV/Excel import. The most important finding from all four research areas is that **zero new npm dependencies are required** — Prisma, @react-pdf/renderer, @fast-csv/parse, ExcelJS, Zod, date-fns, and LangChain already cover every technical need. This is application-layer work: new Prisma models, new PDF templates, new server actions, and new business logic in TypeScript.

The recommended approach is a strict 4-phase build in dependency order: (1) establish the Document Prisma model and build the quotation CRUD as the pattern setter, (2) build the conversion flows between document types, (3) build the unified document list view once multiple types exist, then (4) build bank reconciliation as an independent workstream. The Document model is the critical architectural decision — the existing AppData JSON pattern cannot support the cross-document queries, status filtering, and relational chain linking that v1.1 requires. New document types must use a first-class `Document` Prisma model, not AppData blobs.

The primary risks are data model integrity (quotations must never pollute the Transaction table) and financial accuracy (satang/baht double-conversion is a known pitfall from v1.0, and bank reconciliation must never auto-confirm matches without user review). Thai bank CSV formats vary per bank and include Buddhist Era dates, TIS-620 encoding, and Thai-language column headers — the import parser must be configurable, not hardcoded. All 9 critical pitfalls identified in PITFALLS-v1.1.md have clear prevention strategies mapped to specific phases.

## Key Findings

### Recommended Stack

The v1.1 features require zero new dependencies. Every technical need is covered by the existing stack. Document workflow state machine logic is 20 lines of TypeScript using a `Record<string, string[]>` transition table — XState adds 15kB and significant complexity for a problem with 4–5 states. Thai banks export CSV and Excel, not OFX, so no OFX parser is needed. Bank reconciliation matching uses deterministic amount+date+description scoring — Fuse.js is premature when the LLM pipeline already handles edge cases.

**Core technologies for v1.1:**
- **Prisma ^6.6.0**: New Document, BankStatement, BankEntry models — schema-driven, type-safe, atomic counter for sequential numbering
- **@react-pdf/renderer ^4.3.0**: Quotation PDF, Receipt PDF, Delivery Note PDF — existing THSarabunNew font registration reused directly
- **@fast-csv/parse ^5.0.2**: Bank statement CSV import — already used for RD export, same pipe approach
- **ExcelJS ^4.4.0**: Bank statement Excel import via `workbook.xlsx.load(buffer)` — already installed for export
- **Zod ^3.24.2**: New schemas for quotation form, bank statement column mapping, document status transitions
- **LangChain ^0.3.30**: AI-assisted bank transaction matching suggestions — existing pipeline, new prompt templates only
- **date-fns ^3.6.0**: Quotation validity period, due date calculation, Buddhist Era year arithmetic

**Installation for v1.1:** `npx prisma migrate dev --name add_quotation_document_workflow_bank_reconciliation` (no npm installs)

### Expected Features

**Must have (table stakes — P1):**
- Quotation creation with Thai line items, contact picker, validity date, sequential numbering (QT-YYMM-NNN)
- Quotation PDF in Thai with THSarabunNew font, Buddhist Era dates
- Quotation status tracking: draft → sent → accepted/rejected/expired with auto-expire
- Quotation-to-invoice conversion (pre-filled, one-click, editable before saving)
- Invoice-to-receipt conversion (marks payment, generates receipt with payment date/method)
- Invoice-to-tax-invoice conversion (pre-fills existing tax invoice form from invoice data)
- Document reference chain: QT-001 → INV-001 → RC-001 with clickable navigation
- Bank statement CSV/Excel import with configurable column mapping UI
- Manual transaction matching UI (side-by-side bank entries vs BanChee transactions)
- Auto-suggest matching by amount + date proximity with confidence score display

**Should have (differentiators — P2):**
- One-click full-chain shortcut: quotation → mark paid → auto-create invoice + receipt + tax invoice
- AI-powered bank statement description parsing (Thai bank cryptic codes → counterparty, transaction type)
- Reconciliation summary report per account per month
- Delivery note (ใบส่งของ) generation as optional document type

**Defer to v2+:**
- Direct bank API / Open Banking integration (no Thai banks have public API for SMEs)
- Partial payment and installment tracking (requires full AR system)
- Purchase order workflow (purchase side of document chain)
- Customer-facing quotation approval portal with e-signature
- Automatic bank statement PDF parsing (too fragile across Thai bank formats)
- e-Tax Invoice PDF/A-3 with digital signature (requires ETDA XML and certificate management)

### Architecture Approach

v1.1 adds to the existing Next.js App Router + Prisma architecture by introducing four new layers: a Document Prisma model (replaces AppData for business documents), a services layer for document workflow state machine and bank reconciliation matching algorithm, new app directories per document type following the existing tax-invoice pattern, and new model files wrapping Prisma queries per entity type. The existing Contact, BusinessProfile, Transaction, tax-calculator, and PDF generation patterns are all reused without modification.

**Major components:**
1. **Document model (Prisma)** — Unified business document storage with self-referential chain linking via `sourceDocumentId`, seller/buyer data snapshots (denormalized at creation time for legal immutability), status column with validated transitions, and indexes on type, status, contactId, issuedAt
2. **services/document-workflow.ts** — Status transition validation (`VALID_TRANSITIONS` lookup per document type), document conversion logic with data snapshot preservation, sequential number generation per document type
3. **services/bank-statement-parser.ts** — Pluggable parser per Thai bank format (KBank, SCB, BBL, generic), encoding detection (TIS-620 vs UTF-8), Buddhist Era date conversion, configurable column mapping
4. **services/bank-reconciliation.ts** — Score-based matching: amount match (+40 pts), date proximity (+30 pts), description similarity (+30 pts); returns top 3 candidates per bank entry; always requires user confirmation
5. **apps/quotation/** — Full CRUD + PDF, follows existing tax-invoice app directory pattern with manifest.ts, page.tsx, actions.ts, and components/

**Key architectural decisions:**
- `sellerData` and `buyerData` stored as JSON snapshots — legal documents must preserve addresses at time of issuance
- `transactionId` stored on Document (not bidirectional FK) to avoid circular dependency with Transaction model
- Bank entries use single signed `amount` field (positive = deposit, negative = withdrawal) not separate debit/credit columns
- Existing tax invoices in AppData remain untouched — migration deferred to v1.2

### Critical Pitfalls

**Top 5 of 9 identified in PITFALLS-v1.1.md (by impact):**

1. **Satang double-division in quotation line items** — `formatCurrency()` already divides by 100. Passing a baht value shows 1/100th of the correct amount. Prevention: store all amounts in satang throughout; convert only at form input boundary. Establish convention in Phase 1 before any amount logic is written.

2. **AppData cannot support document queries** — Storing quotations in AppData (existing v1.0 pattern) makes "find all quotations for contact X" or "quotations expiring this week" impossible without loading all records. Prevention: use the new Document Prisma model with indexes on userId, contactId, status, type, issuedAt.

3. **Transaction model pollution from document types** — Cramming quotations, delivery notes, and receipts into the Transaction table inflates dashboard income stats, contaminates tax reports, and breaks RD export. Prevention: quotations are NOT financial transactions — create a separate Document model.

4. **Conversion mutates original quotation** — Modeling conversion as "update the quotation to become an invoice" destroys the original, prevents audit traceability, and leaves partial failures in a corrupt state. Prevention: conversion must CREATE a new Document and link it via `sourceDocumentId`; update source status to "converted" only after the new document is successfully created inside `prisma.$transaction()`.

5. **Bank CSV format assumptions** — Each Thai bank exports CSV with different column names (some in Thai), different date formats (Buddhist Era vs Gregorian), different encodings (TIS-620 vs UTF-8), and some export Excel or PDF only. Prevention: build a column mapping UI on first import, auto-detect encoding, handle Buddhist Era dates (year > 2500 → subtract 543).

**4 additional critical pitfalls to track:**
- **FIRST_CLASS_COLUMNS** — New Transaction columns silently go to `extra` JSON blob if not added to the set in `models/transactions.ts`. Add every new column to this set immediately after migration.
- **Sequential numbering race condition** — Use unique setting codes per document type (`seq_quotation`, `seq_receipt`, etc.) and keep the `prisma.$transaction()` isolation pattern.
- **Status machine without explicit transitions** — Define `VALID_TRANSITIONS` and enforce at model layer, not just UI. A cancelled quotation must not be reactivated.
- **Auto-reconciliation false positives** — Never auto-confirm bank matches. Require user confirmation for every match, especially for recurring amounts (rent, subscriptions, utilities).

## Implications for Roadmap

The 4-phase structure is validated independently by both FEATURES.md and ARCHITECTURE.md reaching the same conclusion:

### Phase 1: Document Model + Quotation System

**Rationale:** The Document Prisma model is the foundation every subsequent feature depends on. Quotation exercises all patterns (form, list, status transitions, PDF, sequential numbering, contact picker) without requiring conversion logic yet. This phase establishes the satang convention, numbering service, `VALID_TRANSITIONS` pattern, and PDF template structure that all other document types will follow.

**Delivers:** Document and DocumentCounter Prisma models; `models/documents.ts`; `services/document-workflow.ts` (status machine); Quotation full CRUD; Quotation PDF with THSarabunNew; Quotation list with status badges and expiry indicators.

**Features from FEATURES.md:** Quotation creation with line items, Quotation PDF generation, Quotation validity period, Contact picker (existing Contact model reused), Sequential quotation numbering, Quotation status tracking.

**Pitfalls to prevent:** Pitfall 1 (satang convention), Pitfall 2 (AppData instead of Document model), Pitfall 3 (sequential numbering race), Pitfall 8 (Transaction model pollution), Pitfall 9 (AppData scaling).

### Phase 2: Document Workflow Chain + Conversions

**Rationale:** Requires the Document model from Phase 1. Delivers the core value proposition — "fill in information once" — that FlowAccount and PEAK use as their primary selling point. Highest P1 feature density.

**Delivers:** `convertQuotationToInvoiceAction()` with atomic Prisma transaction; Invoice standalone creation; `markInvoicePaidAction()` with auto-receipt generation; Tax invoice form pre-fill from invoice data; Delivery note and billing note apps; Document reference chain UI (clickable chain navigation); One-click full-chain shortcut.

**Features from FEATURES.md:** All P1 document conversion features, Document reference linking, Document lifecycle statuses, One-click full-chain shortcut (P2 differentiator).

**Pitfalls to prevent:** Pitfall 4 (conversion mutates original — must CREATE new document), Pitfall 5 (status machine without explicit transitions).

### Phase 3: Document List + Status Dashboard

**Rationale:** Only meaningful once multiple document types exist (Phase 1 + 2). This is the operational view business owners use daily to track pending quotes, overdue invoices, and actions required.

**Delivers:** `apps/document-list/` unified cross-type table; Status badges per document type; Type/status/date filters; Document detail view with full chain visualization; Overdue invoice detection.

**Features from FEATURES.md:** Document lifecycle statuses at-a-glance, Document reference chain display, Quotation expiry visibility.

### Phase 4: Bank Reconciliation

**Rationale:** Completely independent of the document chain. Can be built in parallel with Phases 2–3 if resources allow (only dependency is the `documentId` field on Transaction from Phase 1 migration). Placed last because it is self-contained, technically complex (Thai bank format variance), and represents a distinct user workflow.

**Delivers:** BankStatement and BankEntry Prisma models; `services/bank-statement-parser.ts` with KBank/SCB/BBL/generic support; `services/bank-reconciliation.ts` with score-based matching; `apps/bank-reconciliation/` full UI (upload, column mapping, side-by-side review, reconciliation summary); AI description parsing (P3, defer if time-constrained).

**Features from FEATURES.md:** Bank statement CSV/Excel import, Manual transaction matching UI, Auto-suggest matching, Reconciliation summary, AI bank description parsing (optional).

**Pitfalls to prevent:** Pitfall 6 (bank CSV format assumptions — configurable column mapping required from day one), Pitfall 7 (amount-only matching false positives — multi-factor scoring required).

### Phase Ordering Rationale

- **Document model first**: AppData cannot be queried by status, type, or date range. The Document model unlocks all downstream features — without it, Phase 2 cannot link documents, Phase 3 cannot query across types, and Phase 4 cannot link bank entries to documents.
- **Quotation before conversions**: You cannot convert what does not yet exist. Phase 1 builds the source document; Phase 2 builds the conversion flows.
- **Document list after multiple types**: A unified list of one document type has no value. The dashboard value emerges only when quotation + invoice + receipt all exist.
- **Bank reconciliation independent**: Shares no code with the document chain. The only dependency is the Transaction `documentId` field from Phase 1 migration. This makes Phase 4 a candidate for parallel development after Phase 1.

### Research Flags

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Quotation + Document Model):** Well-established Prisma schema pattern. Follows existing tax-invoice app directory structure exactly. No novel integration.
- **Phase 2 (Document Conversions):** Document conversion with snapshot preservation is a standard accounting pattern. The existing `credit-note/actions.ts` is the correct reference implementation.
- **Phase 3 (Document List):** Standard Prisma query + Next.js server component table pattern. No novel integration.

**Phases likely needing targeted research during planning:**
- **Phase 4 (Bank Reconciliation):** Thai bank CSV column formats per bank should be verified with real sample exports before building the parser. Obtain actual CSV exports from KBank, SCB, and KTB before writing parser configuration. TIS-620 encoding detection approach needs validation with real bank files.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies confirmed by cross-checking each feature requirement against existing package.json. All library capabilities (ExcelJS read, @fast-csv/parse, LangChain prompts) verified against official docs and existing codebase usage. |
| Features | HIGH | Based on official Thai Revenue Department sources, direct competitor analysis (FlowAccount, PEAK product pages), and Thai business document standards. Document chain is legally defined and well-documented. |
| Architecture | HIGH | Based on codebase analysis of existing patterns (tax-invoice, credit-note, contacts, transactions). Document model design follows Prisma best practices. Anti-patterns identified from actual code review. |
| Pitfalls | HIGH | 5 of 9 pitfalls grounded in existing BanChee codebase issues (satang convention, FIRST_CLASS_COLUMNS, AppData limitations) confirmed by code review. 4 from accounting software domain knowledge. |

**Overall confidence:** HIGH

### Gaps to Address

- **Thai bank CSV exact column formats**: Research uses community sources and GitHub converters, not official bank documentation. Obtain real CSV exports from KBank, SCB, and KTB before building parsers. Generic configurable column mapping is the fallback default.
- **Concurrent user sequential numbering**: The `prisma.$transaction()` atomic pattern is correct for single-user mode. If multi-tenant use ever arrives, the sequence counter approach needs PostgreSQL SEQUENCE or row-level locking review.
- **Buddhist Era year rollover in document numbers**: QT-YYYY-NNNN format includes the year. Behavior at fiscal year boundary (Dec 31 → Jan 1) needs explicit test coverage to verify sequence resets per year.

## Sources

### Primary (HIGH confidence)

- Thai Revenue Code Section 86 — Tax invoice requirements, 11 mandatory fields for ใบกำกับภาษี (verified at library.siam-legal.com)
- Revenue Department e-Tax Invoice (etax.rd.go.th) — Compliance requirements
- BanChee codebase direct analysis — `prisma/schema.prisma`, `models/transactions.ts` (FIRST_CLASS_COLUMNS), `lib/utils.ts` (formatCurrency), `app/(app)/apps/tax-invoice/actions.ts` (sequential numbering pattern), `app/(app)/apps/credit-note/actions.ts` (document reference pattern), `app/(app)/apps/invoices/components/invoice-page.tsx` (amount convention mismatch)
- Prisma transactions docs (prisma.io) — Atomic multi-model operations confirmed
- XState v5 official docs (stately.ai) — Reviewed and rejected as overkill for 4–5 state machine

### Secondary (MEDIUM confidence)

- FlowAccount Quotation, Invoice, Tax Invoice feature pages (flowaccount.com) — Competitor feature baseline and document status definitions
- PEAK Account manual — Create invoice from quotation, receipt/tax invoice creation, bank reconciliation
- SCB Statement Converter GitHub (shlomki/scb-statement-converter) — Thai bank CSV format reference
- ASEAN NOW forum — Confirms Thai banks primarily export PDF, some CSV

### Tertiary (LOW confidence — validate before Phase 4 implementation)

- Thai bank CSV column format details per bank — Community-sourced, not official bank documentation
- TIS-620 encoding detection approach — General encoding detection, not Thai-bank-specific validation

---
*Research completed: 2026-03-25*
*Scope: BanChee v1.1 Document Workflow & Bank Reconciliation milestone*
*Prior research: 2026-03-23 (v1.0 base stack and Thai tax feature research)*
*Ready for roadmap: yes*
