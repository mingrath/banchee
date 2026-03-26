---
phase: 05-document-model-quotation-system
plan: 02
subsystem: api
tags: [zod, server-actions, quotation, formdata, satang, vat, document-model]

requires:
  - phase: 05-document-model-quotation-system
    plan: 01
    provides: "Document Prisma model, CRUD layer (createDocument, listDocuments, updateDocumentStatus), QuotationLineItem/QuotationData types, document-workflow service"
provides:
  - "Zod validation schema for quotation form (quotationFormSchema)"
  - "QuotationFormValues type"
  - "App manifest for quotation sidebar registration"
  - "createQuotationAction server action with baht-to-satang conversion, VAT computation, seller/buyer snapshot"
  - "updateQuotationStatusAction server action delegating to state machine"
  - "listQuotationsAction server action filtered by QUOTATION type"
affects: [05-03, 05-04, 06-document-chain]

tech-stack:
  added: []
  patterns: ["FormData.getAll() for dynamic line item arrays", "Baht-to-satang conversion at action boundary (Math.round(parseFloat() * 100))", "Overall discount applied before VAT computation"]

key-files:
  created:
    - "forms/quotation.ts"
    - "app/(app)/apps/quotation/manifest.ts"
    - "app/(app)/apps/quotation/actions.ts"
  modified: []

key-decisions:
  - "Line items parsed from FormData.getAll() separately from Zod scalar validation -- Zod cannot handle dynamic array indices from FormData natively"
  - "Baht-to-satang conversion happens at the action boundary (not in form or model) -- consistent with tax-invoice pattern"
  - "Computation order: per-item amounts -> subtotal -> overall discount -> VAT on discounted subtotal -> total"

patterns-established:
  - "Quotation action pattern: validate scalars with Zod, parse line items from FormData.getAll(), convert currency at boundary, compute totals, snapshot seller/buyer, persist via Document model"
  - "App manifest pattern: code + Thai name + description + Lucide icon for sidebar registration"

requirements-completed: [QUOT-01, QUOT-03]

duration: 3min
completed: 2026-03-26
---

# Phase 05 Plan 02: Quotation Form Schema and Server Actions Summary

**Zod schema validating quotation form fields with Thai messages, plus three server actions (create with baht-to-satang conversion and VAT computation, updateStatus via state machine, list filtered by QUOTATION type)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-26T01:48:01Z
- **Completed:** 2026-03-26T01:50:38Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Zod schema validates contactId, issuedAt, validityDays, paymentTerms, includeVat, overallDiscount, note with Thai error messages
- createQuotationAction handles end-to-end flow: FormData parsing, Zod validation, dynamic line item extraction, baht-to-satang conversion at boundary, per-item and overall discount computation, VAT toggle, seller/buyer data snapshot, Document model persistence via createDocument
- updateQuotationStatusAction delegates to updateDocumentStatus which enforces the QUOTATION state machine transitions
- listQuotationsAction filters documents by QUOTATION type for the quotation list page
- App manifest registers quotation app with Thai name and FileText icon for sidebar

## Task Commits

Each task was committed atomically:

1. **Task 1: Zod schema + app manifest** - `1e770ef` (feat)
2. **Task 2: Quotation server actions (create, updateStatus, list)** - `99e46c9` (feat)

## Files Created/Modified
- `forms/quotation.ts` - Zod schema validating quotation form scalar fields with Thai error messages
- `app/(app)/apps/quotation/manifest.ts` - App manifest with code "quotation", Thai name, FileText icon
- `app/(app)/apps/quotation/actions.ts` - Three server actions: createQuotationAction, updateQuotationStatusAction, listQuotationsAction

## Decisions Made
- Line items parsed via FormData.getAll() separately from Zod schema validation, matching the existing tax-invoice/actions.ts pattern -- Zod cannot natively handle repeated FormData keys with dynamic indices
- Baht-to-satang conversion uses Math.round(parseFloat(value) * 100) at the action boundary, preventing the satang double-division pitfall identified in v1.1 research
- Total computation follows strict order: per-item amounts -> subtotal -> overall discount -> VAT on discounted subtotal -> total, ensuring VAT is computed on the correct base

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered
None.

## Known Stubs
None -- all three server actions are fully implemented with real logic, proper imports, and wired data sources.

## User Setup Required
None -- no external service configuration required.

## Next Phase Readiness
- Server actions ready for quotation form UI (Plan 05-03) via useActionState
- Manifest ready for sidebar registration
- createQuotationAction returns QuotationData for immediate PDF preview after creation
- updateQuotationStatusAction ready for status badge/button UI integration

---
*Phase: 05-document-model-quotation-system*
*Completed: 2026-03-26*
