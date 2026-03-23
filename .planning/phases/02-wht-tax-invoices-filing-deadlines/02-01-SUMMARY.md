---
phase: 02-wht-tax-invoices-filing-deadlines
plan: 01
subsystem: database, api
tags: [prisma, wht, withholding-tax, thai-holidays, filing-deadlines, zod, date-fns, contacts]

requires:
  - phase: 01-vat-core-thai-localization
    provides: "tax-calculator.ts with extractVATFromTotal, VAT_RATE, satang arithmetic pattern"
provides:
  - "WHT calculator functions (calculateWHT, computeWHTFromTotal, WHT_RATES, WHT_RATE_OPTIONS, WHT_THRESHOLD)"
  - "Filing deadline computation (getDeadlinesForMonth, getNextBusinessDay) with Thai holiday awareness"
  - "Thai holidays service (THAI_HOLIDAYS_2026, getHolidaysForYear)"
  - "Contact Prisma model with CRUD (createContact with upsert, searchContacts, getContactById, getContactsByUserId)"
  - "FilingStatus Prisma model with CRUD (getFilingStatuses, getFilingStatusesForMonth, upsertFilingStatus)"
  - "Contact Zod schema with 13-digit Tax ID validation"
  - "WHT columns on Transaction (wht_rate, wht_amount, wht_type, contact_id)"
  - "FIRST_CLASS_COLUMNS extended with WHT fields"
affects: [02-02, 02-03, 02-04, 02-05]

tech-stack:
  added: []
  patterns:
    - "WHT basis-point arithmetic matching VAT_RATE convention (300 = 3%)"
    - "Holiday-aware business day calculation with date-fns"
    - "Contact upsert on userId+taxId+branch unique constraint"

key-files:
  created:
    - services/thai-holidays.ts
    - services/thai-holidays.test.ts
    - services/filing-deadlines.ts
    - services/filing-deadlines.test.ts
    - models/contacts.ts
    - models/filing-status.ts
    - forms/contacts.ts
    - prisma/migrations/20260323212513_add_wht_contacts_filing/migration.sql
  modified:
    - services/tax-calculator.ts
    - services/tax-calculator.test.ts
    - prisma/schema.prisma
    - models/transactions.ts

key-decisions:
  - "WHT uses same basis-point convention as VAT (300 = 3%) for consistency across tax calculator"
  - "WHT threshold enforced at 100,000 satang (1,000 THB) -- below returns zero WHT per Revenue Dept rules"
  - "Contact model uses upsert on userId+taxId+branch composite unique -- prevents duplicates during inline creation"
  - "Filing deadlines compute in next month with getNextBusinessDay skipping weekends and holidays"
  - "Holiday data is year-keyed (getHolidaysForYear) allowing future year additions without code changes"

patterns-established:
  - "Pure function service pattern: services/thai-holidays.ts exports data + getter, no side effects"
  - "Filing deadline computation: getDeadlinesForMonth returns typed array with paper/e-filing/adjusted dates"
  - "Contact CRUD follows existing model pattern: userId as first param, prisma queries, typed returns"

requirements-completed: [WHT-01, WHT-02, INV-04, FILE-01, FILE-04]

duration: 8min
completed: 2026-03-23
---

# Phase 2 Plan 1: Schema Foundation Summary

**WHT calculator with basis-point arithmetic, Contact/FilingStatus Prisma models, filing deadline computation with Thai 2026 holiday awareness**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-23T14:19:31Z
- **Completed:** 2026-03-23T14:27:39Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- WHT calculator correctly computes on pre-VAT base with 1,000 THB threshold, using same basis-point pattern as existing VAT calculator
- Filing deadline service returns PP30/PND3/PND53 deadlines with automatic weekend and Thai public holiday adjustment
- Contact and FilingStatus Prisma models with full CRUD, migration SQL, and Zod validation schema
- All 59 tests pass (14 existing VAT + 36 new WHT/holiday/deadline + 9 existing thai-date)

## Task Commits

Each task was committed atomically:

1. **Task 1: WHT calculator functions with TDD + Thai holidays + filing deadline services** - `02c3b77` (feat)
2. **Task 2: Prisma schema + Contact/FilingStatus models + WHT columns + Zod + FIRST_CLASS_COLUMNS** - `279d14d` (feat)

## Files Created/Modified
- `services/tax-calculator.ts` - Extended with WHT_RATES, WHT_RATE_OPTIONS, WHT_THRESHOLD, calculateWHT, computeWHTFromTotal
- `services/tax-calculator.test.ts` - Added 16 WHT tests covering rates, threshold, chaining
- `services/thai-holidays.ts` - All 22 Thai public holidays for 2026 with year-keyed getter
- `services/thai-holidays.test.ts` - 8 tests for holiday data completeness and getter
- `services/filing-deadlines.ts` - PP30/PND3/PND53 deadline computation with getNextBusinessDay
- `services/filing-deadlines.test.ts` - 12 tests for deadlines, weekend/holiday adjustment, year rollover
- `prisma/schema.prisma` - Added Contact model, FilingStatus model, WHT columns on Transaction, whtType index
- `prisma/migrations/20260323212513_add_wht_contacts_filing/migration.sql` - DDL for all schema changes
- `models/contacts.ts` - Contact CRUD with upsert on composite unique key
- `models/filing-status.ts` - FilingStatus CRUD with upsert per form per month
- `forms/contacts.ts` - Zod schema with 13-digit Tax ID validation and Thai error messages
- `models/transactions.ts` - Added WHT fields to TransactionData type and FIRST_CLASS_COLUMNS set

## Decisions Made
- WHT uses same basis-point convention as VAT (300 = 3%) for consistency across the tax calculator
- WHT threshold enforced at 100,000 satang (1,000 THB) per Revenue Dept rules -- amounts below return zero WHT
- Contact model uses upsert on userId+taxId+branch composite unique to prevent duplicates during inline creation
- Holiday data is year-keyed via getHolidaysForYear switch -- adding 2027 holidays requires only a new case, no structural changes
- Filing deadlines always use e-filing dates as the adjusted baseline (not paper deadlines) since BanChee targets e-filing users

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all functions are fully implemented with real data (holiday list, WHT rates, filing dates).

## Next Phase Readiness
- WHT calculator ready for Plan 02-02 (WHT recording in transaction forms + AI integration)
- Contact model ready for Plan 02-03 (50 Tawi certificate generation) and Plan 02-04 (tax invoice creation)
- Filing deadline service ready for Plan 02-05 (dashboard deadline widgets + filing status tracker)
- All Prisma schema changes ready -- migration SQL included for deployment

## Self-Check: PASSED

All 7 created files verified on disk. Both task commits (02c3b77, 279d14d) verified in git log.

---
*Phase: 02-wht-tax-invoices-filing-deadlines*
*Completed: 2026-03-23*
