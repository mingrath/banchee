# Phase 3: CIT + Tax Intelligence + Dashboard - Research

**Researched:** 2026-03-23
**Domain:** Thai corporate income tax estimation, non-deductible expense AI flagging, credit/debit notes, tax dashboard
**Confidence:** HIGH

## Summary

Phase 3 extends BanChee's Thai tax compliance layer with four feature areas: (1) SME corporate income tax estimation using the three-tier progressive rate system, (2) AI-powered Section 65 tri flagging during receipt scanning to catch non-deductible expenses, (3) credit note and debit note creation per Sections 86/9 and 86/10, and (4) a unified monthly tax summary dashboard aggregating VAT, WHT, CIT, and flagged expenses.

The codebase from Phases 1 and 2 provides strong patterns for all four areas. The report app pattern (manifest/page/actions/components) has been used three times (VAT report, WHT report, tax invoice) and should be cloned for both the CIT report app and credit/debit note app. The `services/tax-calculator.ts` already uses satang integer arithmetic with basis-point rates, and CIT calculation must follow the same convention. The AI prompt in `models/defaults.ts` already handles WHT rate suggestion and can be extended with 65 tri flagging instructions. The dashboard already has parallel data fetching and card-based widgets (VATSummaryCard, WHTSummaryCard) that the monthly tax summary section should follow.

**Primary recommendation:** Follow established patterns exactly. CIT calculation goes in `services/tax-calculator.ts`, 65 tri flagging extends the AI prompt + adds a new validator file, credit/debit notes clone the tax invoice app pattern, and the tax summary is a new dashboard section with cards.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: CIT calculator as a dedicated page/app (same pattern as VAT report and WHT report apps). Shows: total income, total deductible expenses, non-deductible flags, net profit, tiered rate breakdown (0% on first 300K, 15% on 300K-3M, 20% above), estimated CIT amount.
- D-02: PND50 (annual) and PND51 (half-year) helpers show the same calculation but for the relevant period. Not PDF forms -- data summary that user can reference when filing manually on rd.go.th.
- D-03: SME eligibility check: auto-verify capital <=5M and revenue <=30M from business profile. If not eligible, show standard 20% flat rate instead.
- D-04: AI flags non-deductible expenses DURING receipt scanning (extends Phase 1 AI extraction flow). If AI detects a potential 65 tri item, show warning badge alongside existing validation badges.
- D-05: Dashboard shows running summary of flagged items: entertainment expense running total vs 0.3% cap, charitable donations vs 2% cap, total non-deductible amount. Color-coded (green=under limit, amber=approaching, red=over limit).
- D-06: 65 tri categories to flag: (1) provisions/reserves, (2) personal expenses, (3) charitable >2%, (4) entertainment >0.3% or >10M, (5) capital expenditure, (6) fines/penalties, (7) expenses without identified recipient, (8) CIT payments.
- D-07: Follow tax invoice creation pattern from Phase 2. Form with required fields, links to original invoice, auto-adjusts linked transaction amounts. THSarabunNew PDF output.
- D-08: Unified monthly summary page (new section on dashboard, below existing widgets). Shows: VAT payable/credit, WHT total withheld, estimated CIT (annualized from YTD), flagged expenses count + amount, next filing deadlines.
- D-09: Simple card layout -- not a complex analytical dashboard. Target user is non-accountant. Headline numbers + color coding.

### Claude's Discretion
- CIT calculator page layout and field arrangement
- 65 tri flag badge visual design and warning wording
- Credit/debit note form field layout
- Tax summary dashboard card arrangement and responsive behavior
- PND50/PND51 data presentation format
- Entertainment expense cap calculation implementation details

