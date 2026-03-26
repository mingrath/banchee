# Phase 5: Document Model + Quotation System - Research

**Researched:** 2026-03-25
**Domain:** Prisma data model design, Thai quotation document workflow, PDF generation, sequential numbering
**Confidence:** HIGH

## Summary

Phase 5 introduces the `Document` Prisma model as a first-class database entity replacing AppData for business documents, then builds the quotation CRUD system as the pattern-setter for all document types. The existing codebase provides all necessary infrastructure: `@react-pdf/renderer` with THSarabunNew font registration, `prisma.$transaction` for atomic sequential numbering, `ContactAutocomplete` for buyer selection, `computeVATOnSubtotal` for satang arithmetic, and the `ActionState<T>` server action pattern.

Zero new npm dependencies are required. The entire phase is application-layer code: one Prisma migration adding the Document model, one models layer file (`models/documents.ts`), one services file (`services/document-workflow.ts` for status transitions), one Zod schema (`forms/quotation.ts`), and the quotation app directory mirroring the existing `tax-invoice` app structure.

**Primary recommendation:** Clone the `tax-invoice` app structure exactly (manifest, page, actions, components for form/PDF/preview), replacing AppData storage with the new Document Prisma model, and adding quotation-specific fields (validity period, payment terms, discount columns, unit column). The Document model is the single most important deliverable -- it must be correct before any UI work begins.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Full Buddhist Era year format: `PREFIX-BBBB-NNNN` (e.g., QT-2568-0001)
- **D-02:** Counter resets annually at fiscal year boundary (standard Thai practice)
- **D-03:** 4-digit sequence counter (0001-9999) per document type per year
- **D-04:** Fixed prefixes -- QT (quotation), INV (invoice), RCT (receipt), DLV (delivery), TAX (tax invoice). No user customization.
- **D-05:** Numbering uses existing Settings model + `prisma.$transaction()` pattern (same as tax-invoice app: read-parse-increment-save)
- **D-06:** Dynamic line item rows with "+ Add Item" button below the table, delete icon per row
- **D-07:** Each row: description (text), quantity (number), unit (text), unit price (baht input to satang storage), discount (baht), amount (auto-calculated)
- **D-08:** VAT toggle: include 7% VAT or not. No WHT on quotations.
- **D-09:** Per-item discount column + overall discount field on total
- **D-10:** Contact selector with inline create (reuse existing contact autocomplete from tax-invoice)
- **D-11:** Validity period field (default 30 days) and payment terms (free text)
- **D-12:** Standard Thai quotation format with THSarabunNew font
- **D-13:** Layout: company header (logo + name + address + Tax ID) to buyer info to line items table to subtotal/discount/VAT/total to validity note to 2 signature lines
- **D-14:** Client-side PDF generation via @react-pdf/renderer (same pattern as VAT/WHT reports)
- **D-15:** Single `Document` Prisma model with `documentType` enum (QUOTATION, INVOICE, RECEIPT, DELIVERY_NOTE). NOT separate tables per type.
- **D-16:** Line items stored as JSON column on Document (matches existing AppData pattern)
- **D-17:** Seller and buyer data snapshotted as JSON at document creation time
- **D-18:** `sourceDocumentId` self-referential FK for chain linking
- **D-19:** Status stored as string column with explicit transition validation function (not XState)
- **D-20:** All amounts in satang integers (matches v1.0 convention)
- **D-21:** UUID primary keys, camelCase code / snake_case DB via @map()
- **D-22:** Existing tax-invoice app (AppData-based) stays as-is. NOT migrated in Phase 5.
- **D-23:** New Document model does NOT interact with AppData. Separate data path.

### Claude's Discretion
- Exact Prisma schema field names and types (follow existing @map conventions)
- Status values per document type (research should confirm standard Thai statuses)
- Loading skeleton and error state design
- Form validation error messages (in Thai)
- PDF spacing, margins, and exact typography

