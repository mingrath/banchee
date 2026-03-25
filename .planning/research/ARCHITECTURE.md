# Architecture Research: v1.1 Document Workflow

**Domain:** Thai SME Document Workflow + Bank Reconciliation (extension of existing Thai tax accounting app)
**Researched:** 2026-03-25
**Confidence:** HIGH (based on codebase analysis, Thai business document standards, and competitor patterns)

---

## System Overview

v1.1 adds three feature groups to the existing BanChee architecture. The goal is to integrate with -- not replace -- the existing patterns (AppData-based document storage, server actions, models layer, `@react-pdf/renderer` PDF generation, satang integer arithmetic).

```
+------------------------------------------------------------------+
|                     Presentation Layer                             |
|   app/(app)/apps/                                                 |
|   +-- quotation/           NEW  Quotation CRUD + PDF              |
|   +-- delivery-note/       NEW  Delivery note from quote/invoice  |
|   +-- billing-note/        NEW  Billing note from quote/invoice   |
|   +-- receipt/             NEW  Receipt (payment confirmation)     |
|   +-- bank-reconciliation/ NEW  Import + match + review UI        |
|   +-- tax-invoice/         MOD  Add "convert from quotation"      |
|   +-- credit-note/         MOD  No structural changes             |
|   +-- document-list/       NEW  Unified document list + status    |
+------------------------------------------------------------------+
                              |
+------------------------------------------------------------------+
|                     Server Actions Layer                           |
|   app/(app)/apps/*/actions.ts                                     |
|   +-- quotation/actions.ts       NEW  Create, update, convert     |
|   +-- delivery-note/actions.ts   NEW  Generate from source doc    |
|   +-- billing-note/actions.ts    NEW  Generate from source doc    |
|   +-- receipt/actions.ts         NEW  Generate on payment         |
|   +-- bank-recon/actions.ts      NEW  Import, match, confirm      |
|   +-- tax-invoice/actions.ts     MOD  Accept sourceQuotationId    |
|   +-- document-list/actions.ts   NEW  Query + filter documents    |
+------------------------------------------------------------------+
                              |
+------------------------------------------------------------------+
|                     Services Layer                                 |
|   services/                                                       |
|   +-- document-workflow.ts       NEW  State machine + conversion  |
|   +-- bank-reconciliation.ts     NEW  Matching algorithm          |
|   +-- bank-statement-parser.ts   NEW  CSV/Excel parsing           |
|   +-- tax-calculator.ts         EXISTING  No changes              |
|   +-- thai-date.ts              EXISTING  No changes              |
+------------------------------------------------------------------+
                              |
+------------------------------------------------------------------+
|                     Models Layer                                   |
|   models/                                                         |
|   +-- documents.ts               NEW  Document CRUD + queries     |
|   +-- bank-statements.ts         NEW  Statement + entry CRUD      |
|   +-- apps.ts                   EXISTING  No changes              |
|   +-- contacts.ts              EXISTING  No changes               |
|   +-- business-profile.ts      EXISTING  No changes               |
|   +-- transactions.ts          EXISTING  Minor: link to document  |
+------------------------------------------------------------------+
                              |
+------------------------------------------------------------------+
|                     Database Layer                                  |
|   prisma/schema.prisma                                             |
|   +-- Document model            NEW  Replaces AppData for docs    |
|   +-- BankStatement model       NEW  Imported statement metadata  |
|   +-- BankEntry model           NEW  Individual bank transactions |
|   +-- Transaction model         MOD  Add documentId FK            |
+------------------------------------------------------------------+
```

### Component Responsibilities

