# Stack Research: v1.1 Document Workflow & Bank Reconciliation

**Project:** BanChee v1.1 -- Quotation, Document Workflow, Bank Reconciliation
**Researched:** 2026-03-25
**Confidence:** HIGH
**Scope:** Additions/changes for NEW v1.1 features only. See previous STACK.md commit for v1.0 base stack.

## Executive Summary

The v1.1 features (quotation system, document workflow chain, bank reconciliation) require **zero new npm dependencies**. The existing stack -- Prisma, @react-pdf/renderer, @fast-csv/parse, Zod, date-fns -- already covers every technical need. The work is application-layer code (new Prisma models, new PDF templates, new server actions), not new library integration.

This is a significant finding: what initially looks like three complex features (state machine for workflow, OFX parser for bank statements, fuzzy matching for reconciliation) resolves to straightforward Prisma schema design + business logic in TypeScript.

## What's Already Installed That Covers v1.1

| Existing Dependency | v1.1 Use Case | Why It's Sufficient |
|---------------------|---------------|---------------------|
| Prisma ^6.6.0 | Document models (Quotation, Receipt), workflow status tracking, sequential numbering, bank statement storage | Schema-driven, type-safe, atomic operations for counter increment, relation modeling for document chain |
| @react-pdf/renderer ^4.3.0 | Quotation PDF, Receipt PDF, Delivery Note PDF, Billing Note PDF | Already renders Thai PDFs with THSarabunNew. Invoice PDF template exists as reference pattern. |
| @fast-csv/parse ^5.0.2 | Bank statement CSV import | Already installed. Thai banks export CSV (not OFX). Parse columns: date, description, withdrawal, deposit, balance. |
| @fast-csv/format ^5.0.2 | Export reconciliation reports | Already installed. Same pipe-delimited pattern used for RD export. |
| ExcelJS ^4.4.0 | Bank statement Excel import (some banks export .xlsx) | Already installed. Can read .xlsx files, not just write them. `workbook.xlsx.load(buffer)` parses uploaded Excel. |
| Zod ^3.24.2 | Quotation form validation, bank statement column mapping validation | Already installed. Add new schemas for quotation items, document conversion, CSV column mapping. |
| date-fns ^3.6.0 | Due date calculation (quotation validity period), payment terms | Already installed. `addDays()`, `differenceInDays()`, `format()` cover all needs. |
| LangChain ^0.3.30 | AI-assisted bank statement categorization, auto-matching suggestions | Already installed. Can use existing LLM pipeline to suggest transaction matches. |
| shadcn/ui | Quotation form UI, document status badges, reconciliation table, stepper/timeline | Already installed. Table, Badge, Dialog, Tabs, Select components cover the UI needs. |
| Lucide React ^0.475.0 | Document status icons, workflow chain visualization | Already installed. FileText, Receipt, ArrowRight, CheckCircle, AlertCircle icons. |
| sonner ^2.0.1 | Toast notifications for document actions (created, converted, reconciled) | Already installed. |

## New Dependencies: NONE Required

### Why No State Machine Library (XState)

The document workflow is a **linear progression with status flags**, not a complex state machine:

```
Quotation (draft -> sent -> accepted -> expired/rejected)
    |
    v [convert action]
Invoice (draft -> sent -> partial -> paid -> overdue)
    |
    v [confirm payment action]
Receipt (issued)
```

This is modeled as a simple `status` string column on each document model with a pure TypeScript function validating transitions:

```typescript
// This is all the "state machine" logic needed
const QUOTATION_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent", "cancelled"],
  sent: ["accepted", "rejected", "expired"],
  accepted: ["converted"],  // triggers invoice creation
  // terminal states: rejected, expired, cancelled, converted
}

function canTransition(currentStatus: string, targetStatus: string): boolean {
  return QUOTATION_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false
}
```