### Deferred Ideas (OUT OF SCOPE)
- Revenue Dept XML export for CIT -- Phase 4
- Full general ledger / chart of accounts -- out of scope
- Tax optimization suggestions (beyond flagging) -- v2
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCAN-05 | AI flags non-deductible expenses (Section 65 Tri) with explanation | AI prompt extension + new `non-deductible-validator.ts` following tax-invoice-validator pattern; new LLM output fields `is_non_deductible` + `non_deductible_reason` + `non_deductible_category` |
| CIT-01 | SME tax rate calculation (0% first 300K, 15% 300K-3M, 20% above) | `calculateSMECIT()` in tax-calculator.ts using satang arithmetic; `isSMEEligible()` checking capital + revenue thresholds from business profile |
| CIT-02 | PND50 annual CIT data helper | Server action in CIT report app; aggregates full fiscal year income/expenses from transactions; applies 65 tri adjustments |
| CIT-03 | PND51 half-year estimated CIT data helper | Same action with first-6-months date filter; same calculation flow as PND50 |
| INV-03 | Credit note and debit note creation for invoice corrections | New app at `app/(app)/apps/credit-note/` cloning tax-invoice pattern; Sections 86/9 + 86/10 required fields; links to original invoice via AppData key |
| RPT-01 | Monthly tax summary dashboard | New dashboard section with 4-5 cards; parallel fetch of VAT/WHT/CIT/flags; follows VATSummaryCard gradient pattern |
| RPT-02 | Income/expense summary with profit calculation | Reuse existing `getDashboardStats` which already computes profitPerCurrency; add year-to-date aggregation for CIT estimation |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^15.2.4 | App framework | Already in project, App Router with Server Components |
| Prisma | ^6.6.0 | Database ORM | Already in project, schema extensions needed |
| Zod | ^3.24.2 | Form/data validation | Already in project, all forms use `.safeParse()` |
| @react-pdf/renderer | ^4.3.0 | Credit/debit note PDFs | Already in project, used for all PDF generation |
| date-fns | ^3.6.0 | Date manipulation | Already in project, used in filing deadlines |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.475.0 | Icons | Dashboard cards, badges, form controls |
| shadcn/ui (Card, Badge) | Built-in | UI components | Dashboard cards, 65 tri warning badges |
| tailwind-merge + clsx | ^3.0.1 / ^2.1.1 | Conditional styling | Color-coded threshold indicators |

**No new packages required.** All Phase 3 features use existing dependencies.

## Architecture Patterns

### Recommended Project Structure (New Files Only)
```
services/
  tax-calculator.ts           # EXTEND: add calculateSMECIT(), isSMEEligible()

models/
  stats.ts                    # EXTEND: add getCITEstimate(), getNonDeductibleSummary()
  business-profile.ts         # EXTEND: add biz_paid_up_capital to BUSINESS_PROFILE_CODES
  defaults.ts                 # EXTEND: AI prompt for 65 tri, new LLM output fields
  transactions.ts             # EXTEND: FIRST_CLASS_COLUMNS with isNonDeductible, nonDeductibleReason, nonDeductibleCategory

ai/
  validators/
    non-deductible-validator.ts  # NEW: Section 65 tri flagging logic (parallel to tax-invoice-validator.ts)

forms/
  credit-note.ts              # NEW: Zod schema for credit/debit note

app/(app)/apps/
  cit-report/
    manifest.ts               # NEW: CIT report app registration
    page.tsx
    actions.ts                # generateCITReportAction(formData) -- year, half/full
    components/
      cit-report-client.tsx
      cit-summary.tsx         # Tiered breakdown display
  credit-note/
    manifest.ts               # NEW: Credit/debit note app
    page.tsx
    actions.ts                # createCreditNoteAction, createDebitNoteAction
    components/
      credit-note-form.tsx
      credit-note-pdf.tsx
      note-preview.tsx

components/dashboard/
  tax-summary-card.tsx        # NEW: Unified monthly tax overview
  non-deductible-summary.tsx  # NEW: 65 tri flags + cap tracking

prisma/
  migrations/XXXXXX_add_non_deductible_fields/  # NEW migration
  schema.prisma               # EXTEND: Transaction model + BusinessProfile settings
```

### Pattern 1: Report App Pattern (Clone for CIT Report)
**What:** Established 3-file + components pattern from VAT and WHT reports.
**When to use:** Any new reporting/form app.
**Example:**
```typescript
// manifest.ts -- app registration (auto-discovered by common.ts)
export const manifest = {
  code: "cit-report",
  name: "ประมาณการภาษีเงินได้นิติบุคคล",
  description: "ประมาณการ CIT, PND50, PND51",
  icon: "Calculator",
}

// actions.ts -- server action pattern
export async function generateCITReportAction(
  prevState: ActionState<CITReportData> | null,
  formData: FormData
): Promise<ActionState<CITReportData>> {
  const user = await getCurrentUser()
  // ...computation logic
  return { success: true, data: reportData }
}
```

