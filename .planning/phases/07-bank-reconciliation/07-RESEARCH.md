# Phase 7: Bank Reconciliation - Research

**Researched:** 2026-03-26
**Domain:** CSV/Excel bank statement parsing, multi-factor transaction matching, reconciliation workflow UI
**Confidence:** HIGH

## Summary

Phase 7 adds bank reconciliation to BanChee: import Thai bank CSV/Excel statements, map columns via dropdown UI with bank presets (KBank/SCB/BBL), auto-match entries against existing transactions using a multi-factor scoring algorithm, review matches in a two-column UI, and create new transactions from unmatched entries. The reconciliation status is tracked per statement.

The technical foundation is strong. All required libraries are already installed: `@fast-csv/parse` v5.0.2 for CSV, `ExcelJS` v4.4.0 for Excel reading, `date-fns` v3.6.0 for date proximity scoring. The critical finding is that Node.js 23's built-in `TextDecoder` natively supports `windows-874` (TIS-620) encoding, so **no new dependency is needed** for Thai encoding conversion. The BankStatement and BankEntry Prisma models are designed in ARCHITECTURE.md but not yet in the schema -- they must be added via migration. The matching algorithm is pure TypeScript: exact amount comparison (satang integers), date-fns `differenceInDays` for proximity, and simple substring/includes for description matching.

**Primary recommendation:** Build in 4 waves: (1) Prisma models + bank statement parser service with encoding/B.E. detection, (2) import action + column mapping UI with bank presets, (3) matching algorithm service + review UI with confirm/reject, (4) create-transaction-from-unmatched + statement list page with status tracking.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: File upload accepts both CSV and Excel (.xlsx). CSV parsed with @fast-csv/parse, Excel with ExcelJS -- both already installed.
- D-02: Column mapping uses dropdown selectors: show first 3 preview rows, each column gets a dropdown with options: Date / Description / Deposit / Withdrawal / Balance / Reference / Skip.
- D-03: Thai banks use separate Deposit and Withdrawal columns (not signed amounts). The import form expects this pattern.
- D-04: Auto-detect encoding: try UTF-8 first, fall back to TIS-620 (Windows-874) if garbled Thai characters detected.
- D-05: Bank preset selector for top 3 banks: KBank, SCB, BBL. Preset pre-selects column mapping. Fallback: "Other" for manual mapping.
- D-06: Auto-detect Buddhist Era dates: if parsed year > 2400, subtract 543 automatically.
- D-07: Multi-factor matching score: exact amount match (40%), date proximity within 3 days (30%), description keyword similarity (30%). Threshold: score >= 60% to suggest a match.
- D-08: Two-column table review UI: left = bank entries, right = matched BanChee transactions. Confirm/reject per pair.
- D-09: Ambiguous matches: auto-select top-scoring match, show "alternatives" expand for other candidates.
- D-10: Unmatched bank entries get a "Create Transaction" one-click button, pre-fills amount/date/description.
- D-11: All amounts from bank CSV converted to satang at import boundary (multiply by 100, Math.round). Never store baht floats.
- D-12: BankStatement Prisma model: stores file name, import date, bank name, period, total entries, matched count.
- D-13: BankEntry Prisma model: stores each row with date, description, deposit, withdrawal, balance, matched transactionId (nullable), match status.
- D-14: Reconciliation status per statement: imported -> in_progress -> reconciled.
- D-15: Statement list page shows all imported statements with status badges and progress.

### Claude's Discretion
- Exact matching algorithm implementation details
- Column preview rendering and table layout
- Error handling for malformed CSV rows
- Bank preset column configurations (known gap -- need real CSV samples)
- Statement detail page layout

