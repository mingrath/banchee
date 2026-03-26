---
phase: 06-document-workflow-chain-conversions
verified: 2026-03-26T08:00:00Z
status: human_needed
score: 5/5 must-haves verified
re_verification: false
human_verification:
  - test: "Quotation-to-invoice conversion end-to-end"
    expected: "Accepted quotation converts to invoice with all data pre-filled, quotation marked 'converted', redirect to /apps/invoice/{id}"
    why_human: "Requires browser interaction through the full conversion flow with real form state transitions"
  - test: "Invoice-to-receipt partial payment tracking"
    expected: "Create two receipts for partial amounts — first does not mark invoice 'paid', second (bringing total >= invoice) does mark it 'paid'"
    why_human: "Multi-step flow requiring real DB writes and invoice status recalculation across two receipt creations"
  - test: "PDF rendering with THSarabunNew"
    expected: "Invoice PDF shows 'ใบแจ้งหนี้ / INVOICE', receipt shows 'ใบเสร็จรับเงิน / RECEIPT', delivery note shows 'ใบส่งของ / DELIVERY NOTE' — all with correct Thai font"
    why_human: "Font rendering in @react-pdf/renderer cannot be verified without visual inspection"
  - test: "Delivery note PDF has no financial totals"
    expected: "Downloaded delivery note PDF shows only item columns (#, description, quantity, unit) with no unit price, discount, amount, or totals section"
    why_human: "PDF layout correctness (absence of financial columns) requires visual inspection of the rendered PDF"
  - test: "Unified document list chain badges"
    expected: "At /apps/documents, a document that is part of a chain (e.g., QT -> INV -> RCT) shows all three abbreviated badges as clickable links"
    why_human: "Requires real documents in the DB with chain links to verify badge rendering and navigation"
---

# Phase 6: Document Workflow Chain + Conversions — Verification Report