### Pattern 2: Satang Integer Arithmetic (Extend for CIT)
**What:** All monetary amounts stored and computed in satang (1 baht = 100 satang). Rates in basis points.
**When to use:** CIT calculation, entertainment cap calculation, all monetary comparisons.
**Example:**
```typescript
// services/tax-calculator.ts -- CIT tiered calculation
export type CITResult = {
  netProfit: number         // satang
  isEligible: boolean       // SME qualification
  tiers: CITTier[]          // breakdown per tier
  totalCIT: number          // satang
  effectiveRate: number     // basis points
}

export type CITTier = {
  from: number              // satang
  to: number                // satang
  rate: number              // basis points
  taxableAmount: number     // satang
  tax: number               // satang
}

// Tier boundaries in satang
const SME_TIER_1_LIMIT = 30000000   // 300,000 THB
const SME_TIER_2_LIMIT = 300000000  // 3,000,000 THB

export function calculateSMECIT(netProfitSatang: number): CITResult {
  if (netProfitSatang <= 0) {
    return { netProfit: netProfitSatang, isEligible: true, tiers: [], totalCIT: 0, effectiveRate: 0 }
  }

  const tiers: CITTier[] = []
  let remaining = netProfitSatang
  let totalCIT = 0

  // Tier 1: 0% on first 300,000 THB
  const tier1Amount = Math.min(remaining, SME_TIER_1_LIMIT)
  tiers.push({ from: 0, to: SME_TIER_1_LIMIT, rate: 0, taxableAmount: tier1Amount, tax: 0 })
  remaining -= tier1Amount

  // Tier 2: 15% on 300,001 - 3,000,000 THB
  if (remaining > 0) {
    const tier2Limit = SME_TIER_2_LIMIT - SME_TIER_1_LIMIT
    const tier2Amount = Math.min(remaining, tier2Limit)
    const tier2Tax = Math.round(tier2Amount * 1500 / 10000) // 15% in basis points
    tiers.push({ from: SME_TIER_1_LIMIT, to: SME_TIER_2_LIMIT, rate: 1500, taxableAmount: tier2Amount, tax: tier2Tax })
    totalCIT += tier2Tax
    remaining -= tier2Amount
  }

  // Tier 3: 20% on above 3,000,000 THB
  if (remaining > 0) {
    const tier3Tax = Math.round(remaining * 2000 / 10000) // 20% in basis points
    tiers.push({ from: SME_TIER_2_LIMIT, to: Infinity, rate: 2000, taxableAmount: remaining, tax: tier3Tax })
    totalCIT += tier3Tax
  }

  const effectiveRate = netProfitSatang > 0 ? Math.round(totalCIT * 10000 / netProfitSatang) : 0

  return { netProfit: netProfitSatang, isEligible: true, tiers, totalCIT, effectiveRate }
}

export function calculateFlatCIT(netProfitSatang: number): CITResult {
  const tax = netProfitSatang > 0 ? Math.round(netProfitSatang * 2000 / 10000) : 0
  return {
    netProfit: netProfitSatang,
    isEligible: false,
    tiers: [{ from: 0, to: Infinity, rate: 2000, taxableAmount: Math.max(0, netProfitSatang), tax }],
    totalCIT: tax,
    effectiveRate: 2000,
  }
}
```

### Pattern 3: AI Prompt Extension (65 Tri Flagging)
**What:** Extend the DEFAULT_PROMPT_ANALYSE_NEW_FILE with 65 tri detection instructions and add new LLM output fields.
**When to use:** SCAN-05 requirement.
**Example:**
```typescript
// models/defaults.ts -- append to existing prompt
// Add after WHT section, before {fields}:
`
For ALL expense transactions, check if the expense might be non-deductible under Section 65 tri:
- is_non_deductible: true if the expense appears non-deductible under Thai Revenue Code Section 65 tri, false otherwise
- non_deductible_reason: brief explanation in Thai of WHY it is non-deductible (e.g., "ค่าปรับ — รายจ่ายต้องห้ามตามมาตรา 65 ตรี (6)")
- non_deductible_category: one of: "provision", "personal", "charitable", "entertainment", "capital", "penalty", "no_recipient", "cit_payment", "" (empty if fully deductible)