### Deferred Ideas (OUT OF SCOPE)
- Direct bank API integration -- requires bank partnerships, deferred indefinitely
- PDF bank statement parsing -- too inconsistent across banks, defer to v2+
- Recurring transaction detection -- could flag monthly recurring entries, defer to v2
- Multi-account support -- multiple bank accounts per business, defer to v2
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BANK-01 | User can import bank statements from CSV or Excel files with flexible column mapping UI | @fast-csv/parse `parseString` for CSV, ExcelJS `workbook.xlsx.load(buffer)` for Excel. Column mapping dropdown pattern with 3-row preview. Bank presets for KBank/SCB/BBL. |
| BANK-02 | System handles Thai bank CSV variations (TIS-620 encoding, Buddhist Era dates, inconsistent column positions) | Node.js 23 `TextDecoder('windows-874')` for encoding. B.E. detection: year > 2400 subtract 543. Column mapping UI handles position variance. |
| BANK-03 | Auto-matching uses multi-factor scoring: amount (exact match) + date proximity + description similarity | Pure TypeScript scoring: amount equality on satang integers (40%), `differenceInDays` from date-fns (30%), `String.includes` / `toLowerCase` for description (30%). |
| BANK-04 | User can review matched pairs in side-by-side UI: confirm, reject, or manually match | Two-column table component. Server actions: `confirmMatchAction`, `rejectMatchAction`, `manualMatchAction`. |
| BANK-05 | Unmatched bank entries can create new transactions directly from the reconciliation view | `createTransactionFromEntryAction` reuses existing `createTransaction` from `models/transactions.ts`, pre-fills from BankEntry data. |
| BANK-06 | Reconciliation status tracked per statement (imported/in-progress/reconciled) | `status` field on BankStatement model. "reconciled" when all entries are matched/created/skipped. Computed from entry match counts. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @fast-csv/parse | 5.0.2 | CSV string/stream parsing | Already installed, used in `models/export_and_import.ts`. `parseString()` handles buffer-to-rows. |
| ExcelJS | 4.4.0 | Excel .xlsx file reading | Already installed, used in `services/export-excel.ts`. `workbook.xlsx.load(buffer)` reads uploaded files. |
| date-fns | 3.6.0 | Date proximity calculation | Already installed. `differenceInDays()` for matching score date component. |
| Prisma | 6.6.0 | BankStatement + BankEntry models | Already installed. New models follow existing UUID PK + @map pattern. |
| Zod | 3.24.2 | Form validation for import/mapping | Already installed. New schemas for column mapping and bank selection. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js TextDecoder | built-in (v23) | TIS-620/Windows-874 encoding conversion | When CSV is not valid UTF-8 -- `new TextDecoder('windows-874').decode(buffer)` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TextDecoder (built-in) | iconv-lite (0.7.2) | iconv-lite has broader encoding support but TextDecoder covers TIS-620/Windows-874 natively in Node 23. No new dependency needed. |
| String.includes for description matching | Fuse.js (fuzzy search) | Fuse.js adds 6kB. Simple contains/includes handles 90%+ of Thai bank descriptions. Exact amount is the primary discriminator anyway. |
| Manual column mapping | Hardcoded bank parsers | Column mapping UI is more robust: bank CSV formats change without notice. Presets accelerate the common case. |

**Installation:**
```bash
# No new packages to install. All required libraries are already in package.json.
# Only Prisma migration is needed:
npx prisma migrate dev --name add_bank_reconciliation
```

## Architecture Patterns

### Recommended Project Structure
```
app/(app)/apps/bank-reconciliation/
  manifest.ts                     # { code: "bank-reconciliation", name: "กระทบยอดธนาคาร" }
  page.tsx                        # Statement list page (Server Component)
  [statementId]/
    page.tsx                      # Review page for a single statement
  actions.ts                      # importStatement, confirmMatch, rejectMatch, createFromEntry, skipEntry
  components/
    statement-upload.tsx           # Client: file upload + bank preset selector + column mapping
    column-mapper.tsx              # Client: dropdown mapping UI with preview rows
    match-review-table.tsx         # Client: two-column review table
    statement-list.tsx             # Client: list of imported statements with status/progress

services/
  bank-statement-parser.ts        # CSV/Excel parsing + encoding detection + B.E. conversion
  bank-reconciliation.ts          # Multi-factor matching algorithm

models/
  bank-statements.ts              # BankStatement + BankEntry CRUD (Prisma queries)

forms/
  bank-statement.ts               # Zod schemas for import form + column mapping
```

