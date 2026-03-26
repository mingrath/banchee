# Phase 6: Document Workflow Chain + Conversions - Research

**Researched:** 2026-03-26
**Domain:** Document-to-document conversion flows, invoice/receipt/delivery note CRUD, unified document list, Thai business document chain
**Confidence:** HIGH

## Summary

Phase 6 extends the Phase 5 foundation (Document Prisma model, quotation CRUD, status machine, PDF generation) to implement the full Thai business document chain: quotation to invoice to receipt, plus delivery notes. The existing codebase provides every building block needed: the `Document` model with `sourceDocumentId` self-referential FK for chain linking, `createDocument()` with atomic sequential numbering, `canTransition()`/`assertValidTransition()` for status enforcement, `@react-pdf/renderer` with THSarabunNew for PDF templates, and the `QuotationForm`/`QuotationPDF`/`QuotationDetailActions` components as clone-ready patterns.

The primary new concern is the **conversion action pattern**: a single server action that (1) loads the source document, (2) validates it can be converted (status check), (3) creates a new Document with `sourceDocumentId` pointing back, (4) updates the source document's status, all within a `prisma.$transaction()`. The secondary concern is **receipt-specific fields** (payment method, payment date, paid amount) which do not exist on the current Document model schema -- these must be stored in a receipt-specific JSON metadata column or via a Prisma migration adding nullable columns.

**Primary recommendation:** Build conversion actions first (quotation-to-invoice, invoice-to-receipt, quotation/invoice-to-delivery-note), then clone the quotation UI pattern for each document type's pages, then build the unified document list last since it depends on all document types existing.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** One-click direct create for ALL conversions -- quotation->invoice, invoice->receipt, invoice/quotation->delivery note. No dialog, no pre-filled form. Click -> document instantly created with all data copied -> redirect to new document's detail page.
- **D-02:** Source document status auto-updates on conversion (quotation -> "converted", invoice -> "paid" when receipt total >= invoice amount). Prevents double conversion.
- **D-03:** Invoices can be created BOTH standalone (new form) AND converted from quotation. Both paths supported.
- **D-04:** Conversion copies all data (line items, contact, amounts, seller/buyer snapshots) into new Document record with sourceDocumentId pointing to the source. Source document is NEVER mutated beyond status change.
- **D-05:** Invoice has its own status machine: draft -> sent -> overdue -> paid -> void. "Overdue" triggered when past due date and not yet paid.
- **D-06:** Invoice form mirrors quotation form (line items, contact, VAT, discounts) but adds a due date field.
- **D-07:** Sequential numbering: INV-BBBB-NNNN (same pattern as quotation, year-scoped counter).
- **D-08:** Invoice PDF layout matches quotation PDF pattern but titled "ใบแจ้งหนี้ / INVOICE" with due date and payment info sections.
- **D-09:** Receipt created via one-click from invoice detail page. Defaults: payment date = today, payment method = "transfer". Editable on receipt detail page after creation.
- **D-10:** Payment methods: bank transfer (โอนเงิน), cash (เงินสด), cheque (เช็ค), credit card (บัตรเครดิต).
- **D-11:** Partial payments supported -- multiple receipts per invoice, each for a partial amount. Invoice auto-marks "paid" when sum of receipt amounts >= invoice total.
- **D-12:** Receipt has minimal status machine: draft -> confirmed -> void. No "sent" state.
- **D-13:** Sequential numbering: RCT-BBBB-NNNN.
- **D-14:** Receipt PDF titled "ใบเสร็จรับเงิน / RECEIPT" with payment method and received amount sections.
- **D-15:** Delivery note can be created from quotation OR invoice detail page.
- **D-16:** Delivery note has simple status: draft -> delivered -> void.
- **D-17:** Sequential numbering: DLV-BBBB-NNNN.
- **D-18:** Delivery note PDF titled "ใบส่งของ / DELIVERY NOTE" -- focuses on items and delivery info, no financial totals.
- **D-19:** New page at /apps/documents showing ALL document types in one table.
- **D-20:** Inline chain badges -- each row shows linked doc icons (QT -> INV -> RCT) as clickable badges linking to each document's detail page.
- **D-21:** Filters: document type (dropdown), status (dropdown), date range (from/to), contact (search).
- **D-22:** Quotation-only list at /apps/quotation remains unchanged -- /apps/documents is the unified view.
- **D-23:** Each document type gets its own PDF component, all sharing the same THSarabunNew font registration and thai-pdf-styles. Clone QuotationPDF pattern, change title and type-specific sections.
- **D-24:** All PDFs maintain the same 11-section layout structure from quotation PDF but with type-appropriate headers, sections, and fields.

### Claude's Discretion
- Exact status values and Thai labels per document type
- Detail page layout for invoice/receipt/delivery note (follow quotation detail page pattern)
- Overdue detection mechanism (lazy vs scheduled)
- Invoice/receipt/delivery form validation rules
- Filter component implementation (client-side vs server-side)