Categories to flag:
(1) สำรอง/เงินกองทุนสำรอง — provisions/reserves
(2) รายจ่ายส่วนตัว — personal expenses not related to business
(3) การบริจาค — charitable (flag but note: deductible up to 2% of net profit)
(4) ค่ารับรอง/เลี้ยงรับรอง — entertainment (flag but note: deductible up to 0.3% of revenue, max 10M)
(5) รายจ่ายลงทุน/ซื้อทรัพย์สิน — capital expenditure (must be depreciated, not expensed)
(6) ค่าปรับ/เงินเพิ่ม/เบี้ยปรับ — fines, penalties, surcharges
(7) รายจ่ายที่ไม่สามารถพิสูจน์ผู้รับ — expenses without identified recipient
(8) ภาษีเงินได้นิติบุคคล — CIT payments themselves
If unsure, set is_non_deductible=false (prefer false negatives over false positives).
`

// New DEFAULT_FIELDS entries
{
  code: "is_non_deductible",
  name: "รายจ่ายต้องห้าม",
  type: "boolean",
  llm_prompt: "true if expense is non-deductible under Section 65 tri, false otherwise. For income transactions, always false.",
  isVisibleInList: false,
  isVisibleInAnalysis: false,
  isRequired: false,
  isExtra: false,
},
{
  code: "non_deductible_reason",
  name: "เหตุผลรายจ่ายต้องห้าม",
  type: "string",
  llm_prompt: "Brief Thai explanation of why expense is non-deductible. Empty if fully deductible.",
  isVisibleInList: false,
  isVisibleInAnalysis: false,
  isRequired: false,
  isExtra: true,
},
{
  code: "non_deductible_category",
  name: "หมวดรายจ่ายต้องห้าม",
  type: "string",
  llm_prompt: "Category: provision, personal, charitable, entertainment, capital, penalty, no_recipient, cit_payment, or empty",
  isVisibleInList: false,
  isVisibleInAnalysis: false,
  isRequired: false,
  isExtra: true,
},
```

### Pattern 4: Dashboard Card Widget (Clone for Tax Summary)
**What:** Gradient Card with icon, headline number, subtitle, and link. Color-coded by status.
**When to use:** Tax summary section cards.
**Example:**
```typescript
// Follow VATSummaryCard/WHTSummaryCard pattern exactly:
// - 3-column grid: md:grid-cols-3 (or 4 for tax summary)
// - Gradient backgrounds: bg-gradient-to-br from-white via-{color}-50/30 to-{color}-50/40
// - border-{color}-200/50
// - hover:shadow-lg transition-all duration-300
// - CardHeader with title (text-sm font-bold) + icon
// - CardContent with headline number (text-2xl font-bold) + subtitle (text-xs text-muted-foreground)
// - Optional Link to detail page
```

### Pattern 5: Business Profile Settings Extension (SME Fields)
**What:** Add `biz_paid_up_capital` to Setting model. Business profile stores all business fields as Settings with `biz_` prefix.
**When to use:** SME eligibility check (D-03).
**Example:**
```typescript
// models/business-profile.ts -- extend
export const BUSINESS_PROFILE_CODES = [
  "biz_company_name",
  "biz_tax_id",
  "biz_branch",
  "biz_address",
  "biz_vat_registered",
  "biz_vat_reg_date",
  "biz_fiscal_year_start",
  "biz_paid_up_capital",  // NEW: satang, for SME eligibility
] as const

// In BusinessProfile type:
paidUpCapital: number // satang, 0 = not set

// SME eligibility: paidUpCapital <= 500000000 (5M THB in satang)
// AND annual revenue <= 3000000000 (30M THB in satang)
```