**Phase Goal:** Users can convert documents along the Thai business chain — quotation to invoice to receipt to tax invoice — filling in data once and flowing it through the entire chain
**Verified:** 2026-03-26T08:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can convert an accepted quotation to an invoice with one click — all data pre-fills from source | VERIFIED | `convertQuotationToInvoiceAction` in `app/(app)/apps/invoice/actions.ts` validates source status is "accepted", calls `createDocumentFromSource`, updates source to "converted" in `$transaction` (lines 207-234). Quotation detail-actions imports and wires the action (line 19, 199). |
| 2 | User can create a receipt linked to an invoice, recording payment date and method, and invoice auto-updates to "paid" | VERIFIED | `createReceiptFromInvoiceAction` in `app/(app)/apps/receipt/actions.ts` calls `createDocumentFromSource` then `sumReceiptAmountsForInvoice` to check if total >= invoice total and auto-marks invoice "paid" (lines 78-100). `updateReceiptAction` and void both recalculate. |
| 3 | User can create a delivery note linked to a quotation or invoice | VERIFIED | `createDeliveryNoteFromSourceAction` in `app/(app)/apps/delivery-note/actions.ts` uses `createDocumentFromSource` for DELIVERY_NOTE, accepts QUOTATION or INVOICE source, does NOT update source status (lines 57-84). |
| 4 | Every conversion creates a new document — source is never mutated, only its status changes | VERIFIED | `createDocumentFromSource()` in `models/documents.ts` (lines 151-219) creates a new doc and sets `sourceDocumentId`. Only `status` is updated on source (in callers). Plan 01 key decision documented: "createDocumentFromSource does NOT update source status — caller handles that." |
| 5 | User can view all documents in a unified list with type and status filters, each showing chain links | VERIFIED | `app/(app)/apps/documents/page.tsx` calls `listDocumentsWithChain` (line 9). `DocumentTable` renders `ChainBadges` component. `DocumentFilters` provides type/status/date range. `ChainBadges` uses `Link` with `href="/apps/{route}/{doc.id}"` and `ArrowRight` separator. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | dueDate, paymentMethod, paymentDate, paidAmount columns | VERIFIED | Lines 309-312: all 4 nullable columns present with correct `@map()` snake_case DB names |
| `prisma/migrations/20260326044821_add_invoice_receipt_fields/migration.sql` | Migration for new columns | VERIFIED | Directory exists in `prisma/migrations/` |
| `services/document-workflow.ts` | INVOICE_STATUSES, RECEIPT_STATUSES, DELIVERY_NOTE_STATUSES, transitions, getEffectiveInvoiceStatus | VERIFIED | Lines 30-95: all status maps exported, VALID_TRANSITIONS at lines 78-87, getEffectiveInvoiceStatus at line 95 |
| `models/documents.ts` | createDocumentFromSource, getDocumentsBySourceId, sumReceiptAmountsForInvoice, listDocumentsWithChain | VERIFIED | Lines 151, 222, 241, 261 — all four functions implemented (303-line file, substantive) |
| `forms/invoice.ts` | invoiceFormSchema with dueDate | VERIFIED | Line 3: schema exported; line 6: dueDate required field |
| `app/(app)/apps/invoice/actions.ts` | createInvoiceAction, convertQuotationToInvoiceAction, updateInvoiceStatusAction | VERIFIED | All three actions present, 284 lines, NEXT_REDIRECT re-throw at lines 238-249 |
| `app/(app)/apps/invoice/components/invoice-pdf.tsx` | THSarabunNew, "ใบแจ้งหนี้ / INVOICE" title | VERIFIED | registerThaiFonts() called at line 8; title text at line 289-290 (Unicode-escaped Thai + "/ INVOICE") |
| `app/(app)/apps/invoice/[id]/detail-actions.tsx` | canTransition, createReceiptFromInvoiceAction, createDeliveryNoteFromSourceAction wired | VERIFIED | Lines 17-18: real imports from receipt/delivery-note actions; lines 183, 198: form actions wired |
| `app/(app)/apps/receipt/actions.ts` | createReceiptFromInvoiceAction, updateReceiptAction, updateReceiptStatusAction | VERIFIED | All three present, sumReceiptAmountsForInvoice called at lines 91, 171, 224; NEXT_REDIRECT at 107-115 |
| `app/(app)/apps/receipt/components/receipt-pdf.tsx` | "ใบเสร็จรับเงิน / RECEIPT" title, payment info section | VERIFIED | Title at line 313; "ข้อมูลการชำระเงิน" at line 437; payment method/date fields rendered |
| `app/(app)/apps/delivery-note/actions.ts` | createDeliveryNoteFromSourceAction, updateDeliveryNoteStatusAction | VERIFIED | createDocumentFromSource called at line 58; NEXT_REDIRECT at lines 70-79 |
| `app/(app)/apps/delivery-note/components/delivery-note-pdf.tsx` | "ใบส่งของ / DELIVERY NOTE", NO subtotal/vatAmount | VERIFIED | Title at line 248; grep for "subtotal" or "vatAmount" returns no matches |
| `app/(app)/apps/documents/page.tsx` | Uses listDocumentsWithChain | VERIFIED | Lines 2 and 9: imported and called |
| `app/(app)/apps/documents/components/chain-badges.tsx` | ArrowRight, Link href to detail pages | VERIFIED | ArrowRight imported (line 5); Link href at line 89 |
| `app/(app)/apps/documents/components/status-badge.tsx` | ALL_DOCUMENT_STATUSES | VERIFIED | Imported (line 4); used as default at line 35 |
| `app/(app)/apps/invoice/components/payment-progress-bar.tsx` | ชำระครบแล้ว, เกินกำหนดชำระ labels | VERIFIED | Line 25: "ชำระครบแล้ว"; line 54: "เกินกำหนดชำระ {overdueDays} วัน" |
| `app/(app)/apps/quotation/[id]/detail-actions.tsx` | สร้างใบแจ้งหนี้, สร้างใบส่งของ conversion buttons | VERIFIED | Lines 203, 214: button text; line 19: convertQuotationToInvoiceAction imported; line 199: form action wired |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `models/documents.ts` | `services/document-workflow.ts` | `assertValidTransition` | WIRED | Line 3: imported; line 139: called in updateDocumentStatus |
| `models/documents.ts` | `prisma/schema.prisma` | paymentMethod, paymentDate, paidAmount, dueDate | WIRED | Lines 74-76: fields written; lines 211-213: overrides applied; line 252: paidAmount aggregated |
| `app/(app)/apps/invoice/actions.ts` | `models/documents.ts` | createDocument, createDocumentFromSource, updateDocumentStatus | WIRED | Lines 12-15: imported; lines 124, 220, 277: called |
| `app/(app)/apps/invoice/[id]/detail-actions.tsx` | `services/document-workflow.ts` | canTransition, getEffectiveInvoiceStatus | WIRED | Line 19: imported; lines 136, 147, 162: canTransition called |
| `app/(app)/apps/invoice/components/invoice-pdf.tsx` | `exports/pdf/fonts.ts` | registerThaiFonts | WIRED | Line 2: imported; line 8: called at module level |
| `app/(app)/apps/receipt/actions.ts` | `models/documents.ts` | createDocumentFromSource, sumReceiptAmountsForInvoice | WIRED | Lines 8, 10: imported; lines 78, 91, 171, 224: called |
| `app/(app)/apps/delivery-note/actions.ts` | `models/documents.ts` | createDocumentFromSource | WIRED | Line 8: imported; line 58: called |
| `app/(app)/apps/invoice/[id]/detail-actions.tsx` | `app/(app)/apps/receipt/actions.ts` | createReceiptFromInvoiceAction | WIRED | Line 17: imported; line 183: form action |
| `app/(app)/apps/documents/page.tsx` | `models/documents.ts` | listDocumentsWithChain | WIRED | Line 2: imported; line 9: called |
| `app/(app)/apps/documents/components/chain-badges.tsx` | detail pages | Link href to /apps/{type}/{id} | WIRED | Line 89: `href={\`/apps/${route}/${doc.id}\`}` |
| `app/(app)/apps/quotation/[id]/detail-actions.tsx` | `app/(app)/apps/invoice/actions.ts` | convertQuotationToInvoiceAction | WIRED | Line 19: imported; line 199: form action |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| QUOT-06 | 06-02, 06-04 | Convert accepted quotation to invoice with one click | SATISFIED | `convertQuotationToInvoiceAction` in invoice/actions.ts; conversion buttons in quotation/[id]/detail-actions.tsx |
| DOC-02 | 06-02 | Create invoice standalone or from quotation | SATISFIED | `createInvoiceAction` + `convertQuotationToInvoiceAction` both implemented |
| DOC-03 | 06-03 | Create receipt linked to invoice with payment date/method | SATISFIED | `createReceiptFromInvoiceAction` with defaults (transfer, today, full amount); `receipt-detail-edit.tsx` for editing |
| DOC-04 | 06-03 | Create delivery note linked to quotation or invoice | SATISFIED | `createDeliveryNoteFromSourceAction` accepts QUOTATION or INVOICE source |
| DOC-05 | 06-01, 06-02, 06-03 | Document conversion is immutable — new record, source never mutated | SATISFIED | `createDocumentFromSource` creates new doc; only status updated on source; plan key-decision explicitly documented |
| DOC-06 | 06-02, 06-03 | Each document type has PDF template with THSarabunNew | SATISFIED | invoice-pdf.tsx, receipt-pdf.tsx, delivery-note-pdf.tsx all use registerThaiFonts() |
| DOC-08 | 06-04 | Unified document list with type and status filters | SATISFIED | /apps/documents page with DocumentTable, DocumentFilters, ChainBadges |