### Deferred Ideas (OUT OF SCOPE)
- Combined tax invoice/receipt (ใบกำกับภาษี/ใบเสร็จรับเงิน) -- v2, requires "issued as a set" marking per Revenue Department rules
- Purchase order (ใบสั่งซื้อ) -- v2, not table stakes
- Billing note (ใบวางบิล) -- could be added later as a separate document type between invoice and receipt
- Auto-overdue cron job -- could add scheduled detection later; lazy detection at query time is sufficient for v1.1
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QUOT-06 | User can convert accepted quotation to tax invoice with one click (pre-fills all data, marks quotation as converted) | Conversion action pattern: load source doc -> validate status "accepted" -> create new INVOICE Document with sourceDocumentId -> update quotation to "converted" -> redirect. All in prisma.$transaction(). |
| DOC-02 | User can create an invoice/billing note -- standalone or converted from quotation | Two paths: (1) InvoiceForm clone of QuotationForm with dueDate field added, (2) One-click conversion from quotation detail page. Both use createDocument() with documentType "INVOICE". |
| DOC-03 | User can create a receipt linked to an invoice, recording payment date and method | One-click from invoice detail page. Receipt stores paymentMethod and paymentDate in a metadata JSON field or new nullable columns. Partial payments: sum receipts for an invoice, auto-mark "paid" when >= invoice total. |
| DOC-04 | User can create a delivery note linked to a quotation or invoice | One-click from quotation or invoice detail page. Copies line items but omits financial totals per D-18. Simple status: draft -> delivered -> void. |
| DOC-05 | Document conversion is immutable -- creates new record, never mutates source document | Conversion creates NEW Document with sourceDocumentId FK. Source is only updated for status field (quotation -> "converted"). Line items, amounts, snapshots are never modified on source. Enforced by action code pattern. |
| DOC-06 | Each document type has its own PDF template with THSarabunNew | Clone QuotationPDF for InvoicePDF (add due date, payment terms), ReceiptPDF (add payment method, received amount), DeliveryNotePDF (items only, no totals). All use registerThaiFonts() + thaiPdfStyles. |
| DOC-08 | User can view all documents in a unified list with type and status filters | New page /apps/documents with listDocuments() query (no type filter = all types). Client-side filters for type dropdown, status dropdown, date range. Chain badges showing linked documents. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @prisma/client | ^6.6.0 | Document CRUD, atomic conversions in $transaction, schema migration for receipt fields | Already installed. All document operations go through models/documents.ts. |
| @react-pdf/renderer | ^4.3.0 | InvoicePDF, ReceiptPDF, DeliveryNotePDF generation | Already installed. THSarabunNew registered in exports/pdf/fonts.ts. Clone QuotationPDF pattern. |
| zod | ^3.24.2 | Invoice form validation, receipt metadata validation | Already installed. .safeParse() pattern in all server actions. |
| date-fns | ^3.6.0 | Due date calculation, overdue detection, date range filtering | Already installed. addDays(), isBefore(), isAfter() for invoice overdue logic. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | ^2.0.1 | Toast notifications for conversion success/error | Already installed. toast.success() on conversion complete. |
| lucide-react | ^0.475.0 | Icons (FileText, Receipt, Truck, ArrowRight, Filter) | Already installed. Document type icons in chain badges and list. |
| react-day-picker | ^8.10.1 | Date range filter for unified document list | Already installed. shadcn Calendar component wraps this. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Prisma migration for receipt columns | JSON metadata field on Document | JSON field avoids schema migration but loses type safety and queryability. Since receipts need paymentMethod for filtering, nullable columns are cleaner. |
| Client-side filtering on unified list | Server-side filtering via query params | Client-side is simpler for v1.1 with small datasets (< 1000 docs). Server-side needed later for scale. CONTEXT leaves this as Claude's discretion. |
| Separate Receipt/Invoice models | Single Document model with type discriminator | Already locked by Phase 5 D-15: single Document model. No alternative needed. |

**Installation:**
```bash
# No new packages needed -- all dependencies already in package.json
# Prisma migration required for receipt-specific fields:
npx prisma migrate dev --name add_receipt_payment_fields
```

## Architecture Patterns

### Recommended Project Structure
```
app/(app)/apps/
  invoice/
    manifest.ts              # { code: "invoice", name: "ใบแจ้งหนี้" }
    page.tsx                 # Server component: list invoices + create form
    [id]/
      page.tsx               # Detail view with status actions + conversion buttons
      detail-actions.tsx     # Status transitions + "สร้างใบเสร็จ" + "สร้างใบส่งของ" buttons
    actions.ts               # createInvoiceAction, convertQuotationToInvoiceAction, updateInvoiceStatusAction
    components/
      invoice-form.tsx       # Clone QuotationForm + add dueDate field
      invoice-list.tsx       # Clone QuotationList with invoice statuses
      invoice-pdf.tsx        # Clone QuotationPDF: "ใบแจ้งหนี้ / INVOICE" + due date section
      status-badge.tsx       # Invoice-specific status-color mapping
  receipt/
    manifest.ts              # { code: "receipt", name: "ใบเสร็จรับเงิน" }
    page.tsx                 # List receipts (no create form -- receipts created from invoice)
    [id]/
      page.tsx               # Detail view: payment info editable, status actions
      detail-actions.tsx     # Confirm, void, PDF download
    actions.ts               # createReceiptFromInvoiceAction, updateReceiptAction, updateReceiptStatusAction
    components/
      receipt-detail-edit.tsx # Edit payment method, date, amount after creation
      receipt-pdf.tsx         # "ใบเสร็จรับเงิน / RECEIPT" + payment method + received amount
      status-badge.tsx        # Receipt-specific status-color mapping
  delivery-note/
    manifest.ts              # { code: "delivery-note", name: "ใบส่งของ" }
    page.tsx                 # List delivery notes
    [id]/
      page.tsx               # Detail view: items list, delivery status
      detail-actions.tsx     # Mark delivered, void, PDF download
    actions.ts               # createDeliveryNoteAction, updateDeliveryNoteStatusAction
    components/
      delivery-note-pdf.tsx  # "ใบส่งของ / DELIVERY NOTE" -- items only, no financials
      status-badge.tsx        # Delivery note status-color mapping
  documents/
    manifest.ts              # { code: "documents", name: "เอกสารทั้งหมด" }
    page.tsx                 # Server component: load all documents
    actions.ts               # listAllDocumentsAction with filters
    components/
      document-table.tsx     # Unified table with type/status/date/contact filters
      chain-badges.tsx       # Inline linked doc icons (QT -> INV -> RCT)
      document-filters.tsx   # Type dropdown, status dropdown, date range, contact search

services/
  document-workflow.ts       # EXTEND: Add INVOICE, RECEIPT, DELIVERY_NOTE transitions + status maps

models/
  documents.ts               # EXTEND: Add createDocumentFromSource(), getDocumentsBySourceId(), sumReceiptAmounts()

forms/
  invoice.ts                 # Zod schema for standalone invoice form
```

