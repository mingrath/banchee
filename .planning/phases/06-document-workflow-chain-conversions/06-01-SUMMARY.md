---
phase: 06-document-workflow-chain-conversions
plan: 01
subsystem: database, api
tags: [prisma, vitest, zod, status-machine, document-chain, tdd]

# Dependency graph
requires:
  - phase: 05-document-model-quotation-system
    provides: Document Prisma model, createDocument(), canTransition(), QUOTATION status machine
provides:
  - INVOICE_STATUSES, RECEIPT_STATUSES, DELIVERY_NOTE_STATUSES status maps with Thai labels
  - VALID_TRANSITIONS for INVOICE, RECEIPT, DELIVERY_NOTE document types
  - getEffectiveInvoiceStatus() for lazy overdue detection
  - createDocumentFromSource() for atomic document conversion with data copying
  - getDocumentsBySourceId() for chain-linked document retrieval
  - sumReceiptAmountsForInvoice() with voided receipt exclusion
  - listDocumentsWithChain() with sourceDocument/derivedDocuments relations
  - Invoice Zod schema (invoiceFormSchema) with dueDate field
  - Schema migration adding dueDate, paymentMethod, paymentDate, paidAmount columns to Document
affects: [06-02, 06-03, 06-04, 06-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [display-only-status (overdue), aggregate-with-exclusion (voided receipts), source-document-copy-pattern]

key-files:
  created:
    - forms/invoice.ts
    - prisma/migrations/20260326044821_add_invoice_receipt_fields/migration.sql
  modified:
    - prisma/schema.prisma
    - services/document-workflow.ts
    - services/__tests__/document-workflow.test.ts
    - models/documents.ts
    - models/__tests__/documents.test.ts

key-decisions:
  - "overdue is display-only status -- not stored in DB, computed lazily via getEffectiveInvoiceStatus()"
  - "createDocumentFromSource does NOT update source status -- caller handles that for reusability"
  - "sumReceiptAmountsForInvoice uses Prisma aggregate with status not voided filter"
  - "Invoice form uses dueDate instead of validityDays (invoices don't expire, they have payment deadlines)"

patterns-established:
  - "Display-only status: getEffectiveInvoiceStatus() computes overdue without DB state"
  - "Source copy pattern: createDocumentFromSource() copies all data from source with overrides"
  - "Aggregate exclusion: sumReceiptAmountsForInvoice() uses status not voided for correct totals"

requirements-completed: [DOC-05, DOC-02, DOC-03, DOC-04]

# Metrics
duration: 4min
completed: 2026-03-26
---

# Phase 06 Plan 01: Document Workflow Chain Conversions Summary

**Invoice/receipt/delivery note status machines with lazy overdue detection, atomic document conversion, chain queries, and invoice Zod schema -- all via TDD**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-26T04:46:43Z
- **Completed:** 2026-03-26T04:51:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- INVOICE (5 statuses), RECEIPT (3 statuses), DELIVERY_NOTE (3 statuses) status maps with Thai labels matching UI spec
- VALID_TRANSITIONS for all three new document types enforced by existing canTransition()
- getEffectiveInvoiceStatus() handles lazy overdue detection (display-only, not a DB status)
- Schema migration adds dueDate, paymentMethod, paymentDate, paidAmount nullable columns to Document
- createDocumentFromSource() atomically creates child documents with full data copying
- sumReceiptAmountsForInvoice() correctly excludes voided receipts
- listDocumentsWithChain() returns documents with source/derived relations for chain badge display
- Invoice Zod schema validates contactId, issuedAt, dueDate (replaces validityDays)
- 70 tests passing (48 workflow + 22 model)

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration + status machines + status maps** - `d7357c7` (feat)
2. **Task 2: Conversion model functions + chain queries + invoice Zod schema** - `9ef2012` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added dueDate, paymentMethod, paymentDate, paidAmount nullable columns to Document model
- `prisma/migrations/20260326044821_add_invoice_receipt_fields/migration.sql` - Migration SQL for new columns
- `services/document-workflow.ts` - Added INVOICE_STATUSES, RECEIPT_STATUSES, DELIVERY_NOTE_STATUSES, VALID_TRANSITIONS entries, getEffectiveInvoiceStatus(), ALL_DOCUMENT_STATUSES
- `services/__tests__/document-workflow.test.ts` - 18 new tests for status transitions, status maps, and getEffectiveInvoiceStatus
- `models/documents.ts` - Added createDocumentFromSource(), getDocumentsBySourceId(), sumReceiptAmountsForInvoice(), listDocumentsWithChain(), extended CreateDocumentInput type
- `models/__tests__/documents.test.ts` - 11 new tests for conversion, chain queries, and aggregate functions
- `forms/invoice.ts` - Invoice Zod schema with dueDate field

## Decisions Made
- **Overdue is display-only:** Not stored in DB, computed lazily by getEffectiveInvoiceStatus() when status is "sent" and dueDate is past. Avoids cron job complexity for v1.1.
- **createDocumentFromSource does NOT update source status:** Keeps function reusable -- the caller (server action) handles source status transitions separately for flexibility.
- **Invoice form uses dueDate instead of validityDays:** Invoices have payment deadlines, not expiry. dueDate is a required field in the form schema.
- **Aggregate exclusion for receipts:** sumReceiptAmountsForInvoice uses `status: { not: "voided" }` to exclude voided receipts from totals, per Pitfall 3 in research.

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness
- Status machines and transitions ready for invoice CRUD (plan 06-02)
- createDocumentFromSource() ready for conversion actions (plan 06-03)
- sumReceiptAmountsForInvoice() ready for receipt creation with auto-paid detection (plan 06-03)
- listDocumentsWithChain() ready for unified document list page (plan 06-05)
- Invoice form schema ready for invoice form component (plan 06-02)

## Self-Check: PASSED

All 7 files verified present. Both commit hashes (d7357c7, 9ef2012) found in git log. 70 tests passing.

---
*Phase: 06-document-workflow-chain-conversions*
*Completed: 2026-03-26*