### Anti-Patterns to Avoid
- **Floating-point CIT calculation:** Use satang integers for ALL monetary math. `netProfit * 0.15` is WRONG -- use `Math.round(netProfit * 1500 / 10000)`.
- **Hardcoded tier boundaries without constants:** Define `SME_TIER_1_LIMIT`, `SME_TIER_2_LIMIT` etc. as named constants.
- **Mixing fiscal periods:** PND50 is full year, PND51 is first 6 months. Date filters must be strict, using `fiscalYearStart` from business profile.
- **65 tri false positives:** AI should default to `is_non_deductible=false` when uncertain. False positives frustrate users. The validator can add a second check.
- **New DB columns without FIRST_CLASS_COLUMNS update:** Any new Transaction column MUST be added to `FIRST_CLASS_COLUMNS` in `models/transactions.ts` or values silently go to `extra` JSON.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CIT tier calculation | Custom loop with manual bracket math | Pure function with constant tier array | Off-by-one errors at tier boundaries; must handle zero/negative profit |
| Entertainment expense 0.3% cap | Ad-hoc percentage math | Dedicated function using `MAX(revenue, capital) * 30 / 10000` in satang | Cap is whichever is GREATER of revenue or capital base; plus hard cap at 10M |
| Credit note sequential numbering | Custom counter | Reuse existing `prisma.$transaction` read-parse-increment pattern from tax invoice | Atomicity required for sequential numbers |
| Date range for fiscal year | Manual month calculation | `date-fns` with `fiscalYearStart` from business profile | Calendar year vs non-calendar fiscal year edge case |
| Dashboard parallel fetching | Sequential awaits | `Promise.all([...])` matching existing `dashboard/page.tsx` pattern | Dashboard already does this; consistency matters |

**Key insight:** Every feature in Phase 3 has an existing pattern in the codebase. The CIT calculator extends tax-calculator.ts. The 65 tri validator follows tax-invoice-validator.ts. Credit notes clone tax invoice. Dashboard cards clone VAT/WHT summary cards. Do NOT invent new patterns.

## Common Pitfalls

### Pitfall 1: SME Eligibility Cliff
**What goes wrong:** Code applies tiered rates when either capital > 5M or revenue > 30M.
**Why it happens:** The eligibility check is BOTH conditions (AND), but if EITHER is exceeded, the company loses SME status entirely and pays flat 20% on ALL profit.
**How to avoid:** `isSMEEligible(capital, revenue)` must return `false` if EITHER threshold is exceeded. When not eligible, use `calculateFlatCIT()` not `calculateSMECIT()`.
**Warning signs:** Tests that only check one threshold, not both.

### Pitfall 2: Entertainment Cap Formula -- Greater of Revenue OR Capital
**What goes wrong:** Using only revenue for the 0.3% cap when paid-up capital might be higher.
**Why it happens:** The Thai Revenue Code says `MAX(total_revenue * 0.003, paid_up_capital * 0.003)` with a hard cap at 10M THB. Most implementations only use revenue.
**How to avoid:** Always compute both bases and take the maximum, then cap at `1000000000` satang (10M THB).
**Warning signs:** Entertainment cap calculation that doesn't reference `biz_paid_up_capital`.

### Pitfall 3: Charitable Deduction 2% Cap Based on Net Profit -- Circular Dependency
**What goes wrong:** Charitable deduction cap is 2% of net profit, but net profit depends on deductions. This creates a circular calculation.
**Why it happens:** The cap is: `deductible_charity = MIN(actual_charity, net_profit_before_charity * 0.02)`. Net profit must be computed BEFORE applying the charitable deduction cap, then the non-deductible portion is added back.
**How to avoid:** Two-pass calculation: (1) compute net profit with all expenses deducted, (2) calculate charitable cap against that number, (3) add back non-deductible portion.
**Warning signs:** CIT estimate that includes all charitable expenses as deductible regardless of cap.

### Pitfall 4: New Transaction Columns Not in FIRST_CLASS_COLUMNS
**What goes wrong:** After adding `isNonDeductible`, `nonDeductibleReason`, `nonDeductibleCategory` columns to Prisma schema, values silently go into the `extra` JSON column instead of the proper database columns.
**Why it happens:** `splitTransactionDataExtraFields()` in `models/transactions.ts` only passes known column names through to standard. Anything not in `FIRST_CLASS_COLUMNS` goes to `extra`.
**How to avoid:** Add `"isNonDeductible"`, `"nonDeductibleReason"`, `"nonDeductibleCategory"` to the `FIRST_CLASS_COLUMNS` Set after the Prisma migration.
**Warning signs:** New columns always `null` despite AI returning values; values found in `extra` JSON instead.