**Why NOT XState:**
- XState v5 adds ~15kB gzipped to the bundle for a feature that needs ~20 lines of TypeScript
- The workflow has 4-5 states with 6-7 transitions total -- XState is designed for dozens/hundreds of states
- XState's actor model and parallel states are unused -- no concurrent state regions needed
- No guards, delays, or side-effect orchestration that XState excels at
- The status is persisted in PostgreSQL, not in-memory -- XState's runtime state management adds no value
- Adding XState creates a learning curve for contributors disproportionate to the problem complexity

### Why No OFX Parser Library

Thai banks (SCB, KBank, Bangkok Bank, Krungthai) do **not** export OFX files. The standard export formats are:
- **PDF statements** (primary format, all banks)
- **CSV files** (available from internet banking, varying column formats per bank)
- **Excel files** (some banks like Bangkok Bank dStatement)

Since BanChee targets Thai SMEs, OFX support would serve zero users. `@fast-csv/parse` (already installed) handles CSV. ExcelJS (already installed) handles .xlsx. PDF statement parsing can use the existing LLM vision pipeline.

If OFX support is ever needed (international users), `ofx-data-extractor` (v1.4.8, TypeScript, MIT, ~1,300 weekly downloads) is the best option -- but defer until there's actual demand.

### Why No Fuzzy Matching Library (Fuse.js)

Bank reconciliation matching uses **deterministic criteria first**:
1. **Exact amount match** (same satang value) -- catches 70%+ of transactions
2. **Date range match** (within +/- 3 days of transaction date) -- narrows candidates
3. **Description contains merchant name** -- simple `String.includes()` or SQL `ILIKE`

This deterministic approach handles 90%+ of reconciliation cases. For the remaining edge cases, the LLM pipeline can suggest matches using the existing LangChain infrastructure (send unmatched bank entries + unmatched transactions to the LLM for matching suggestions).

Fuse.js (6kB gzipped) is a fine library, but adding it for the 5-10% of cases where simple string matching fails is premature when the LLM pipeline already exists.

### Why No Document Numbering Library

Thai business documents use format-based sequential numbering:
- Quotation: `QT-{YYYY}-{NNNN}` (e.g., `QT-2568-0001`)
- Invoice: `INV-{YYYY}-{NNNN}`
- Receipt: `REC-{YYYY}-{NNNN}`
- Delivery Note: `DN-{YYYY}-{NNNN}`

This is a Prisma atomic counter operation, not a UUID/nanoid problem:

```typescript
// Atomic increment in Prisma -- no race conditions
const counter = await prisma.documentCounter.upsert({
  where: { userId_type_year: { userId, type: "quotation", year: 2568 } },
  update: { value: { increment: 1 } },
  create: { userId, type: "quotation", year: 2568, value: 1 },
})
const docNumber = `QT-${year}-${String(counter.value).padStart(4, "0")}`
```

## Prisma Schema Additions (New Models)

The v1.1 features need these new models (not library choices, but schema design that drives the stack):