### Pattern 1: Bank Statement Parser Service
**What:** Pure function that takes a file buffer + column mapping and returns normalized `ParsedBankEntry[]` rows.
**When to use:** Called by the import server action after the user confirms column mapping.
**Example:**
```typescript
// services/bank-statement-parser.ts
import { parseString } from "@fast-csv/parse"

export type ColumnMapping = {
  date: number       // column index
  description: number
  deposit: number | null
  withdrawal: number | null
  balance: number | null
  reference: number | null
}

export type ParsedBankEntry = {
  date: Date
  description: string
  deposit: number    // satang (0 if withdrawal)
  withdrawal: number // satang (0 if deposit)
  balance: number | null // satang
  reference: string | null
}

/**
 * Detect if a buffer is TIS-620 encoded.
 * Check: try UTF-8 decode, look for Thai Unicode range (0x0E00-0x0E7F).
 * If no Thai chars found but buffer has bytes in 0xA1-0xFB range, it is TIS-620.
 */
export function detectEncoding(buffer: Buffer): "utf-8" | "windows-874" {
  const utf8Text = new TextDecoder("utf-8", { fatal: false }).decode(buffer)
  const hasThaiUnicode = /[\u0E00-\u0E7F]/.test(utf8Text)
  if (hasThaiUnicode) return "utf-8"

  // Check for TIS-620 byte range (Thai chars are 0xA1-0xFB in TIS-620)
  const hasTIS620Bytes = buffer.some((b) => b >= 0xA1 && b <= 0xFB)
  if (hasTIS620Bytes) return "windows-874"

  return "utf-8" // default
}

/**
 * Convert B.E. year to Gregorian if needed.
 * B.E. years are > 2400 (e.g., 2569 -> 2026).
 */
export function normalizeYear(year: number): number {
  return year > 2400 ? year - 543 : year
}

/**
 * Convert baht string to satang integer at import boundary.
 * Handles comma-separated Thai number formats: "1,234.56" -> 123456
 */
export function bahtToSatang(value: string): number {
  const cleaned = value.replace(/[,\s]/g, "")
  const num = parseFloat(cleaned)
  if (isNaN(num)) return 0
  return Math.round(num * 100)
}
```

### Pattern 2: Multi-Factor Matching Algorithm
**What:** Score-based matching between bank entries and transactions. Returns sorted candidates.
**When to use:** After import, before user review.
**Example:**
```typescript
// services/bank-reconciliation.ts
import { differenceInDays } from "date-fns"

export type MatchCandidate = {
  transactionId: string
  score: number       // 0-100
  reasons: string[]   // ["exact_amount", "date_within_1_day", "description_match"]
}

export function scoreMatch(
  entryAmount: number,   // satang (positive for deposit, negative for withdrawal)
  entryDate: Date,
  entryDescription: string,
  txTotal: number,       // satang (from Transaction.total)
  txDate: Date,          // from Transaction.issuedAt
  txName: string         // from Transaction.name or Transaction.merchant
): MatchCandidate {
  let score = 0
  const reasons: string[] = []

  // Amount match: 40 points for exact match on absolute value
  if (Math.abs(entryAmount) === Math.abs(txTotal)) {
    score += 40
    reasons.push("exact_amount")
  }

  // Date proximity: 30 points max
  const daysDiff = Math.abs(differenceInDays(entryDate, txDate))
  if (daysDiff === 0) { score += 30; reasons.push("same_date") }
  else if (daysDiff <= 1) { score += 25; reasons.push("date_within_1_day") }
  else if (daysDiff <= 3) { score += 20; reasons.push("date_within_3_days") }
  else if (daysDiff <= 7) { score += 10; reasons.push("date_within_7_days") }

  // Description similarity: 30 points max
  const entryLower = entryDescription.toLowerCase()
  const txLower = (txName || "").toLowerCase()
  if (txLower && entryLower.includes(txLower)) {
    score += 30; reasons.push("description_contains")
  } else if (txLower && txLower.includes(entryLower.substring(0, 10))) {
    score += 15; reasons.push("partial_description")
  }

  return { transactionId: "", score, reasons }
}
```

### Pattern 3: Server Action Pattern (Following Existing Convention)
**What:** Server actions use `ActionState<T>` return type, `getCurrentUser()` for auth, Zod validation.
**When to use:** All bank reconciliation mutations.
**Example:**
```typescript
// app/(app)/apps/bank-reconciliation/actions.ts
"use server"
import { ActionState } from "@/lib/actions"
import { getCurrentUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function importBankStatementAction(
  prevState: ActionState<{ statementId: string }> | null,
  formData: FormData
): Promise<ActionState<{ statementId: string }>> {
  try {
    const user = await getCurrentUser()
    // ... parse file, create BankStatement + BankEntry rows
    revalidatePath("/apps/bank-reconciliation")
    return { success: true, data: { statementId: "..." } }
  } catch (error) {
    console.error("Failed to import bank statement:", error)
    return { success: false, error: "นำเข้ารายการธนาคารไม่สำเร็จ" }
  }
}
```

