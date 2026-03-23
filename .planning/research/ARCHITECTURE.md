# Architecture Patterns

**Domain:** Thai SME Tax Compliance Extension for TaxHacker Fork
**Researched:** 2026-03-23

---

## Recommended Architecture

Extend TaxHacker's existing server-first Next.js 15 architecture with six new component layers. Do NOT rewrite existing components -- add alongside them. The existing architecture (Server Components + Server Actions + models/ + ai/) remains intact. New Thai tax features plug into the same patterns.

### System Diagram

```
                    +----------------------------------+
                    |        Presentation Layer         |
                    |   app/(app)/                      |
                    |   +------ tax-dashboard/          |  <-- NEW: Thai tax overview
                    |   +------ apps/vat-report/        |  <-- NEW: PP.30 generation
                    |   +------ apps/wht-report/        |  <-- NEW: PND 3/53 generation
                    |   +------ apps/tax-ledger/        |  <-- NEW: Purchase/Sales ledger
                    |   +------ apps/tax-calendar/      |  <-- NEW: Filing deadlines
                    +----------------+-----------------+
                                     |
                    +----------------+-----------------+
                    |         Service Layer             |  <-- NEW LAYER
                    |   services/                       |
                    |   +------ tax-calculator.ts       |  VAT/WHT/CIT computation
                    |   +------ tax-validator.ts        |  Invoice field validation
                    |   +------ filing-period.ts        |  Period computation + deadlines
                    |   +------ report-generator.ts     |  PDF/Excel/XML dispatch
                    +----------------+-----------------+
                                     |
                    +----------------+-----------------+
                    |          Models Layer             |
                    |   models/                         |
                    |   +------ transactions.ts         |  EXTEND: VAT/WHT fields
                    |   +------ tax-filings.ts          |  <-- NEW: Filing records
                    |   +------ wht-certificates.ts     |  <-- NEW: WHT cert CRUD
                    |   +------ tax-config.ts           |  <-- NEW: Tax rules config
                    |   +------ stats.ts                |  EXTEND: Tax summaries
                    +----------------+-----------------+
                                     |
                    +----------------+-----------------+
                    |          AI Pipeline              |
                    |   ai/                             |
                    |   +------ prompt.ts               |  EXTEND: Thai prompt builder
                    |   +------ prompts/                |  <-- NEW: Per-document-type prompts
                    |   |       +-- thai-tax-invoice.ts  |
                    |   |       +-- thai-receipt.ts      |
                    |   +------ validators/             |  <-- NEW: Post-AI validation
                    |           +-- tax-invoice.ts       |
                    +----------------+-----------------+
                                     |
                    +----------------+-----------------+
                    |       Export Pipeline              |  <-- NEW LAYER
                    |   exports/                         |
                    |   +------ pdf/                     |  @react-pdf/renderer + Thai fonts
                    |   +------ excel/                   |  ExcelJS (server-side)
                    |   +------ rd-xml/                  |  Revenue Dept upload format
                    |   +------ flowaccount/             |  FlowAccount CSV compat
                    +----------------+-----------------+
                                     |
                    +----------------+-----------------+
                    |       i18n Layer                   |  <-- NEW LAYER
                    |   messages/                        |
                    |   +------ th.json                  |  Thai translations
                    |   +------ en.json                  |  English translations
                    |   i18n/                            |
                    |   +------ request.ts               |  next-intl config
                    |   +------ routing.ts               |  Locale config
                    +----------------------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With | New/Extend |
|-----------|---------------|-------------------|------------|
| **services/tax-calculator.ts** | All tax math: VAT 7%, WHT 1-5%, CIT rates, Section 65 tri flags | models/, called by Server Actions | NEW |
| **services/tax-validator.ts** | Validate 10 required Thai tax invoice fields, TIN format, document completeness | ai/ (post-extraction), Server Actions | NEW |
| **services/filing-period.ts** | Compute filing periods, deadlines, check if overdue, generate reminders | models/tax-filings, Server Actions | NEW |
| **services/report-generator.ts** | Dispatch to PDF/Excel/XML generators, orchestrate multi-format export | exports/, models/ | NEW |
| **models/tax-filings.ts** | CRUD for TaxFiling records (PP30, PND3, PND53, PND50) | prisma, services/ | NEW |
| **models/wht-certificates.ts** | CRUD for WHT certificate records | prisma, services/ | NEW |
| **models/tax-config.ts** | Tax rates, thresholds, rules per tax year (data, not logic) | prisma, services/ | NEW |
| **exports/pdf/** | Generate Thai PDF reports (PP30, WHT certs) with Thai fonts | @react-pdf/renderer, services/ | NEW |
| **exports/excel/** | Generate Excel for tax ledgers, FlowAccount-compatible format | ExcelJS, services/ | NEW |
| **exports/rd-xml/** | Generate RD e-Filing upload format (text/CSV, not true XML) | services/ | NEW |
| **ai/prompts/** | Per-document-type Thai extraction prompts | ai/prompt.ts, ai/schema.ts | NEW |
| **ai/validators/** | Post-AI structured validation (TIN checksums, required fields) | services/tax-validator | NEW |
| **messages/** | i18n translation files (th.json, en.json) | next-intl runtime | NEW |
| **models/transactions.ts** | Extended with VAT/WHT first-class columns | prisma, services/ | EXTEND |
| **models/stats.ts** | Extended with tax summary aggregations | prisma, services/ | EXTEND |
| **models/defaults.ts** | Thai categories, Thai field prompts, THB default | prisma | EXTEND |

---

## 1. Database Schema Extensions (Prisma)

### 1.1 Transaction Model Extension

Promote VAT/WHT from the `extra` JSON column to first-class database columns. This is critical -- tax calculations require indexed, queryable, type-safe fields. The existing `extra` JSON column cannot be efficiently aggregated with `GROUP BY`.

```prisma
model Transaction {
  // ... existing fields unchanged ...

  // === NEW: Thai Tax Fields ===
  subtotal              Int?                  // Pre-tax amount (satang)
  vatRate               Int?      @map("vat_rate")       // e.g. 700 = 7.00%
  vatAmount             Int?      @map("vat_amount")     // VAT in satang
  vatType               String?   @map("vat_type")       // "input" | "output" | "none"
  whtRate               Int?      @map("wht_rate")       // e.g. 300 = 3.00%
  whtAmount             Int?      @map("wht_amount")     // WHT in satang
  whtFormType           String?   @map("wht_form_type")  // "pnd3" | "pnd53"
  merchantTaxId         String?   @map("merchant_tax_id") // 13-digit Thai TIN
  merchantBranch        String?   @map("merchant_branch") // "00000" = HQ, "00001" = Branch 1
  documentNumber        String?   @map("document_number") // Tax invoice number
  documentType          String?   @map("document_type")   // "tax_invoice" | "receipt" | "credit_note" | "debit_note"
  isDeductible          Boolean   @default(true) @map("is_deductible")  // Section 65 tri flag
  nonDeductibleReason   String?   @map("non_deductible_reason")

  // === NEW: Indexes for tax queries ===
  @@index([vatType])
  @@index([whtFormType])
  @@index([documentType])
  @@index([merchantTaxId])
}
```

**Why first-class columns, not extra JSON:**
- Tax reports need `SUM(vatAmount) WHERE vatType = 'input' AND issuedAt BETWEEN ...` -- impossible to do efficiently with JSON
- WHT certificate generation needs to query by `merchantTaxId` and `whtFormType`
- Filing period reports need indexed date + tax type queries
- The existing `vat_rate` and `vat` extra fields in DEFAULT_FIELDS should be migrated to these columns in a data migration

**Amount storage convention:** Continue TaxHacker's pattern of storing amounts as integers (satang = 1/100 baht). Rates stored as basis points (700 = 7.00%) to avoid floating-point issues.

### 1.2 New Models

```prisma
model TaxFiling {
  id            String    @id @default(uuid()) @db.Uuid
  userId        String    @map("user_id") @db.Uuid
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  formType      String    @map("form_type")   // "pp30" | "pnd3" | "pnd53" | "pnd50" | "pnd51"
  periodMonth   Int       @map("period_month") // 1-12
  periodYear    Int       @map("period_year")  // Gregorian year (not B.E.)
  status        String    @default("draft")    // "draft" | "generated" | "filed" | "overdue"
  filedAt       DateTime? @map("filed_at")
  dueDate       DateTime  @map("due_date")
  totalTax      Int?      @map("total_tax")    // satang
  totalBase     Int?      @map("total_base")   // satang
  data          Json?                          // Form-specific computed data snapshot
  generatedFile String?   @map("generated_file") // Path to generated PDF/Excel
  note          String?
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  @@unique([userId, formType, periodMonth, periodYear])
  @@index([userId])
  @@index([status])
  @@index([dueDate])
  @@map("tax_filings")
}