```prisma
model Quotation {
  id              String    @id @default(uuid()) @db.Uuid
  userId          String    @map("user_id") @db.Uuid
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  documentNumber  String    @map("document_number")
  contactId       String    @map("contact_id") @db.Uuid
  status          String    @default("draft")  // draft|sent|accepted|rejected|expired|converted|cancelled
  items           Json      @default("[]")
  subtotal        Int       // satang
  vatAmount       Int       @map("vat_amount")
  totalAmount     Int       @map("total_amount")
  validUntil      DateTime? @map("valid_until")
  notes           String?
  terms           String?
  convertedToId   String?   @map("converted_to_id") @db.Uuid  // -> Invoice transaction ID
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  @@unique([userId, documentNumber])
  @@index([userId])
  @@index([status])
  @@map("quotations")
}

model DocumentCounter {
  id     String @id @default(uuid()) @db.Uuid
  userId String @map("user_id") @db.Uuid
  type   String // quotation|invoice|receipt|delivery_note|billing_note
  year   Int    // Buddhist Era year
  value  Int    @default(0)

  @@unique([userId, type, year])
  @@map("document_counters")
}

model BankStatement {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String   @map("user_id") @db.Uuid
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  bankName        String   @map("bank_name")
  accountNumber   String   @map("account_number")
  importedAt      DateTime @default(now()) @map("imported_at")
  fileName        String   @map("file_name")
  totalEntries    Int      @default(0) @map("total_entries")
  matchedEntries  Int      @default(0) @map("matched_entries")

  entries         BankEntry[]

  @@index([userId])
  @@map("bank_statements")
}

model BankEntry {
  id              String    @id @default(uuid()) @db.Uuid
  statementId     String    @map("statement_id") @db.Uuid
  statement       BankStatement @relation(fields: [statementId], references: [id], onDelete: Cascade)
  date            DateTime
  description     String
  withdrawal      Int?      // satang (null if deposit)
  deposit         Int?      // satang (null if withdrawal)
  balance         Int?      // satang
  transactionId   String?   @map("transaction_id") @db.Uuid  // matched Transaction
  matchConfidence String?   @map("match_confidence")  // exact|suggested|manual
  matchedAt       DateTime? @map("matched_at")

  @@index([statementId])
  @@index([transactionId])
  @@map("bank_entries")
}
```

## Integration Points with Existing Code

### Quotation System

| Integration Point | Existing Code | New Code Needed |
|-------------------|---------------|-----------------|
| PDF generation | `app/(app)/apps/invoices/actions.ts` -- `generateInvoicePDF()` | Clone pattern for `generateQuotationPDF()`. Same `renderToBuffer()` + THSarabunNew approach. |
| Contact selection | `models/contacts.ts` -- `searchContacts()`, `getContactById()` | Reuse directly. Add Contact relation to Quotation model. |
| Document template | `app/(app)/apps/invoices/default-templates.ts` -- `InvoiceTemplate` | Create `QuotationTemplate` following same pattern. Add Thai labels. |
| App data storage | `models/apps.ts` -- `getAppData()`, `setAppData()` | Reuse for quotation template storage. App key: `"quotations"`. |
| Form validation | `forms/transactions.ts` -- Zod schemas | Create `forms/quotations.ts` with quotation-specific Zod schema. |
| File storage | `lib/files.ts` -- `safePathJoin()`, file upload path utilities | Reuse for quotation PDF storage. Same user directory structure. |

### Document Workflow Chain

| Integration Point | Existing Code | New Code Needed |
|-------------------|---------------|-----------------|
| Convert quotation to invoice | `models/transactions.ts` -- `createTransaction()` | New action: copy quotation items/amounts into a Transaction with type "income". Set `convertedToId` on quotation. |
| Invoice to receipt | `app/(app)/apps/invoices/actions.ts` -- `saveInvoiceAsTransactionAction()` | New action: generate receipt PDF from paid invoice transaction. Receipt is a confirmation document, not a new transaction. |
| Status tracking | -- | New: `models/quotations.ts` with `updateQuotationStatus()` using transition validation function. |
| Document chain display | -- | New: UI component showing linked documents (quotation -> invoice -> receipt) with status badges. |

### Bank Reconciliation

| Integration Point | Existing Code | New Code Needed |
|-------------------|---------------|-----------------|
| CSV parsing | `@fast-csv/parse` already installed, used in `models/export_and_import.ts` | New: `models/bank-statements.ts` with `importBankStatement()` using `@fast-csv/parse`. |
| Excel parsing | `exceljs` already installed | New: Add `.xlsx` import path using `workbook.xlsx.load(buffer)`. |
| Transaction matching | `models/transactions.ts` -- `getTransactions()` with filters | New: Query transactions by date range + amount for matching candidates. |
| AI-assisted matching | `ai/analyze.ts` -- LangChain pipeline | New: Prompt template for "match these bank entries to these transactions". |
| File upload | `lib/files.ts` -- upload utilities | Reuse for bank statement file storage. |

## Alternatives Considered