### Pattern 4: BankEntry Match Status State Machine
**What:** BankEntry.matchStatus tracks reconciliation progress per entry.
**When to use:** All match status transitions.
```
unmatched  ->  suggested  (auto-match found candidate, score >= 60%)
suggested  ->  confirmed  (user clicks confirm)
suggested  ->  unmatched  (user clicks reject)
unmatched  ->  confirmed  (user manually matches)
unmatched  ->  created    (user creates transaction from entry)
unmatched  ->  skipped    (user explicitly skips)
confirmed  ->  unmatched  (user un-matches)
```

### Anti-Patterns to Avoid
- **Auto-confirming matches:** Never auto-confirm, even at 100% confidence. Financial reconciliation requires human review. Always set matchStatus to "suggested", not "confirmed".
- **Storing baht floats in BankEntry:** Always convert to satang at import boundary. Bank CSVs have values like "1,234.56" -- parse, multiply by 100, Math.round, store as integer.
- **Hardcoding column positions per bank:** Use the dropdown mapping UI. Bank presets only PRE-SELECT the mapping, user can override.
- **Parsing entire CSV into memory at once:** For large files (>5000 rows), consider streaming. However, for v1.1 SME use case, `parseString` on the full buffer is acceptable (typical statements are <500 rows).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom line-by-line parser | `@fast-csv/parse` `parseString()` | Handles quoted fields, escaped delimiters, multi-line values, edge cases |
| Excel reading | Manual .xlsx extraction | `ExcelJS` `workbook.xlsx.load(buffer)` | XLSX is a complex ZIP-based format with shared strings, styles, relationships |
| Date difference | Manual day subtraction | `date-fns` `differenceInDays()` | Handles timezone offsets, DST transitions, leap years correctly |
| TIS-620 decoding | Byte-by-byte conversion table | Node.js built-in `TextDecoder('windows-874')` | Maintained by ICU, handles edge cases, zero dependency |
| Fuzzy string matching | Custom Levenshtein implementation | `String.includes()` + `toLowerCase()` | For this use case (Thai bank descriptions vs transaction names), simple substring matching is sufficient. Amount is the primary discriminator. |

**Key insight:** The reconciliation algorithm's value is in the scoring weights and threshold, not in fancy matching. Exact amount match on satang integers catches 70%+ of cases. The remaining 30% needs human judgment regardless of algorithmic sophistication.

## Common Pitfalls

### Pitfall 1: TIS-620 Garbled Thai Characters
**What goes wrong:** Thai characters from KBank CSV exports appear as mojibake (e.g., "ร​ายà¸à¸²à¸£" instead of "รายการ").
**Why it happens:** KBank and some other Thai banks export CSVs in TIS-620 (Windows-874) encoding, not UTF-8. If the file is read as UTF-8, multi-byte Thai characters are decoded incorrectly.
**How to avoid:**
1. Read file as raw `Buffer`, not as string.
2. Call `detectEncoding(buffer)` -- check for Thai Unicode range in UTF-8 decode; fall back to TIS-620 if absent but TIS-620 byte range present.
3. Decode with `new TextDecoder('windows-874').decode(buffer)` when TIS-620 detected.
4. Parse the decoded string with `parseString()`.
**Warning signs:** Thai text displaying as Latin characters with diacritics, or as replacement characters (U+FFFD).

### Pitfall 2: Buddhist Era Date Off-by-543-Years
**What goes wrong:** Dates from Thai bank statements are 543 years in the future (e.g., "25/03/2569" parsed as March 2569 instead of March 2026).
**Why it happens:** Thai banks commonly use Buddhist Era (B.E.) calendar where year = Gregorian + 543. KBank and KTB consistently use B.E. SCB uses Gregorian. The parser must handle both.
**How to avoid:**
1. After parsing a date, check if the year component > 2400.
2. If so, subtract 543 to convert to Gregorian.
3. Store only Gregorian dates in the database (existing convention in `services/thai-date.ts`).
4. Never assume a specific format -- let the column mapping and preview rows help the user verify.
**Warning signs:** Bank entries with dates in the 2560s showing up as future entries.

