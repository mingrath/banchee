---
phase: 05-document-model-quotation-system
plan: 03
subsystem: ui
tags: [react-pdf, pdf, thai-font, quotation, status-badge, shadcn]

# Dependency graph
requires:
  - phase: 05-document-model-quotation-system
    provides: "QuotationData type, QUOTATION_STATUSES, document-workflow.ts"
provides:
  - "QuotationPDF component for rendering A4 quotation PDFs with THSarabunNew"
  - "StatusBadge component mapping 7 quotation statuses to Thai labels and colors"
affects: [05-04-PLAN, phase-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PDF formatAmount() local helper for satang-to-baht display"
    - "Module-level registerThaiFonts() for font registration before component render"
    - "StatusBadge with dark mode via dark: Tailwind variants"

key-files:
  created:
    - app/(app)/apps/quotation/components/quotation-pdf.tsx
    - app/(app)/apps/quotation/components/status-badge.tsx
  modified: []

key-decisions:
  - "Used local formatAmount with direct satang/100 division instead of importing formatSatangToDisplay for PDF self-containment"
  - "StatusBadge uses variant='outline' base with className color overrides for clean semantic styling"

patterns-established:
  - "Quotation PDF layout: 11-section A4 template matching tax-invoice-pdf pattern"
  - "Status badge pattern: reusable across document types via status-to-style mapping"

requirements-completed: [QUOT-04, QUOT-05]

# Metrics
duration: 3min
completed: 2026-03-26
---

# Phase 05 Plan 03: PDF Template & StatusBadge Summary

**QuotationPDF with THSarabunNew rendering 11-section A4 layout plus StatusBadge mapping 7 statuses to Thai labels with dark mode**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-26T01:48:02Z
- **Completed:** 2026-03-26T01:51:32Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- QuotationPDF renders complete A4 document: company header with optional logo, bilingual title, document info, party boxes, 7-column line items table, conditional discount/VAT totals, validity note, note section, dual signature blocks, BanChee footer
- StatusBadge maps all 7 quotation statuses (draft, sent, accepted, rejected, expired, converted, voided) to correct Thai labels and semantic colors with dark mode support
- THSarabunNew font registered at module level preventing Pitfall 6 (empty boxes)
- All PDF amounts use formatAmount() with satang/100 preventing Pitfall 1 (double-division)

## Task Commits

Each task was committed atomically:

1. **Task 1: Quotation PDF template with THSarabunNew** - `99e46c9` (feat)
2. **Task 2: StatusBadge component for quotation statuses** - `78baaa0` (feat)

**Plan metadata:** [pending] (docs: complete plan)

## Files Created/Modified
- `app/(app)/apps/quotation/components/quotation-pdf.tsx` - A4 PDF template with 11 sections: company header, title, doc info, HR, party boxes, 7-column items table, totals, validity note, note, signatures, footer
- `app/(app)/apps/quotation/components/status-badge.tsx` - Client component mapping quotation status to Thai label and semantic color badge

## Decisions Made
- Used local formatAmount() with direct satang/100 instead of importing formatSatangToDisplay -- keeps PDF component self-contained and matches plan's acceptance criteria requiring "/ 100" in formatAmount
- StatusBadge uses Badge variant="outline" as base with className overrides for semantic colors -- this gives a clean border while allowing full background/text color control per status

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- QuotationPDF and StatusBadge are ready for integration in Plan 04 (quotation list and detail pages)
- Both components depend only on types from Plan 01 (document-workflow.ts) which is already complete
- No blockers for Plan 04

## Self-Check: PASSED

All files verified on disk, all commits verified in git log.

---
*Phase: 05-document-model-quotation-system*
*Completed: 2026-03-26*
