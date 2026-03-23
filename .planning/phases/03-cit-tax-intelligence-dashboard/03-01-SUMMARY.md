---
phase: 03-cit-tax-intelligence-dashboard
plan: 01
subsystem: tax-engine
tags: [cit, sme, section-65-tri, non-deductible, prisma, ai-prompt, vitest]

# Dependency graph
requires:
  - phase: 01-thai-foundation-vat-compliance
    provides: "tax-calculator.ts with VAT/WHT functions, FIRST_CLASS_COLUMNS pattern"
  - phase: 02-withholding-tax-contacts-filing
    provides: "WHT fields in Transaction, business-profile model, filing-deadlines"
provides:
  - "CIT calculator: calculateSMECIT, calculateFlatCIT, isSMEEligible"
  - "Cap calculators: calculateEntertainmentCap, calculateCharitableCap"
  - "Non-deductible validator: validateNonDeductibleExpense"
  - "3 new Transaction columns: isNonDeductible, nonDeductibleReason, nonDeductibleCategory"
  - "AI prompt with Section 65 tri flagging instructions"
  - "Stats queries: getCITEstimate, getNonDeductibleSummary"
  - "Business profile: paidUpCapital field"
affects: [03-02-PLAN, 03-03-PLAN, phase-04]

# Tech tracking
tech-stack:
  added: []
  patterns: ["satang-arithmetic CIT tiered calculation", "heuristic-override AI validator pattern", "parallel aggregate fetch with Promise.all"]

key-files:
  created:
    - "ai/validators/non-deductible-validator.ts"
    - "prisma/migrations/20260323170426_add_non_deductible_fields/"
    - "services/cit-calculator.test.ts"
    - "ai/validators/non-deductible-validator.test.ts"
  modified:
    - "services/tax-calculator.ts"
    - "models/transactions.ts"
    - "models/defaults.ts"
    - "models/business-profile.ts"
    - "models/stats.ts"
    - "app/(app)/unsorted/actions.ts"
    - "components/unsorted/analyze-form.tsx"
    - "components/settings/business-profile-form.tsx"
    - "app/(app)/settings/business-profile-actions.ts"
    - "prisma/schema.prisma"

key-decisions:
  - "CIT uses satang integer arithmetic matching VAT/WHT convention (Math.round for each tier)"
  - "Non-deductible validator uses heuristic-first pattern: category+keyword checks override AI flags"
  - "Plan's 5M CIT test case had arithmetic error (675K vs correct 805K) -- implemented correct math"
  - "Entertainment cap status thresholds: >=1.0 over, >=0.8 approaching, else under"
  - "paidUpCapital stored in satang in Settings model, form input in baht with *100 conversion"

patterns-established:
  - "Heuristic-override validator: check category+keywords first, then fall back to AI flags"
  - "CIT tiered calculation: compute each tier amount, apply rate with Math.round(amount * rate / 10000)"
  - "Cap status calculation: ratio-based thresholds (over/approaching/under)"

requirements-completed: [SCAN-05, CIT-01]

# Metrics
duration: 11min
completed: 2026-03-24
---

# Phase 03 Plan 01: CIT Calculator + Section 65 Tri AI Flagging Summary

**CIT engine with SME tiered rates, non-deductible expense validator with heuristic overrides, and AI prompt extended for Section 65 tri flagging across 8 categories**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-23T16:59:46Z
- **Completed:** 2026-03-23T17:11:03Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments

- CIT calculator with 3-tier SME rates (0%/15%/20%), flat 20% rate, and SME eligibility check using satang integer arithmetic
- Entertainment cap (0.3% of revenue, 10M hard cap) and charitable cap (2% of net profit) with status thresholds
- Non-deductible validator with heuristic-first pattern: category+keyword checks for penalties, entertainment, charitable; AI flag fallback
- 3 new Transaction columns (isNonDeductible, nonDeductibleReason, nonDeductibleCategory) in FIRST_CLASS_COLUMNS
- AI prompt extended with Section 65 tri instructions covering 8 non-deductible categories
- getCITEstimate and getNonDeductibleSummary stats queries with parallel fetching and fiscal year date range
- Business profile extended with paidUpCapital field (baht input, satang storage)
- Warning badge in analyze-form.tsx with destructive/amber color coding for non-deductible items

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration + CIT calculator + 65 tri AI + validator + wiring** (TDD)
   - `e5d3c85` (test: failing tests for CIT calculator and non-deductible validator)
   - `91028bd` (feat: CIT calculator, Section 65 tri AI flagging, non-deductible validator)