### Pattern 1: One-Click Conversion Action
**What:** Server action that atomically creates a new document from a source document and updates the source's status
**When to use:** All document-to-document conversions (quotation->invoice, invoice->receipt, quotation/invoice->delivery note)
**Example:**
```typescript
// Source: Extension of existing credit-note/actions.ts immutable conversion pattern
// Combined with models/documents.ts createDocument() pattern

export async function convertQuotationToInvoiceAction(
  prevState: ActionState<{ invoiceId: string }> | null,
  formData: FormData
): Promise<ActionState<{ invoiceId: string }>> {
  try {
    const user = await getCurrentUser()
    const sourceDocId = formData.get("sourceDocumentId") as string

    // 1. Load source document
    const sourceDoc = await getDocumentById(user.id, sourceDocId)
    if (!sourceDoc) return { success: false, error: "ไม่พบเอกสารต้นทาง" }

    // 2. Validate source can be converted
    if (sourceDoc.documentType !== "QUOTATION" || sourceDoc.status !== "accepted") {
      return { success: false, error: "ใบเสนอราคาต้องมีสถานะ 'อนุมัติ' ก่อนแปลงเป็นใบแจ้งหนี้" }
    }

    // 3. Atomic: create invoice + update source status
    const invoice = await prisma.$transaction(async (tx) => {
      // Create new invoice document
      const newDoc = await createDocumentInTransaction(tx, user.id, {
        documentType: "INVOICE",
        sourceDocumentId: sourceDocId,
        contactId: sourceDoc.contactId,
        issuedAt: new Date(),
        dueDate: addDays(new Date(), 30),  // default 30-day payment terms
        subtotal: sourceDoc.subtotal,
        discountAmount: sourceDoc.discountAmount,
        vatRate: sourceDoc.vatRate,
        vatAmount: sourceDoc.vatAmount,
        total: sourceDoc.total,
        items: sourceDoc.items as unknown[],
        sellerData: sourceDoc.sellerData,
        buyerData: sourceDoc.buyerData,
        note: sourceDoc.note,
      })

      // Update source quotation status to "converted"
      await tx.document.update({
        where: { id: sourceDocId },
        data: { status: "converted" },
      })

      return newDoc
    })

    revalidatePath("/apps/quotation")
    revalidatePath("/apps/invoice")
    redirect(`/apps/invoice/${invoice.id}`)
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error
    console.error("Failed to convert quotation to invoice:", error)
    return { success: false, error: "แปลงเอกสารไม่สำเร็จ" }
  }
}
```

**Critical details:**
- The `prisma.$transaction()` wraps BOTH the document creation AND the source status update -- if either fails, both roll back
- The `redirect()` call must be OUTSIDE the transaction and try/catch must re-throw redirect errors (Next.js throws NEXT_REDIRECT as an error)
- Source document data is copied into the new record, never referenced by pointer -- immutable conversion per D-04

### Pattern 2: Receipt Partial Payment Tracking
**What:** Multiple receipts per invoice, auto-marking invoice as "paid" when sum >= total
**When to use:** Invoice-to-receipt conversion
**Example:**
```typescript
// In receipt creation action:

// 1. Create receipt document linked to invoice
const receipt = await createDocument(user.id, {
  documentType: "RECEIPT",
  sourceDocumentId: invoiceId,
  // ... copy amounts, parties, etc.
  paymentMethod: "transfer",    // default per D-09
  paymentDate: new Date(),       // default per D-09
  paidAmount: invoiceDoc.total,  // default to full amount, editable later
})

// 2. Check if all receipts sum to >= invoice total
const existingReceipts = await getDocumentsBySourceId(user.id, invoiceId, "RECEIPT")
const totalPaid = existingReceipts
  .filter(r => r.status !== "voided")
  .reduce((sum, r) => sum + (r.total ?? 0), 0) + receipt.total

// 3. Auto-transition invoice to "paid" if fully paid
if (totalPaid >= invoiceDoc.total) {
  await updateDocumentStatus(user.id, invoiceId, "paid")
}
```

### Pattern 3: Lazy Overdue Detection
**What:** Compute "overdue" status at query time rather than via cron job
**When to use:** Invoice list display and detail pages
**Example:**
```typescript
// Same pattern as Phase 5's lazy expiration for quotations
// In invoice list component and detail page:

function getEffectiveInvoiceStatus(doc: Document): string {
  if (
    doc.status === "sent" &&
    doc.dueDate &&
    new Date(doc.dueDate) < new Date()
  ) {
    return "overdue"
  }
  return doc.status
}

// "overdue" is a display-only status -- the DB keeps "sent"
// This follows the exact same pattern as quotation "expired" detection
// in app/(app)/apps/quotation/[id]/page.tsx lines 59-64
```