### Deferred Ideas (OUT OF SCOPE)
- Tax invoice migration to Document model -- v1.2 (D-22 decision)
- Combined tax invoice/receipt format -- v2
- Purchase order -- v2
- Quotation approval workflow -- requires ADV-05 multi-user feature
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QUOT-01 | User can create a quotation with line items and contact selection | Document model schema, quotation form Zod schema, line item pattern from tax-invoice, ContactAutocomplete reuse |
| QUOT-02 | Quotation uses sequential numbering (QT-BBBB-NNNN) with configurable prefix | Existing `prisma.$transaction` + Setting pattern in `tax-invoice/actions.ts:94-112`, `toBuddhistYear()` utility. Note: CONTEXT.md D-01 overrides REQUIREMENTS.md format to full B.E. year |
| QUOT-03 | Quotation stores validity period (default 30 days) and payment terms | `validUntil` DateTime field on Document model, `paymentTerms` String field, `date-fns addDays()` for default calculation |
| QUOT-04 | User can generate quotation PDF with THSarabunNew | Existing PDF pattern: `registerThaiFonts()` + `thaiPdfStyles` + `@react-pdf/renderer` Document/Page/View/Text components, `formatSatangToDisplay()`, client-side `pdf().toBlob()` |
| QUOT-05 | User can view all quotations in a list with status badges | Document model with `@@index([userId])`, `@@index([type])`, `@@index([status])` indexes; shadcn Badge component for status display |
| DOC-01 | New Document Prisma model with status tracking, line items JSON, and sourceDocumentId | Full Document model schema with self-referential relation, JSON columns for items/sellerData/buyerData, status string column |
| DOC-07 | Status transitions follow explicit state machine | `services/document-workflow.ts` with `VALID_TRANSITIONS` lookup table, `canTransition()` and `assertValidTransition()` functions |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @prisma/client | ^6.6.0 | Document model, migrations, atomic transactions | Already installed. Schema-driven, type-safe. Handles UUID PKs, @map, JSON columns. |
| @react-pdf/renderer | ^4.3.0 | Quotation PDF generation (client-side) | Already installed. THSarabunNew font registered in `exports/pdf/fonts.ts`. |
| zod | ^3.24.2 | Quotation form validation schema | Already installed. `.safeParse()` pattern used in all server actions. |
| date-fns | ^3.6.0 | Validity period calculation (addDays), date comparisons | Already installed. `addDays(issueDate, 30)` for default validUntil. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | ^2.0.1 | Toast notifications for create/update success | Already installed. Same `toast.success()` / `toast.error()` pattern. |
| lucide-react | ^0.475.0 | Icons (Plus, Trash2, FileText, Download, Loader2) | Already installed. Same icons as tax-invoice form. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| String status column | Prisma enum | Enums require migration for each new status value; string is more flexible for iteration. Use string with TypeScript union type for compile-time safety. |
| JSON items column | Separate LineItem table | LineItem table adds join complexity for SME-scale data (typically <20 items). JSON is simpler, matches AppData pattern. Tradeoff: cannot query individual items. Acceptable for quotations. |
| Settings model for counters | Dedicated DocumentCounter model | CONTEXT D-05 locks this: use existing Settings model. Counter reset logic must be handled in application code at fiscal year boundary. |

**Installation:**
```bash
# No new packages needed -- all dependencies already in package.json
# Only Prisma migration required:
npx prisma migrate dev --name add_document_model
```

## Architecture Patterns

### Recommended Project Structure
```
app/(app)/apps/
  quotation/
    manifest.ts            # { code: "quotation", name: "ใบเสนอราคา" }
    page.tsx               # Server component: load user, profile, render form
    [id]/
      page.tsx             # Detail view: show document, status actions, PDF download
    actions.ts             # createQuotationAction, updateQuotationStatusAction, listQuotationsAction
    components/
      quotation-form.tsx   # Client component: line items, contact selector, VAT toggle
      quotation-list.tsx   # Client component: table with status badges, filters
      quotation-pdf.tsx    # @react-pdf/renderer document template
      quotation-preview.tsx # Dialog: summary + PDF download (clone invoice-preview.tsx)

forms/
  quotation.ts             # Zod schema for quotation validation

models/
  documents.ts             # Document CRUD: create, getById, list, updateStatus

services/
  document-workflow.ts     # Status transitions, validation, fiscal year number generation
```