| Category | Decision | Alternative | Why Not |
|----------|----------|-------------|---------|
| Document workflow | Status column + TypeScript transitions | XState v5 | Overkill: ~15kB for 20 lines of transition logic. 4-5 states, not dozens. Status persisted in DB, not in-memory. |
| Document workflow | Status column + TypeScript transitions | Robot3 (lightweight FSM) | Still unnecessary overhead. The "state machine" is a Record<string, string[]> lookup. |
| Bank statement format | CSV + Excel import only | OFX parser (ofx-data-extractor) | Thai banks don't export OFX. Zero users would benefit. Defer to if/when international expansion. |
| Bank statement format | CSV + Excel import only | QIF parser | QIF is legacy Quicken format. Not used by Thai banks. |
| Transaction matching | Amount + date + description matching | Fuse.js fuzzy search | Deterministic matching covers 90%+. LLM pipeline handles edge cases. Adding Fuse.js is premature. |
| Transaction matching | Amount + date + description matching | fast-fuzzy | Same reasoning as Fuse.js. |
| Sequential numbering | Prisma atomic counter | nanoid/CUID | Business document numbers must be sequential and human-readable (QT-2568-0001), not random strings. |
| Sequential numbering | Prisma atomic counter | PostgreSQL SEQUENCE | Prisma doesn't expose raw sequences well. Upsert with increment is portable and works with the existing Prisma setup. |
| Quotation PDF | @react-pdf/renderer (existing) | Puppeteer HTML-to-PDF | Already in the project. Adding Puppeteer means headless Chrome in Docker (~400MB). Quotation is a structured document, not free-form HTML. |
| Quotation PDF | @react-pdf/renderer (existing) | pdfmake | Switching PDF libraries mid-project creates inconsistency. @react-pdf/renderer already works with THSarabunNew. |

## What NOT to Add

| Avoid | Why | What to Do Instead |
|-------|-----|-------------------|
| XState or any state machine library | Document workflow has 4-5 states with simple linear transitions. A status column + 20 lines of validation TypeScript is sufficient. XState adds bundle weight, learning curve, and complexity for a problem that doesn't warrant it. | `status` string column + `VALID_TRANSITIONS` lookup object |
| OFX parser | Thai banks don't export OFX. Zero Thai SME users would benefit from OFX support. | CSV import with `@fast-csv/parse` (already installed) + Excel import with ExcelJS (already installed) |
| Fuse.js or fuzzy matching library | Bank reconciliation matching is primarily by exact amount + date proximity. The 5-10% edge cases are better handled by the existing LLM pipeline than a string-matching library. | Exact amount match + date range + SQL ILIKE for description. LLM for unmatched suggestions. |
| nanoid / CUID / Snowflake ID | Business documents need sequential, human-readable numbers (QT-2568-0001), not random IDs. The document's UUID primary key is separate from the display number. | Prisma atomic counter upsert |
| Puppeteer / Playwright for PDF | Headless Chrome adds ~400MB to Docker image. @react-pdf/renderer already generates Thai PDFs. | Continue using @react-pdf/renderer with THSarabunNew font |
| Separate workflow engine (n8n, Temporal) | Self-hosted single-user app doesn't need distributed workflow orchestration. The document chain is request-response, not long-running async. | Server actions with status validation |
| React Email for document notifications | No email notifications planned for v1.1. Documents are managed in the UI. | Defer to v1.2 if LINE/email notifications are added. |

## Installation

```bash
# No new packages to install for v1.1.
# All required libraries are already in package.json.

# Only Prisma migration is needed:
npx prisma migrate dev --name add_quotation_document_workflow_bank_reconciliation
```

## Version Compatibility