### Pitfall 5: Credit Note VAT Adjustment Direction
**What goes wrong:** Credit note reduces the VAT but code adds it instead of subtracting.
**Why it happens:** Credit notes DECREASE taxable value (Section 86/10). The VAT adjustment is NEGATIVE. Debit notes INCREASE taxable value (Section 86/9). Mixing them up inverts the tax liability.
**How to avoid:** Credit note: `adjustedVAT = originalVAT - creditNoteVAT`. Debit note: `adjustedVAT = originalVAT + debitNoteVAT`. Create separate types for clarity.
**Warning signs:** VAT summary shows higher tax after issuing a credit note.

### Pitfall 6: PND51 Half-Year Period Uses Fiscal Year, Not Calendar Year
**What goes wrong:** PND51 always uses Jan-Jun instead of respecting the fiscal year start.
**Why it happens:** Business profile has `fiscalYearStart` (1-12) but code hardcodes January as start.
**How to avoid:** Compute first-half period as `fiscalYearStart` to `fiscalYearStart + 5` months. For calendar year companies (`fiscalYearStart=1`), this is Jan-Jun. For others, adjust accordingly.
**Warning signs:** Non-calendar-year companies get wrong PND51 period.

## Code Examples

### CIT Estimation Server Action Pattern
```typescript
// Source: tax-invoice actions.ts pattern + CIT requirements
export type CITReportData = {
  period: { type: "annual" | "half-year"; year: number }
  businessProfile: BusinessProfile
  totalIncome: number          // satang
  totalExpenses: number        // satang
  nonDeductibleTotal: number   // satang -- flagged 65 tri items
  netProfit: number            // satang -- income - expenses + nonDeductible
  isEligible: boolean          // SME qualification
  citResult: CITResult         // from calculateSMECIT or calculateFlatCIT
  entertainmentCap: EntertainmentCapResult
  charitableCap: CharitableCapResult
}

export async function generateCITReportAction(
  prevState: ActionState<CITReportData> | null,
  formData: FormData
): Promise<ActionState<CITReportData>> {
  const user = await getCurrentUser()
  const periodType = formData.get("periodType") as "annual" | "half-year"
  const year = parseInt(formData.get("year") as string, 10)

  const profile = await getBusinessProfile(user.id)
  const { startDate, endDate } = getFiscalPeriod(profile.fiscalYearStart, year, periodType)

  // Parallel fetch: income + expenses + non-deductible items
  const [incomeResult, expenseResult, nonDeductibleResult] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId: user.id, type: "income", issuedAt: { gte: startDate, lt: endDate } },
      _sum: { total: true },
    }),
    prisma.transaction.aggregate({
      where: { userId: user.id, type: "expense", issuedAt: { gte: startDate, lt: endDate } },
      _sum: { total: true },
    }),
    prisma.transaction.aggregate({
      where: { userId: user.id, type: "expense", isNonDeductible: true, issuedAt: { gte: startDate, lt: endDate } },
      _sum: { total: true },
    }),
  ])

  const totalIncome = incomeResult._sum.total || 0
  const totalExpenses = expenseResult._sum.total || 0
  const nonDeductibleTotal = nonDeductibleResult._sum.total || 0
  const netProfit = totalIncome - totalExpenses + nonDeductibleTotal

  // SME eligibility check
  const isEligible = isSMEEligible(profile.paidUpCapital, totalIncome)
  const citResult = isEligible ? calculateSMECIT(netProfit) : calculateFlatCIT(netProfit)

  return { success: true, data: { /* ... */ } }
}
```