### Pattern 4: Unified Document List with Chain Badges
**What:** Single table showing all document types with clickable chain links
**When to use:** /apps/documents page
**Example:**
```typescript
// Load all documents with their derived documents for chain badges
const documents = await prisma.document.findMany({
  where: { userId },
  include: {
    sourceDocument: { select: { id: true, documentNumber: true, documentType: true } },
    derivedDocuments: { select: { id: true, documentNumber: true, documentType: true } },
  },
  orderBy: { createdAt: "desc" },
})

// Chain badge component shows: QT-2568-0001 -> INV-2568-0001 -> RCT-2568-0001
// Each badge is a Link to the document's detail page
```

### Anti-Patterns to Avoid
- **Mutating source document data on conversion:** Only the `status` field changes on the source. Line items, amounts, and snapshots are NEVER modified. This is locked by D-04.
- **Creating a dialog/form for one-click conversions:** D-01 explicitly states NO dialog, NO form. Click -> create -> redirect. All data is copied from source.
- **Using the same StatusBadge component for all types:** Each document type has different statuses with different Thai labels. Create type-specific status maps (INVOICE_STATUSES, RECEIPT_STATUSES, etc.) while keeping the StatusBadge component generic enough to accept any status map.
- **Checking overdue via cron:** Deferred idea. Use lazy detection at query time, same pattern as quotation expiration.
- **Storing paymentMethod in the Document model's existing JSON items field:** Receipt payment info is separate metadata, not a line item. Use dedicated fields.

## Schema Migration: Receipt-Specific Fields

The current Document model lacks fields needed by receipts and invoices. Two approaches:

### Recommended: Add Nullable Columns via Migration

```prisma
// Add to Document model:
dueDate          DateTime? @map("due_date")           // Invoice: payment due date
paymentMethod    String?   @map("payment_method")      // Receipt: "transfer"|"cash"|"cheque"|"credit_card"
paymentDate      DateTime? @map("payment_date")        // Receipt: when payment was received
paidAmount       Int?      @map("paid_amount")          // Receipt: amount paid in satang (for partial payments)
```

**Why nullable columns over JSON metadata:**
1. `paymentMethod` needs to be filterable in the unified document list (D-21)
2. `dueDate` is needed for overdue detection queries
3. Nullable columns are backward-compatible -- existing QUOTATION documents simply have NULL for these fields
4. Type safety via Prisma-generated types

**Migration must be applied BEFORE any invoice/receipt creation code.**

### CreateDocumentInput Extension

```typescript
// Extend existing CreateDocumentInput in models/documents.ts:
export type CreateDocumentInput = {
  documentType: string
  sourceDocumentId?: string | null   // NEW: for conversions
  contactId?: string | null
  issuedAt?: Date | null
  validUntil?: Date | null
  dueDate?: Date | null              // NEW: for invoices
  paymentTerms?: string | null
  paymentMethod?: string | null      // NEW: for receipts
  paymentDate?: Date | null          // NEW: for receipts
  paidAmount?: number | null         // NEW: for receipts (satang)
  subtotal: number
  discountAmount: number
  vatRate: number
  vatAmount: number
  total: number
  items: unknown[]
  sellerData?: unknown
  buyerData?: unknown
  note?: string | null
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF templates for each doc type | New PDF infrastructure | Clone `QuotationPDF` component, change title + type-specific sections | All infrastructure exists: registerThaiFonts(), thaiPdfStyles, formatAmount(), branchDisplay(). Only content differs. |
| Status transition validation | New validation logic per type | Extend `VALID_TRANSITIONS` in document-workflow.ts | Add INVOICE, RECEIPT, DELIVERY_NOTE keys to existing lookup table. canTransition()/assertValidTransition() work for any type. |
| Sequential numbering per type | Custom numbering logic | Existing `createDocument()` in models/documents.ts | Already handles any documentType via DOCUMENT_PREFIXES lookup. INV, RCT, DLV prefixes already defined. |
| Date formatting for PDFs | Custom date functions | `formatThaiDateLong()` from services/thai-date.ts | Already handles Buddhist Era, Thai month names, all formatting. |
| Contact/seller snapshot creation | Custom snapshot logic | Copy existing pattern from quotation actions.ts lines 73-113 | getBusinessProfile() + getContactById() -> JSON snapshots at creation time. |
| Line items table in PDF | Custom table layout | Clone `itemsTable` styles + mapping from QuotationPDF | Table header row, alternating row styles, column widths all reusable. |
| Form component for invoices | Build from scratch | Clone QuotationForm, add dueDate Input field | Same line items, contact selector, VAT toggle, discount fields. Only dueDate is new. |

**Key insight:** Phase 6 is 90% cloning Phase 5 patterns with minor variations per document type. The only genuinely new logic is (1) the conversion action pattern, (2) partial payment tracking, and (3) the unified document list with chain badges.

## Document-Type-Specific Status Maps

### Invoice Statuses (recommended)
```typescript
export const INVOICE_STATUSES = {
  draft: { label: "แบบร่าง", color: "secondary" },
  sent: { label: "ส่งแล้ว", color: "blue" },
  overdue: { label: "เกินกำหนด", color: "destructive" },  // display-only, lazy detection
  paid: { label: "ชำระแล้ว", color: "green" },
  voided: { label: "ยกเลิก", color: "muted" },
} as const
```

### Receipt Statuses (recommended)
```typescript
export const RECEIPT_STATUSES = {
  draft: { label: "แบบร่าง", color: "secondary" },
  confirmed: { label: "ยืนยันแล้ว", color: "green" },
  voided: { label: "ยกเลิก", color: "muted" },
} as const
```

### Delivery Note Statuses (recommended)
```typescript
export const DELIVERY_NOTE_STATUSES = {
  draft: { label: "แบบร่าง", color: "secondary" },
  delivered: { label: "ส่งแล้ว", color: "green" },
  voided: { label: "ยกเลิก", color: "muted" },
} as const
```

### All-Type Status Map (for unified document list)
```typescript
// Combined map for the unified /apps/documents page
export const ALL_DOCUMENT_STATUSES = {
  ...QUOTATION_STATUSES,
  ...INVOICE_STATUSES,
  ...RECEIPT_STATUSES,
  ...DELIVERY_NOTE_STATUSES,
} as const
// Note: "draft" and "voided" overlap across types, which is fine -- same label/color
```

## State Machine Extensions

```typescript
// Add to VALID_TRANSITIONS in services/document-workflow.ts:
INVOICE: {
  draft: ["sent", "voided"],
  sent: ["paid", "voided"],
  // "overdue" is display-only -- never stored in DB
  // "paid" is set automatically when receipt total >= invoice total
},
RECEIPT: {
  draft: ["confirmed", "voided"],
  // confirmed, voided = terminal
},
DELIVERY_NOTE: {
  draft: ["delivered", "voided"],
  // delivered, voided = terminal
},
```

## Models Layer Extensions

```typescript
// New functions needed in models/documents.ts:

