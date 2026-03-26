---
phase: 06-document-workflow-chain-conversions
plan: 04
subsystem: ui
tags: [next.js, react, shadcn, document-workflow, chain-badges, filters, payment-progress]

# Dependency graph
requires:
  - phase: 06-01
    provides: Document model, listDocumentsWithChain, document-workflow service
  - phase: 06-02
    provides: Invoice form, InvoiceDetailActions, invoice detail page
  - phase: 06-03
    provides: Receipt and delivery-note actions, receipt creation, delivery note creation
provides:
  - Unified document list page at /apps/documents with all document types
  - ChainBadges component showing linked documents as clickable badges
  - DocumentFilters component with type, status, and date range filtering
  - Generic StatusBadge accepting any statusMap
  - PaymentProgressBar component for invoice payment tracking
  - Quotation-to-invoice and quotation-to-delivery-note conversion buttons
affects: [06-05, unified-document-view, document-workflow-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [client-side-filtering, chain-badge-navigation, generic-status-badge]

key-files:
  created:
    - app/(app)/apps/documents/manifest.ts
    - app/(app)/apps/documents/page.tsx
    - app/(app)/apps/documents/components/document-table.tsx
    - app/(app)/apps/documents/components/chain-badges.tsx
    - app/(app)/apps/documents/components/document-filters.tsx
    - app/(app)/apps/documents/components/status-badge.tsx
    - app/(app)/apps/invoice/components/payment-progress-bar.tsx
  modified:
    - app/(app)/apps/quotation/[id]/detail-actions.tsx
    - app/(app)/apps/invoice/[id]/page.tsx

key-decisions:
  - "Client-side filtering for unified document list -- small dataset, avoids server round-trips"
  - "Generic StatusBadge accepts optional statusMap prop, defaults to ALL_DOCUMENT_STATUSES"
  - "ChainBadges abbreviate doc numbers (QT-2568-0001 -> QT-0001) for compact display"
  - "PaymentProgressBar uses inline CSS width rather than shadcn Progress (consistent with existing pattern)"

patterns-established:
  - "Generic StatusBadge pattern: accepts any status map, defaults to all-document union"
  - "Chain badge navigation: source -> current -> derived with ArrowRight separator"
  - "Document type badge colors: slate(QT), blue(INV), green(RCT), amber(DLV)"

requirements-completed: [DOC-08, QUOT-06]

# Metrics
duration: 6min
completed: 2026-03-26
---

# Phase 06 Plan 04: Unified Document List, Chain Badges, Conversion Buttons, and Payment Progress

**Unified /apps/documents page with chain badges, type/status/date filters, quotation conversion buttons, and invoice payment progress bar**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-26T05:20:35Z
- **Completed:** 2026-03-26T05:27:05Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Built unified document list page showing all document types (quotation, invoice, receipt, delivery note) in one table with client-side filtering
- Created chain badges component displaying linked documents as clickable navigation badges (QT -> INV -> RCT)
- Added quotation conversion buttons: "create invoice" when accepted, "create delivery note" when accepted or converted
- Created reusable PaymentProgressBar component and wired it into the invoice detail page with sumReceiptAmountsForInvoice

## Task Commits

Each task was committed atomically:

1. **Task 1: Unified document list page with chain badges and filters** - `4e48e3d` (feat)
2. **Task 2: Quotation conversion buttons + invoice payment progress bar** - `3934e2f` (feat)

## Files Created/Modified
- `app/(app)/apps/documents/manifest.ts` - App registration for unified document list
- `app/(app)/apps/documents/page.tsx` - Server component querying listDocumentsWithChain
- `app/(app)/apps/documents/components/document-table.tsx` - Client table with filtering, row navigation, chain badges
- `app/(app)/apps/documents/components/chain-badges.tsx` - Clickable linked document badges with ArrowRight separator
- `app/(app)/apps/documents/components/document-filters.tsx` - Type, status, date range filter row
- `app/(app)/apps/documents/components/status-badge.tsx` - Generic StatusBadge with optional statusMap prop
- `app/(app)/apps/invoice/components/payment-progress-bar.tsx` - Payment progress with paid/remaining labels, overdue indicator
- `app/(app)/apps/quotation/[id]/detail-actions.tsx` - Added conversion buttons for invoice and delivery note
- `app/(app)/apps/invoice/[id]/page.tsx` - Replaced inline progress with PaymentProgressBar, uses sumReceiptAmountsForInvoice

## Decisions Made
- Client-side filtering chosen for unified list because dataset is small and avoids server round-trips
- Generic StatusBadge defaults to ALL_DOCUMENT_STATUSES but accepts custom map for flexibility
- ChainBadges abbreviate document numbers for compact display in table cells
- PaymentProgressBar continues using inline CSS width pattern established in Plan 02 (not shadcn Progress component)
- Conversion buttons use form action pattern with hidden sourceDocumentId input for server action compatibility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All document types now visible in unified list with chain navigation
- Quotation conversion flow complete: accepted quotation can create invoice or delivery note
- Invoice payment tracking fully wired with PaymentProgressBar and sumReceiptAmountsForInvoice
- Ready for Plan 05 (final phase plan)

---
*Phase: 06-document-workflow-chain-conversions*
*Completed: 2026-03-26*