### Pattern 1: Document Model Schema
**What:** Single Prisma model supporting all document types via a `documentType` string discriminator
**When to use:** All document storage (quotation now, invoice/receipt/delivery in Phase 6)
**Example:**
```prisma
// Source: Verified against existing schema conventions in prisma/schema.prisma
model Document {
  id               String    @id @default(uuid()) @db.Uuid
  userId           String    @map("user_id") @db.Uuid
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  documentType     String    @map("document_type")   // "QUOTATION" | "INVOICE" | "RECEIPT" | "DELIVERY_NOTE"
  documentNumber   String    @map("document_number")  // QT-2568-0001
  status           String    @default("draft")        // draft|sent|accepted|rejected|expired|converted|voided

  contactId        String?   @map("contact_id") @db.Uuid
  issuedAt         DateTime? @map("issued_at")
  validUntil       DateTime? @map("valid_until")
  paymentTerms     String?   @map("payment_terms")

  // Monetary (all satang integers)
  subtotal         Int       @default(0)
  discountAmount   Int       @default(0) @map("discount_amount")
  vatRate          Int       @default(0) @map("vat_rate")     // basis points: 700 = 7%
  vatAmount        Int       @default(0) @map("vat_amount")
  total            Int       @default(0)

  // Structured data as JSON
  items            Json      @default("[]")
  sellerData       Json?     @map("seller_data")
  buyerData        Json?     @map("buyer_data")

  // Document chain
  sourceDocumentId String?   @map("source_document_id") @db.Uuid
  sourceDocument   Document? @relation("DocumentChain", fields: [sourceDocumentId], references: [id])
  derivedDocuments Document[] @relation("DocumentChain")

  note             String?
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  @@unique([userId, documentNumber])
  @@index([userId])
  @@index([documentType])
  @@index([status])
  @@index([contactId])
  @@index([sourceDocumentId])
  @@index([issuedAt])
  @@map("documents")
}
```

**Key schema decisions:**
- `documentType` as String (not Prisma enum) -- avoids migration churn when adding types
- `vatRate` defaults to 0 (not 700) -- quotations may or may not include VAT (D-08 toggle)
- `discountAmount` as top-level field -- per D-09 overall discount
- `paymentTerms` as free text -- per D-11
- No `transactionId` FK in Phase 5 -- quotations do NOT create transactions (Phase 6 concern)
- `@@unique([userId, documentNumber])` -- safety net for numbering uniqueness

### Pattern 2: Sequential Number Generation with Fiscal Year Reset
**What:** Clone the existing `tax-invoice/actions.ts:94-112` pattern with year-aware counter keys
**When to use:** Every document creation
**Example:**
```typescript
// Source: Existing pattern in app/(app)/apps/tax-invoice/actions.ts lines 94-117
// Extended with year-aware key per CONTEXT D-02

async function generateDocumentNumber(
  userId: string,
  prefix: string,
  buddhistYear: number
): Promise<string> {
  // Year-scoped counter key: "seq_quotation_2568"
  const seqCode = `seq_${prefix.toLowerCase()}_${buddhistYear}`

  const nextNumber = await prisma.$transaction(async (tx) => {
    const current = await tx.setting.findFirst({
      where: { userId, code: seqCode },
    })
    const next = (parseInt(current?.value ?? "0", 10) + 1).toString()
    await tx.setting.upsert({
      where: { userId_code: { userId, code: seqCode } },
      update: { value: next },
      create: { userId, code: seqCode, name: seqCode, value: next },
    })
    return next
  })

  // Format: QT-2568-0001
  return `${prefix}-${buddhistYear}-${nextNumber.padStart(4, "0")}`
}
```

**Critical detail:** The counter key includes the B.E. year (`seq_qt_2568`), so counters auto-reset at fiscal year boundary per D-02. When a new year starts, the first document gets counter 1 because there is no existing Setting for that year.

### Pattern 3: Status Transition Validation
**What:** Pure TypeScript function replacing XState -- ~20 lines per CONTEXT D-19
**When to use:** Every `updateDocumentStatus` call
**Example:**
```typescript
// Source: Architecture research .planning/research/ARCHITECTURE.md
// services/document-workflow.ts

const VALID_TRANSITIONS: Record<string, Record<string, string[]>> = {
  QUOTATION: {
    draft: ["sent", "voided"],
    sent: ["accepted", "rejected", "voided"],
    accepted: ["converted"],
    // rejected, converted, voided = terminal states
  },
  // Phase 6 adds INVOICE, RECEIPT, DELIVERY_NOTE transitions
}

export function canTransition(
  documentType: string,
  currentStatus: string,
  targetStatus: string
): boolean {
  const typeTransitions = VALID_TRANSITIONS[documentType]
  if (!typeTransitions) return false
  return typeTransitions[currentStatus]?.includes(targetStatus) ?? false
}

export function assertValidTransition(
  documentType: string,
  currentStatus: string,
  targetStatus: string
): void {
  if (!canTransition(documentType, currentStatus, targetStatus)) {
    throw new Error(
      `Invalid transition: ${documentType} cannot go from "${currentStatus}" to "${targetStatus}"`
    )
  }
}
```