### Pitfall 3: Satang Double-Division on Bank Entry Display
**What goes wrong:** Bank entry amounts display as 1/100th of correct value. A 5,000 THB deposit shows as 50.00.
**Why it happens:** Amounts are converted to satang at import (`"5,000.00" * 100 = 500000`). If the display layer calls `formatCurrency()` which already divides by 100, and the component ALSO divides by 100 before passing to `formatCurrency()`, double-division occurs. This is the same pitfall documented in PITFALLS-v1.1.md Pitfall #1.
**How to avoid:**
1. Store amounts in satang (integer) in BankEntry model.
2. Display with `formatSatangToDisplay(satang)` from `services/tax-calculator.ts` for raw number, or pass satang directly to `formatCurrency()`.
3. Never manually divide by 100 before calling a function that already does the conversion.
**Warning signs:** Amounts showing as fractions of expected values in the review table.

### Pitfall 4: Deposit/Withdrawal Column Confusion
**What goes wrong:** All bank entries show as positive amounts, losing the distinction between money in and money out.
**Why it happens:** Thai banks use separate Deposit and Withdrawal columns (D-03). If the parser treats both as positive numbers and stores only one "amount" field, the transaction direction is lost.
**How to avoid:**
1. BankEntry model has separate `deposit` and `withdrawal` fields (both nullable, both satang).
2. For matching: compute the "effective amount" = deposit > 0 ? +deposit : -withdrawal.
3. Match deposits against income transactions, withdrawals against expense transactions.
4. Display: green for deposits, red for withdrawals (per CONTEXT.md specifics).
**Warning signs:** All entries appearing as the same color/direction in the review UI.

### Pitfall 5: Duplicate Statement Import
**What goes wrong:** User imports the same CSV twice, creating duplicate BankEntry rows. Matching algorithm produces false matches because duplicates exist.
**Why it happens:** No deduplication check on import. The same statement file can be uploaded multiple times.
**How to avoid:**
1. Generate a hash of the file content (e.g., first 1000 bytes + file size) and store on BankStatement.
2. On import, check if a statement with the same hash already exists for this user.
3. If duplicate found, warn the user: "This statement appears to have been imported already."
4. Allow override (re-import) but warn clearly.
**Warning signs:** Statement list showing duplicate entries with identical dates and entry counts.

### Pitfall 6: Matching Amount Sign Mismatch
**What goes wrong:** A 5,000 THB bank deposit (positive) fails to match against a 5,000 THB income transaction because the Transaction.total is stored differently.
**Why it happens:** BankEntry stores deposits as positive satang. Transaction.total for income might be positive, but for expenses it could also be positive (representing the absolute value). The sign conventions may not align between the two models.
**How to avoid:**
1. Always compare absolute values: `Math.abs(entryEffectiveAmount) === Math.abs(transaction.total)`.
2. Also check type alignment: deposits should match income transactions, withdrawals should match expense transactions.
3. Log both values during development for verification.
**Warning signs:** Perfect amount matches being missed; matching only working for one direction (deposits or withdrawals but not both).

## Code Examples

### CSV Parsing with Encoding Detection
```typescript
// services/bank-statement-parser.ts
import { parseString } from "@fast-csv/parse"

export async function parseCSVBuffer(
  buffer: Buffer,
  skipLines: number = 0
): Promise<string[][]> {
  const encoding = detectEncoding(buffer)
  const text = new TextDecoder(encoding).decode(buffer)

  return new Promise((resolve, reject) => {
    const rows: string[][] = []
    parseString(text, {
      headers: false,
      skipLines,
      ignoreEmpty: true,
      trim: true,
    })
      .on("data", (row: string[]) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", (err: Error) => reject(err))
  })
}
```