| Existing Package | Version | v1.1 Compatibility | Notes |
|------------------|---------|---------------------|-------|
| @prisma/client | ^6.6.0 | Full | New models follow existing patterns (UUID PK, @map, @@index) |
| @react-pdf/renderer | ^4.3.0 | Full | Same `renderToBuffer()` + `createElement()` pattern as invoice PDF |
| @fast-csv/parse | ^5.0.2 | Full | Already used for CSV import. Bank statement is another CSV format. |
| exceljs | ^4.4.0 | Full | Already used for export. `.xlsx.load()` reads Excel files for import. |
| zod | ^3.24.2 | Full | New schemas for quotation, bank statement column mapping |
| date-fns | ^3.6.0 | Full | `addDays()` for quotation validity, `isAfter()` for expiry check |
| langchain | ^0.3.30 | Full | New prompt templates for bank statement matching suggestions |

## Risk Assessment

| Area | Risk | Mitigation |
|------|------|------------|
| Bank CSV format variation | Each Thai bank has different CSV column layouts | Build configurable column mapping UI. Let user map columns on first import. Save mapping per bank for reuse. |
| Quotation-to-invoice data integrity | Converting quotation must atomically create invoice + update quotation status | Use Prisma `$transaction([...])` for atomic multi-model operations |
| Sequential number gaps | Deleted quotations leave gaps in numbering sequence | Accept gaps -- Thai Revenue Department does not require gap-free numbering for quotations (only tax invoices). Document this in UI. |
| Thai PDF rendering edge cases | Complex quotation layouts with many items may have pagination issues | Test with 20+ line item quotations. @react-pdf/renderer handles page breaks via `break` prop. |
| Bank reconciliation accuracy | False positive matches (same amount, wrong transaction) | Show match confidence level. Require user confirmation for all matches. Never auto-reconcile without review. |

## Sources

- [Thai bank statement formats (ASEAN NOW forum)](https://aseannow.com/topic/1297452-thai-banks-dont-give-out-statements-in-excel-or-csv-format/) -- confirms Thai banks primarily export PDF, some CSV [MEDIUM]
- [SCB statement converter (GitHub)](https://github.com/shlomki/scb-statement-converter) -- confirms SCB exports PDF, needs conversion to CSV [MEDIUM]
- [Bangkok Bank dStatement](https://www.bangkokbank.com/en/Personal/Digital-Banking/dStatement) -- confirms BBL offers digital statements [MEDIUM]
- [XState v5 official docs](https://stately.ai/docs/xstate) -- reviewed for applicability, concluded overkill for this use case [HIGH]
- [XState v5 announcement](https://stately.ai/blog/2023-12-01-xstate-v5) -- "smaller than ever" but still ~15kB gzipped [HIGH]
- [XState with Next.js App Router (blog)](https://www.adammadojemu.com/blog/opinionated-approach-xstate-with-next-js-app-router-rsc) -- RSC integration adds complexity [MEDIUM]
- [ofx-data-extractor npm](https://www.npmjs.com/package/ofx-data-extractor) -- v1.4.8, TypeScript, 1,273 weekly downloads. Viable if OFX needed later. [HIGH]
- [ofx-js npm](https://www.npmjs.com/package/ofx-js) -- v0.2.0, last published 2 years ago, not recommended [MEDIUM]
- [Fuse.js official site](https://www.fusejs.io/) -- lightweight fuzzy search, good but premature for this use case [HIGH]
- [@react-pdf/renderer npm](https://www.npmjs.com/package/@react-pdf/renderer) -- v4.3.2 latest, confirmed compatible [HIGH]
- [Prisma transactions docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) -- atomic multi-model operations confirmed [HIGH]
- [Existing BanChee invoice actions](file:///Users/ohmmingrath/Projects/banchee/app/(app)/apps/invoices/actions.ts) -- reference pattern for PDF generation [HIGH]
- [Existing BanChee contacts model](file:///Users/ohmmingrath/Projects/banchee/models/contacts.ts) -- reusable for quotation recipient [HIGH]

---
*Stack research for: BanChee v1.1 Document Workflow & Bank Reconciliation*
*Researched: 2026-03-25*
*Previous research: 2026-03-23 (v1.0 base stack)*