/**
 * Create a document from a source document (for conversions).
 * Copies line items, parties, amounts from source.
 */
export async function createDocumentFromSource(
  userId: string,
  sourceDocumentId: string,
  overrides: Partial<CreateDocumentInput> & { documentType: string }
)

/**
 * Get all documents derived from a source document (for chain display).
 */
export async function getDocumentsBySourceId(
  userId: string,
  sourceDocumentId: string,
  documentType?: string
)

/**
 * Sum paid amounts of non-voided receipts linked to a source invoice.
 * Used for partial payment tracking.
 */
export async function sumReceiptAmountsForInvoice(
  userId: string,
  invoiceId: string
): Promise<number>

/**
 * List documents with filters for the unified document list.
 * Extends existing listDocuments with date range and contact filters.
 */
export async function listDocumentsWithChain(
  userId: string,
  filters?: {
    documentType?: string
    status?: string
    dateFrom?: Date
    dateTo?: Date
    contactId?: string
    limit?: number
    offset?: number
  }
)
```

## Conversion Button Placement

| Source Doc | Button Label (Thai) | Button Location | Target Action |
|-----------|---------------------|-----------------|---------------|
| Quotation (accepted) | สร้างใบแจ้งหนี้ | quotation/[id]/detail-actions.tsx | convertQuotationToInvoiceAction |
| Quotation (accepted/converted) | สร้างใบส่งของ | quotation/[id]/detail-actions.tsx | createDeliveryNoteFromSourceAction |
| Invoice (any non-terminal) | สร้างใบเสร็จ | invoice/[id]/detail-actions.tsx | createReceiptFromInvoiceAction |
| Invoice (sent/overdue) | สร้างใบส่งของ | invoice/[id]/detail-actions.tsx | createDeliveryNoteFromSourceAction |

**Note on quotation conversion buttons:** The quotation detail page (quotation/[id]/detail-actions.tsx) currently shows status transition buttons. Phase 6 ADDS conversion buttons alongside these -- "สร้างใบแจ้งหนี้" appears when status is "accepted".

## Common Pitfalls

### Pitfall 1: Redirect Error Swallowed in Conversion Action Try/Catch
**What goes wrong:** Next.js `redirect()` throws a special `NEXT_REDIRECT` error. If the conversion action wraps everything in try/catch and returns `{ success: false, error }`, the redirect is caught and the user stays on the source page instead of navigating to the new document.
**Why it happens:** The `redirect()` function from `next/navigation` uses exceptions for flow control. This is by design in the Next.js App Router.
**How to avoid:** Re-throw redirect errors in the catch block:
```typescript
catch (error) {
  if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error
  // ... handle real errors
}
```
**Warning signs:** Clicking "สร้างใบแจ้งหนี้" shows an error toast but the invoice was actually created. User stays on the quotation page.

### Pitfall 2: Double Conversion Creates Duplicate Documents
**What goes wrong:** User clicks "สร้างใบแจ้งหนี้" twice quickly. Two invoices are created from the same quotation because both requests read the quotation as "accepted" before either updates it to "converted".
**Why it happens:** Without transaction isolation, the status check and status update are not atomic.
**How to avoid:** The conversion action must use `prisma.$transaction()` with the status check INSIDE the transaction. The second request will see the quotation as "converted" and fail the validation.
**Warning signs:** Two invoices with different numbers linked to the same quotation.

### Pitfall 3: Partial Payment Sum Includes Voided Receipts
**What goes wrong:** A voided receipt is still counted in the sum of payments for an invoice. The invoice shows as "paid" even though the actual payment was voided.
**Why it happens:** The sum query does not filter out receipts with status "voided".
**How to avoid:** Always filter `WHERE status != 'voided'` when summing receipt amounts for an invoice.
**Warning signs:** Invoice marked as "paid" but the customer has not actually paid.

### Pitfall 4: StatusBadge Imported from Quotation Instead of Local
**What goes wrong:** The invoice detail page imports StatusBadge from `../components/status-badge` which uses `QUOTATION_STATUSES`. Invoice-specific statuses like "overdue" or "paid" show as the raw English string instead of Thai labels.
**Why it happens:** Copy-pasting from the quotation app without updating the import path or status map.
**How to avoid:** Each app directory has its own StatusBadge (or uses a shared one that accepts a status map as prop). The shared approach is better -- create a generic StatusBadge that takes `statusMap: Record<string, { label: string; color: string }>` as a prop.
**Warning signs:** Status badges showing English text like "paid" or "overdue" instead of Thai.

### Pitfall 5: Delivery Note PDF Shows Financial Totals
**What goes wrong:** The delivery note PDF is cloned from QuotationPDF and still shows subtotal, VAT, discount, and total sections.
**Why it happens:** D-18 explicitly states delivery notes focus on items and delivery info, NO financial totals.
**How to avoid:** When cloning QuotationPDF for DeliveryNotePDF, remove sections 7 (totals), 8 (validity), and modify section 10 (signature) to show receiver/delivery person instead of quotation approver.
**Warning signs:** Delivery note showing prices and totals when it should only show items and quantities.

### Pitfall 6: Conversion Button Visible on Wrong Status
**What goes wrong:** "สร้างใบแจ้งหนี้" button appears on a draft quotation that has not been accepted yet.
**Why it happens:** The conversion button visibility check does not verify the source document's status.
**How to avoid:** Conversion buttons must check `canTransition(documentType, currentStatus, "converted")` or equivalent status gate before rendering. For quotation -> invoice, only show when `effectiveStatus === "accepted"`.
**Warning signs:** Users creating invoices from unaccepted quotations, bypassing the approval workflow.

### Pitfall 7: Chain Badge Query N+1 Problem
**What goes wrong:** The unified document list loads 100 documents, then for each one makes a separate query to find its sourceDocument and derivedDocuments. This creates 200+ database queries.
**Why it happens:** Using `getDocumentById()` in a loop instead of including relations in the initial query.
**How to avoid:** Use Prisma `include` in the list query:
```typescript
include: {
  sourceDocument: { select: { id: true, documentNumber: true, documentType: true } },
  derivedDocuments: { select: { id: true, documentNumber: true, documentType: true } },
}
```
**Warning signs:** Unified document list page loads slowly. Database logs show hundreds of SELECT queries.

## Code Examples

Verified patterns from the existing codebase:

### Conversion Action with Atomic Transaction
```typescript
// Source: Extension of credit-note/actions.ts pattern + models/documents.ts createDocument()
// This is the core pattern for ALL conversions in Phase 6