**All 7 Phase 6 requirements: SATISFIED**

Note: DOC-08 requirement text in REQUIREMENTS.md does not include "tax invoice" (TAX_INVOICE document type). The phase goal mentions "tax invoice" but both the REQUIREMENTS.md definition and all 5 PLANs only require quotation, invoice, receipt, and delivery note conversions. TAX_INVOICE is deferred to v2 (ETAX-01). This is not a gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | No TODO/FIXME/placeholder/stubs detected in new app directories | — | — |

Scanned: all files under `app/(app)/apps/invoice/`, `app/(app)/apps/receipt/`, `app/(app)/apps/delivery-note/`, `app/(app)/apps/documents/`. No anti-patterns found.

Note on Plan 02 known stubs: The 06-02-SUMMARY documented two intentional toast placeholder stubs for conversion buttons ("สร้างใบเสร็จ", "สร้างใบส่งของ"). Plan 03 resolved these — `app/(app)/apps/invoice/[id]/detail-actions.tsx` now imports real actions at lines 17-18 with form wiring at lines 183, 198.

### Human Verification Required

#### 1. Quotation-to-Invoice Conversion Flow

**Test:** Go to `/apps/quotation`, create a quotation, send it, accept it. Click "สร้างใบแจ้งหนี้" on the detail page.
**Expected:** Redirect to new invoice page with all line items, contact, amounts, and VAT pre-filled from the quotation. Quotation detail now shows status "converted".
**Why human:** Full form state transition with real DB writes across two documents; redirect behavior requires browser.