### Excel Parsing with ExcelJS
```typescript
// services/bank-statement-parser.ts
import ExcelJS from "exceljs"

export async function parseExcelBuffer(buffer: Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const worksheet = workbook.worksheets[0] // first sheet
  if (!worksheet) throw new Error("No worksheet found")

  const rows: string[][] = []
  worksheet.eachRow((row, rowNumber) => {
    const values = row.values as (string | number | Date | null)[]
    // ExcelJS row.values is 1-indexed (index 0 is empty)
    const cells = values.slice(1).map((v) => {
      if (v instanceof Date) return v.toISOString()
      if (v === null || v === undefined) return ""
      return String(v)
    })
    rows.push(cells)
  })
  return rows
}
```

### Bank Preset Column Configurations
```typescript
// services/bank-statement-parser.ts

/**
 * Bank presets define DEFAULT column mappings.
 * User can always override via dropdown UI.
 * IMPORTANT: These are best-guess based on common CSV exports.
 * Real bank CSV formats vary and need validation with actual exports.
 */
export const BANK_PRESETS: Record<string, {
  label: string
  labelTh: string
  defaultMapping: ColumnMapping
  defaultSkipLines: number
  encoding: "utf-8" | "windows-874"
  dateFormat: "DD/MM/YYYY" | "YYYY-MM-DD"
  useBuddhistEra: boolean
}> = {
  kbank: {
    label: "KBank",
    labelTh: "กสิกรไทย",
    defaultMapping: { date: 0, description: 1, withdrawal: 2, deposit: 3, balance: 4, reference: null },
    defaultSkipLines: 1,
    encoding: "windows-874",
    dateFormat: "DD/MM/YYYY",
    useBuddhistEra: true,
  },
  scb: {
    label: "SCB",
    labelTh: "ไทยพาณิชย์",
    defaultMapping: { date: 0, description: 1, withdrawal: 2, deposit: 3, balance: 4, reference: null },
    defaultSkipLines: 1,
    encoding: "utf-8",
    dateFormat: "DD/MM/YYYY",
    useBuddhistEra: false,
  },
  bbl: {
    label: "BBL",
    labelTh: "กรุงเทพ",
    defaultMapping: { date: 0, description: 1, withdrawal: 2, deposit: 3, balance: 4, reference: null },
    defaultSkipLines: 1,
    encoding: "utf-8",
    dateFormat: "DD/MM/YYYY",
    useBuddhistEra: false,
  },
}
```

### Prisma Schema Addition (BankStatement + BankEntry)
```prisma
// Add to prisma/schema.prisma

model BankStatement {
  id              String      @id @default(uuid()) @db.Uuid
  userId          String      @map("user_id") @db.Uuid
  user            User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  bankName        String      @map("bank_name")     // "kbank" | "scb" | "bbl" | "other"
  accountNumber   String?     @map("account_number") // masked: last 4 digits only
  filename        String
  fileHash        String?     @map("file_hash")      // for duplicate detection
  periodStart     DateTime?   @map("period_start")
  periodEnd       DateTime?   @map("period_end")
  status          String      @default("imported")    // "imported" | "in_progress" | "reconciled"

  totalEntries    Int         @default(0) @map("total_entries")
  matchedEntries  Int         @default(0) @map("matched_entries")

  entries         BankEntry[]

  createdAt       DateTime    @default(now()) @map("created_at")

  @@index([userId])
  @@map("bank_statements")
}

model BankEntry {
  id              String        @id @default(uuid()) @db.Uuid
  statementId     String        @map("statement_id") @db.Uuid
  statement       BankStatement @relation(fields: [statementId], references: [id], onDelete: Cascade)

  date            DateTime
  description     String
  deposit         Int?          // satang (null if withdrawal)
  withdrawal      Int?          // satang (null if deposit)
  balance         Int?          // running balance in satang
  reference       String?       // bank reference number

  // Reconciliation
  matchStatus     String        @default("unmatched") @map("match_status")
                                // "unmatched" | "suggested" | "confirmed" | "created" | "skipped"
  transactionId   String?       @map("transaction_id") @db.Uuid
  matchScore      Int?          @map("match_score")   // 0-100 confidence
  matchReasons    Json?         @map("match_reasons")  // ["exact_amount", "same_date"]

  createdAt       DateTime      @default(now()) @map("created_at")

  @@index([statementId])
  @@index([matchStatus])
  @@index([date])
  @@map("bank_entries")
}

// Also add to User model:
// bankStatements  BankStatement[]
```

### Key Differences from ARCHITECTURE.md Schema

