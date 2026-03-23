---
phase: 01-thai-foundation-vat-compliance
plan: 04
subsystem: ui, database
tags: [vat, dashboard, prisma-aggregate, middleware, thai-i18n, shadcn]

# Dependency graph
requires:
  - phase: 01-01
    provides: "VAT columns in Prisma schema (vatType, vatAmount, issuedAt), business-profile model, tax-calculator, thai-date, formatCurrency"
provides:
  - "VATSummary type and getVATSummary DB-level aggregation query"
  - "getExpiringInvoices query for 6-month expiry warnings"
  - "getRevenueYTD query for revenue threshold tracking"
  - "VATSummaryCard component (3-card gradient grid)"
  - "VATExpiryWarnings component (collapsible alert)"
  - "VATThresholdAlert component (progress bar alert)"
  - "Cookie-based setup wizard gate in middleware.ts"
  - "VAT report manifest stub for sidebar/link resolution"
  - "Thai labels on dashboard stats (replacing English)"
affects: [01-05, 02-wht-dashboard]

# Tech tracking
tech-stack:
  added: [date-fns (subMonths, differenceInDays)]
  patterns: [DB-level aggregate queries for VAT sums, cookie-based middleware gate, Unicode escape sequences for Thai text in JSX]

key-files:
  created:
    - components/dashboard/vat-summary-card.tsx
    - components/dashboard/vat-expiry-warnings.tsx
    - components/dashboard/vat-threshold-alert.tsx
    - app/(app)/apps/vat-report/manifest.ts
  modified:
    - models/stats.ts
    - middleware.ts
    - app/(app)/dashboard/page.tsx
    - components/dashboard/stats-widget.tsx

key-decisions:
  - "Cookie-based middleware gate instead of Prisma DB query (Edge runtime limitation)"
  - "Unicode escape sequences for Thai text to ensure consistent encoding"
  - "Satang values passed directly to formatCurrency (which divides by 100 internally)"

patterns-established:
  - "VAT aggregation pattern: prisma.transaction.aggregate with _sum on vatAmount grouped by vatType"
  - "Cookie-based setup gate: banchee_setup_complete cookie checked in middleware"
  - "VAT section conditional rendering: profile.vatRegistered controls visibility"

requirements-completed: [VAT-01, VAT-03, VAT-07, BIZ-02]

# Metrics
duration: 6min
completed: 2026-03-23
---

# Phase 01 Plan 04: VAT Dashboard Widgets Summary

**VAT dashboard with DB-aggregate summary cards, 6-month expiry warnings, 1.8M threshold alert, Thai labels, middleware setup gate, and VAT report manifest stub**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-23T11:34:40Z
- **Completed:** 2026-03-23T11:41:05Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- VAT summary queries use Prisma aggregate on first-class vatAmount column (DB-level SUM, not in-memory JS)
- Dashboard shows color-coded Output VAT (green), Input VAT (blue), and Net VAT (amber/green) cards with Thai labels
- Middleware redirects incomplete business profiles to /setup via cookie-based gate
- Expiry warnings and revenue threshold alerts integrated into dashboard with proper Thai copy
- All English labels in stats-widget.tsx replaced with Thai equivalents

## Task Commits

Each task was committed atomically:

1. **Task 1: VAT stats aggregation, middleware setup gate, and VAT report manifest stub** - `78f9373` (feat)
2. **Task 2: VAT dashboard widgets and Thai dashboard labels** - `4e1ac38` (feat)

## Files Created/Modified
- `models/stats.ts` - Added VATSummary type, getVATSummary, getExpiringInvoices, getRevenueYTD queries
- `middleware.ts` - Added cookie-based setup wizard gate, expanded matcher array
- `app/(app)/dashboard/page.tsx` - Fetches VAT data in parallel, conditionally renders VAT section
- `app/(app)/apps/vat-report/manifest.ts` - Manifest stub for sidebar link resolution
- `components/dashboard/vat-summary-card.tsx` - 3-card gradient grid for Output/Input/Net VAT
- `components/dashboard/vat-expiry-warnings.tsx` - Collapsible alert for invoices near 6-month expiry
- `components/dashboard/vat-threshold-alert.tsx` - Progress bar alert for 1.8M revenue threshold
- `components/dashboard/stats-widget.tsx` - English labels replaced with Thai

## Decisions Made
- **Cookie-based middleware gate:** Prisma Client cannot run in Next.js Edge middleware. Used `banchee_setup_complete` cookie instead of DB query. The setup wizard (Plan 01-02) must set this cookie upon completion.
- **Unicode escapes for Thai text:** All Thai strings written as Unicode escape sequences in JSX to ensure consistent file encoding across all environments.
- **Satang direct to formatCurrency:** All VAT amounts stored in satang are passed directly to formatCurrency which handles the /100 division internally. No formatSatangToDisplay call to avoid double-division bug.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- VAT report page content (page.tsx, actions.ts) to be created in Plan 01-05
- Setup wizard needs to set `banchee_setup_complete` cookie upon completion (check Plan 01-02 implementation)
- Dashboard VAT section is wired and ready for data once transactions with vatType are created

## Self-Check: PASSED

All 8 files verified present. Both task commits (78f9373, 4e1ac38) confirmed in git log.

---
*Phase: 01-thai-foundation-vat-compliance*
*Completed: 2026-03-23*