| Component | Responsibility | New/Modify | Communicates With |
|-----------|---------------|------------|-------------------|
| **Document model** | Store all business documents (quotation, invoice, receipt, etc.) with status, line items, links between documents | NEW | models/documents.ts, Transaction model |
| **BankStatement model** | Store imported bank statement file metadata (source bank, period, filename) | NEW | models/bank-statements.ts, BankEntry |
| **BankEntry model** | Individual bank transaction rows with matching status | NEW | models/bank-statements.ts, Transaction |
| **services/document-workflow.ts** | Document status transitions and conversion logic (quote to invoice, invoice to receipt) | NEW | models/documents.ts, actions |
| **services/bank-reconciliation.ts** | Fuzzy matching algorithm: match bank entries to transactions by amount + date + name | NEW | models/bank-statements.ts, models/transactions.ts |
| **services/bank-statement-parser.ts** | Parse CSV/Excel bank statements from Thai banks (KBank, SCB, BBL) into normalized BankEntry rows | NEW | bank-recon/actions.ts |
| **apps/document-list/** | Unified view of all documents across types, with status filters | NEW | models/documents.ts |
| **apps/quotation/** | Quotation form, list, PDF, convert-to-invoice button | NEW | models/documents.ts, contacts, business-profile |
| **apps/receipt/** | Receipt generation after payment confirmation | NEW | models/documents.ts |

---

## Critical Architecture Decision: Document Model vs AppData

### Problem

The existing system stores tax invoices and credit notes in the `AppData` model -- a generic JSON blob with a string key pattern like `tax-invoice-INV-2569-0001`. This was sufficient for v1.0 where each document type was independent, but v1.1 requires:

1. **Cross-document relationships**: A quotation links to the invoice it became; an invoice links to the receipt confirming payment.
2. **Status tracking**: Documents move through states (draft, sent, accepted, paid, voided).
3. **Querying across types**: "Show all pending documents" requires filtering by status across document types.
4. **Transaction linking**: A Transaction should know which Document generated it (and vice versa).

### Recommendation: New `Document` Prisma Model

**Do NOT continue using AppData for new document types.** Create a first-class `Document` model. The existing tax invoices and credit notes in AppData remain as-is (migration later, not in v1.1).

**Rationale:**
- AppData's `@@unique([userId, app])` constraint means one key per document -- works for storage but fails for querying ("find all quotations with status=sent").
- JSON blobs cannot have foreign keys, indexes, or type-safe joins.
- The document workflow (quotation -> invoice -> receipt) requires relational links between documents.
- Bank reconciliation needs to join Transaction to Document to check payment status.

### Migration Path for Existing Tax Invoices

Do NOT migrate existing AppData tax invoices in v1.1. Instead:
- New tax invoices created via "convert from quotation" use the Document model.
- The standalone tax-invoice app continues using AppData for backward compatibility.
- v1.2 or later: migrate all AppData tax invoices to Document model with a one-time script.

---

## Recommended Data Model

### New: Document Model

```prisma
model Document {
  id              String    @id @default(uuid()) @db.Uuid
  userId          String    @map("user_id") @db.Uuid
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Document identity
  type            String    // "quotation" | "invoice" | "tax_invoice" | "receipt" | "delivery_note" | "billing_note"
  documentNumber  String    @map("document_number")

  // Status workflow
  status          String    @default("draft") // "draft" | "sent" | "accepted" | "rejected" | "converted" | "paid" | "voided"

  // Parties
  contactId       String?   @map("contact_id") @db.Uuid

  // Dates
  issuedAt        DateTime? @map("issued_at")
  validUntil      DateTime? @map("valid_until")  // For quotations (validity period)
  paidAt          DateTime? @map("paid_at")      // When payment was confirmed

  // Monetary (all in satang)
  subtotal        Int       @default(0)
  vatAmount       Int       @default(0) @map("vat_amount")
  vatRate         Int       @default(700) @map("vat_rate")
  whtAmount       Int       @default(0) @map("wht_amount")
  whtRate         Int       @default(0) @map("wht_rate")
  total           Int       @default(0)

  // Line items (JSON array -- same TaxInvoiceItem shape)
  items           Json      @default("[]")

  // Document chain -- self-referential links
  sourceDocumentId String?  @map("source_document_id") @db.Uuid
  sourceDocument   Document? @relation("DocumentChain", fields: [sourceDocumentId], references: [id])
  derivedDocuments Document[] @relation("DocumentChain")

  // Link to auto-created Transaction
  transactionId   String?   @map("transaction_id") @db.Uuid

  // Seller snapshot (denormalized from business profile at creation time)
  sellerData      Json?     @map("seller_data")
  // Buyer snapshot (denormalized from contact at creation time)
  buyerData       Json?     @map("buyer_data")

  // Misc
  note            String?

  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  @@unique([userId, documentNumber])
  @@index([userId])
  @@index([type])
  @@index([status])
  @@index([contactId])
  @@index([sourceDocumentId])
  @@index([issuedAt])
  @@map("documents")
}
```

**Key design decisions:**

1. **`sellerData` and `buyerData` as JSON snapshots**: Denormalize at creation time. If the business profile or contact address changes later, the historical document retains the values at the time of issuance. This matches real-world legal requirements -- a printed invoice must show the address at the time of issue.

2. **`sourceDocumentId` self-reference**: Creates the document chain. A quotation's `sourceDocumentId` is null. An invoice converted from that quotation points back to it. A receipt points to the invoice.

3. **`items` as JSON**: Reuses the existing `TaxInvoiceItem` shape `{description, quantity, unitPrice, amount}`. No need for a separate LineItem table at this scale (SME = typically <20 items per document).

4. **`transactionId` without FK constraint**: Store the reference without a hard FK to avoid coupling the Transaction model to the Document model bidirectionally. Query via the models layer.

5. **Status values per document type**: Not all statuses apply to all types. The models layer enforces valid transitions per type (see Document Workflow section below).

### New: BankStatement Model

```prisma
model BankStatement {
  id          String      @id @default(uuid()) @db.Uuid
  userId      String      @map("user_id") @db.Uuid
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  bankName    String      @map("bank_name")     // "kbank" | "scb" | "bbl" | "ktb" | "other"
  accountNumber String?   @map("account_number")
  periodStart DateTime?   @map("period_start")
  periodEnd   DateTime?   @map("period_end")
  filename    String

  totalEntries Int        @default(0) @map("total_entries")
  matchedEntries Int      @default(0) @map("matched_entries")

  entries     BankEntry[]

  createdAt   DateTime    @default(now()) @map("created_at")

  @@index([userId])
  @@map("bank_statements")
}

model BankEntry {
  id              String        @id @default(uuid()) @db.Uuid
  statementId     String        @map("statement_id") @db.Uuid
  statement       BankStatement @relation(fields: [statementId], references: [id], onDelete: Cascade)

  date            DateTime
  description     String
  amount          Int           // satang, positive = deposit, negative = withdrawal
  balance         Int?          // running balance in satang (if available)
  reference       String?       // bank reference number

  // Reconciliation
  matchStatus     String        @default("unmatched") @map("match_status") // "unmatched" | "matched" | "confirmed" | "ignored"
  transactionId   String?       @map("transaction_id") @db.Uuid
  matchConfidence Int?          @map("match_confidence") // 0-100 score

  createdAt       DateTime      @default(now()) @map("created_at")

  @@index([statementId])
  @@index([matchStatus])
  @@index([date])
  @@map("bank_entries")
}
```

### Modified: Transaction Model

Add one optional field to link transactions to documents:

```prisma
// Add to existing Transaction model:
documentId String? @map("document_id") @db.Uuid
```

This replaces the current pattern of storing `documentNumber` as a plain string. Existing transactions keep their `documentNumber` field for backward compatibility. New transactions created by the document workflow set both `documentNumber` AND `documentId`.

### Modified: User Model

Add relations:

```prisma
// Add to existing User model:
documents       Document[]
bankStatements  BankStatement[]
```

---

## Document Workflow State Machine

### Quotation (ใบเสนอราคา)

```
draft → sent → accepted → converted (to invoice)
                ↘ rejected
       ↘ voided
```

### Invoice / Tax Invoice (ใบแจ้งหนี้ / ใบกำกับภาษี)

```
draft → sent → paid (receipt generated)
       ↘ voided
```

### Receipt (ใบเสร็จรับเงิน)

```
(auto-created as "issued" when invoice is marked paid)
issued → voided
```

### Delivery Note (ใบส่งสินค้า) / Billing Note (ใบวางบิล)

```
draft → issued → voided
```

### Transition Rules (implemented in `services/document-workflow.ts`)

```typescript
const VALID_TRANSITIONS: Record<string, Record<string, string[]>> = {
  quotation: {
    draft: ["sent", "voided"],
    sent: ["accepted", "rejected", "voided"],
    accepted: ["converted"],
    // rejected, converted, voided = terminal
  },
  invoice: {
    draft: ["sent", "voided"],
    sent: ["paid", "voided"],
    // paid, voided = terminal
  },
  tax_invoice: {
    draft: ["sent", "voided"],
    sent: ["paid", "voided"],
  },
  receipt: {
    issued: ["voided"],
  },
  delivery_note: {
    draft: ["issued", "voided"],
    issued: ["voided"],
  },
  billing_note: {
    draft: ["issued", "voided"],
    issued: ["voided"],
  },
}
```

---

## Data Flow: Document Conversion Chain

### Flow 1: Quotation to Tax Invoice

```
User creates quotation (apps/quotation/page.tsx)
    ↓
createQuotationAction() → validates form, generates QT-YYYY-NNNN number
    ↓
prisma.document.create({ type: "quotation", status: "draft" })
    ↓
User sends quotation → status: "sent"
    ↓
Customer accepts → status: "accepted"
    ↓
User clicks "Convert to Tax Invoice" button
    ↓
convertQuotationToInvoiceAction(quotationId)
    ↓
1. Load source document (quotation)
2. Validate source status === "accepted"
3. Generate INV-YYYY-NNNN number (same seq_ pattern)
4. Create new Document({ type: "tax_invoice", sourceDocumentId: quotationId, items: quotation.items })
5. Update quotation status → "converted"
6. Auto-create income Transaction (same logic as existing tax-invoice/actions.ts)
7. Return new invoice document
```

### Flow 2: Invoice to Receipt

```
User marks invoice as "paid" (from document-list or invoice detail)
    ↓
markInvoicePaidAction(invoiceId, paidAt)
    ↓
1. Update invoice status → "paid", paidAt
2. Auto-create receipt Document({ type: "receipt", sourceDocumentId: invoiceId })
3. Generate RCP-YYYY-NNNN number
4. Receipt inherits buyer/seller/items/total from invoice
5. Return receipt document
```

### Flow 3: Quotation/Invoice to Delivery Note

```
User clicks "Create Delivery Note" on an accepted quotation or sent invoice
    ↓
createDeliveryNoteAction(sourceDocumentId)
    ↓
1. Load source document
2. Generate DN-YYYY-NNNN (reuse "delivery-note" seq, separate from credit-note DN prefix)
3. Create Document({ type: "delivery_note", sourceDocumentId })
4. Copy items from source (user can edit before finalizing)
```

### Flow 4: Bank Reconciliation

```
User uploads bank statement CSV (apps/bank-reconciliation/page.tsx)
    ↓
importBankStatementAction(formData: File)
    ↓
1. Parse CSV via services/bank-statement-parser.ts
2. Detect bank format (KBank, SCB, BBL columns differ)
3. Convert amounts to satang integers
4. Create BankStatement + BankEntry rows
    ↓
Auto-match phase (services/bank-reconciliation.ts)
    ↓
For each BankEntry:
  1. Find Transaction candidates: same userId, amount matches, date within +/- 3 days
  2. Score matches: exact amount = +40, date match = +30, name similarity = +30
  3. If score >= 80 → matchStatus: "matched", store transactionId + confidence
  4. If no match → matchStatus: "unmatched"
    ↓
User reviews matches in UI
    ↓
confirmMatchAction(bankEntryId, transactionId) → matchStatus: "confirmed"
ignoreEntryAction(bankEntryId) → matchStatus: "ignored"
createTransactionFromEntryAction(bankEntryId) → create Transaction + confirm
```

---

## Recommended Project Structure (New Files Only)

```
app/(app)/apps/
├── quotation/
│   ├── manifest.ts            # { code: "quotation", name: "ใบเสนอราคา" }
│   ├── page.tsx               # List + create form
│   ├── [id]/
│   │   └── page.tsx           # Detail view + convert/status actions
│   ├── actions.ts             # create, update, convert, updateStatus
│   └── components/
│       ├── quotation-form.tsx  # Client component, reuse line-item pattern
│       ├── quotation-list.tsx  # List with status badges
│       └── quotation-pdf.tsx  # @react-pdf/renderer template
├── receipt/
│   ├── manifest.ts
│   ├── page.tsx
│   ├── actions.ts
│   └── components/
│       └── receipt-pdf.tsx
├── delivery-note/
│   ├── manifest.ts
│   ├── page.tsx
│   ├── actions.ts
│   └── components/
│       └── delivery-note-pdf.tsx
├── billing-note/
│   ├── manifest.ts
│   ├── page.tsx
│   ├── actions.ts
│   └── components/
│       └── billing-note-pdf.tsx
├── document-list/
│   ├── manifest.ts
│   ├── page.tsx
│   ├── actions.ts
│   └── components/
│       ├── document-table.tsx     # Unified table with type/status filters
│       └── document-status-badge.tsx
├── bank-reconciliation/
│   ├── manifest.ts
│   ├── page.tsx
│   ├── actions.ts
│   └── components/
│       ├── statement-upload.tsx   # CSV file upload + bank selector
│       ├── match-review.tsx       # Side-by-side bank vs transaction
│       └── reconciliation-summary.tsx

forms/
├── quotation.ts               # NEW: Zod schema
├── document-status.ts         # NEW: Status transition validation
├── bank-statement.ts          # NEW: Upload + bank selection schema

models/
├── documents.ts               # NEW: Document CRUD
├── bank-statements.ts         # NEW: BankStatement + BankEntry CRUD

services/
├── document-workflow.ts       # NEW: Status transitions + conversion
├── bank-reconciliation.ts     # NEW: Matching algorithm
├── bank-statement-parser.ts   # NEW: CSV/Excel parsing
```

### Structure Rationale

- **One app directory per document type**: Follows the existing pattern (tax-invoice, credit-note each get their own directory). Each app is self-contained with its manifest, page, actions, and components.
- **document-list as a separate app**: Provides the cross-type view that individual apps cannot. This is a read-only aggregation view.
- **services/ for business logic**: Document workflow state machine and bank reconciliation matching belong in services, not in actions. Actions validate input and call services. This matches the existing pattern where `tax-calculator.ts` and `thai-date.ts` live in services/.
- **models/ for data access**: `models/documents.ts` wraps all Document Prisma queries. `models/bank-statements.ts` wraps BankStatement/BankEntry queries. Follows the existing models/ convention.

---

## Architectural Patterns

### Pattern 1: Document Conversion with Snapshot Preservation

**What:** When converting document A to document B, copy all data at conversion time -- do not reference the source's current state for rendering.

**When to use:** Every conversion (quotation to invoice, invoice to receipt).

**Trade-offs:** Duplicates data (items, buyer/seller info) across documents. This is intentional -- legal documents must preserve the data at the time of issuance. A quotation's price might differ from the final invoice.

```typescript
// services/document-workflow.ts
export async function convertDocument(
  sourceId: string,
  targetType: DocumentType,
  overrides?: Partial<DocumentData>
): Promise<Document> {
  const source = await getDocumentById(userId, sourceId)
  if (!source) throw new Error("Source document not found")

  // Validate transition
  assertCanConvert(source.type, source.status, targetType)

  // Generate new number
  const docNumber = await generateDocumentNumber(userId, targetType)

  // Snapshot: copy items + parties from source, allow overrides
  const newDoc = await createDocument(userId, {
    type: targetType,
    documentNumber: docNumber,
    sourceDocumentId: sourceId,
    items: overrides?.items ?? source.items,
    sellerData: source.sellerData,  // Preserve seller snapshot
    buyerData: source.buyerData,    // Preserve buyer snapshot
    contactId: source.contactId,
    subtotal: overrides?.subtotal ?? source.subtotal,
    vatAmount: overrides?.vatAmount ?? source.vatAmount,
    total: overrides?.total ?? source.total,
    ...overrides,
  })

  // Update source status
  await updateDocumentStatus(userId, sourceId, "converted")

  return newDoc
}
```

### Pattern 2: Sequential Number Generation (Existing Pattern, Extended)

**What:** Reuse the existing `prisma.$transaction` + `Setting.value` pattern for new document type prefixes.

**When to use:** Every document type needs its own sequence counter.

**Trade-offs:** The Setting model stores counters as string values, parsed via `parseInt`. This works fine for a single-user self-hosted app. Would need rethinking for multi-tenant.

```typescript
// New sequence codes (added to existing seq_tax_invoice, seq_credit_note, seq_debit_note):
const SEQUENCE_CODES: Record<string, { code: string; prefix: string }> = {
  quotation:     { code: "seq_quotation",     prefix: "QT" },
  invoice:       { code: "seq_invoice",       prefix: "INV" },  // Shares with tax_invoice
  tax_invoice:   { code: "seq_tax_invoice",   prefix: "INV" },  // Existing
  receipt:       { code: "seq_receipt",        prefix: "RCP" },
  delivery_note: { code: "seq_delivery_note", prefix: "DLV" },  // Distinct from credit-note DN
  billing_note:  { code: "seq_billing_note",  prefix: "BIL" },
  credit_note:   { code: "seq_credit_note",   prefix: "CN" },   // Existing
  debit_note:    { code: "seq_debit_note",     prefix: "DN" },   // Existing
}
```

**Important:** Delivery note prefix `DLV` is intentionally different from debit note `DN` to avoid collision with the existing `seq_debit_note` counter.

### Pattern 3: Bank Statement Parser Strategy

**What:** Pluggable parser per Thai bank format. Each bank exports CSV/Excel with different column layouts.

**When to use:** Bank reconciliation import.

**Trade-offs:** Manual maintenance of parser per bank. Thai banks do not have stable CSV export schemas -- they change without notice. Start with 3 banks (KBank, SCB, BBL) plus a generic/manual format.

```typescript
// services/bank-statement-parser.ts
export type ParsedBankEntry = {
  date: Date
  description: string
  amount: number      // satang, positive = deposit, negative = withdrawal
  balance?: number    // satang
  reference?: string
}

export type BankFormat = "kbank" | "scb" | "bbl" | "generic"

export function detectBankFormat(headers: string[]): BankFormat {
  // KBank: typically "วันที่", "รายการ", "ถอน", "ฝาก", "คงเหลือ"
  // SCB: typically "Transaction Date", "Description", "Withdrawal", "Deposit", "Balance"
  // BBL: typically "Date", "Description", "Debit", "Credit", "Balance"
  // Generic: "date", "description", "amount"
}

export function parseStatement(
  rows: string[][],
  format: BankFormat
): ParsedBankEntry[] {
  const parser = PARSERS[format]
  return rows.map(row => parser(row))
}
```

### Pattern 4: Fuzzy Matching for Bank Reconciliation

**What:** Score-based matching between bank entries and transactions.

**When to use:** After bank statement import, before user review.

**Trade-offs:** Fuzzy matching will have false positives. Always require user confirmation. Never auto-confirm matches -- the user is the final authority.

```typescript
// services/bank-reconciliation.ts
export type MatchCandidate = {
  transactionId: string
  confidence: number  // 0-100
  reasons: string[]   // ["exact amount", "date within 1 day"]
}

export function findMatches(
  entry: ParsedBankEntry,
  transactions: Transaction[]
): MatchCandidate[] {
  return transactions
    .map(tx => scoreMatch(entry, tx))
    .filter(m => m.confidence >= 50)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)  // Top 3 candidates
}

function scoreMatch(entry: ParsedBankEntry, tx: Transaction): MatchCandidate {
  let score = 0
  const reasons: string[] = []

  // Amount match (most important)
  if (Math.abs(entry.amount) === Math.abs(tx.total ?? 0)) {
    score += 40
    reasons.push("exact amount")
  }

  // Date proximity
  const daysDiff = Math.abs(differenceInDays(entry.date, tx.issuedAt ?? new Date()))
  if (daysDiff === 0) { score += 30; reasons.push("same date") }
  else if (daysDiff <= 3) { score += 20; reasons.push("date within 3 days") }
  else if (daysDiff <= 7) { score += 10; reasons.push("date within 7 days") }

  // Name/description similarity
  const nameSimilarity = computeSimilarity(entry.description, tx.merchant ?? tx.name ?? "")
  if (nameSimilarity > 0.7) { score += 30; reasons.push("name match") }
  else if (nameSimilarity > 0.4) { score += 15; reasons.push("partial name match") }

  return { transactionId: tx.id, confidence: Math.min(score, 100), reasons }
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Documents in AppData

**What people do:** Continue the v1.0 pattern of `prisma.appData.upsert({ app: "quotation-QT-2569-0001" })` for new document types.

**Why it's wrong:** AppData cannot be queried by status, type, or date range without loading all records. The document workflow requires joins (quotation -> invoice -> receipt chain) which JSON blobs cannot express. AppData lacks indexes on document-specific fields.

**Do this instead:** Use the new `Document` Prisma model with proper columns, indexes, and self-referential foreign keys.

### Anti-Pattern 2: Bidirectional FK Between Transaction and Document

**What people do:** Add `documentId` FK on Transaction AND `transactionId` FK on Document, creating a circular dependency.

**Why it's wrong:** Circular FKs complicate creation order (which one do you create first?), make migrations fragile, and can cause issues with Prisma's relation resolution.

**Do this instead:** Store `documentId` on Transaction only (the "child" points to the "parent"). The Document knows its transaction via a query: `prisma.transaction.findFirst({ where: { documentId: doc.id } })`. Or store `transactionId` on Document only (either direction works, pick one and be consistent). Recommendation: store `transactionId` on Document since the Document action creates the Transaction and has the ID immediately.

### Anti-Pattern 3: Auto-Confirming Bank Matches

**What people do:** If matching confidence is 100%, skip user review and mark as confirmed.

**Why it's wrong:** Financial reconciliation errors can cause tax filing mistakes. Even "perfect" matches could be wrong (e.g., two payments of exactly the same amount on the same day to the same vendor).

**Do this instead:** Always show matches as "suggested" (matchStatus: "matched"). The user clicks to confirm. Never auto-confirm.

### Anti-Pattern 4: Mutable Document Content After Issuance

**What people do:** Allow editing line items or amounts on a document after it has been sent or converted.

**Why it's wrong:** Thai tax law requires sequential, immutable tax documents. Editing a sent invoice is legally problematic -- you must issue a credit/debit note instead.

**Do this instead:** Documents in "draft" status are editable. Once status transitions to "sent" or beyond, the document is immutable. Changes require voiding + reissuing, or issuing a credit/debit note.

---

## Integration Points with Existing System

### Integration 1: Contact Model (No Changes)

The existing Contact model (`@@unique([userId, taxId, branch])`) is sufficient. Documents reference contacts via `contactId`. The contact autocomplete pattern from tax-invoice form is reusable for quotation/invoice forms.

### Integration 2: Business Profile (No Changes)

The existing `getBusinessProfile()` function provides seller data. Documents snapshot this at creation time into `sellerData` JSON. No changes to the business profile model.

### Integration 3: Tax Calculator (No Changes)

The existing `computeVATOnSubtotal()` and `extractVATFromTotal()` functions are used by the document creation actions. No changes needed.

### Integration 4: Transaction Auto-Creation (Modified)

Currently, `tax-invoice/actions.ts` creates an income Transaction when a tax invoice is generated. The same pattern applies to the new document workflow, but with an added `documentId` link:

```typescript
// In document creation actions:
const transaction = await prisma.transaction.create({
  data: {
    userId: user.id,
    type: "income",
    name: `ใบกำกับภาษี ${documentNumber}`,
    documentId: newDocument.id,  // NEW: link back to document
    // ... rest same as existing pattern
  },
})

// Update document with transaction reference:
await prisma.document.update({
  where: { id: newDocument.id },
  data: { transactionId: transaction.id },
})
```

### Integration 5: PDF Generation (Reuse Pattern)

Existing PDF components use `@react-pdf/renderer` with THSarabunNew font registration, Thai date formatting, and satang-to-baht display conversion. New document PDFs (quotation-pdf.tsx, receipt-pdf.tsx, etc.) follow the exact same pattern as `tax-invoice-pdf.tsx`.

### Integration 6: Sequential Numbering (Reuse Pattern)

The existing `prisma.$transaction` + `parseInt(current?.value ?? "0", 10) + 1` pattern in `tax-invoice/actions.ts` is reused for all new document types. Each type gets its own `seq_*` setting code.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 user, self-hosted (current) | Monolith is fine. SQLite would even work. PostgreSQL provides room to grow. |
| 10-50 users (future multi-tenant) | Add `userId` indexes on Document and BankEntry (already included). Connection pooling via PgBouncer. |
| 100+ users | Bank statement parsing should move to a background job (currently synchronous). Use the existing Progress model + SSE pattern for long-running imports. |

### First bottleneck: Bank statement parsing

Large CSV files (10,000+ rows) parsed synchronously in a server action will timeout. Solution: chunk parsing with the existing `Progress` model for UI feedback.

### Second bottleneck: Document queries

"Show all documents" across 10,000+ documents needs pagination. The existing transaction pagination pattern (`getTransactions` with `limit/offset`) is the template.

---

## Suggested Build Order

Build order is driven by dependencies -- each phase produces components that later phases consume.

### Phase 1: Document Model + Quotation App

**Build:** Prisma migration (Document model), `models/documents.ts`, `services/document-workflow.ts` (status machine), `forms/quotation.ts`, `apps/quotation/` (full CRUD + PDF).

**Rationale:** The Document model is the foundation everything else depends on. Quotation is the entry point of the Thai business document chain and exercises all the patterns (form, list, status transitions, PDF, sequential numbering) without needing the conversion logic yet.

**Dependencies:** None (uses existing Contact, BusinessProfile, tax-calculator).

### Phase 2: Document Conversion + Tax Invoice Integration

**Build:** `convertQuotationToInvoiceAction`, update `tax-invoice/actions.ts` to optionally accept `sourceDocumentId`, receipt auto-generation on payment, delivery-note + billing-note apps.

**Rationale:** Requires the Document model from Phase 1. The conversion logic is the core value of the "document workflow chain." Receipt is a natural follow-on from invoice payment.

**Dependencies:** Phase 1 (Document model, quotation app).

### Phase 3: Document List + Status Dashboard

**Build:** `apps/document-list/` with unified table, status badges, type/status/date filters, document detail view with chain visualization.

**Rationale:** Can only be meaningful once multiple document types exist (Phase 1 + 2). This is the operational view business owners will use daily.

**Dependencies:** Phase 1 + 2 (multiple document types exist).

### Phase 4: Bank Reconciliation

**Build:** Prisma migration (BankStatement, BankEntry), `services/bank-statement-parser.ts`, `services/bank-reconciliation.ts`, `models/bank-statements.ts`, `apps/bank-reconciliation/` (upload, review, confirm).

**Rationale:** Independent of the document workflow chain. Can be built in parallel after Phase 1 (needs the Document/Transaction link but not the full chain). Placed last because it is self-contained and lower priority than the document chain.

**Dependencies:** Transaction model `documentId` field (Phase 1 migration). Does not depend on Phase 2 or 3.

---

## Sources

- BanChee codebase analysis: `prisma/schema.prisma`, `models/apps.ts`, `models/contacts.ts`, `models/business-profile.ts`, `app/(app)/apps/tax-invoice/actions.ts`, `app/(app)/apps/credit-note/actions.ts`, `services/tax-calculator.ts`
- [FlowAccount Quotation Features](https://flowaccount.com/en/functions/quotation) -- competitor quotation workflow reference
- [FlowAccount Document Workflow Blog](https://flowaccount.com/blog/cloud-accounting-software-thailand-quotation/) -- quotation-to-invoice flow
- [SME Document Guide](https://smebaas.com/essential-sales-documents-thailand-guide/) -- Thai business document standards
- [VBA Partners Tax Invoice Guide](https://vbapartners.com/how-to-issue-a-tax-invoice-receipt-in-thailand/) -- Tax invoice/receipt issuance rules
- [SCB Statement Converter](https://github.com/shlomki/scb-statement-converter) -- Thai bank PDF-to-CSV tool (reference for column formats)
- [Bank Reconciliation Architecture](https://statementextract.com/blogs/automated-bank-reconciliation-software-guide/) -- reconciliation algorithm patterns

---
*Architecture research for: BanChee v1.1 Document Workflow*
*Researched: 2026-03-25*