### Entertainment Expense Cap Calculation
```typescript
// Source: THAI_TAX_REFERENCE.md Section 8, item (4)
export type EntertainmentCapResult = {
  actualAmount: number        // satang -- total entertainment expenses
  revenueBase: number         // satang -- total_revenue * 0.003
  capitalBase: number         // satang -- paid_up_capital * 0.003
  capBase: number             // satang -- MAX(revenueBase, capitalBase)
  hardCap: number             // satang -- 10,000,000 THB = 1,000,000,000 satang
  deductibleAmount: number    // satang -- MIN(actualAmount, capBase, hardCap)
  nonDeductibleAmount: number // satang -- actualAmount - deductibleAmount
  status: "under" | "approaching" | "over"
}

const ENTERTAINMENT_HARD_CAP = 1000000000 // 10M THB in satang

export function calculateEntertainmentCap(
  actualEntertainment: number,  // satang
  totalRevenue: number,         // satang
  paidUpCapital: number,        // satang
): EntertainmentCapResult {
  const revenueBase = Math.round(totalRevenue * 30 / 10000)     // 0.3%
  const capitalBase = Math.round(paidUpCapital * 30 / 10000)    // 0.3%
  const capBase = Math.max(revenueBase, capitalBase)
  const effectiveCap = Math.min(capBase, ENTERTAINMENT_HARD_CAP)
  const deductibleAmount = Math.min(actualEntertainment, effectiveCap)
  const nonDeductibleAmount = actualEntertainment - deductibleAmount

  // Status thresholds: approaching = 80%+ of cap
  const ratio = effectiveCap > 0 ? actualEntertainment / effectiveCap : 0
  const status = ratio >= 1 ? "over" : ratio >= 0.8 ? "approaching" : "under"

  return {
    actualAmount: actualEntertainment,
    revenueBase,
    capitalBase,
    capBase,
    hardCap: ENTERTAINMENT_HARD_CAP,
    deductibleAmount,
    nonDeductibleAmount,
    status,
  }
}
```

### Credit Note Required Fields (Sections 86/9 and 86/10)
```typescript
// Source: Revenue Department Section 86/10 (credit note) and 86/9 (debit note)
export const creditNoteFormSchema = z.object({
  // Required: link to original invoice
  originalInvoiceKey: z.string().min(1, "กรุณาเลือกใบกำกับภาษีต้นฉบับ"),

  // Required: type (credit or debit)
  noteType: z.enum(["credit", "debit"]),

  // Required: date of issuance (field 4)
  issuedAt: z.string().min(1, "กรุณาเลือกวันที่ออก"),

  // Required: reason (field 6)
  reason: z.string().min(1, "กรุณาระบุเหตุผล"),

  // Required: line items showing original value, corrected value, difference
  items: z.array(z.object({
    description: z.string().min(1, "กรุณากรอกรายละเอียด"),
    originalAmount: z.coerce.number(),   // satang
    correctedAmount: z.coerce.number(),  // satang
  })).min(1, "กรุณาเพิ่มอย่างน้อย 1 รายการ"),

  note: z.string().optional(),
})
```