model WhtCertificate {
  id              String    @id @default(uuid()) @db.Uuid
  userId          String    @map("user_id") @db.Uuid
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  certificateNo   String    @map("certificate_no")
  payerTaxId      String    @map("payer_tax_id")    // Your company TIN
  payerName       String    @map("payer_name")
  payerBranch     String    @map("payer_branch")
  payeeTaxId      String    @map("payee_tax_id")    // Recipient TIN
  payeeName       String    @map("payee_name")
  payeeBranch     String?   @map("payee_branch")
  payeeType       String    @map("payee_type")      // "individual" | "company"
  formType        String    @map("form_type")        // "pnd3" | "pnd53"
  incomeType      String    @map("income_type")      // Revenue Dept income type code
  incomeDesc      String?   @map("income_desc")
  paidDate        DateTime  @map("paid_date")
  paidAmount      Int       @map("paid_amount")      // satang
  whtAmount       Int       @map("wht_amount")       // satang
  whtRate         Int       @map("wht_rate")          // basis points
  conditions      String?                             // "withheld_at_time" | "withheld_forever"
  transactionId   String?   @map("transaction_id") @db.Uuid
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  @@index([userId])
  @@index([formType])
  @@index([paidDate])
  @@map("wht_certificates")
}

model TaxConfig {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  code      String                              // "vat_registered" | "company_tax_id" | "company_branch" ...
  value     String?
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([userId, code])
  @@map("tax_config")
}