export async function convertQuotationToInvoiceAction(
  prevState: ActionState<{ invoiceId: string }> | null,
  formData: FormData
): Promise<ActionState<{ invoiceId: string }>> {
  try {
    const user = await getCurrentUser()
    const sourceDocId = formData.get("sourceDocumentId") as string
    if (!sourceDocId) return { success: false, error: "ข้อมูลไม่ครบถ้วน" }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Load and validate source
      const source = await tx.document.findFirst({
        where: { id: sourceDocId, userId: user.id },
      })
      if (!source) throw new Error("ไม่พบเอกสารต้นทาง")
      if (source.documentType !== "QUOTATION" || source.status !== "accepted") {
        throw new Error("ใบเสนอราคาต้องมีสถานะ 'อนุมัติ'")
      }

      // 2. Generate invoice number (same seq pattern)
      const now = new Date()
      const buddhistYear = toBuddhistYear(now.getFullYear())
      const counterKey = getCounterKey("INV", buddhistYear)
      const current = await tx.setting.findFirst({
        where: { userId: user.id, code: counterKey },
      })
      const nextSeq = parseInt(current?.value ?? "0", 10) + 1
      await tx.setting.upsert({
        where: { userId_code: { userId: user.id, code: counterKey } },
        update: { value: nextSeq.toString() },
        create: { userId: user.id, code: counterKey, name: counterKey, value: nextSeq.toString() },
      })
      const invoiceNumber = formatDocumentNumber("INV", buddhistYear, nextSeq)

      // 3. Create invoice
      const invoice = await tx.document.create({
        data: {
          userId: user.id,
          documentType: "INVOICE",
          documentNumber: invoiceNumber,
          status: "draft",
          sourceDocumentId: sourceDocId,
          contactId: source.contactId,
          issuedAt: now,
          dueDate: addDays(now, 30),
          subtotal: source.subtotal,
          discountAmount: source.discountAmount,
          vatRate: source.vatRate,
          vatAmount: source.vatAmount,
          total: source.total,
          items: source.items ?? [],
          sellerData: source.sellerData,
          buyerData: source.buyerData,
          paymentTerms: source.paymentTerms,
          note: source.note,
        },
      })

      // 4. Update source status
      assertValidTransition("QUOTATION", source.status, "converted")
      await tx.document.update({
        where: { id: sourceDocId },
        data: { status: "converted" },
      })

      return invoice
    })

    revalidatePath("/apps/quotation")
    revalidatePath("/apps/invoice")
    redirect(`/apps/invoice/${result.id}`)
  } catch (error) {
    // Re-throw redirect -- Next.js uses exceptions for navigation
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error
    console.error("Failed to convert quotation to invoice:", error)
    const message = error instanceof Error ? error.message : "แปลงเอกสารไม่สำเร็จ"
    return { success: false, error: message }
  }
}
```

### Receipt Creation with Partial Payment Check
```typescript
// Source: New pattern combining createDocument + partial payment logic