### Pattern 4: Client-Side PDF Generation
**What:** Use `pdf().toBlob()` on client, not server, to avoid server memory pressure
**When to use:** PDF download button click
**Example:**
```typescript
// Source: Existing pattern in app/(app)/apps/tax-invoice/components/invoice-preview.tsx lines 47-59

import { pdf } from "@react-pdf/renderer"
import { createElement } from "react"
import { QuotationPDF } from "./quotation-pdf"

const handleDownload = async () => {
  setIsGenerating(true)
  try {
    const element = createElement(QuotationPDF, { quotationData })
    const blob = await pdf(element as any).toBlob()
    downloadBlob(blob, `${documentNumber}.pdf`)
    toast.success("PDF พร้อมดาวน์โหลด")
  } catch (error) {
    console.error("Failed to generate PDF:", error)
    toast.error("สร้าง PDF ไม่สำเร็จ")
  } finally {
    setIsGenerating(false)
  }
}
```

### Pattern 5: Line Item Form with Satang Conversion
**What:** User inputs baht values, form converts to satang at submission boundary
**When to use:** Quotation form line items
**Example:**
```typescript
// Source: Existing pattern in app/(app)/apps/tax-invoice/actions.ts lines 54-58

// In actions.ts -- conversion at form parse boundary:
const items = itemDescriptions.map((desc, i) => ({
  description: desc,
  quantity: parseFloat(itemQuantities[i] || "0"),
  unit: itemUnits[i] || "ชิ้น",
  unitPrice: Math.round(parseFloat(itemUnitPrices[i] || "0") * 100), // baht to satang
  discount: Math.round(parseFloat(itemDiscounts[i] || "0") * 100),   // baht to satang
}))

// In form component -- display uses formatCurrency(satangValue, "THB"):
// formatCurrency already divides by 100 internally (lib/utils.ts line 20)
```

