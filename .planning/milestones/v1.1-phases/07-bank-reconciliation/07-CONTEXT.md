# Phase 7: Bank Reconciliation - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Import bank statements from CSV or Excel files, map columns flexibly, auto-match entries against BanChee transactions using multi-factor scoring, provide a review UI for confirming/rejecting matches, and allow creating new transactions from unmatched entries. Track reconciliation status per statement.

Requirements: BANK-01, BANK-02, BANK-03, BANK-04, BANK-05, BANK-06

</domain>

<decisions>
## Implementation Decisions

### Import UX + Column Mapping
- **D-01:** File upload accepts both CSV and Excel (.xlsx). CSV parsed with @fast-csv/parse, Excel with ExcelJS — both already installed.
- **D-02:** Column mapping uses dropdown selectors: show first 3 preview rows, each column gets a dropdown with options: Date / Description / Deposit / Withdrawal / Balance / Reference / Skip.
- **D-03:** Thai banks use separate Deposit and Withdrawal columns (not signed amounts). The import form expects this pattern.
- **D-04:** Auto-detect encoding: try UTF-8 first, fall back to TIS-620 (Windows-874) if garbled Thai characters detected.
- **D-05:** Bank preset selector for top 3 banks: KBank (กสิกรไทย), SCB (ไทยพาณิชย์), BBL (กรุงเทพ). Preset pre-selects column mapping. Fallback: "อื่นๆ" (Other) for manual mapping via dropdowns.
- **D-06:** Auto-detect Buddhist Era dates: if parsed year > 2400, subtract 543 automatically. Handles both B.E. and Gregorian without user toggle.

### Matching Rules + Review UI
- **D-07:** Multi-factor matching score: exact amount match (40%), date proximity within 3 days (30%), description keyword similarity (30%). Threshold: score ≥ 60% to suggest a match.
- **D-08:** Two-column table review UI: left column = bank entries, right column = matched BanChee transactions. Each pair has confirm (✓) and reject (✗) buttons.
- **D-09:** Ambiguous matches: auto-select the top-scoring match, show "alternatives" expand to see other candidates and switch.
- **D-10:** Unmatched bank entries get a "สร้างรายการ" (Create Transaction) one-click button — pre-fills transaction with bank entry amount, date, and description as defaults.
- **D-11:** All amounts from bank CSV converted to satang at import boundary (multiply by 100, Math.round). Never store baht floats.

### Reconciliation Status
- **D-12:** BankStatement Prisma model: stores file name, import date, bank name, period, total entries, matched count.
- **D-13:** BankEntry Prisma model: stores each row from the statement with date, description, deposit, withdrawal, balance, matched transactionId (nullable), match status (unmatched/matched/created/skipped).
- **D-14:** Reconciliation status per statement: imported → in_progress → reconciled. "Reconciled" when all entries are either matched, created, or skipped.
- **D-15:** Statement list page shows all imported statements with status badges and progress (e.g., "45/50 entries resolved").

### Claude's Discretion
- Exact matching algorithm implementation details
- Column preview rendering and table layout
- Error handling for malformed CSV rows
- Bank preset column configurations (will need real CSV samples to validate)
- Statement detail page layout

</decisions>

<specifics>
## Specific Ideas

- Import flow: Upload file → select bank preset (or manual) → preview with column dropdowns → confirm import → auto-match runs → review page opens
- The review page should feel like a checklist — work through entries top to bottom, confirm/reject/skip each one
- Show running progress: "23/50 entries resolved" with a progress bar at the top
- Bank entry amounts should display as green (deposit) or red (withdrawal) for visual clarity

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing patterns
- `app/(app)/apps/quotation/actions.ts` — Server action pattern for CRUD
- `models/documents.ts` — Model layer pattern with Prisma queries
- `services/tax-calculator.ts` — formatCurrency, satang conventions
- `models/export_and_import.ts` — Existing CSV import logic (for transactions)

### Research
- `.planning/research/ARCHITECTURE.md` — BankStatement + BankEntry model design
- `.planning/research/PITFALLS-v1.1.md` — Thai bank CSV pitfalls, encoding, B.E. dates
- `.planning/research/STACK.md` — @fast-csv/parse for CSV, ExcelJS for Excel, no new deps

### Data format references
- KBank, SCB, BBL CSV format details need validation with real exports (known gap)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **@fast-csv/parse** — Already installed, used in `models/export_and_import.ts` for CSV import
- **ExcelJS** — Already installed, used in `services/export-excel.ts` for export (can use for import too)
- **Transaction model** — `models/transactions.ts` with createTransaction for new transactions from unmatched entries
- **formatCurrency** — `services/tax-calculator.ts` for amount display
- **StatusBadge** — Reusable component from Phase 5/6 for reconciliation status
- **Server action pattern** — ActionState<T> return type, Zod validation

### Established Patterns
- Satang integers for all amounts (×100 at import boundary)
- Server Components for list pages, Client Components for interactive forms
- Models layer wraps all Prisma queries
- Sequential page pattern: list → detail → actions

### Integration Points
- BankEntry.matchedTransactionId links to Transaction.id
- Creating transaction from unmatched entry reuses existing createTransaction model function
- Statement list page as new app: /apps/bank-reconciliation

</code_context>

<deferred>
## Deferred Ideas

- **Direct bank API integration** — requires bank partnerships, deferred indefinitely
- **PDF bank statement parsing** — too inconsistent across banks, defer to v2+
- **Recurring transaction detection** — could flag monthly recurring entries, defer to v2
- **Multi-account support** — multiple bank accounts per business, defer to v2

</deferred>

---

*Phase: 07-bank-reconciliation*
*Context gathered: 2026-03-26*
