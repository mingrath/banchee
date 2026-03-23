---
phase: 01-thai-foundation-vat-compliance
verified: 2026-03-23T12:00:00Z
status: passed
score: 18/18 must-haves verified
gaps: []
human_verification:
  - test: "Run dev server and complete setup wizard end-to-end"
    expected: "Redirects to /setup, all 7 steps work, saves business profile, navigates to dashboard"
    why_human: "Cookie-based gate requires browser session; cannot verify redirect behavior via static analysis"
  - test: "Upload a Thai receipt image and click Analyze"
    expected: "AI extracts Tax ID, branch, VAT amount; validation badges display per field"
    why_human: "LLM provider call and vision extraction require live API key and runtime"
  - test: "Download PP30 PDF after selecting a month"
    expected: "Thai text renders correctly with THSarabunNew font, no placeholder squares"
    why_human: "PDF rendering and font embedding require runtime execution of @react-pdf/renderer"
  - test: "Verify Noto Sans Thai font renders in browser"
    expected: "Thai text uses Noto Sans Thai, not system fallback"
    why_human: "Font loading via next/font requires browser rendering to confirm"
  - test: "Edit a transaction with VAT fields, save, reload page"
    expected: "vatType, vatAmount, merchantTaxId persist after save (not lost to extra JSON)"
    why_human: "Persistence path requires live DB write and re-read cycle"
---

# Phase 01: Thai Foundation + VAT Compliance Verification Report

**Phase Goal:** A Thai SME owner can set up their business profile, upload receipts in Thai, and track VAT input/output with monthly PP30 report generation
**Verified:** 2026-03-23
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Currency amounts display with baht symbol and comma separators | VERIFIED | `lib/utils.ts` LOCALE = "th-TH", Intl.NumberFormat with th-TH locale |
| 2 | Dates display in Buddhist Era format throughout the app | VERIFIED | `services/thai-date.ts` uses `th-TH-u-ca-buddhist` Intl.DateTimeFormat |
| 3 | Uploading a receipt captures VAT amount, VAT type, subtotal, merchant Tax ID, document number | VERIFIED | `prisma/schema.prisma` has first-class columns; `app/(app)/unsorted/actions.ts` maps extracted fields to columns |
| 4 | User can save and retrieve business profile | VERIFIED | `models/business-profile.ts` exports getBusinessProfile, updateBusinessProfile, isBusinessProfileComplete; `app/(app)/setup/actions.ts` and `app/(app)/settings/page.tsx` both wire to it |
| 5 | VAT extraction from 10,700 satang total correctly produces 10,000 subtotal and 700 VAT | VERIFIED | `services/tax-calculator.ts`: `Math.round(totalInclVAT * 10000 / (10000 + vatRate))` integer arithmetic; VAT_RATE = 700 |
| 6 | New users see Thai category names and THB as default currency | VERIFIED | `models/defaults.ts`: DEFAULT_CATEGORIES first entry `{ code: "ads", name: "โฆษณา" }`; DEFAULT_SETTINGS default_currency = "THB" |
| 7 | First-time user is guided through a 7-step setup wizard | VERIFIED | `app/(app)/setup/components/setup-wizard.tsx` has all 7 Thai step titles; "เริ่มใช้งาน" final button |
| 8 | Setup wizard validates Thai Tax ID as exactly 13 digits | VERIFIED | `forms/business-profile.ts`: `z.string().regex(/^\d{13}$/, ...)` |
| 9 | THSarabunNew font files are registered for PDF generation | VERIFIED | `public/fonts/THSarabunNew.ttf` (473KB), `THSarabunNew-Bold.ttf` (360KB); `exports/pdf/fonts.ts` registers both |
| 10 | AI extracts Thai tax invoice fields with inline validation | VERIFIED | `ai/validators/tax-invoice-validator.ts` exports validateTaxInvoiceFields with 10+ Section 86/4 checks; `components/unsorted/analyze-form.tsx` renders ValidationBadge per field |
| 11 | Dashboard shows VAT summary cards (Output, Input, Net) | VERIFIED | `components/dashboard/vat-summary-card.tsx`: ภาษีขาย / ภาษีซื้อ / ต้องชำระ|เครดิตภาษี; DB-level aggregate via `models/stats.ts` |
| 12 | VAT section hidden when business is not VAT-registered | VERIFIED | `app/(app)/dashboard/page.tsx`: `{profile.vatRegistered && (...VATSummaryCard...)}` |
| 13 | Input tax invoices approaching 6-month expiry show amber warning | VERIFIED | `components/dashboard/vat-expiry-warnings.tsx`: "ใบกำกับภาษีใกล้หมดอายุ (6 เดือน)" with AlertTriangle |
| 14 | Revenue approaching 1.8M THB threshold shows info alert | VERIFIED | `components/dashboard/vat-threshold-alert.tsx`: "ใกล้ถึงเกณฑ์จดทะเบียน VAT (฿1,800,000)" with Progress bar |
| 15 | Setup wizard gate redirects incomplete profiles to /setup | VERIFIED | `middleware.ts`: cookie-based gate; redirects when `banchee_setup_complete` cookie absent |
| 16 | User can generate Purchase Tax Report, Sales Tax Report, and PP30 for any month | VERIFIED | `app/(app)/apps/vat-report/`: page.tsx, actions.ts with generateVATReportAction, pp30-pdf.tsx, purchase-tax-report-pdf.tsx, sales-tax-report-pdf.tsx, report-preview.tsx all exist |
| 17 | PP30 data includes all 16 fields per Revenue Department structure | VERIFIED | `app/(app)/apps/vat-report/actions.ts`: PP30Fields type with 16 fields (salesAmount through totalExcess); Field 16 computed |
| 18 | Editing a transaction saves VAT fields to first-class Prisma columns | VERIFIED | `models/transactions.ts` STANDARD_TRANSACTION_COLUMNS array includes vatType, vatAmount, merchantTaxId, documentNumber; `forms/transactions.ts` Zod schema includes all VAT fields |

