# Phase 3: CIT + Tax Intelligence + Dashboard - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

SME corporate income tax estimation with tiered rate calculation, AI flagging of non-deductible expenses (Section 65 tri), credit note/debit note workflow for invoice corrections, and unified monthly tax summary dashboard showing VAT + WHT + CIT + flags. Builds on Phase 1's tax calculator and Phase 2's WHT/invoice infrastructure.

</domain>

<decisions>
## Implementation Decisions

### CIT Estimation UX
- **D-01:** CIT calculator as a dedicated page/app (same pattern as VAT report and WHT report apps). Shows: total income, total deductible expenses, non-deductible flags, net profit, tiered rate breakdown (0% on first 300K, 15% on 300K-3M, 20% above), estimated CIT amount.
- **D-02:** PND50 (annual) and PND51 (half-year) helpers show the same calculation but for the relevant period. Not PDF forms — data summary that user can reference when filing manually on rd.go.th.
- **D-03:** SME eligibility check: auto-verify capital ≤5M and revenue ≤30M from business profile. If not eligible, show standard 20% flat rate instead.

### Section 65 Tri Flagging
- **D-04:** AI flags non-deductible expenses DURING receipt scanning (extends Phase 1 AI extraction flow). If AI detects a potential 65 tri item, show warning badge alongside existing validation badges.
- **D-05:** Dashboard shows running summary of flagged items: entertainment expense running total vs 0.3% cap, charitable donations vs 2% cap, total non-deductible amount. Color-coded (green=under limit, amber=approaching, red=over limit).
- **D-06:** 65 tri categories to flag: (1) provisions/reserves, (2) personal expenses, (3) charitable >2%, (4) entertainment >0.3% or >10M, (5) capital expenditure, (6) fines/penalties, (7) expenses without identified recipient, (8) CIT payments.

### Credit Note / Debit Note
- **D-07:** Follow tax invoice creation pattern from Phase 2. Form with required fields, links to original invoice, auto-adjusts linked transaction amounts. THSarabunNew PDF output.

### Tax Summary Dashboard
- **D-08:** Unified monthly summary page (new section on dashboard, below existing widgets). Shows: VAT payable/credit, WHT total withheld, estimated CIT (annualized from YTD), flagged expenses count + amount, next filing deadlines.
- **D-09:** Simple card layout — not a complex analytical dashboard. Target user is non-accountant. Headline numbers + color coding. "ภาพรวมภาษีประจำเดือน" (Monthly Tax Overview).

### Claude's Discretion
- CIT calculator page layout and field arrangement
- 65 tri flag badge visual design and warning wording
- Credit/debit note form field layout
- Tax summary dashboard card arrangement and responsive behavior
- PND50/PND51 data presentation format
- Entertainment expense cap calculation implementation details

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Thai Tax Compliance
- `.planning/research/THAI_TAX_REFERENCE.md` — Section 8 (65 tri complete list), Section 9 (SME tax rates + eligibility), Section 10 (filing deadlines for PND50/PND51)
- `.planning/research/FEATURES.md` — CIT competitor features, tax intelligence differentiators

### Prior Phase Context
- `.planning/phases/01-thai-foundation-vat-compliance/01-CONTEXT.md` — Thai UI, one-click report pattern, review-before-save
- `.planning/phases/02-wht-tax-invoices-filing-deadlines/02-CONTEXT.md` — Report generation pattern, filing dashboard, contact management

### Codebase (from Phase 1+2 execution)
- `services/tax-calculator.ts` — Extend with CIT calculation functions (calculateSMECIT)
- `models/stats.ts` — Extend with getCITEstimate, getNonDeductibleSummary
- `app/(app)/apps/vat-report/` — Clone pattern for CIT report app
- `app/(app)/apps/tax-invoice/` — Clone pattern for credit/debit note
- `components/dashboard/` — Add tax summary section alongside existing widgets
- `ai/prompt.ts` + `models/defaults.ts` — Extend AI prompt for 65 tri flagging

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `services/tax-calculator.ts` — Add calculateSMECIT(netProfit, isEligible) function
- `models/stats.ts` — Add getCITEstimate(userId, year), getNonDeductibleSummary(userId, year)
- `app/(app)/apps/` — Report app pattern (manifest, page, actions, components) used 3 times now
- `components/dashboard/` — Card gradient pattern, parallel data fetching in dashboard/page.tsx
- `ai/validators/tax-invoice-validator.ts` — Extend validation pattern for 65 tri flagging
- `exports/pdf/` — THSarabunNew fonts + thai-pdf-styles for credit note PDFs

### Established Patterns
- **Report apps:** manifest.ts → page.tsx → actions.ts → client.tsx → preview.tsx → pdf.tsx
- **Dashboard widgets:** Parallel fetch in page.tsx, conditional render based on data
- **AI flagging:** Validation badges pattern from Phase 1 (✓/✗ inline)
- **Form + PDF:** Zod schema → server action → PDF component → preview dialog

### Integration Points
- **AI prompt:** Add 65 tri detection instructions to DEFAULT_PROMPT_ANALYSE_NEW_FILE
- **Dashboard page:** Add monthly tax summary section (3rd section after VAT + filing deadlines)
- **Transaction model:** Add `isNonDeductible` boolean + `nonDeductibleReason` string fields
- **Credit/debit note:** New app route at `app/(app)/apps/credit-note/`
- **CIT app:** New app route at `app/(app)/apps/cit-report/`

</code_context>

<specifics>
## Specific Ideas

- CIT estimation should feel like a simple calculator — input is automatic (from transaction totals), output is "you owe approximately X baht"
- 65 tri flagging is the "smart accountant" moment — AI catches things a non-accountant would miss
- Tax summary dashboard is the "peace of mind" view — one glance tells you everything's OK or needs attention
- Credit notes should be rare — keep the UI simple, linked from original invoice

</specifics>

<deferred>
## Deferred Ideas

- Revenue Dept XML export for CIT — Phase 4
- Full general ledger / chart of accounts — out of scope
- Tax optimization suggestions (beyond flagging) — v2

</deferred>

---

*Phase: 03-cit-tax-intelligence-dashboard*
*Context gathered: 2026-03-23*
