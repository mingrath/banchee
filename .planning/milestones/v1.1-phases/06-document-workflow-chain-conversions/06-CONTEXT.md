# Phase 6: Document Workflow Chain + Conversions - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable document-to-document conversion flows along the Thai business document chain (quotation → invoice → receipt, plus delivery notes), build invoice/receipt/delivery note CRUD with PDFs, and create a unified document list. Phase 5's Document model, status machine, and quotation system are the foundation.

Requirements: QUOT-06, DOC-02, DOC-03, DOC-04, DOC-05, DOC-06, DOC-08

</domain>

<decisions>
## Implementation Decisions

### Conversion UX
- **D-01:** One-click direct create for ALL conversions — quotation→invoice, invoice→receipt, invoice/quotation→delivery note. No dialog, no pre-filled form. Click → document instantly created with all data copied → redirect to new document's detail page.
- **D-02:** Source document status auto-updates on conversion (quotation → "converted", invoice → "paid" when receipt total ≥ invoice amount). Prevents double conversion.
- **D-03:** Invoices can be created BOTH standalone (new form) AND converted from quotation. Both paths supported.
- **D-04:** Conversion copies all data (line items, contact, amounts, seller/buyer snapshots) into new Document record with sourceDocumentId pointing to the source. Source document is NEVER mutated beyond status change.

### Invoice (ใบแจ้งหนี้)
- **D-05:** Invoice has its own status machine: draft → sent → overdue → paid → void. "Overdue" triggered when past due date and not yet paid.
- **D-06:** Invoice form mirrors quotation form (line items, contact, VAT, discounts) but adds a due date field (วันครบกำหนดชำระ).
- **D-07:** Sequential numbering: INV-BBBB-NNNN (same pattern as quotation, year-scoped counter).
- **D-08:** Invoice PDF layout matches quotation PDF pattern but titled "ใบแจ้งหนี้ / INVOICE" with due date and payment info sections.

### Receipt (ใบเสร็จรับเงิน)
- **D-09:** Receipt created via one-click from invoice detail page. Defaults: payment date = today, payment method = "transfer". Editable on receipt detail page after creation.
- **D-10:** Payment methods: bank transfer (โอนเงิน), cash (เงินสด), cheque (เช็ค), credit card (บัตรเครดิต).
- **D-11:** Partial payments supported — multiple receipts per invoice, each for a partial amount. Invoice auto-marks "paid" when sum of receipt amounts ≥ invoice total.
- **D-12:** Receipt has minimal status machine: draft → confirmed → void. No "sent" state.
- **D-13:** Sequential numbering: RCT-BBBB-NNNN.
- **D-14:** Receipt PDF titled "ใบเสร็จรับเงิน / RECEIPT" with payment method and received amount sections.

### Delivery Note (ใบส่งของ)
- **D-15:** Delivery note can be created from quotation OR invoice detail page.
- **D-16:** Delivery note has simple status: draft → delivered → void.
- **D-17:** Sequential numbering: DLV-BBBB-NNNN.
- **D-18:** Delivery note PDF titled "ใบส่งของ / DELIVERY NOTE" — focuses on items and delivery info, no financial totals.

### Unified Document List
- **D-19:** New page at /apps/documents showing ALL document types in one table.
- **D-20:** Inline chain badges — each row shows linked doc icons (QT → INV → RCT) as clickable badges linking to each document's detail page.
- **D-21:** Filters: document type (dropdown), status (dropdown), date range (from/to), contact (search).
- **D-22:** Quotation-only list at /apps/quotation remains unchanged — /apps/documents is the unified view.

### PDF Templates
- **D-23:** Each document type gets its own PDF component, all sharing the same THSarabunNew font registration and thai-pdf-styles. Clone QuotationPDF pattern, change title and type-specific sections.
- **D-24:** All PDFs maintain the same 11-section layout structure from quotation PDF but with type-appropriate headers, sections, and fields.