model FilingReminder {
  id          String    @id @default(uuid()) @db.Uuid
  userId      String    @map("user_id") @db.Uuid
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  filingType  String    @map("filing_type")     // "pp30" | "pnd3" | "pnd53"
  dueDate     DateTime  @map("due_date")
  reminderAt  DateTime  @map("reminder_at")     // When to show reminder
  isDismissed Boolean   @default(false) @map("is_dismissed")
  createdAt   DateTime  @default(now()) @map("created_at")

  @@index([userId, isDismissed])
  @@index([reminderAt])
  @@map("filing_reminders")
}
```

**Why TaxConfig instead of reusing Setting model:** The existing Setting model stores UI preferences and LLM config. Tax configuration (TIN, branch number, VAT registration status, fiscal year) is semantically different and queried differently. Separating them avoids polluting the settings namespace and allows typed access patterns.

### 1.3 User Model Extension

```prisma
model User {
  // ... existing fields ...

  // === NEW: Relations ===
  taxFilings      TaxFiling[]
  whtCertificates WhtCertificate[]
  taxConfig       TaxConfig[]
  filingReminders FilingReminder[]
}
```

### 1.4 Migration Strategy

Use Prisma's standard migration workflow. Migration order matters:

1. **Migration 1:** Add new columns to Transaction (nullable, no data changes)
2. **Migration 2:** Create TaxFiling, WhtCertificate, TaxConfig, FilingReminder models
3. **Migration 3:** Data migration script to move existing `extra.vat_rate` and `extra.vat` values from JSON into the new first-class columns
4. **Migration 4:** Add indexes on new columns

Keep the `extra` JSON column -- it still serves user-defined custom fields. Only move the VAT/WHT fields that are now first-class.

---

## 2. AI Prompt System Extension

### 2.1 Multi-Prompt Architecture

The current system has ONE global prompt (`prompt_analyse_new_file` setting). Thai tax invoices need a specialized prompt that extracts 10+ Thai-specific fields. Rather than overwriting the global prompt, introduce a prompt selection layer.

**Architecture:**

```
ai/
  prompt.ts              <-- KEEP: existing buildLLMPrompt()
  prompts/
    index.ts             <-- NEW: prompt registry + selector
    thai-tax-invoice.ts  <-- NEW: Thai tax invoice extraction prompt
    thai-receipt.ts      <-- NEW: Simplified Thai receipt prompt
    generic.ts           <-- NEW: wraps the existing user-defined prompt
  schema.ts              <-- EXTEND: support enum/date types
  validators/
    index.ts             <-- NEW: post-extraction validation dispatch
    tax-invoice.ts       <-- NEW: validate 10 Thai tax invoice fields
    tin-validator.ts     <-- NEW: validate Thai TIN format (13 digits)
```

**Prompt selection logic in `ai/prompts/index.ts`:**

```typescript
// Pseudocode -- actual implementation in build phase
type PromptType = "generic" | "thai_tax_invoice" | "thai_receipt"

function selectPrompt(userSettings: SettingsMap, taxConfig: TaxConfigMap): PromptType {
  // If user has Thai tax features enabled (TIN configured), use Thai prompts
  // Otherwise fall back to the existing generic prompt
  if (taxConfig.company_tax_id) {
    return "thai_tax_invoice"  // Default for Thai users
  }
  return "generic"
}

function buildPromptForType(type: PromptType, fields: Field[], categories: Category[], projects: Project[]): string {
  switch (type) {
    case "thai_tax_invoice":
      return buildThaiTaxInvoicePrompt(fields, categories, projects)
    case "thai_receipt":
      return buildThaiReceiptPrompt(fields, categories, projects)
    default:
      return buildLLMPrompt(/* existing logic */)
  }
}
```

### 2.2 Thai Tax Invoice Prompt

The prompt must extract these Revenue Department required fields:

```
- ชื่อผู้ออกใบกำกับภาษี (Seller name)
- เลขประจำตัวผู้เสียภาษี (Seller TIN) -- 13 digits
- สำนักงานใหญ่/สาขา (HQ/Branch number)
- ที่อยู่ผู้ออก (Seller address)
- ชื่อผู้ซื้อ (Buyer name)
- เลขประจำตัวผู้เสียภาษีผู้ซื้อ (Buyer TIN)
- เลขที่ใบกำกับภาษี (Tax invoice number)
- วันที่ออกใบกำกับภาษี (Issue date)
- รายการสินค้า/บริการ (Items/services)
- จำนวนเงินรวม + ภาษีมูลค่าเพิ่ม (Total + VAT amount)
```

The prompt should be bilingual (instruct the LLM in English, but tell it to expect Thai text on documents). Include specific patterns for Thai TIN format (`X-XXXX-XXXXX-XX-X`) and Thai date formats (B.E. dates with 543 year offset).

### 2.3 Post-Extraction Validation

Add a validation step AFTER AI extraction, BEFORE saving to database. This catches LLM hallucinations and formatting errors:

```
analyzeFileAction()
  -> analyzeTransaction()     (existing: LLM call)
  -> validateExtraction()     (NEW: structured validation)
     -> validateTIN()         (13-digit checksum)
     -> validateVATAmount()   (7% of subtotal +/- tolerance)
     -> validateRequiredFields()  (10 RD-required fields present)
  -> return to UI with validation warnings