The ARCHITECTURE.md designed the BankEntry model with a single `amount` field (positive=deposit, negative=withdrawal). Based on CONTEXT.md D-03 and D-13, the model uses separate `deposit` and `withdrawal` fields instead. This aligns better with Thai bank CSV format (always separate columns) and avoids sign-confusion in matching.

Additional fields added beyond ARCHITECTURE.md:
- `BankStatement.fileHash` -- for duplicate import detection (Pitfall 5)
- `BankStatement.status` -- reconciliation status per D-14 ("imported" | "in_progress" | "reconciled")
- `BankEntry.matchScore` -- numeric 0-100 (was `matchConfidence: String` in ARCHITECTURE.md, changed to Int for scoring)
- `BankEntry.matchReasons` -- JSON array of string reasons for transparency in review UI

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| iconv-lite for TIS-620 | Node.js TextDecoder (built-in) | Node.js 16+ | Zero dependency for Thai encoding |
| `@fast-csv/parse` v4 (bundled in fast-csv) | `@fast-csv/parse` v5 (standalone) | 2023 | Already installed at v5.0.2; standalone import |
| Single amount column (signed) | Separate deposit/withdrawal columns | Design decision | Matches Thai bank CSV format; avoids sign confusion |

**Deprecated/outdated:**
- `csv-parse` (alternative parser): Still maintained but project already uses @fast-csv/parse. Do not introduce a second CSV library.
- `iconv-lite` for TIS-620: Unnecessary in Node.js 23; TextDecoder handles it natively.

## Open Questions

1. **Bank preset accuracy**
   - What we know: KBank likely uses TIS-620 and B.E. dates. SCB likely uses UTF-8 and Gregorian dates. BBL likely exports Excel, not CSV.
   - What's unclear: Exact column positions per bank. These vary by account type and download method.
   - Recommendation: Ship presets as best-guess defaults. Column mapping UI is the safety net. Users verify via the 3-row preview. Update presets based on real user feedback.

2. **Large file performance**
   - What we know: `parseString` loads entire CSV into memory. Typical SME bank statements are 100-500 rows.
   - What's unclear: At what row count does synchronous parsing become problematic in a server action?
   - Recommendation: For v1.1, synchronous parsing is fine. Add a 10,000-row hard limit with error message. Streaming can be added in v2 if needed.

3. **Transaction type alignment for matching**
   - What we know: Bank deposits should match income transactions. Bank withdrawals should match expenses.
   - What's unclear: How to handle transfers between accounts (neither income nor expense in the traditional sense).
   - Recommendation: Match by amount/date regardless of type for now. The review UI lets users correct mismatches. Type checking can be added as a bonus scoring factor (not blocking).

## Sources

### Primary (HIGH confidence)
- BanChee codebase: `models/documents.ts`, `services/document-workflow.ts`, `models/export_and_import.ts`, `services/tax-calculator.ts`, `services/export-excel.ts`, `services/thai-date.ts`
- @fast-csv/parse v5.0.2 type definitions: `ParserOptionsArgs` interface with `parseString`, `skipLines`, `headers`, `trim`, `ignoreEmpty`, `encoding`
- ExcelJS v4.4.0 README: `workbook.xlsx.load(buffer)` API for reading .xlsx from buffer
- Node.js 23 TextDecoder: Verified `windows-874` and `tis-620` encoding support via runtime test
- date-fns v3.6.0: Verified `differenceInDays()` returns absolute day count

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` -- BankStatement/BankEntry model design (adapted for separate deposit/withdrawal per D-03)
- `.planning/research/PITFALLS-v1.1.md` -- Thai bank CSV pitfalls (TIS-620, B.E. dates, format variations)
- `.planning/research/STACK.md` -- Zero new dependencies confirmation

### Tertiary (LOW confidence)
- Thai bank CSV column positions in BANK_PRESETS: Best-guess based on community reports and SCB statement converter (GitHub). Need validation with real exports. Flagged as "known gap" in CONTEXT.md.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified as installed, APIs confirmed via type definitions and runtime tests
- Architecture: HIGH - Follows established BanChee patterns (Server Components, server actions, models layer, Prisma)
- Pitfalls: HIGH - Based on codebase analysis and documented v1.1 pitfalls research
- Bank presets: LOW - Need real CSV samples to validate column positions

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable -- no fast-moving dependencies)