**Score:** 18/18 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | Transaction model with VAT columns | VERIFIED | vatType, vatAmount, vatRate, subtotal, merchantTaxId, merchantBranch, documentNumber; @@index([vatType]) |
| `services/tax-calculator.ts` | Pure function VAT calculations in satang | VERIFIED | Exports extractVATFromTotal, computeVATOnSubtotal; VAT_RATE = 700; integer arithmetic via Math.round |
| `services/thai-date.ts` | Buddhist Era date formatting | VERIFIED | Exports formatThaiDate, formatThaiDateLong, formatThaiMonth, toBuddhistYear; uses th-TH-u-ca-buddhist |
| `models/business-profile.ts` | Business profile CRUD via Settings model | VERIFIED | Exports getBusinessProfile (cached), updateBusinessProfile, isBusinessProfileComplete; uses biz_ prefixed codes |
| `forms/business-profile.ts` | Zod schema for business profile validation | VERIFIED | Exports businessProfileSchema; Tax ID regex /^\d{13}$/ |
| `models/defaults.ts` | Thai categories, THB default currency | VERIFIED | DEFAULT_CATEGORIES[0] = "โฆษณา"; default_currency = "THB"; Thai LLM prompt with merchant_tax_id |
| `lib/utils.ts` | Thai locale formatting | VERIFIED | LOCALE = "th-TH" |
| `app/(app)/setup/page.tsx` | Setup wizard page route | VERIFIED | Exists; imports SetupWizard; force-dynamic |
| `app/(app)/setup/actions.ts` | Server actions for business profile steps | VERIFIED | Exports saveBusinessProfileAction; imports businessProfileSchema + updateBusinessProfile |
| `app/(app)/setup/components/setup-wizard.tsx` | Multi-step wizard with 7 steps | VERIFIED | "use client"; all 7 Thai step titles; Tax ID regex; "เริ่มใช้งาน" button |
| `app/(app)/setup/components/wizard-step-indicator.tsx` | Step progress indicator | VERIFIED | Accepts currentStep, totalSteps props |
| `exports/pdf/fonts.ts` | THSarabunNew font registration | VERIFIED | Exports registerThaiFonts; Font.register with family "THSarabunNew"; called at module load |
| `exports/pdf/thai-pdf-styles.ts` | Shared PDF styles | VERIFIED | Exports thaiPdfStyles; fontFamily: "THSarabunNew"; page/title/heading/body/tableHeader/tableCell/amountCell styles |
| `public/fonts/THSarabunNew.ttf` | Regular font file >100KB | VERIFIED | 473,880 bytes |
| `public/fonts/THSarabunNew-Bold.ttf` | Bold font file >100KB | VERIFIED | 360,692 bytes |
| `ai/validators/tax-invoice-validator.ts` | Section 86/4 field validation | VERIFIED | Exports validateTaxInvoiceFields, ValidationResult, correctBuddhistEraDate; checks 10+ fields; Tax ID regex |
| `components/unsorted/tax-invoice-validation.tsx` | Inline validation badges | VERIFIED | Exports ValidationBadge, TaxInvoiceValidationSummary; uses Check/X/Minus lucide icons |
| `components/unsorted/analyze-form.tsx` | Extended form with VAT fields | VERIFIED | Contains vatType, vatAmount, subtotal, merchantTaxId; imports extractVATFromTotal; imports ValidationBadge; Thai labels "วิเคราะห์", "บันทึกรายการ", "ผู้ขาย" |
| `models/stats.ts` | VAT summary aggregation queries | VERIFIED | Exports VATSummary type, getVATSummary (prisma.aggregate), getExpiringInvoices, getRevenueYTD |
| `components/dashboard/vat-summary-card.tsx` | 3-card VAT grid | VERIFIED | "use client"; ภาษีขาย / ภาษีซื้อ / ต้องชำระ|เครดิตภาษี; passes satang directly to formatCurrency; "ดูรายละเอียด" link to /apps/vat-report |
| `components/dashboard/vat-expiry-warnings.tsx` | 6-month expiry warning | VERIFIED | AlertTriangle; "ใบกำกับภาษีใกล้หมดอายุ (6 เดือน)"; Collapsible invoice list |
| `components/dashboard/vat-threshold-alert.tsx` | 1.8M threshold alert | VERIFIED | "ใกล้ถึงเกณฑ์จดทะเบียน VAT (฿1,800,000)"; Progress bar; THRESHOLD_SATANG = 180000000 |
| `middleware.ts` | Setup wizard redirect gate | VERIFIED | Cookie-based gate; redirects to /setup; skips /setup and /api paths; matcher includes /setup/:path*, /apps/:path* |
| `app/(app)/apps/vat-report/manifest.ts` | VAT report manifest | VERIFIED | Exports manifest with code "vat-report", name "รายงาน VAT" |
| `app/(app)/apps/vat-report/page.tsx` | VAT report page | VERIFIED | force-dynamic; imports VATReportClient |
| `app/(app)/apps/vat-report/actions.ts` | Report data computation | VERIFIED | Exports generateVATReportAction; computes all 16 PP30Fields; queries input/output transactions |
| `app/(app)/apps/vat-report/components/pp30-pdf.tsx` | PP30 PDF template | VERIFIED | Imports registerThaiFonts + thaiPdfStyles; title "แบบ ภ.พ.30"; "ภาษีขายเดือนนี้", "ภาษีซื้อเดือนนี้" |
| `app/(app)/apps/vat-report/components/purchase-tax-report-pdf.tsx` | Purchase tax report PDF | VERIFIED | Title "รายงานภาษีซื้อ"; 9 column headers (colSeqH through colVatH) |
| `app/(app)/apps/vat-report/components/sales-tax-report-pdf.tsx` | Sales tax report PDF | VERIFIED | Title "รายงานภาษีขาย" |
| `app/(app)/apps/vat-report/components/report-preview.tsx` | Preview dialog with downloads | VERIFIED | Dialog; 4 download buttons; "ดาวน์โหลดทั้งหมด"; imports JSZip |
| `forms/transactions.ts` | Zod schema with VAT fields | VERIFIED | vatType, vatAmount, merchantTaxId all present with optional/nullable |
| `components/transactions/edit.tsx` | Transaction edit with VAT fields | VERIFIED | vatType, vatAmount, merchantTaxId; imports extractVATFromTotal; Thai labels "ภาษีซื้อ", "ภาษีขาย" |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `services/tax-calculator.ts` | `prisma/schema.prisma` | vatAmount/subtotal store calculator output | WIRED | vatAmount Int? and subtotal Int? match satang integer output |
| `models/business-profile.ts` | `prisma/schema.prisma` | Setting model stores biz_ prefixed codes | WIRED | biz_company_name in BUSINESS_PROFILE_CODES; queries Setting model |
| `app/(app)/setup/actions.ts` | `models/business-profile.ts` | calls updateBusinessProfile | WIRED | Direct import + call confirmed |
| `app/(app)/setup/actions.ts` | `forms/business-profile.ts` | validates with businessProfileSchema | WIRED | Direct import + safeParse confirmed |
| `exports/pdf/fonts.ts` | `public/fonts/THSarabunNew.ttf` | Font.register path reference | WIRED | path.join(process.cwd(), "public/fonts/THSarabunNew.ttf") |
| `app/(app)/unsorted/actions.ts` | `ai/validators/tax-invoice-validator.ts` | post-extraction validation | WIRED | imports + calls validateTaxInvoiceFields after LLM extraction |
| `components/unsorted/analyze-form.tsx` | `components/unsorted/tax-invoice-validation.tsx` | renders ValidationBadge | WIRED | imports ValidationBadge, TaxInvoiceValidationSummary, FIELD_VALIDATION_MAP |
| `ai/prompt.ts` | `models/defaults.ts` | prompt template includes Thai tax instructions | WIRED | buildLLMPrompt interpolates {fields} which includes merchant_tax_id from DEFAULT_FIELDS |
| `components/dashboard/vat-summary-card.tsx` | `models/stats.ts` | receives VATSummary as props | WIRED | Accepts VATSummary type; passes satang directly to formatCurrency |
| `app/(app)/dashboard/page.tsx` | `models/stats.ts` | calls getVATSummary, getExpiringInvoices, getRevenueYTD | WIRED | All three imported and called in Promise.all |
| `app/(app)/apps/vat-report/components/pp30-pdf.tsx` | `exports/pdf/fonts.ts` | imports registerThaiFonts | WIRED | Direct import + call at module top |
| `app/(app)/apps/vat-report/components/pp30-pdf.tsx` | `exports/pdf/thai-pdf-styles.ts` | imports thaiPdfStyles | WIRED | Direct import confirmed |
| `app/(app)/apps/vat-report/actions.ts` | `models/stats.ts` | queries VAT transaction data | WIRED | Imports getBusinessProfile; queries transactions directly with vatType filter |
| `app/(app)/transactions/actions.ts` | `models/transactions.ts` | delegates to createTransaction/updateTransaction | WIRED | STANDARD_TRANSACTION_COLUMNS includes all 7 VAT field names |
| `forms/transactions.ts` | `components/transactions/edit.tsx` | Zod schema validates VAT fields | WIRED | edit.tsx form data flows through transactionFormSchema in actions |
| `middleware.ts` | (cookie) | setup wizard gate | WIRED | Checks banchee_setup_complete cookie; redirects to /setup |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| I18N-01 | 01-01 | UI displays in Thai with Revenue Department terminology | SATISFIED | th-TH locale, Thai category names, Thai labels throughout |
| I18N-02 | 01-01 | Buddhist Era date display | SATISFIED | services/thai-date.ts with th-TH-u-ca-buddhist |
| I18N-03 | 01-01 | Thai number/currency formatting | SATISFIED | lib/utils.ts LOCALE="th-TH" |
| I18N-04 | 01-02, 01-05 | Thai font in generated PDFs | SATISFIED | THSarabunNew registered; pp30-pdf.tsx/purchase-tax-report-pdf.tsx/sales-tax-report-pdf.tsx use it |
| SCAN-01 | 01-03 | AI extracts Thai tax invoice fields | SATISFIED | analyze-form.tsx vatType/merchantTaxId/vatAmount; DEFAULT_PROMPT includes merchant_tax_id |
| SCAN-02 | 01-03 | AI validates tax invoice against Section 86/4 | SATISFIED | tax-invoice-validator.ts checks 10+ required fields with per-field status |
| SCAN-03 | 01-03 | AI auto-categorizes into Thai categories | SATISFIED | DEFAULT_CATEGORIES fully Thai with Thai llm_prompt hints |
| VAT-01 | 01-01, 01-05 | Track input/output VAT per transaction | SATISFIED | vatType column; analyze-form.tsx + edit.tsx both have vatType selector |
| VAT-02 | 01-01 | Auto-calculate 7% VAT with /107 formula | SATISFIED | extractVATFromTotal uses Math.round(total * 10000 / (10000 + 700)) |
| VAT-03 | 01-04 | Auto-detect VAT registration requirement at 1.8M | SATISFIED | vat-threshold-alert.tsx with THRESHOLD_SATANG = 180000000 |
| VAT-04 | 01-05 | Generate Purchase Tax Report | SATISFIED | purchase-tax-report-pdf.tsx with 9 columns per Revenue Department format |
| VAT-05 | 01-05 | Generate Sales Tax Report | SATISFIED | sales-tax-report-pdf.tsx with "รายงานภาษีขาย" |
| VAT-06 | 01-05 | Generate PP30 monthly VAT return | SATISFIED | pp30-pdf.tsx; PP30Fields type with 16 fields; generateVATReportAction computes all 16 |
| VAT-07 | 01-04 | Flag input tax invoices approaching 6-month expiry | SATISFIED | getExpiringInvoices queries 5-6 month window; vat-expiry-warnings.tsx |
| BIZ-01 | 01-01, 01-02 | Business profile with company name, Tax ID, branch, address | SATISFIED | models/business-profile.ts + forms/business-profile.ts + setup wizard |
| BIZ-02 | 01-04 | VAT registration toggle controls features | SATISFIED | dashboard conditionally renders VAT section on profile.vatRegistered |
| BIZ-03 | 01-01 | Accounting period configuration | SATISFIED | biz_fiscal_year_start in business profile; setup wizard Step 6 |
| BIZ-04 | 01-01 | Base currency THB | SATISFIED | DEFAULT_SETTINGS default_currency = "THB" |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/(app)/transactions/actions.ts` | 42, 65 | VAT fields not directly mapped in action — delegates to `createTransaction`/`updateTransaction` | INFO | Not a stub; the model layer's `STANDARD_TRANSACTION_COLUMNS` list includes all VAT fields and `splitTransactionDataExtraFields` handles routing correctly. Confirmed wired. |
| `middleware.ts` | 9-15 | Cookie-based setup gate (not DB query) | INFO | Intentional fallback per PLAN note about Edge runtime Prisma limitations. Works correctly but requires the setup wizard to set `banchee_setup_complete` cookie on completion. |

No blockers or stub-level anti-patterns detected. All implementations are substantive.

---

### Human Verification Required

#### 1. Setup Wizard Flow

**Test:** Start dev server (`npm run dev`), open http://localhost:7331, complete all 7 wizard steps with valid data (company name, 13-digit Tax ID, branch, address, VAT toggle on, fiscal month, LLM API key)
**Expected:** Redirected to /setup on first visit; wizard saves all data; banchee_setup_complete cookie set; redirected to /dashboard after completion
**Why human:** Cookie-based gate and multi-step form submission require browser session with live database writes

#### 2. AI Receipt Scanning + Validation Badges

**Test:** Upload a Thai receipt photo, click "วิเคราะห์"
**Expected:** AI fills form fields including merchantTaxId (13 digits), vatAmount, vatType; green/red validation badges appear per-field; TaxInvoiceValidationSummary shows at top of tax section
**Why human:** LLM provider call requires live API key, vision extraction requires actual image

#### 3. PP30 PDF Thai Text Rendering

**Test:** Navigate to /apps/vat-report, select any month, click "ออกรายงาน", download "ภ.พ.30"
**Expected:** PDF opens with Thai text rendered correctly using THSarabunNew font, no placeholder squares or missing tone marks; all 16 fields visible
**Why human:** @react-pdf/renderer font embedding requires runtime rendering

#### 4. Noto Sans Thai Font in Browser

**Test:** Open any page in Chrome/Safari, inspect CSS computed font on Thai text
**Expected:** font-family resolves to "Noto Sans Thai" not a system fallback
**Why human:** Font loading via next/font/google requires browser rendering and network

#### 5. VAT Field Persistence After Edit

**Test:** Create or find a transaction, edit it by setting vatType="input", vatAmount=700, merchantTaxId="1234567890123", save, reload the page
**Expected:** All three VAT fields still show the saved values (not empty/reset)
**Why human:** Persistence requires live DB write through the full transactionFormSchema → createTransaction/updateTransaction → Prisma path

---

### Summary

Phase 01 (Thai Foundation + VAT Compliance) goal is fully achieved at the code level. All 18 observable truths are verified. All 32 required artifacts exist and are substantive. All 16 key links are wired. All 18 requirement IDs (I18N-01 through BIZ-04) are satisfied.

**Key architectural decisions verified as correctly implemented:**
- Integer satang arithmetic throughout (no floating point in tax calculations)
- First-class Prisma columns for VAT fields (not extra JSON)
- DB-level aggregate queries for VAT sums (not in-memory JS)
- Cookie-based setup gate (correct choice given Edge runtime Prisma limitations)
- THSarabunNew TTF files present at correct size (>100KB each)
- Thai UI encoded as Unicode escapes in TSX (functionally equivalent to literal Thai characters)

5 items require human runtime verification (visual font rendering, live AI extraction, PDF rendering, full wizard flow, DB persistence) — none are blockers to proceeding, as all supporting code is correctly wired.

---

_Verified: 2026-03-23_
_Verifier: Claude (gsd-verifier)_