```

**Data flow:** The validator returns `{ valid: boolean, warnings: string[], corrected: Record<string, any> }`. Warnings are shown in the review UI (the existing AnalyzeForm). The user can accept corrections or override.

### 2.4 Schema Extension

Extend `ai/schema.ts` to support new field types needed for Thai tax:

- Add `"enum"` type support for `vatType` ("input"/"output"/"none") and `documentType`
- Add `"date"` type support that instructs LLM to return YYYY-MM-DD
- Add `"taxid"` virtual type that instructs LLM to extract 13-digit format

The current `fieldsToJsonSchema` function only handles `"string"` and `"number"`. Add type mapping:

```typescript
const TYPE_MAP: Record<string, object> = {
  string: { type: "string" },
  number: { type: "number" },
  enum: { type: "string", enum: [] },  // populated from field.options
  date: { type: "string", format: "date" },
  taxid: { type: "string", pattern: "^\\d{13}$" },
}
```

---

## 3. i18n Architecture (next-intl)

### 3.1 Strategy: next-intl WITHOUT Locale URL Prefix

BanChee is Thai-first. Do NOT add `/th/` or `/en/` URL prefixes. Use next-intl with `localePrefix: "never"` and cookie-based locale detection. This avoids restructuring all existing routes.

**Why next-intl over alternatives:**
- Best App Router support for Next.js 15 (Server Components + Server Actions)
- Supports `localePrefix: "never"` -- no route restructuring needed
- Built-in plural rules, date formatting, number formatting
- Works with Server Components (no client bundle bloat)
- HIGH confidence: official docs confirmed this approach

### 3.2 Integration Plan

**File structure (added to project root):**

```
messages/
  th.json              # Primary: Thai translations
  en.json              # Secondary: English translations
i18n/
  request.ts           # next-intl server config
  routing.ts           # Locale config (th default, en available)
```

**next.config.ts change:**

```typescript
import createNextIntlPlugin from "next-intl/plugin"
const withNextIntl = createNextIntlPlugin()
// Wrap existing config
export default withNextIntl(nextConfig)
```

**Middleware integration:**

The existing `middleware.ts` checks auth cookies. next-intl also needs middleware. Compose them:

```typescript
import createMiddleware from "next-intl/middleware"
import { routing } from "@/i18n/routing"

// Chain: next-intl locale detection THEN existing auth check
```

**Route structure -- NO `[locale]` folder needed:**

Because `localePrefix: "never"`, existing routes stay at `app/(app)/transactions/page.tsx` -- no need to wrap everything in `app/[locale]/(app)/`. The locale is detected from a cookie and available via `useLocale()` / `getLocale()`.

### 3.3 Translation Scope

Translate in phases, not all at once:

**Phase 1 (Thai tax features):** Translate only new Thai tax pages + navigation labels
**Phase 2 (Full i18n):** Translate existing TaxHacker pages

Translation keys follow a flat namespace convention:

```json
{
  "nav.dashboard": "หน้าหลัก",
  "nav.transactions": "รายการ",
  "tax.vat_input": "ภาษีซื้อ",
  "tax.vat_output": "ภาษีขาย",
  "tax.wht": "หัก ณ ที่จ่าย",
  "tax.filing.pp30": "ภ.พ.30",
  "tax.filing.pnd3": "ภ.ง.ด.3",
  "tax.filing.pnd53": "ภ.ง.ด.53"
}
```

### 3.4 Date Display: Buddhist Era

Store dates as Gregorian `DateTime` in PostgreSQL (no change). Display conversion to B.E. (add 543) happens in a utility function:

```typescript
function formatThaiDate(date: Date, locale: string): string {
  if (locale === "th") {
    // Use Intl.DateTimeFormat with th-TH-u-ca-buddhist calendar
    return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
      year: "numeric", month: "long", day: "numeric"
    }).format(date)
  }
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date)
}
```

This uses the browser/Node.js built-in Buddhist calendar support. No external library needed. HIGH confidence -- `Intl.DateTimeFormat` with `th-TH-u-ca-buddhist` is a standard ICU feature.

---

## 4. Report Generation Architecture

### 4.1 PDF Reports: Keep @react-pdf/renderer + Thai Font Registration

TaxHacker already uses `@react-pdf/renderer` v4.3.0 for invoice PDFs. Extend it for Thai tax forms rather than switching libraries.

**Thai font issue and solution:**
- @react-pdf/renderer does NOT auto-detect Thai fonts (confirmed via GitHub issues)
- Solution: Register THSarabunNew.ttf (or Noto Sans Thai) explicitly via `Font.register()`
- Store font files in `public/fonts/` or `assets/fonts/`
- Register once at app startup in a shared config file

```typescript
// exports/pdf/fonts.ts
import { Font } from "@react-pdf/renderer"

Font.register({
  family: "THSarabun",
  fonts: [
    { src: "/fonts/THSarabunNew.ttf" },
    { src: "/fonts/THSarabunNew-Bold.ttf", fontWeight: "bold" },
  ],
})
```

**Report types as new App modules:**

Each Thai tax report becomes a new "app" in the apps/ directory (following the existing `apps/invoices/` pattern):

```
app/(app)/apps/
  invoices/          <-- EXISTING
  vat-report/        <-- NEW: PP.30 monthly VAT report
    manifest.ts
    page.tsx
    actions.ts
    components/
      vat-report-pdf.tsx     <-- @react-pdf/renderer component
      vat-report-form.tsx    <-- Period selector + preview
  wht-report/        <-- NEW: PND 3/53 WHT filing report
    manifest.ts
    page.tsx
    actions.ts
    components/
      wht-report-pdf.tsx
      wht-cert-pdf.tsx       <-- Individual WHT certificate
  tax-ledger/        <-- NEW: Purchase/Sales tax ledger
    manifest.ts
    page.tsx
    actions.ts
    components/
      ledger-table.tsx
      ledger-export.tsx      <-- Excel export button