### Claude's Discretion
- Exact status values and Thai labels per document type
- Detail page layout for invoice/receipt/delivery note (follow quotation detail page pattern)
- Overdue detection mechanism (lazy vs scheduled)
- Invoice/receipt/delivery form validation rules
- Filter component implementation (client-side vs server-side)

</decisions>

<specifics>
## Specific Ideas

- Conversion buttons should appear on the detail page of the source document (e.g., "สร้างใบแจ้งหนี้" button on quotation detail, "สร้างใบเสร็จ" on invoice detail)
- Partial payment: show remaining balance on invoice detail page as "คงเหลือ: ฿X,XXX.XX" with a progress bar
- Chain badges in unified list should use the same StatusBadge component from Phase 5 but with document type prefix (QT, INV, RCT, DLV)

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 5 patterns (clone these)
- `app/(app)/apps/quotation/actions.ts` — Server action pattern: validate → convert → snapshot → persist → redirect
- `app/(app)/apps/quotation/components/quotation-form.tsx` — Line item form with dynamic rows, VAT toggle, discounts
- `app/(app)/apps/quotation/components/quotation-pdf.tsx` — 11-section PDF template with THSarabunNew
- `app/(app)/apps/quotation/components/status-badge.tsx` — Status-to-color mapping component
- `app/(app)/apps/quotation/[id]/page.tsx` — Detail page with document summary, line items, totals
- `app/(app)/apps/quotation/[id]/detail-actions.tsx` — Status transition buttons, PDF download, void dialog

### Core services
- `services/document-workflow.ts` — Status transitions, document numbering, types
- `models/documents.ts` — Document CRUD (createDocument, getDocumentById, listDocuments, updateDocumentStatus)
- `services/tax-calculator.ts` — VAT/WHT calculations, formatCurrency
- `models/business-profile.ts` — Seller data snapshot source

### Research
- `.planning/research/FEATURES.md` — Thai document chain order, competitor analysis
- `.planning/research/ARCHITECTURE.md` — Document model design, data flows, conversion patterns
- `.planning/research/PITFALLS-v1.1.md` — Immutable conversion pattern, satang conventions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **QuotationPDF component** — Clone for InvoicePDF, ReceiptPDF, DeliveryNotePDF (change title + type-specific sections)
- **QuotationForm component** — Clone for InvoiceForm (add due date field)
- **StatusBadge component** — Already supports extensible status-color mapping
- **Detail page pattern** — quotation/[id]/page.tsx + detail-actions.tsx → clone for invoice/receipt/delivery
- **Server action pattern** — createQuotationAction → clone for createInvoiceAction, createReceiptAction, createDeliveryNoteAction
- **Document CRUD** — models/documents.ts already has createDocument, listDocuments, etc. for any documentType

### Established Patterns
- Conversion = create new Document with sourceDocumentId + update source status (credit-note pattern from v1.0)
- Status transitions via canTransition() + transitionStatus() in document-workflow.ts
- Sequential numbering via Settings model year-scoped counter
- Seller/buyer snapshots at creation time (getBusinessProfile + getContactById → JSON)

### Integration Points
- Invoice detail page needs "สร้างใบเสร็จ" button that calls createReceiptAction
- Quotation detail page needs "สร้างใบแจ้งหนี้" button that calls createInvoiceAction
- Receipt creation must check partial payment total against invoice amount
- Unified document list page reads from listDocuments with type/status/date/contact filters

</code_context>

<deferred>
## Deferred Ideas

- **Combined tax invoice/receipt** (ใบกำกับภาษี/ใบเสร็จรับเงิน) — v2, requires "issued as a set" marking per Revenue Department rules
- **Purchase order** (ใบสั่งซื้อ) — v2, not table stakes
- **Billing note** (ใบวางบิล) — could be added later as a separate document type between invoice and receipt
- **Auto-overdue cron job** — could add scheduled detection later; lazy detection at query time is sufficient for v1.1

</deferred>

---

*Phase: 06-document-workflow-chain-conversions*
*Context gathered: 2026-03-26*