export async function createReceiptFromInvoiceAction(
  prevState: ActionState<{ receiptId: string }> | null,
  formData: FormData
): Promise<ActionState<{ receiptId: string }>> {
  try {
    const user = await getCurrentUser()
    const invoiceId = formData.get("sourceDocumentId") as string

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.document.findFirst({
        where: { id: invoiceId, userId: user.id, documentType: "INVOICE" },
      })
      if (!invoice) throw new Error("ไม่พบใบแจ้งหนี้")
      if (invoice.status === "voided" || invoice.status === "paid") {
        throw new Error("ใบแจ้งหนี้นี้ไม่สามารถสร้างใบเสร็จได้")
      }

      // Calculate remaining balance
      const existingReceipts = await tx.document.findMany({
        where: {
          userId: user.id,
          sourceDocumentId: invoiceId,
          documentType: "RECEIPT",
          status: { not: "voided" },
        },
      })
      const totalPaid = existingReceipts.reduce((sum, r) => sum + (r.paidAmount ?? r.total), 0)
      const remaining = invoice.total - totalPaid
      if (remaining <= 0) throw new Error("ใบแจ้งหนี้นี้ชำระครบแล้ว")

      // Generate receipt number
      const now = new Date()
      const buddhistYear = toBuddhistYear(now.getFullYear())
      const counterKey = getCounterKey("RCT", buddhistYear)
      const current = await tx.setting.findFirst({ where: { userId: user.id, code: counterKey } })
      const nextSeq = parseInt(current?.value ?? "0", 10) + 1
      await tx.setting.upsert({
        where: { userId_code: { userId: user.id, code: counterKey } },
        update: { value: nextSeq.toString() },
        create: { userId: user.id, code: counterKey, name: counterKey, value: nextSeq.toString() },
      })

      const receipt = await tx.document.create({
        data: {
          userId: user.id,
          documentType: "RECEIPT",
          documentNumber: formatDocumentNumber("RCT", buddhistYear, nextSeq),
          status: "draft",
          sourceDocumentId: invoiceId,
          contactId: invoice.contactId,
          issuedAt: now,
          paymentDate: now,
          paymentMethod: "transfer",
          paidAmount: remaining,  // default to remaining balance
          subtotal: invoice.subtotal,
          discountAmount: invoice.discountAmount,
          vatRate: invoice.vatRate,
          vatAmount: invoice.vatAmount,
          total: invoice.total,
          items: invoice.items ?? [],
          sellerData: invoice.sellerData,
          buyerData: invoice.buyerData,
        },
      })

      // Auto-mark invoice as paid if total receipts >= invoice total
      const newTotalPaid = totalPaid + remaining
      if (newTotalPaid >= invoice.total) {
        await tx.document.update({
          where: { id: invoiceId },
          data: { status: "paid" },
        })
      }

      return receipt
    })

    revalidatePath("/apps/invoice")
    revalidatePath("/apps/receipt")
    redirect(`/apps/receipt/${result.id}`)
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error
    console.error("Failed to create receipt:", error)
    const message = error instanceof Error ? error.message : "สร้างใบเสร็จไม่สำเร็จ"
    return { success: false, error: message }
  }
}
```

### Generic StatusBadge with Type-Specific Maps
```typescript
// Source: Extension of quotation/components/status-badge.tsx
// Make it reusable across all document types

"use client"
import { Badge } from "@/components/ui/badge"

type StatusInfo = { label: string; color: string }
type StatusMap = Record<string, StatusInfo>

const STATUS_STYLES: Record<string, string> = {
  secondary: "bg-secondary text-secondary-foreground",
  blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  green: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  destructive: "bg-destructive/10 text-destructive",
  orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  muted: "bg-muted text-muted-foreground",
}