```

### 4.2 Excel Reports: ExcelJS (Server-Side)

Use ExcelJS for server-side Excel generation. It supports:
- Styled cells (borders, colors, fonts) -- needed for Thai accountant format
- Multiple worksheets per workbook
- Streaming to avoid memory issues
- Runs purely server-side (Node.js) -- no client bundle impact

**Why ExcelJS, not SheetJS:**
- ExcelJS has better styling support (SheetJS community edition lacks cell styling)
- ExcelJS is MIT licensed
- Native streaming support for large datasets

```
exports/excel/
  vat-ledger.ts       # Purchase/Sales tax ledger (รายงานภาษีซื้อ/ภาษีขาย)
  wht-summary.ts      # WHT filing summary spreadsheet
  flowaccount.ts      # FlowAccount-compatible import format
  common.ts           # Shared styles, headers, Thai number formatting
```

**Excel generation runs as a Server Action** returning a file download, using the existing SSE progress pattern for large datasets:

```
Server Action -> query transactions -> ExcelJS workbook -> Buffer -> Response with Content-Disposition
```

### 4.3 Revenue Department Export Format

The Thai Revenue Department e-Filing system (efiling.rd.go.th) does NOT accept raw XML for most forms. The actual upload format is:

- **PP.30 (VAT):** Web form entry OR text/CSV upload via RD Prep program
- **PND 3/53 (WHT):** Text file upload via RD Prep program with fixed-width or pipe-delimited format
- **PND 50/51 (CIT):** Web form entry only

**Architecture for RD export:**

```
exports/rd-format/
  pnd3.ts             # Generate PND 3 text file (pipe-delimited)
  pnd53.ts            # Generate PND 53 text file (pipe-delimited)
  pp30-data.ts        # Generate PP.30 calculation summary (for manual entry reference)
  common.ts           # Field formatting rules, Thai character encoding
```

The PND 3/53 text format is a pipe-delimited file with specific column positions for: sequence number, TIN, name, address, paid date, income type, WHT rate, paid amount, WHT amount. The exact format is documented in the RD Prep program's help files.

**Confidence: MEDIUM.** The exact RD Prep file format specifications are not publicly documented in English. The format is reverse-engineered from RD Prep exports and Thai accounting software documentation (Odoo Thailand module, FlowAccount). Phase-specific research will be needed to verify exact field positions.

### 4.4 FlowAccount Export

FlowAccount accepts Excel import for:
- Products/services
- Business contacts
- Expense transactions

The export should generate an Excel file matching FlowAccount's import template columns. This is a mapping exercise in `exports/excel/flowaccount.ts`.

**Confidence: LOW.** FlowAccount does not publish their import format specification publicly. Will need to download a sample template from FlowAccount during implementation to reverse-engineer the column mapping.

---

## 5. Tax Calculation Engine

### 5.1 Architecture: Pure Functions in services/

Tax calculations are pure functions (input -> output, no side effects, no database access). This makes them testable, auditable, and safe to unit test.

```
services/
  tax-calculator.ts     # All tax math
  tax-rules.ts          # Rate tables and thresholds (data)
```

### 5.2 VAT Calculation

```typescript
// services/tax-rules.ts
export const VAT_RATE = 700  // 7.00% in basis points
export const VAT_THRESHOLD = 180_000_000  // 1.8M baht in satang

// services/tax-calculator.ts
type VATResult = {
  subtotal: number      // satang
  vatAmount: number     // satang
  total: number         // satang
}

// Given a total (VAT-inclusive), extract VAT
function extractVATFromTotal(totalInclVAT: number, vatRate: number = VAT_RATE): VATResult

// Given a subtotal (VAT-exclusive), compute VAT
function computeVATOnSubtotal(subtotal: number, vatRate: number = VAT_RATE): VATResult

// Monthly VAT summary for PP.30
type PP30Summary = {
  periodMonth: number
  periodYear: number
  outputVAT: number       // VAT collected on sales
  inputVAT: number        // VAT paid on purchases
  netVAT: number          // output - input (positive = pay, negative = refund)
  salesTotal: number
  purchaseTotal: number
}
function computePP30(transactions: Transaction[], month: number, year: number): PP30Summary
```

### 5.3 Withholding Tax Calculation

```typescript
// WHT rate lookup by service type
export const WHT_RATES: Record<string, number> = {
  "rent": 500,            // 5%
  "advertising": 200,     // 2%
  "transportation": 100,  // 1%
  "service": 300,         // 3% (most common)
  "professional": 300,    // 3%
  "contractor": 300,      // 3%
}

type WHTResult = {
  grossAmount: number     // satang
  whtAmount: number       // satang
  netPayment: number      // satang (gross - WHT)
  whtRate: number         // basis points
}