#### 2. Invoice-to-Receipt Partial Payment Tracking

**Test:** Create invoice, send it. Click "สร้างใบเสร็จ" twice — first time edit the amount to be less than the invoice total. Second time, enter the remaining amount.
**Expected:** After first receipt: invoice status remains "sent". After second receipt that brings total >= invoice total: invoice status changes to "paid". Payment progress bar reflects both receipts.
**Why human:** Multi-step flow with real DB state changes and automatic recalculation logic.

#### 3. PDF Rendering with THSarabunNew

**Test:** Download PDFs for all three document types: invoice, receipt, delivery note.
**Expected:** All PDFs render correctly in Thai with THSarabunNew font. Invoice title is "ใบแจ้งหนี้ / INVOICE". Receipt title is "ใบเสร็จรับเงิน / RECEIPT". Delivery note title is "ใบส่งของ / DELIVERY NOTE".
**Why human:** Font rendering in @react-pdf/renderer cannot be verified programmatically.

#### 4. Delivery Note — No Financial Columns

**Test:** Create delivery note from an invoice. Download the PDF.
**Expected:** PDF shows only columns: # / รายละเอียด / จำนวน / หน่วย. No unit price, discount, amount columns. No subtotal, VAT, total section.
**Why human:** PDF layout (absence of sections) requires visual inspection.

#### 5. Unified Document List with Chain Badges

**Test:** After creating the QT -> INV -> RCT chain above, go to `/apps/documents`.
**Expected:** Each document row in the chain shows abbreviated badges (e.g., "QT-0001 -> INV-0001 -> RCT-0001") as clickable links. Clicking each badge navigates to the correct detail page. Type and status filters work to narrow the list.
**Why human:** Chain badge rendering requires real linked documents in the DB; clickability requires browser.

### Gaps Summary

No automation-detectable gaps found. All observable truths are verified, all 17 required artifacts exist and are substantively implemented, all 11 key links are wired. All 7 phase requirements are satisfied.

The 5 human verification items are functional behaviors that require a running application with real database state. Automated code analysis confirms the correct implementation paths are wired — the human tests confirm the paths are traversable end-to-end.

---

_Verified: 2026-03-26T08:00:00Z_
_Verifier: Claude (gsd-verifier)_