export function StatusBadge({
  status,
  statusMap,
}: {
  status: string
  statusMap: StatusMap
}) {
  const info = statusMap[status]
  const label = info?.label ?? status
  const className = STATUS_STYLES[info?.color ?? "secondary"] ?? STATUS_STYLES.secondary

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}
```

## Invoice Form: Differences from Quotation Form

| Field | Quotation | Invoice | Notes |
|-------|-----------|---------|-------|
| Contact selector | Yes | Yes | Same component |
| Line items | Yes | Yes | Same component |
| VAT toggle | Yes | Yes | Same component |
| Discounts | Yes | Yes | Same component |
| Issued date | Yes | Yes | Same component |
| Validity days | Yes | No | Quotation-specific |
| Due date | No | Yes | Invoice-specific: DatePicker, default 30 days from issue |
| Payment terms | Yes | Yes | Same component |
| Note | Yes | Yes | Same component |

The invoice form is QuotationForm minus validity days, plus due date. Same line item pattern, same contact selector, same VAT toggle.

## Unified Document List: Filter Architecture

**Recommended: Client-side filtering** (Claude's discretion area)

Rationale:
- Self-hosted single-user app -- document count will be < 1000 for years
- Server component loads ALL documents on page render (matching existing `force-dynamic` pattern)
- Client-side filters are instant UX -- no round-trip to server
- Same pattern used by QuotationList (client-side status filter)
- Can migrate to server-side later if scale demands

```typescript
// Filter state shape for the unified list:
type DocumentFilters = {
  documentType: string   // "all" | "QUOTATION" | "INVOICE" | "RECEIPT" | "DELIVERY_NOTE"
  status: string         // "all" | specific status
  dateFrom: string       // ISO date string or ""
  dateTo: string         // ISO date string or ""
  contactSearch: string  // free text search against buyerData.name
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Credit note conversion via AppData (no chain linking) | Document model with sourceDocumentId FK | Phase 5 (schema), Phase 6 (usage) | Enables full quotation->invoice->receipt chain with relational queries |
| Single document type (quotation only) | Multiple document types sharing Document model | Phase 6 (this phase) | INVOICE, RECEIPT, DELIVERY_NOTE transitions added to state machine |
| Quotation-only status badges | Generic StatusBadge accepting any status map | Phase 6 (this phase) | Reusable across all document types without code duplication |

**Deprecated/outdated:**
- AppData for document storage remains in credit-note and tax-invoice apps (legacy, not migrated per Phase 5 D-22)
- The architecture research mentions "billing_note" as a separate document type -- this is deferred per CONTEXT.md

## Open Questions

1. **Receipt `paidAmount` vs `total` for partial payments**
   - What we know: D-11 requires partial payments. Each receipt can be for less than the invoice total.
   - What's unclear: Should the receipt's `total` field hold the invoice total (for display) and a separate `paidAmount` hold the actual payment? Or should `total` be the payment amount?
   - Recommendation: Use `paidAmount` for the actual payment amount (the money received). Keep `total` as the invoice total for reference display. The `paidAmount` column is what gets summed for partial payment tracking. Receipt PDF shows both "ยอดใบแจ้งหนี้: X" and "ยอดรับชำระ: Y".

2. **Should overdue update the DB or remain display-only?**
   - What we know: Deferred idea says no cron. Lazy detection at query time is sufficient for v1.1.
   - What's unclear: If "overdue" is display-only, the unified document list's status filter for "overdue" requires special handling (cannot query by status = "overdue" since it is not stored).
   - Recommendation: Keep it display-only. For the status filter, add client-side logic: when user selects "overdue" filter, show invoices where `status === "sent" && dueDate < now`. This matches the quotation "expired" pattern.

3. **Shared StatusBadge vs per-app StatusBadge**
   - What we know: Current StatusBadge in quotation/components/ uses QUOTATION_STATUSES directly.
   - What's unclear: Should we refactor the existing quotation StatusBadge to be generic, or create new ones for each type?
   - Recommendation: Create a shared generic StatusBadge that accepts a statusMap prop. Keep the quotation-specific one for backward compatibility but have the new document types and the unified list use the generic one. Optionally refactor quotation to use the generic one in a cleanup task.

## Sources

### Primary (HIGH confidence)
- `services/document-workflow.ts` -- Existing VALID_TRANSITIONS, DOCUMENT_PREFIXES, canTransition(), status maps
- `models/documents.ts` -- Existing createDocument(), getDocumentById(), listDocuments(), updateDocumentStatus()
- `app/(app)/apps/quotation/actions.ts` -- Server action pattern: validate -> compute -> snapshot -> persist -> revalidate
- `app/(app)/apps/quotation/[id]/page.tsx` -- Detail page pattern: load doc, cast JSON fields, lazy status detection, QuotationDetailActions
- `app/(app)/apps/quotation/[id]/detail-actions.tsx` -- Status transition buttons, PDF download, void confirmation dialog
- `app/(app)/apps/quotation/components/quotation-pdf.tsx` -- Full PDF template pattern: registerThaiFonts(), StyleSheet, formatAmount(), 11-section layout
- `app/(app)/apps/quotation/components/quotation-form.tsx` -- Form pattern: useActionState, dynamic line items, ContactAutocomplete, computed totals
- `app/(app)/apps/quotation/components/quotation-list.tsx` -- List pattern: client-side status filter, Table component, StatusBadge
- `app/(app)/apps/quotation/components/status-badge.tsx` -- Status-to-color mapping with Badge component
- `app/(app)/apps/credit-note/actions.ts` -- Immutable conversion pattern: load source -> create new -> link via reference
- `prisma/schema.prisma` -- Document model schema with all indexes and self-referential relation
- `services/__tests__/document-workflow.test.ts` -- Existing test patterns for state machine, formatDocumentNumber, getCounterKey
- `models/__tests__/documents.test.ts` -- Existing test patterns with vi.hoisted() Prisma mocking

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` -- Document conversion data flows, state machine design per type
- `.planning/research/PITFALLS-v1.1.md` -- Immutable conversion pattern (Pitfall 4), state machine enforcement (Pitfall 5)
- `.planning/research/FEATURES.md` -- Thai document chain order, FlowAccount/PEAK competitor analysis

### Tertiary (LOW confidence)
- Invoice/Receipt/Delivery Note PDF visual layout specifics -- will need testing with real Thai content
- Partial payment UX (progress bar showing remaining balance) -- needs visual design validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all libraries already installed and verified
- Architecture: HIGH -- all patterns have existing Phase 5 code as direct templates. Document model schema, state machine, conversion flow all verified against working quotation code.
- Pitfalls: HIGH -- all pitfalls identified from existing codebase patterns (redirect error handling, double conversion race, partial payment voided receipts) with concrete prevention strategies
- PDF templates: MEDIUM -- layout specifics need visual testing but infrastructure is proven

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable -- no external dependency changes expected)