function computeWHT(grossAmount: number, serviceType: string): WHTResult
```

### 5.4 Corporate Income Tax (CIT) Calculation

```typescript
// SME reduced rates (net profit brackets)
export const CIT_BRACKETS = [
  { upTo: 30_000_000, rate: 0 },        // 0% on first 300K
  { upTo: 300_000_000, rate: 1500 },     // 15% on 300K-3M
  { upTo: Infinity, rate: 2000 },        // 20% above 3M
]

type CITResult = {
  netProfit: number
  taxByBracket: { bracket: string, taxableAmount: number, tax: number }[]
  totalTax: number
}

function computeCIT(netProfit: number, isSME: boolean): CITResult
```

### 5.5 Section 65 Tri (Non-Deductible Expenses)

Some expenses are not tax-deductible under Thai Revenue Code Section 65 tri. The `isDeductible` boolean on Transaction tracks this. Categories should have a `defaultDeductible` flag:

```typescript
// Categories with deductibility metadata
const NON_DEDUCTIBLE_CATEGORIES = [
  "entertainment_over_limit",  // Entertainment > 0.3% of revenue
  "personal_expense",
  "fine_penalty",              // Tax fines and penalties
  "donation_over_limit",       // Donations > 2% of net profit
]
```

The calculation engine accepts `isDeductible` per transaction and sums only deductible expenses for CIT calculation.

---

## 6. Filing Deadline / Reminder System

### 6.1 Architecture: Database-Driven, Not Cron

For a self-hosted Docker deployment, avoid background cron processes. Instead, use a "check on page load" pattern:

```
User opens dashboard
  -> Server Component calls checkFilingDeadlines(userId)
  -> Query TaxFiling + FilingReminder for upcoming/overdue filings
  -> Return warnings to display in dashboard
```

**Why not node-cron:** TaxHacker runs as a single Next.js process in Docker. Adding node-cron introduces a background process that complicates deployment, logging, and error handling. The "check on load" approach is simpler and sufficient for a single-user self-hosted app.

### 6.2 Filing Calendar

Thai tax filing deadlines (monthly recurrence):

| Form | Deadline | Grace (e-Filing) | Description |
|------|----------|-------------------|-------------|
| PP.30 (VAT) | 15th of following month | +8 days (23rd) | Monthly VAT return |
| PND 3 (WHT individuals) | 7th of following month | +8 days (15th) | WHT on payments to individuals |
| PND 53 (WHT companies) | 7th of following month | +8 days (15th) | WHT on payments to companies |
| PND 50 (annual CIT) | May 30th | +8 days | Annual corporate income tax |
| PND 51 (half-year CIT) | Aug 31st | +8 days | Half-year CIT estimate |

```typescript
// services/filing-period.ts
type FilingDeadline = {
  formType: string
  periodMonth: number
  periodYear: number
  dueDate: Date
  eFilingDueDate: Date  // +8 days
  isOverdue: boolean
}

function getUpcomingDeadlines(today: Date, taxConfig: TaxConfigMap): FilingDeadline[]
function isFilingOverdue(formType: string, periodMonth: number, periodYear: number, today: Date): boolean
```

### 6.3 Reminder Display

Reminders appear as a banner on the dashboard (using the existing `NotificationContext` toast system). No email/push notifications in v1 -- this is a self-hosted app without email infrastructure.

```
Dashboard page.tsx
  -> getUpcomingDeadlines()
  -> if overdue: red banner "PP.30 for January 2026 is overdue (due Feb 23)"
  -> if upcoming (within 7 days): yellow banner "PND 53 for January 2026 due Feb 15"
```

Auto-generate `FilingReminder` records at the start of each month (triggered on dashboard load, idempotent -- check if records for the month already exist).

---

## 7. Export Pipeline Architecture

### 7.1 Unified Export Service

```
services/report-generator.ts
  |
  +-- generateReport(type, format, filters)
  |     |
  |     +-- type: "pp30" | "pnd3" | "pnd53" | "vat_ledger" | "wht_summary" | "flowaccount"
  |     +-- format: "pdf" | "excel" | "rd_text" | "csv"
  |     +-- filters: { month, year, userId }
  |     |
  |     +-- 1. Query relevant transactions from models/
  |     +-- 2. Run through services/tax-calculator for aggregation
  |     +-- 3. Dispatch to exports/{format}/ for rendering
  |     +-- 4. Return Buffer + filename + mimetype
```

### 7.2 Export Route Pattern

Follow the existing export route pattern (`app/(app)/export/transactions/route.ts`):

```
app/(app)/export/
  transactions/route.ts    <-- EXISTING: CSV export
  tax/
    pp30/route.ts          <-- NEW: PP.30 PDF/Excel
    pnd3/route.ts          <-- NEW: PND 3 PDF/text
    pnd53/route.ts         <-- NEW: PND 53 PDF/text
    vat-ledger/route.ts    <-- NEW: Tax ledger Excel
    wht-certs/route.ts     <-- NEW: WHT certificate PDF
    flowaccount/route.ts   <-- NEW: FlowAccount Excel
