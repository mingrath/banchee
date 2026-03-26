# BanChee Retrospective

## Milestone: v1.0 — Thai Tax MVP

**Shipped:** 2026-03-25
**Phases:** 4 | **Plans:** 15 | **Commits:** 229 | **LOC:** 31,600+ TypeScript

### What Was Built
- Thai-localized UI with B.E. dates, Revenue Department terminology, Noto Sans Thai + THSarabunNew
- AI receipt scanning with Section 86/4 validation, WHT rate suggestion, Section 65 tri flagging
- Complete VAT workflow: input/output tracking, /107 formula, PP30 PDF generation
- WHT workflow: 5-tier calculator, 50 Tawi certificates, PND3/PND53 reports, batch ZIP
- CIT estimation: SME tiered rates, non-deductible cap tracking, PND50/PND51 reports
- Tax invoice + credit/debit note creation with sequential numbering
- Filing deadline dashboard with Thai holiday awareness and status tracking
- Multi-format export: RD pipe-delimited TXT, FlowAccount CSV, accountant Excel workbook

### What Worked
- **GSD workflow**: discuss-plan-execute per phase produced consistent, verified output
- **Brownfield approach**: Forking TaxHacker saved massive effort — auth, AI pipeline, file management all free
- **Satang integer arithmetic**: Zero precision issues across all tax calculations
- **Phase ordering by tax frequency**: Monthly (VAT) → monthly (WHT) → annual (CIT) → export was the right sequence
- **Parallel execution**: Independent plans executed in parallel waves, cutting phase time
- **Pure transformation exports**: Export services take data in, return buffers out — clean, testable (35/35 tests)

### What Was Inefficient
- **REQUIREMENTS.md checkboxes not synced**: 3 requirements (CIT-02, CIT-03, INV-03) were built but never checked off — caused confusion at milestone completion
- **Migration timestamp ordering**: Had to rename a migration after the fact due to timestamp collision
- **Resend crash on self-hosted**: Module-level Resend instantiation crashed without API key — should have been guarded from the start

### Patterns Established
- Satang integers everywhere (formatCurrency handles /100 internally)
- FIRST_CLASS_COLUMNS array in models/transactions.ts — must add new fields here
- AppData model for document storage (key pattern: `{type}-{docNumber}`)
- Cookie-based middleware gate (Edge runtime can't run Prisma)
- Client-side PDF generation via pdf() to avoid server memory pressure
- Settings model for sequential numbering with parseInt in $transaction

### Key Lessons
- Always guard optional service clients (Resend, Stripe) with null checks at module level
- Migration timestamps must be manually verified for ordering when dependencies exist
- The /107 VAT formula is non-negotiable — never multiply by 0.07 for inclusive prices
- WHT always on pre-VAT amount — chain extractVATFromTotal() before calculateWHT()

### Cost Observations
- Model mix: 100% Opus (quality profile)
- Sessions: ~2 (one marathon session built phases 1-4, one cleanup session)
- Notable: Entire v1 built in a single extended session — GSD parallel execution was key

## Cross-Milestone Trends

| Metric | v1.0 | v1.1 |
|--------|------|------|
| Phases | 4 | 4 |
| Plans | 15 | 15 |
| Commits | 229 | 71 |
| LOC | 31,600+ | 43,300+ |
| Duration | ~1 day | ~1 day |
| Model | Opus | Opus |

## Milestone: v1.1 — Document Workflow

**Shipped:** 2026-03-26
**Phases:** 4 | **Plans:** 15 | **Commits:** 71 | **LOC:** 43,300+ TypeScript

### What Was Built
- Quotation system with line items, sequential numbering (QT-BBBB-NNNN), PDF, status tracking
- Document workflow chain: quotation → invoice → receipt → delivery note with one-click conversion
- Invoice with due date, overdue detection, standalone + from-quotation creation
- Receipt with partial payments (4 methods: transfer/cash/cheque/credit card), auto-paid detection
- Delivery note (items only, no financials)
- Unified /apps/documents page with inline chain badges and type/status/date filters
- Bank reconciliation: CSV/Excel import with TIS-620 encoding + B.E. date auto-detection
- Bank presets for KBank, SCB, BBL with flexible column mapping UI
- Multi-factor matching algorithm (amount 40% + date 30% + description 30%)
- Match review table with confirm/reject/create-transaction/skip/undo actions
- README rebranded from TaxHacker to BanChee (Thai + English)
- Docker production build verified with 4 type fixes

### What Worked
- **Phase 5 as pattern setter**: Building quotation first established patterns that Phases 6-8 cloned with minimal new code
- **Parallel execution in waves**: Plans 07-03 and 07-04 ran in parallel, cutting Phase 7 wall time
- **UI-SPEC design contracts**: Caught typography (3 weights → 2) and accessibility (missing aria-labels) issues before implementation
- **TDD for service layer**: 37+ tests in Phase 5, carried through Phase 7 — zero logic bugs in production services

### What Was Inefficient
- **@fast-csv/parse client boundary leak**: Imported in 4 client components, broke build — required extracting BANK_PRESETS to bank-constants.ts. Should have been in the research phase pitfalls.
- **Docker build failed in background task**: Ran before fixes were committed — wasted background compute. Should verify build after all code commits.
- **Branch NaN display**: parseInt on Thai text "สำนักงานใหญ่" — caught during visual QA, fixed in-session.

### Patterns Established
- Document model as single Prisma table with documentType enum (not separate tables)
- One-click conversion: create new Document with sourceDocumentId + auto-update source status
- Partial payment via sumReceiptAmountsForInvoice — auto-paid when sum ≥ invoice total
- Bank constants separated from parser for client-safe imports
- Client-side PDF generation with type-specific templates sharing THSarabunNew registration

### Key Lessons
- Always separate Node.js-only imports (fs, crypto) from constants that client components need
- Document conversion must be atomic ($transaction) — create new + update source in one operation
- Bank CSV presets are LOW confidence without real samples — column mapping UI is the safety net
- UI-SPEC catches design issues before they become code debt — worth the extra 5 minutes

---
*Updated: 2026-03-26*
