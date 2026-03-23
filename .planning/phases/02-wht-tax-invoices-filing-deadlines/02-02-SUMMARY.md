---
phase: 02-wht-tax-invoices-filing-deadlines
plan: 02
subsystem: ai, ui
tags: [wht, withholding-tax, llm-prompt, structured-output, zod, analyze-form]

# Dependency graph
requires:
  - phase: 02-01
    provides: "WHT_RATE_OPTIONS, calculateWHT, FIRST_CLASS_COLUMNS with WHT fields, TransactionData with WHT fields"
provides:
  - "AI prompt with WHT rate suggestion instructions for 5 rate tiers"
  - "DEFAULT_FIELDS with wht_rate, wht_service_type, wht_type for LLM structured output"
  - "Analyze form WHT section with rate dropdown and auto-computed amount"
  - "Transaction Zod schema with whtRate, whtAmount, whtType, contactId"
affects: [02-03, 02-04, 02-05]

# Tech tracking
tech-stack:
  added: []
  patterns: ["AI prompt WHT rate suggestion with basis-point values", "Hidden form inputs for computed WHT values"]

key-files:
  created: []
  modified:
    - models/defaults.ts
    - components/unsorted/analyze-form.tsx
    - forms/transactions.ts

key-decisions:
  - "WHT section only shown for expense transactions (not income/sales)"
  - "WHT amount auto-computed from subtotal * rate on both AI result and manual rate change"
  - "wht_service_type stored as extra field (isExtra: true), wht_rate and wht_type as first-class columns"
  - "No changes needed to ai/schema.ts -- fieldsToJsonSchema auto-includes fields with llm_prompt"

patterns-established:
  - "AI WHT suggestion: prompt instructs LLM to return wht_rate in basis points, wht_service_type, wht_type"
  - "Hidden inputs for computed values: whtRate and whtAmount passed as hidden form fields"

requirements-completed: [SCAN-04]

# Metrics
duration: 4min
completed: 2026-03-23
---

# Phase 02 Plan 02: AI WHT Rate Auto-Suggestion Summary

**AI receipt scanning now suggests WHT rate (1-10%) per service type, shown in analyze form with user-editable dropdown and auto-computed amount**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-23T14:31:44Z
- **Completed:** 2026-03-23T14:35:44Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- AI prompt extended with WHT rate suggestion instructions covering all 5 rate tiers (1-10%)
- Three new WHT fields (wht_rate, wht_service_type, wht_type) added to DEFAULT_FIELDS with LLM prompts
- Analyze form shows WHT rate dropdown pre-filled by AI, with auto-computed WHT amount display
- Transaction Zod schema extended with whtRate, whtAmount, whtType, contactId for database persistence

## Task Commits

Each task was committed atomically:

1. **Task 1: AI prompt WHT extension + default fields + schema output** - `c19b978` (feat)
2. **Task 2: Analyze form WHT display + transaction Zod schema + save action WHT fields** - `08cd1a8` (feat)

## Files Created/Modified
- `models/defaults.ts` - Added WHT rate suggestion paragraph to AI prompt and 3 WHT field definitions to DEFAULT_FIELDS
- `components/unsorted/analyze-form.tsx` - Added WHT section with Select dropdown, auto-compute, whtType selector, hidden inputs
- `forms/transactions.ts` - Added whtRate, whtAmount, whtType, contactId to Zod transaction schema

## Decisions Made
- WHT section only rendered when transaction type is "expense" -- services that need WHT are always expenses
- WHT amount auto-computed both during AI analysis mapping and on manual rate change via Select
- wht_service_type uses isExtra: true (goes to extra JSON column) since it has no Prisma column; wht_rate and wht_type use isExtra: false (first-class columns)
- No changes to ai/schema.ts needed -- fieldsToJsonSchema automatically includes any field with a truthy llm_prompt value
- No changes to transaction actions needed -- FIRST_CLASS_COLUMNS already includes WHT fields from Plan 01

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all WHT fields are wired from AI output through form state to database persistence.

## Next Phase Readiness
- WHT data now persists on transactions, ready for Plan 03 (WHT certificate generation)
- Contact model (from Plan 01) can be linked via contactId field in Zod schema
- Filing deadline tracker (Plan 04) can query transactions with whtType for PND3/PND53 grouping

## Self-Check: PASSED

All files exist. All commits verified.

---
*Phase: 02-wht-tax-invoices-filing-deadlines*
*Completed: 2026-03-23*