```

Each route handler follows the same pattern:

```typescript
export async function GET(request: Request) {
  const user = await getCurrentUser()
  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get("month") || "")
  const year = parseInt(searchParams.get("year") || "")
  const format = searchParams.get("format") || "pdf"

  const buffer = await generateReport("pp30", format, { month, year, userId: user.id })

  return new Response(buffer, {
    headers: {
      "Content-Type": format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="PP30_${year}_${month}.${format}"`,
    },
  })
}
```

---

## 8. Data Flow Diagrams

### 8.1 Receipt Upload with Thai Tax Extraction

```
User uploads receipt photo
  |
  v
uploadFilesAction() [existing]
  |
  v
File saved to uploads/{user}/unsorted/
  |
  v
User clicks "Analyze" -> analyzeFileAction() [existing]
  |
  v
selectPrompt() [NEW] -- picks thai_tax_invoice prompt
  |
  v
buildThaiTaxInvoicePrompt() [NEW] -- includes Thai field extraction instructions
  |
  v
analyzeTransaction() [existing] -- LLM call via LangChain
  |
  v
validateExtraction() [NEW] -- check TIN format, VAT math, required fields
  |
  v
Return to UI with extracted data + validation warnings
  |
  v
User reviews, edits, saves -> saveFileAsTransactionAction() [EXTENDED]
  |
  v
Save to Transaction with first-class VAT/WHT columns [EXTENDED]
  |
  v
If WHT detected: auto-create WhtCertificate draft [NEW]
```

### 8.2 Monthly VAT Filing (PP.30)

```
User navigates to Apps -> VAT Report
  |
  v
vat-report/page.tsx loads period selector
  |
  v
User selects month/year -> Server Action queries transactions
  |
  v
services/tax-calculator.ts -> computePP30()
  |
  +-- SUM(vatAmount) WHERE vatType='output' AND period=selected  -> Output VAT
  +-- SUM(vatAmount) WHERE vatType='input'  AND period=selected  -> Input VAT
  +-- Net = Output - Input
  |
  v
Display PP.30 summary in UI
  |
  v
User clicks "Generate PDF" or "Generate Excel"
  |
  v
exports/pdf/pp30.tsx OR exports/excel/pp30.ts
  |
  v
Create/update TaxFiling record with status="generated"
  |
  v
Download file
```

### 8.3 WHT Certificate Generation

```
User navigates to Apps -> WHT Report
  |
  v
wht-report/page.tsx loads period selector
  |
  v
Query WhtCertificate records for selected period
  |
  v
Display list of WHT certificates (auto-created from transactions with WHT)
  |
  v
User clicks "Generate Certificate" on a row
  |
  v
exports/pdf/wht-cert.tsx -> renders official WHT certificate format
  |
  v
Download PDF
  |
  v
User clicks "Generate PND 3/53 Filing"
  |
  v
Group certificates by formType (pnd3 vs pnd53)
  |
  v
exports/excel/wht-summary.ts OR exports/rd-format/pnd3.ts
  |
  v
Create/update TaxFiling record
```

---

## Patterns to Follow

### Pattern 1: Service Layer for Business Logic

**What:** Extract tax business logic into `services/` directory. Keep Server Actions thin.

**When:** Any tax calculation, validation, or multi-step business rule.

**Why:** The existing codebase puts business logic directly in Server Actions (e.g., `unsorted/actions.ts` at 220 lines). Adding Thai tax logic there would create 500+ line action files. A service layer is testable and reusable.

```typescript
// GOOD: Thin action + service
async function saveTransactionAction(formData: FormData) {
  "use server"
  const user = await getCurrentUser()
  const data = transactionFormSchema.safeParse(Object.fromEntries(formData))
  if (!data.success) return { success: false, error: "Invalid input" }

  const taxResult = computeTransactionTax(data.data)  // service call
  const validation = validateTaxInvoice(data.data)     // service call
  if (!validation.valid) return { success: false, error: validation.errors.join(", ") }

  await createTransaction(user.id, { ...data.data, ...taxResult })
  revalidatePath("/transactions")
  return { success: true }
}
```

### Pattern 2: Apps System for New Report Types

**What:** Each Thai tax report is a new "app" in `app/(app)/apps/`.

**When:** Adding PP.30, PND 3/53, tax ledger, tax calendar.

**Why:** The existing apps system (`common.ts` + manifest pattern) provides a clean plugin architecture. It appears in the navigation sidebar automatically. Each app is self-contained with its own page, actions, and components.

### Pattern 3: Immutable Tax Snapshots

**What:** When generating a tax filing, snapshot the computed data into the `TaxFiling.data` JSON column.

**When:** Any time a filing report is generated.

**Why:** Tax filings are point-in-time calculations. If the user edits transactions later, the already-generated filing should still reflect what was filed. The snapshot ensures audit trail integrity.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Tax Data in Extra JSON

**What:** Using the existing `extra` JSON column for VAT/WHT amounts.

**Why bad:** Cannot be indexed, cannot be aggregated with SQL, no type safety, no referential integrity. The existing `vat_rate` and `vat` extra fields prove this -- they exist but are unusable for real tax calculations.

**Instead:** First-class Prisma columns with proper types and indexes (as designed in Section 1).

### Anti-Pattern 2: Hardcoded Tax Rates in Components

**What:** Putting `7` or `0.07` directly in UI components or action files.

**Why bad:** Tax rates change (Thailand's VAT was 10% before, temporarily reduced to 7%). Rates scattered across components are impossible to update atomically.

**Instead:** All rates in `services/tax-rules.ts` as named constants. UI components read from the service layer.

### Anti-Pattern 3: Mixing i18n with Tax Terminology

**What:** Translating Thai tax terms into English equivalents.

**Why bad:** Thai tax terms are legal terms. "withholding tax certificate" is NOT the same as "หนังสือรับรองหัก ณ ที่จ่าย" in legal context. Users filing taxes need the exact Thai terms.

**Instead:** Use official Thai Revenue Department terminology as canonical keys. English is for UI chrome (buttons, navigation), not for tax form labels.

### Anti-Pattern 4: Client-Side Tax Calculations

**What:** Computing VAT/WHT amounts in React components.

**Why bad:** Tax calculations must be auditable and consistent. Client-side math can diverge from server-side (floating point, rounding). Tax amounts should be computed server-side and stored, not re-derived on every render.

**Instead:** All tax math in `services/tax-calculator.ts`, executed in Server Actions, results stored in database.

---

## Suggested Build Order

Dependencies between components determine the build order:

```
Phase 1: Foundation
  1. i18n setup (next-intl)              -- No dependencies, enables all future UI work
  2. Database schema migration            -- No dependencies, enables all data work
  3. Thai defaults (categories, fields)   -- Depends on: schema migration
  4. Service layer skeleton               -- Depends on: schema migration

Phase 2: Core Tax Logic
  5. Tax calculator (VAT/WHT/CIT)        -- Depends on: service layer skeleton
  6. AI prompt extension (Thai invoice)   -- Depends on: Thai defaults
  7. Post-extraction validation           -- Depends on: tax calculator, AI prompts
  8. Transaction form extension           -- Depends on: schema, i18n, tax calculator

Phase 3: Reports & Filing
  9.  PDF Thai font setup                 -- Depends on: i18n
  10. PP.30 VAT report app                -- Depends on: tax calculator, PDF, schema
  11. WHT certificate + PND 3/53 app      -- Depends on: tax calculator, PDF, schema
  12. Tax ledger app                      -- Depends on: schema, Excel setup

Phase 4: Export & Polish
  13. ExcelJS integration                 -- Depends on: tax calculator
  14. FlowAccount export                  -- Depends on: ExcelJS, schema
  15. RD format export                    -- Depends on: tax calculator
  16. Filing deadline system              -- Depends on: schema, service layer
  17. Tax dashboard                       -- Depends on: all stats, i18n
```

**Critical path:** Schema migration (2) must happen first. Everything else flows from having the right data model. i18n (1) can happen in parallel with schema work.

**Parallelizable:** Items 5+6 can happen simultaneously. Items 10+11+12 can happen simultaneously. Items 13+14+15 can happen simultaneously.

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Schema design | HIGH | Based on actual Prisma schema analysis + standard accounting patterns |
| AI prompt extension | HIGH | Existing `buildLLMPrompt` + `fieldsToJsonSchema` are well-understood, extension is straightforward |
| i18n approach | HIGH | next-intl docs confirmed `localePrefix: "never"` works with App Router, no route restructuring needed |
| PDF Thai fonts | MEDIUM | @react-pdf/renderer Thai font issues documented in GitHub, Font.register() is the proven solution, but needs testing |
| ExcelJS integration | HIGH | Well-documented Node.js library, server-side usage is standard |
| RD e-Filing format | LOW | Exact file format specs not publicly documented in English, needs reverse-engineering from RD Prep or Thai accounting software |
| FlowAccount export | LOW | Import template format not publicly documented, needs sample download during implementation |
| Tax calculation rules | MEDIUM | Thai tax rates and brackets are well-documented, but edge cases (partial months, rate changes, special exemptions) need validation against Revenue Code |

---

## Sources

- [next-intl App Router setup](https://next-intl.dev/docs/getting-started/app-router) -- official docs, routing configuration
- [next-intl localePrefix: "never" option](https://next-intl.dev/docs/routing/configuration) -- confirmed no-prefix mode
- [@react-pdf/renderer Thai font issue #633](https://github.com/diegomura/react-pdf/issues/633) -- Thai character rendering requires Font.register()
- [@react-pdf/renderer Font registration docs](https://react-pdf.org/fonts) -- official font API
- [ExcelJS GitHub](https://github.com/exceljs/exceljs) -- Excel generation library
- [Thai Revenue Department e-Filing](https://efiling.rd.go.th/rd-cms/) -- official e-Filing portal
- [Thailand WHT Filing 2026: PND3, PND53 compliance guide](https://www.gentlelawibl.com/post/thailand-withholding-tax-filing-2026-pnd3) -- filing deadlines and form types
- [Odoo Thailand PND3/PND53 module](https://www.spellboundss.com/blog/odoo-blog-articles-4/pnd-3-pnd-53-in-thailand-complete-guide-for-odoo-users-16) -- Excel format for e-Filing reference
- [PostgreSQL double-entry bookkeeping schema](https://gist.github.com/NYKevin/9433376) -- accounting schema patterns
- [KPMG 2025 Thailand Tax Calendar](https://assets.kpmg.com/content/dam/kpmg/th/pdf/2024/12/2025-thailand-tax-calendar-english.pdf) -- filing deadlines reference

---

*Architecture research: 2026-03-23*