2. **Task 2: Stats model CIT estimate + non-deductible summary queries**
   - `faf5ae1` (feat: getCITEstimate and getNonDeductibleSummary stats queries)

## Files Created/Modified

- `services/tax-calculator.ts` -- Extended with CIT types, constants, calculateSMECIT, calculateFlatCIT, isSMEEligible, calculateEntertainmentCap, calculateCharitableCap
- `ai/validators/non-deductible-validator.ts` -- New: Section 65 tri post-extraction validator with heuristic checks
- `prisma/schema.prisma` -- 3 new Transaction columns + isNonDeductible index
- `prisma/migrations/20260323170426_add_non_deductible_fields/` -- Migration SQL
- `models/transactions.ts` -- 3 new fields in TransactionData type + FIRST_CLASS_COLUMNS
- `models/defaults.ts` -- AI prompt extended with 65 tri instructions + 3 new DEFAULT_FIELDS
- `models/business-profile.ts` -- paidUpCapital field, code, default, parsing
- `models/stats.ts` -- getCITEstimate and getNonDeductibleSummary cached query functions
- `app/(app)/unsorted/actions.ts` -- Wired validateNonDeductibleExpense after AI extraction
- `components/unsorted/analyze-form.tsx` -- Non-deductible warning badge with state handling
- `components/settings/business-profile-form.tsx` -- Paid-up capital input field (baht)
- `app/(app)/settings/business-profile-actions.ts` -- paidUpCapital save/reset handling
- `services/cit-calculator.test.ts` -- 22 tests for CIT calculator functions
- `ai/validators/non-deductible-validator.test.ts` -- 8 tests for non-deductible validator

## Decisions Made

- **CIT satang arithmetic**: Each tier uses `Math.round(amount * rate / 10000)` matching VAT/WHT convention, preventing floating-point errors
- **Plan arithmetic correction**: Plan specified 5M profit CIT as 675K (67,500,000 satang) but correct math is 805K (80,500,000 satang) -- implemented correct calculation
- **Heuristic-first validator**: Category+keyword checks (fees+penalty, food/events=entertainment, donations=charitable) override AI flags for higher accuracy
- **paidUpCapital in satang**: Stored as satang in Settings model (consistent with all monetary values), form input in baht with *100 conversion on save, /100 on display
- **Entertainment status thresholds**: ratio >= 1.0 = "over", >= 0.8 = "approaching", else "under" -- same for charitable cap

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TS2322 type error in actions.ts non-deductible assignment**
- **Found during:** Task 1 (wiring validator into analyze flow)
- **Issue:** `output.is_non_deductible = true` failed because output is `Record<string, string>`, not `Record<string, unknown>`
- **Fix:** Cast output to `Record<string, unknown>` before assigning boolean/string values
- **Files modified:** app/(app)/unsorted/actions.ts
- **Verification:** `npx tsc --noEmit` shows no errors in this file
- **Committed in:** 91028bd (Task 1 commit)

**2. [Rule 1 - Bug] Corrected CIT test case arithmetic for 5M profit**
- **Found during:** Task 1 (writing tests)
- **Issue:** Plan specified calculateSMECIT(500000000) = 67,500,000 satang (675K THB) but correct math: 0 + 405K + 400K = 805K THB (80,500,000 satang)
- **Fix:** Test uses correct expected value 80,500,000 satang
- **Verification:** All CIT tests pass with correct tiered calculation
- **Committed in:** e5d3c85 (test commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered

None -- plan executed smoothly with minor corrections noted above.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness

- CIT calculator functions ready for Plan 02 (CIT report page: PND50/PND51 helpers)
- getCITEstimate and getNonDeductibleSummary ready for Plan 03 (dashboard widgets)
- Non-deductible validator active in analyze flow -- new scans will flag Section 65 tri items
- Business profile has paidUpCapital for SME eligibility checks

## Self-Check: PASSED

All created files exist. All 3 task commits verified (e5d3c85, 91028bd, faf5ae1). Migration directory present.

---
*Phase: 03-cit-tax-intelligence-dashboard*
*Completed: 2026-03-24*