### Non-Deductible Validator (65 Tri Post-Extraction Check)
```typescript
// Source: tax-invoice-validator.ts pattern
export type NonDeductibleFlag = {
  isNonDeductible: boolean
  category: string
  reason: string
  severity: "warning" | "info"  // warning = fully non-deductible, info = partially (caps)
}

export function validateNonDeductibleExpense(
  extractedData: Record<string, unknown>
): NonDeductibleFlag {
  // AI already sets is_non_deductible. Validator does secondary checks:
  const isNonDeductible = extractedData.is_non_deductible === true ||
                           extractedData.is_non_deductible === "true"
  const category = asString(extractedData.non_deductible_category)
  const reason = asString(extractedData.non_deductible_reason)

  // Additional heuristic checks that AI might miss:
  const categoryCode = asString(extractedData.categoryCode)
  const name = asString(extractedData.name).toLowerCase()

  // Check for fines/penalties by category
  if (categoryCode === "fees" && (name.includes("ค่าปรับ") || name.includes("เบี้ยปรับ"))) {
    return { isNonDeductible: true, category: "penalty", reason: "ค่าปรับ/เบี้ยปรับ -- รายจ่ายต้องห้ามตามมาตรา 65 ตรี (6)", severity: "warning" }
  }

  // Check for entertainment by category
  if (categoryCode === "food" || categoryCode === "events") {
    return { isNonDeductible: false, category: "entertainment", reason: "ค่ารับรอง -- หักได้ไม่เกิน 0.3% ของรายได้", severity: "info" }
  }

  // Check for donations by category
  if (categoryCode === "donations") {
    return { isNonDeductible: false, category: "charitable", reason: "บริจาค -- หักได้ไม่เกิน 2% ของกำไรสุทธิ", severity: "info" }
  }

  return { isNonDeductible, category, reason, severity: isNonDeductible ? "warning" : "info" }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual CIT calculation | App-computed from transaction data | Phase 3 | User sees estimated CIT without manual math |
| No expense deductibility tracking | AI flags + validator checks during scan | Phase 3 | Non-deductible expenses caught at entry time |
| Separate VAT/WHT dashboards | Unified monthly tax overview | Phase 3 | Single "peace of mind" view |

**Deprecated/outdated:**
- None. Phase 3 extends existing patterns without deprecating anything.

## Open Questions

1. **Fiscal Year Non-Calendar Edge Case**
   - What we know: Business profile stores `fiscalYearStart` (1-12, default 1 = January). Most Thai SMEs use calendar year.
   - What's unclear: Do any users actually use non-calendar fiscal years? Should PND50/PND51 handle this edge case fully or just show a warning?
   - Recommendation: Implement full fiscal year support since the data model already supports it. Low additional effort.

2. **65 Tri AI Accuracy**
   - What we know: AI will flag based on prompt instructions. False positive rate is unknown until real-world testing.
   - What's unclear: How accurate will the AI be at detecting entertainment vs. legitimate food expenses, or capital expenditure vs. operating expenses?
   - Recommendation: Default to `is_non_deductible=false` in the prompt (D-06 says prefer false negatives). Add validator as safety net. Track accuracy post-launch.

3. **Credit Note Links to Original Invoice**
   - What we know: Tax invoices stored in AppData with key `tax-invoice-{docNumber}`. Credit notes need to reference original.
   - What's unclear: Should credit notes also create adjustment transactions, or just exist as documents?
   - Recommendation: Per D-07, "auto-adjusts linked transaction amounts" -- create an adjustment transaction (negative income) and link via `contactId` + `documentNumber` reference.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `services/tax-calculator.ts`, `models/defaults.ts`, `models/stats.ts`, `ai/validators/tax-invoice-validator.ts` -- all verified by reading source files
- `.planning/research/THAI_TAX_REFERENCE.md` -- Sections 8 (65 tri), 9 (SME rates), 10 (filing deadlines)
- [Revenue Department Section 86/9 and 86/10](https://www.rd.go.th/english/37741.html) -- Credit/debit note required fields

### Secondary (MEDIUM confidence)
- [PwC Thailand Corporate Tax Summary](https://taxsummaries.pwc.com/thailand/corporate/taxes-on-corporate-income) -- SME tiered rates and eligibility criteria confirmed
- [Siam Legal Revenue Code Library](https://library.siam-legal.com/thai-law/revenue-code-tax-invoice-debit-note-credit-note-section-86/) -- Section 86 full text reference
- [Acclime Thailand Corporate Tax Guide](https://thailand.acclime.com/guides/corporate-income-tax/) -- CIT rates and filing deadlines

### Tertiary (LOW confidence)
- None. All findings verified with at least two sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new packages needed, all features use existing dependencies verified in package.json
- Architecture: HIGH -- All patterns directly cloned from Phase 1/2 implementations verified in source code
- CIT calculation: HIGH -- Three-tier rates, eligibility criteria, and filing dates confirmed by THAI_TAX_REFERENCE.md + PwC + Acclime
- 65 tri flagging: HIGH for the flag categories and cap formulas; MEDIUM for AI prompt effectiveness (unknown until real-world testing)
- Credit/debit note: HIGH -- Required fields confirmed by Revenue Department official English site (rd.go.th)
- Pitfalls: HIGH -- Derived from codebase analysis (FIRST_CLASS_COLUMNS pattern, satang arithmetic, fiscal year handling)

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable -- Thai tax rates and Revenue Code sections rarely change mid-year)
