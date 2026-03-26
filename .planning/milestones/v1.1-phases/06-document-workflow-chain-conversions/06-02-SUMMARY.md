---
phase: 06-document-workflow-chain-conversions
plan: 02
subsystem: ui, api
tags: [invoice, pdf, thai-pdf, document-workflow, conversion, overdue-detection, status-machine]

# Dependency graph
requires:
  - phase: 06-01
    provides: "Document model, forms/invoice.ts schema, document-workflow service with INVOICE_STATUSES and getEffectiveInvoiceStatus, createDocumentFromSource"
  - phase: 05
    provides: "Quotation CRUD pattern (actions, form, list, detail, PDF), StatusBadge, THSarabunNew fonts"
provides:
  - "Invoice CRUD: standalone create with line items, VAT, dueDate"
  - "One-click quotation-to-invoice conversion (convertQuotationToInvoiceAction)"
  - "Invoice PDF with THSarabunNew titled 'ใบแจ้งหนี้ / INVOICE'"
  - "Invoice detail page with overdue detection, payment status, chain links"
  - "Invoice list with lazy overdue detection via getEffectiveInvoiceStatus"
  - "Conversion button stubs for receipt and delivery note (Plan 03)"
  - "StatusBadge extended to ALL_DOCUMENT_STATUSES for cross-doc-type support"
