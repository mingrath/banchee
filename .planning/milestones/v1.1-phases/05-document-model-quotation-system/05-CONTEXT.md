# Phase 5: Document Model + Quotation System - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the Document Prisma model as the foundation for all business documents, then build quotation CRUD as the first document type — create, edit, list with status tracking, PDF generation, and sequential numbering. This phase sets the pattern that Phase 6 clones for invoices, receipts, and delivery notes.

Requirements: QUOT-01, QUOT-02, QUOT-03, QUOT-04, QUOT-05, DOC-01, DOC-07

</domain>

<decisions>
## Implementation Decisions

### Document Numbering
- **D-01:** Full Buddhist Era year format: `PREFIX-BBBB-NNNN` (e.g., QT-2568-0001)
- **D-02:** Counter resets annually at fiscal year boundary (standard Thai practice)
- **D-03:** 4-digit sequence counter (0001-9999) per document type per year
- **D-04:** Fixed prefixes — QT (quotation), INV (invoice), RCT (receipt), DLV (delivery), TAX (tax invoice). No user customization.
- **D-05:** Numbering uses existing Settings model + `prisma.$transaction()` pattern (same as tax-invoice app: read-parse-increment-save)

### Quotation Form UX
- **D-06:** Dynamic line item rows with "+ Add Item" button below the table, delete icon per row
- **D-07:** Each row: description (text), quantity (number), unit (text: ชิ้น/ครั้ง/วัน/etc), unit price (baht input → satang storage), discount (baht), amount (auto-calculated)
- **D-08:** VAT toggle: include 7% VAT or not. No WHT on quotations (WHT is a payment-time concern, not quoting-time)
- **D-09:** Per-item discount column + overall discount field on total
- **D-10:** Contact selector with inline create (reuse existing contact autocomplete from tax-invoice)
- **D-11:** Validity period field (default 30 days) and payment terms (free text)

### Quotation PDF
- **D-12:** Standard Thai quotation format with THSarabunNew font
- **D-13:** Layout: company header (logo + name + address + Tax ID) → buyer info → line items table → subtotal/discount/VAT/total → validity note → 2 signature lines (ผู้เสนอราคา / ผู้อนุมัติ)
- **D-14:** Client-side PDF generation via @react-pdf/renderer (same pattern as VAT/WHT reports)

### Data Model
- **D-15:** Single `Document` Prisma model with `documentType` enum (QUOTATION, INVOICE, RECEIPT, DELIVERY_NOTE). NOT separate tables per type.
- **D-16:** Line items stored as JSON column on Document (matches existing AppData pattern — flexible, no extra table)
- **D-17:** Seller and buyer data snapshotted as JSON at document creation time (Thai tax law requires documents to reflect data at time of issuance)
- **D-18:** `sourceDocumentId` self-referential FK for chain linking (quotation → invoice → receipt)
- **D-19:** Status stored as string column with explicit transition validation function (not XState — ~20 lines of TypeScript)
- **D-20:** All amounts in satang integers (matches v1.0 convention)
- **D-21:** UUID primary keys, camelCase code / snake_case DB via @map() (matches existing schema conventions)

### Migration Strategy
- **D-22:** Existing tax-invoice app (AppData-based) stays as-is. NOT migrated to Document model in Phase 5. Both systems coexist until v1.2.
- **D-23:** New Document model does NOT interact with AppData. Separate data path.

### Claude's Discretion
- Exact Prisma schema field names and types (follow existing @map conventions)
- Status values per document type (research should confirm standard Thai statuses)
- Loading skeleton and error state design
- Form validation error messages (in Thai)
- PDF spacing, margins, and exact typography

</decisions>

<specifics>
## Specific Ideas

- Quotation form should feel similar to the existing tax-invoice form — same patterns, same contact selector, same PDF preview UX
- The Document model is the foundation — Phase 6 clones this for invoice, receipt, delivery note with minimal new code
- Line item amounts follow the same satang convention: user inputs baht, form converts to satang on save, formatCurrency handles display

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing patterns to follow
- `app/(app)/apps/tax-invoice/actions.ts` — Sequential numbering pattern (read-parse-increment-save in $transaction), line item handling, contact resolution
- `app/(app)/apps/tax-invoice/page.tsx` — Form + PDF preview layout pattern
- `app/(app)/apps/credit-note/actions.ts` — Immutable conversion pattern (creates new record linked to source)
- `services/tax-calculator.ts` — Satang arithmetic, formatCurrency, computeVATOnSubtotal
- `models/contacts.ts` — Contact CRUD with upsert on userId+taxId+branch composite unique
- `prisma/schema.prisma` — All existing model conventions (UUID PK, @map, camelCase)

### Research findings
- `.planning/research/ARCHITECTURE.md` — Document model design, data flows, integration points
- `.planning/research/FEATURES.md` — Thai document chain, FlowAccount/PEAK competitor analysis
- `.planning/research/PITFALLS-v1.1.md` — 9 critical pitfalls including satang double-division, FIRST_CLASS_COLUMNS
- `.planning/research/STACK.md` — Zero new dependencies confirmation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Contact autocomplete component** (`app/(app)/apps/tax-invoice/components/`): Inline create + search, reuse directly
- **PDF generation pattern** (`exports/pdf/thai-pdf-styles.ts`, `exports/pdf/fonts.ts`): THSarabunNew registration and shared styles
- **Sequential numbering** (`tax-invoice/actions.ts:91-120`): Read-parse-increment-save in $transaction — clone for QT prefix
- **Business profile loader** (`models/business-profile.ts`): Load company info for PDF header and seller snapshot
- **formatCurrency** (`services/tax-calculator.ts`): Satang → baht display with ฿ prefix and comma formatting

### Established Patterns
- **Server Actions return `ActionState<T>`**: `{ success: boolean; error?: string; data?: T }`
- **Models layer wraps Prisma**: All DB access through `models/*.ts`, not direct prisma calls in actions
- **Client-side PDF via pdf()**: Called from component, not server — avoids server memory pressure
- **AppData for document storage**: `key: "{type}-{docNumber}"`, value: JSON — BUT we're replacing this with proper Document model

### Integration Points
- **Contact model**: Quotation references Contact via contactId
- **Business profile (Settings)**: Seller info loaded from biz_* settings for PDF header + snapshot
- **Transaction model**: Phase 6 will link Document → Transaction when invoice converts to receipt (not in Phase 5)

</code_context>

<deferred>
## Deferred Ideas

- **Tax invoice migration to Document model** — v1.2 (D-22 decision)
- **Combined tax invoice/receipt format** (ใบกำกับภาษี/ใบเสร็จรับเงิน) — v2, requires "issued as a set" marking
- **Purchase order** (ใบสั่งซื้อ) — v2, not table stakes for Thai SME
- **Quotation approval workflow** (multi-user sign-off) — requires ADV-05 multi-user feature

</deferred>

---

*Phase: 05-document-model-quotation-system*
*Context gathered: 2026-03-25*