### Anti-Patterns to Avoid
- **Store quotations in AppData:** AppData cannot be queried by status, type, or date. Use the Document model. (Architecture research, confirmed by existing AppData limitations.)
- **Mutate unitPrice values before calling formatCurrency:** `formatCurrency()` already divides by 100. Pass satang directly. (Pitfall #1 from PITFALLS-v1.1.md.)
- **Edit documents after status leaves "draft":** Once sent, document content is immutable per Thai business document standards. (Pitfall #4.)
- **Use Prisma enum for documentType:** Enums require migrations when adding new types. String column with TypeScript union type gives the same compile-time safety without migration overhead.
- **Create a Transaction for quotation creation:** Quotations are not financial events. Do NOT auto-create income transactions. (Only invoices/receipts in Phase 6.)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation | Custom HTML-to-PDF pipeline | `@react-pdf/renderer` (already installed) | THSarabunNew already registered. Component pattern proven by 4 existing PDF templates (tax-invoice, credit-note, 50-tawi, PP30). |
| Form validation | Manual if/else chains | Zod schemas with `.safeParse()` (already installed) | Consistent with all existing server actions. Provides typed parse results and Thai error messages. |
| Contact search autocomplete | Custom search input | Existing `ContactAutocomplete` + `ContactInlineCreate` components | Proven pattern in tax-invoice form. Handles search, selection, inline creation. |
| Thai date formatting | Manual string manipulation | `toBuddhistYear()` + `formatThaiDateLong()` from `services/thai-date.ts` | Uses `Intl.DateTimeFormat` with Buddhist calendar. Already handles all Thai month names and formatting. |
| Currency display | Division logic in components | `formatCurrency(satang, "THB")` from `lib/utils.ts` | Handles locale, currency symbol, decimal places, and satang-to-baht conversion in one call. |
| VAT calculation | Inline arithmetic | `computeVATOnSubtotal()` from `services/tax-calculator.ts` | Handles basis-point arithmetic without floating-point errors. Returns `{ subtotal, vatAmount, total }`. |
| Status state machine | XState or robot3 | 20-line TypeScript transition table in `services/document-workflow.ts` | 4-5 states with simple transitions. XState adds 15kB for a problem that needs a `Record<string, string[]>`. |

**Key insight:** Every infrastructure need for Phase 5 is already solved by existing code. The work is wiring these proven patterns together for a new document type, not building new infrastructure.

## Common Pitfalls

### Pitfall 1: Satang Double-Division in Line Item Display
**What goes wrong:** Calling `formatCurrency()` on a value already in baht produces 1/100th of the correct amount. A 5,000 THB item shows as 50.00 THB.
**Why it happens:** The codebase has two amount conventions -- tax-invoice stores in satang, generic invoice stores in baht. The quotation must use satang (per D-20), but developers copying from the wrong reference will mismatch.
**How to avoid:** All `formatCurrency()` calls receive satang values. The form stores user input as baht strings, converts to satang only at the action boundary (`Math.round(parseFloat(val) * 100)`). In the PDF template, use `formatSatangToDisplay()` for raw numeric display and `formatCurrency()` for formatted currency strings.
**Warning signs:** Line item totals displaying as fractions of expected amounts. PDF totals not matching form totals.

### Pitfall 2: Sequential Counter Key Without Year Scope
**What goes wrong:** Using a single `seq_quotation` key means the counter never resets at fiscal year boundary. Documents from 2569 continue numbering from where 2568 ended.
**How to avoid:** Include B.E. year in the Setting code: `seq_qt_2568`, `seq_qt_2569`. Each year starts fresh at 0001. This is the locked decision D-02.
**Warning signs:** QT-2569-0143 when it should be QT-2569-0001 at the start of a new year.

### Pitfall 3: Document Model Missing User Relation on User Model
**What goes wrong:** Adding the Document model to `schema.prisma` without adding the `documents Document[]` relation on the User model causes Prisma validation errors during `prisma generate`.
**How to avoid:** Always update both sides of the relation. Add `documents Document[]` to the User model alongside the Document model definition.
**Warning signs:** `prisma generate` fails with "Error validating: relation field 'user' on Document has no opposite relation field."

### Pitfall 4: Forgot to Add Contact Relation to Document
**What goes wrong:** The Document model has `contactId` but no `@relation` to the Contact model. Prisma allows this (it is just a String field), but you lose type safety and the ability to include Contact data in queries.
**How to avoid:** Either add a proper `@relation` to Contact, or document that `contactId` is an unlinked reference resolved via `getContactById()` in the models layer. The second approach is safer to avoid coupling issues since Contact has a composite unique key `@@unique([userId, taxId, branch])`.
**Warning signs:** `prisma.document.findMany({ include: { contact: true } })` fails with "Unknown field 'contact'."

### Pitfall 5: Discount Calculation Applied in Wrong Order
**What goes wrong:** Per-item discounts and overall discount interact. If you subtract per-item discounts, compute subtotal, then subtract overall discount from subtotal, the VAT base is correct. But if you apply overall discount first and then per-item discounts, the total is wrong.
**How to avoid:** Explicit calculation order: (1) Each item amount = (qty * unitPrice) - itemDiscount, (2) subtotal = sum of item amounts, (3) subtotalAfterDiscount = subtotal - overallDiscount, (4) vatAmount = computeVATOnSubtotal(subtotalAfterDiscount) if VAT toggled on, (5) total = subtotalAfterDiscount + vatAmount.
**Warning signs:** VAT amount does not match 7% of the expected base.

### Pitfall 6: PDF Font Not Registered Before Render
**What goes wrong:** Quotation PDF renders with fallback font (no Thai characters visible -- shows as empty boxes) because `registerThaiFonts()` was not called before the PDF component renders.
**How to avoid:** Import `registerThaiFonts` at the top of the PDF component file and call it at module level (same pattern as `tax-invoice-pdf.tsx` line 9: `registerThaiFonts()`).
**Warning signs:** PDF generates but Thai text appears as rectangles or is missing entirely.

## Code Examples

Verified patterns from the existing codebase:

### Server Action Pattern (from tax-invoice/actions.ts)
```typescript
// Source: app/(app)/apps/tax-invoice/actions.ts
export async function createQuotationAction(
  prevState: ActionState<QuotationData> | null,
  formData: FormData
): Promise<ActionState<QuotationData>> {
  try {
    const user = await getCurrentUser()
    // 1. Parse + validate with Zod
    // 2. Load business profile (seller snapshot)
    // 3. Load contact (buyer snapshot)
    // 4. Compute line item amounts in satang
    // 5. Generate sequential number in $transaction
    // 6. Create Document record
    // 7. Return success with data
    return { success: true, data: quotationData }
  } catch (error) {
    console.error("Failed to create quotation:", error)
    return { success: false, error: "สร้างใบเสนอราคาไม่สำเร็จ" }
  }
}
```

### Form Component Pattern (from tax-invoice-form.tsx)
```typescript
// Source: app/(app)/apps/tax-invoice/components/tax-invoice-form.tsx
// Key patterns to replicate:
// 1. useActionState for form submission
// 2. useState for line items array (immutable updates)
// 3. useMemo for computed totals (subtotal/VAT/total)
// 4. handleSubmit appending dynamic line item fields to FormData
// 5. ContactAutocomplete + ContactInlineCreate for buyer selection
// 6. formatCurrency(satangValue, "THB") for display
```

### Manifest Pattern (from tax-invoice/manifest.ts)
```typescript
// Source: app/(app)/apps/tax-invoice/manifest.ts
export const manifest = {
  code: "quotation",
  name: "ใบเสนอราคา",
  description: "สร้างใบเสนอราคาพร้อมติดตามสถานะ",
  icon: "FileText",
}
```

### PDF Template Pattern (from tax-invoice-pdf.tsx)
```typescript
// Source: app/(app)/apps/tax-invoice/components/tax-invoice-pdf.tsx
// Key patterns:
// 1. import { registerThaiFonts } from "@/exports/pdf/fonts"
// 2. import { thaiPdfStyles } from "@/exports/pdf/thai-pdf-styles"
// 3. registerThaiFonts() called at module top level
// 4. StyleSheet.create({ ...thaiPdfStyles, /* custom overrides */ })
// 5. formatAmount(satang) using formatSatangToDisplay() + Intl.NumberFormat
// 6. <Document><Page size="A4" style={thaiPdfStyles.page}>...
```

## Quotation-Specific Types

### Line Item Type (extends existing TaxInvoiceItem)
```typescript
// New fields per CONTEXT D-07
export type QuotationLineItem = {
  description: string
  quantity: number
  unit: string           // ชิ้น, ครั้ง, วัน, ชั่วโมง, etc.
  unitPrice: number      // satang
  discount: number       // satang (per-item discount)
  amount: number         // satang = (quantity * unitPrice) - discount
}
```

### Quotation Data Type (for PDF rendering)
```typescript
export type QuotationData = {
  id: string
  documentNumber: string      // QT-2568-0001
  status: string              // draft|sent|accepted|rejected|expired|converted|voided
  issuedAt: string
  validUntil: string          // ISO date string
  paymentTerms: string
  seller: {
    name: string
    taxId: string
    branch: string
    address: string
    logo?: string
  }
  buyer: {
    name: string
    taxId: string
    branch: string
    address: string
  }
  items: QuotationLineItem[]
  subtotal: number            // satang
  discountAmount: number      // satang (overall discount)
  includeVat: boolean
  vatAmount: number           // satang
  total: number               // satang
  note?: string
}
```

### Quotation Status Values
```typescript
// Standard Thai quotation statuses (verified against FlowAccount and PEAK competitor analysis)
export const QUOTATION_STATUSES = {
  draft: { label: "แบบร่าง", color: "secondary" },
  sent: { label: "ส่งแล้ว", color: "blue" },
  accepted: { label: "อนุมัติ", color: "green" },
  rejected: { label: "ปฏิเสธ", color: "destructive" },
  expired: { label: "หมดอายุ", color: "orange" },
  converted: { label: "แปลงแล้ว", color: "purple" },
  voided: { label: "ยกเลิก", color: "muted" },
} as const
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AppData JSON blobs for documents | First-class Prisma model with typed columns | Phase 5 (this phase) | Enables querying, indexing, filtering, and relational linking between documents |
| Tax invoice numbering without year scope | Year-scoped counter keys (`seq_qt_2568`) | Phase 5 (this phase) | Enables annual counter reset per D-02 |
| No document linking | `sourceDocumentId` self-referential FK | Phase 5 schema, Phase 6 usage | Enables quotation-to-invoice-to-receipt chain |

**Deprecated/outdated:**
- AppData for business document storage -- still used by existing tax-invoice/credit-note apps (per D-22, not migrated in Phase 5), but all NEW document types use the Document model

## Numbering Format Reconciliation

**REQUIREMENTS.md** states `QT-YYMM-NNN`. **CONTEXT.md D-01** locks the format as `QT-2568-0001` (full B.E. year, no month, 4-digit counter). The CONTEXT.md decision takes precedence as it was made after discussion. This matches the existing tax-invoice numbering pattern (`INV-2568-0001`) in `tax-invoice/actions.ts:117`.

## Open Questions

1. **Contact model relation on Document**
   - What we know: Document has `contactId` String field. Contact has composite unique `@@unique([userId, taxId, branch])`.
   - What's unclear: Adding a formal `@relation` to Contact requires deciding if Contact should have a `documents Document[]` back-relation, which means modifying the Contact model.
   - Recommendation: Store `contactId` as an unlinked String field (same pattern as Transaction.contactId). Resolve via `getContactById()` in the models layer. This avoids modifying the Contact model and keeps Document self-contained. The buyer snapshot JSON (`buyerData`) serves as the display-time data source anyway.

2. **Business logo in PDF header**
   - What we know: D-13 specifies "company header (logo + name + address + Tax ID)". The business profile has `businessLogo` field on User model storing a static file path.
   - What's unclear: Whether `@react-pdf/renderer` can render a local file path image from the client side, or if the logo needs to be served via a URL.
   - Recommendation: Render logo via the existing static file route (`/files/static/{filename}`). If logo is null, omit the image and show company name larger. Test with actual logo upload.

3. **Expired quotation auto-detection**
   - What we know: D-11 specifies validity period. Quotations past their `validUntil` date should show as "expired."
   - What's unclear: Whether to use a cron job / scheduled task, or compute "expired" at query time.
   - Recommendation: Compute at query time. In the list query, add a condition: if `status === "sent" && validUntil < now`, display as "expired" in the UI. Optionally update the DB status to "expired" when the list is fetched (lazy expiration). No cron needed for a self-hosted single-user app.

## Sources

### Primary (HIGH confidence)
- `prisma/schema.prisma` -- All existing model conventions (UUID PK, @map, camelCase, @@index patterns)
- `app/(app)/apps/tax-invoice/actions.ts` -- Sequential numbering pattern (lines 94-117), line item parsing (lines 50-58), seller/buyer snapshot pattern (lines 128-149), AppData storage pattern
- `app/(app)/apps/tax-invoice/components/tax-invoice-form.tsx` -- Form pattern: useActionState, dynamic line items, ContactAutocomplete, computed totals
- `app/(app)/apps/tax-invoice/components/tax-invoice-pdf.tsx` -- PDF template pattern: THSarabunNew, StyleSheet, formatAmount, party boxes, items table
- `app/(app)/apps/tax-invoice/components/invoice-preview.tsx` -- Client-side PDF generation: `pdf().toBlob()`, downloadBlob helper, Dialog component
- `services/tax-calculator.ts` -- Satang arithmetic, VAT computation, formatSatangToDisplay
- `services/thai-date.ts` -- toBuddhistYear, formatThaiDateLong
- `models/contacts.ts` -- searchContacts, getContactById, createContact
- `models/business-profile.ts` -- getBusinessProfile, BusinessProfile type
- `lib/utils.ts` -- formatCurrency (divides by 100 internally, accepts satang)
- `lib/actions.ts` -- ActionState<T> type definition
- `exports/pdf/fonts.ts` -- registerThaiFonts (THSarabunNew normal + bold)
- `exports/pdf/thai-pdf-styles.ts` -- Shared PDF styles (page, title, heading, table, footer)

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` -- Document model schema design, conversion flow, state machine transitions
- `.planning/research/PITFALLS-v1.1.md` -- 9 critical pitfalls (satang double-division, FIRST_CLASS_COLUMNS, numbering race condition)
- `.planning/research/STACK.md` -- Zero new dependencies confirmation, alternatives analysis
- `.planning/research/FEATURES.md` -- FlowAccount/PEAK competitor analysis, Thai quotation feature expectations

### Tertiary (LOW confidence)
- Quotation PDF layout specifics (margins, spacing, signature line dimensions) -- will need visual testing with real Thai content

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and verified in package.json
- Architecture: HIGH -- Document model schema verified against existing Prisma conventions, all patterns have existing code references
- Pitfalls: HIGH -- all pitfalls identified from codebase analysis (not hypothetical), existing v1.0 pitfalls documented with recovery strategies
- PDF template: MEDIUM -- layout specifics need visual testing with actual Thai content and logo rendering

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable -- no external dependency changes expected)