affects: [06-03, 06-04, 06-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Invoice form uses dueDate date input instead of validityDays number input"
    - "Conversion action pattern: validate source -> prisma.$transaction -> createDocumentFromSource + update source status -> redirect"
    - "NEXT_REDIRECT re-throw pattern in conversion actions (Pitfall 1)"
    - "Lazy overdue detection: getEffectiveInvoiceStatus computes display status without DB write"
    - "Payment progress bar: inline CSS width percentage from totalPaid/total ratio"

key-files:
  created:
    - "app/(app)/apps/invoice/manifest.ts"
    - "app/(app)/apps/invoice/actions.ts"
    - "app/(app)/apps/invoice/page.tsx"
    - "app/(app)/apps/invoice/components/invoice-form.tsx"
    - "app/(app)/apps/invoice/components/invoice-list.tsx"
    - "app/(app)/apps/invoice/components/invoice-preview.tsx"
    - "app/(app)/apps/invoice/components/invoice-pdf.tsx"
    - "app/(app)/apps/invoice/[id]/page.tsx"
    - "app/(app)/apps/invoice/[id]/detail-actions.tsx"
  modified:
    - "app/(app)/apps/quotation/components/status-badge.tsx"
    - "models/documents.ts"

key-decisions:
  - "Conversion buttons use toast placeholder instead of stub server action imports -- avoids broken imports before Plan 03 creates receipt/delivery-note apps"
  - "StatusBadge extended to ALL_DOCUMENT_STATUSES rather than creating invoice-specific badge -- single component reused across all document types"
  - "Payment progress bar implemented inline (CSS width) rather than shadcn Progress component -- simpler, no additional import needed"

patterns-established:
  - "Invoice form pattern: dueDate replaces validityDays, date input with default today+30"
  - "Conversion button pattern: form with hidden sourceDocumentId, formAction to conversion server action, redirect on success"
  - "Payment status card: progress bar + linked receipt list with remaining balance"

requirements-completed: [QUOT-06, DOC-02, DOC-05, DOC-06]

# Metrics
duration: 12min
completed: 2026-03-26
---

# Phase 06 Plan 02: Invoice App Summary

**Complete invoice CRUD with standalone create, quotation-to-invoice conversion, THSarabunNew PDF, overdue detection, payment status tracking, and conversion buttons to receipt/delivery note**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-26T04:53:42Z
- **Completed:** 2026-03-26T05:05:42Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Full invoice app with standalone create (line items, contact, VAT, discounts, dueDate) and one-click quotation-to-invoice conversion
- Invoice PDF renders with THSarabunNew, titled "ใบแจ้งหนี้ / INVOICE", includes due date row and payment terms section
- Invoice detail page with lazy overdue detection (red text), payment status card with progress bar and linked receipts, related documents chain
- Conversion buttons for "สร้างใบเสร็จ" and "สร้างใบส่งของ" present with placeholder behavior (actual actions in Plan 03)
- StatusBadge upgraded from QUOTATION_STATUSES to ALL_DOCUMENT_STATUSES for universal document type support

## Task Commits

Each task was committed atomically:

1. **Task 1: Invoice server actions + form + list components** - `6eae57c` (feat)
2. **Task 2: Invoice detail page + PDF template + detail actions** - `01e6807` (feat)

## Files Created/Modified
- `app/(app)/apps/invoice/manifest.ts` - Invoice app manifest (code, name, icon)
- `app/(app)/apps/invoice/actions.ts` - Three server actions: createInvoiceAction, convertQuotationToInvoiceAction, updateInvoiceStatusAction
- `app/(app)/apps/invoice/page.tsx` - Server component with business profile gate, invoice list + form
- `app/(app)/apps/invoice/components/invoice-form.tsx` - Clone of quotation form with dueDate replacing validityDays
- `app/(app)/apps/invoice/components/invoice-list.tsx` - Table with INVOICE_STATUSES and lazy overdue detection
- `app/(app)/apps/invoice/components/invoice-preview.tsx` - Success dialog after creating invoice
- `app/(app)/apps/invoice/components/invoice-pdf.tsx` - Full PDF with THSarabunNew, due date, payment terms, signature area
- `app/(app)/apps/invoice/[id]/page.tsx` - Detail page with overdue detection, payment status, chain links
- `app/(app)/apps/invoice/[id]/detail-actions.tsx` - Status transitions, PDF download, conversion buttons
- `app/(app)/apps/quotation/components/status-badge.tsx` - Extended to ALL_DOCUMENT_STATUSES
- `models/documents.ts` - Fixed Prisma JSON type cast (unknown[] -> any)

## Decisions Made
- Conversion buttons use toast placeholder instead of stub imports -- avoids broken imports before Plan 03
- StatusBadge extended to ALL_DOCUMENT_STATUSES rather than creating separate invoice-specific badge
- Payment progress bar uses inline CSS width rather than importing shadcn Progress component

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Prisma items JSON type cast in models/documents.ts**
- **Found during:** Task 1 (build verification)
- **Issue:** `items: input.items as unknown[]` failed TypeScript strict check -- `unknown[]` not assignable to Prisma's `InputJsonValue`
- **Fix:** Changed cast to `as any` for both createDocument and createDocumentFromSource
- **Files modified:** models/documents.ts
- **Verification:** Build passes
- **Committed in:** 6eae57c (Task 1 commit)

**2. [Rule 3 - Blocking] Extended StatusBadge to support all document type statuses**
- **Found during:** Task 1 (invoice list needs StatusBadge for overdue/paid)
- **Issue:** StatusBadge only imported QUOTATION_STATUSES -- missing overdue, paid, confirmed, delivered labels
- **Fix:** Changed import to ALL_DOCUMENT_STATUSES, added STATUS_STYLES entries for overdue, paid, confirmed, delivered
- **Files modified:** app/(app)/apps/quotation/components/status-badge.tsx
- **Verification:** Build passes, badge renders correctly for all status types
- **Committed in:** 6eae57c (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Known Stubs

1. **Conversion button: "สร้างใบเสร็จ"** -- `app/(app)/apps/invoice/[id]/detail-actions.tsx`, line ~169. Shows toast "ฟังก์ชันนี้จะพร้อมใช้งานใน Plan 03". **Intentional** -- actual createReceiptFromInvoiceAction created in Plan 03.
2. **Conversion button: "สร้างใบส่งของ"** -- `app/(app)/apps/invoice/[id]/detail-actions.tsx`, line ~184. Shows toast placeholder. **Intentional** -- actual createDeliveryNoteFromSourceAction created in Plan 03.

These stubs do NOT prevent the plan's goal (invoice CRUD + PDF + detail) from being achieved. The buttons are visible and correctly conditioned; they will be wired to actual server actions when Plan 03 creates receipt and delivery note apps.

## Issues Encountered
None beyond the auto-fixed items above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Invoice app fully functional for standalone create and quotation conversion
- Receipt and delivery note apps (Plan 03) can use the established conversion button pattern
- Plan 03 needs to replace the toast placeholders with actual conversion server actions
- Payment status card is ready to display receipt data once receipts are created

## Self-Check: PASSED

All 9 created files verified present on disk. Both task commits (6eae57c, 01e6807) verified in git log.

---
*Phase: 06-document-workflow-chain-conversions*
*Completed: 2026-03-26*
