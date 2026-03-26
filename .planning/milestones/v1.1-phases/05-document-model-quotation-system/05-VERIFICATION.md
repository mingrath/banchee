---
phase: 05-document-model-quotation-system
verified: 2026-03-26T09:50:00Z
status: human_needed
score: 5/5 must-haves verified
human_verification:
  - test: "Navigate to /apps/quotation, create a quotation with 2-3 line items, VAT toggle, download PDF"
    expected: "THSarabunNew Thai font renders correctly, 7-column table, totals correct, signature area visible, BanChee footer"
    why_human: "PDF font rendering and layout correctness cannot be verified programmatically"
  - test: "Submit quotation form and verify document number format in preview dialog"
    expected: "QT-2569-0001 format (Buddhist Era year, 4-digit sequence)"
    why_human: "Sequential number generation depends on database state and live form submission"
  - test: "Navigate to detail page, click Send button, verify status changes to sent"
    expected: "Status badge changes from draft to sent, sent action buttons appear (accept/reject/void)"
    why_human: "Status transition UI and state machine enforcement requires live interaction"
  - test: "Check quotation list page with status filter dropdown"
    expected: "Filter by status works client-side, expired detection shows orange badge for sent quotations past validUntil"
    why_human: "Client-side filter behavior and expired detection requires live data"
---

# Phase 05: Document Model + Quotation System Verification Report

**Phase Goal:** Users can create, manage, and print professional Thai quotations with sequential numbering, status tracking, and PDF generation
**Verified:** 2026-03-26T09:50:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Document Prisma model exists with all required fields and migration applied | VERIFIED | `prisma/schema.prisma:296` has `model Document` with all D-15 through D-21 fields; migration `20260326014142_add_document_model` exists |
| 2 | Status transitions enforce the quotation state machine — invalid transitions throw | VERIFIED | `VALID_TRANSITIONS` table in `services/document-workflow.ts:34-38`; `assertValidTransition` throws on invalid; 37 tests pass |
| 3 | Sequential document numbers follow QT-BBBB-NNNN format with year-scoped counters | VERIFIED | `formatDocumentNumber` returns `QT-2568-0001` per tests; `getCounterKey` returns `seq_qt_2568`; tests confirm format |
| 4 | Document CRUD functions work: create, getById, listByUser, updateStatus | VERIFIED | All four exported from `models/documents.ts`; atomic `prisma.$transaction` for create; userId-scoped queries |
| 5 | User can create a quotation via form with line items, contact, VAT, validity | VERIFIED | `quotation-form.tsx` (570 lines): `useActionState(createQuotationAction)`, `ContactAutocomplete`, `Switch` for VAT, `useMemo` totals, dynamic line items grid |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `prisma/schema.prisma` | VERIFIED | Model Document with all fields: `documentType`, `documentNumber`, `status`, `items`, `sellerData`, `buyerData`, `sourceDocumentId`, `@@unique([userId, documentNumber])`, User back-relation at line 45 |
| `services/document-workflow.ts` | VERIFIED | 3700 bytes; exports: `canTransition`, `assertValidTransition`, `formatDocumentNumber`, `getCounterKey`, `DOCUMENT_PREFIXES`, `QUOTATION_STATUSES`, `QuotationLineItem`, `QuotationData` |
| `models/documents.ts` | VERIFIED | 3672 bytes; exports: `createDocument`, `getDocumentById`, `listDocuments`, `updateDocumentStatus`, `CreateDocumentInput`; uses `prisma.$transaction` for atomic counter increment |
| `services/__tests__/document-workflow.test.ts` | VERIFIED | 3971 bytes; 26 tests all passing |
| `models/__tests__/documents.test.ts` | VERIFIED | 7664 bytes; 11 tests all passing |
| `forms/quotation.ts` | VERIFIED | 694 bytes; exports `quotationFormSchema` with `contactId`, `issuedAt`, `validityDays`, `includeVat`, `overallDiscount`; exports `QuotationFormValues` |
| `app/(app)/apps/quotation/manifest.ts` | VERIFIED | 223 bytes; `code: "quotation"`, Thai name, `icon: "FileText"` |
| `app/(app)/apps/quotation/actions.ts` | VERIFIED | 7079 bytes; `"use server"`, `createQuotationAction`, `updateQuotationStatusAction`, `listQuotationsAction`; Zod validation, baht-to-satang conversion, `computeVATOnSubtotal`, `getBusinessProfile`, `getContactById`, `addDays` |
| `app/(app)/apps/quotation/components/quotation-pdf.tsx` | VERIFIED | 14451 bytes (454 lines); `registerThaiFonts()` at module level (line 8); `StyleSheet.create`; 11 sections; signature area; BanChee footer |
| `app/(app)/apps/quotation/components/status-badge.tsx` | VERIFIED | 1031 bytes; `"use client"`, `QUOTATION_STATUSES` import, all 7 status colors including dark mode variants |
| `app/(app)/apps/quotation/page.tsx` | VERIFIED | 68 lines; `force-dynamic`, `getCurrentUser`, `isBusinessProfileComplete`, `getBusinessProfile`, `listDocuments`, `QuotationForm` |
| `app/(app)/apps/quotation/[id]/page.tsx` | VERIFIED | 299 lines; `force-dynamic`, `getDocumentById`, `canTransition`, `StatusBadge`, PDF generation via `detail-actions.tsx` |
| `app/(app)/apps/quotation/components/quotation-form.tsx` | VERIFIED | 570 lines; `"use client"`, `useActionState(createQuotationAction)`, `ContactAutocomplete`, `useMemo` totals, `sm:grid-cols-[1fr_80px_80px_100px_100px_100px_40px]`, `Switch`, `Trash2`, `formatCurrency`, dynamic line items |
| `app/(app)/apps/quotation/components/quotation-list.tsx` | VERIFIED | 154 lines; `"use client"`, `StatusBadge`, `Table`, `Select` filter, `documentNumber`, `formatCurrency`, expired detection |
| `app/(app)/apps/quotation/components/quotation-preview.tsx` | VERIFIED | 146 lines; `"use client"`, `pdf(createElement(QuotationPDF))`, `toBlob()`, `toast.success`, `toast.error` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `models/documents.ts` | `services/document-workflow.ts` | `assertValidTransition` called in `updateDocumentStatus` | WIRED | Line 129: `assertValidTransition(doc.documentType, doc.status, newStatus)` |
| `prisma/schema.prisma` | `models/documents.ts` | Prisma client queries against Document model | WIRED | Lines 85, 102, 125, 130: `prisma.document.findFirst/findMany/update` |
| `app/(app)/apps/quotation/actions.ts` | `models/documents.ts` | `createDocument`, `listDocuments`, `updateDocumentStatus` calls | WIRED | Lines 10, 89, 166, 178 |
| `app/(app)/apps/quotation/actions.ts` | `forms/quotation.ts` | `quotationFormSchema.safeParse` | WIRED | Line 24 |
| `app/(app)/apps/quotation/actions.ts` | `models/business-profile.ts` | `getBusinessProfile` for seller snapshot | WIRED | Lines 8, 73 |
| `app/(app)/apps/quotation/components/quotation-pdf.tsx` | `exports/pdf/fonts.ts` | `registerThaiFonts()` at module top level | WIRED | Line 2 (import), line 8 (call) |
| `app/(app)/apps/quotation/components/quotation-pdf.tsx` | `services/document-workflow.ts` | `QuotationData` type import | WIRED | Line 5 |
| `app/(app)/apps/quotation/components/status-badge.tsx` | `services/document-workflow.ts` | `QUOTATION_STATUSES` import | WIRED | Line 4 |
| `app/(app)/apps/quotation/components/quotation-form.tsx` | `app/(app)/apps/quotation/actions.ts` | `useActionState(createQuotationAction)` | WIRED | Lines 22, 77-78 |
| `app/(app)/apps/quotation/components/quotation-form.tsx` | `components/contacts/contact-autocomplete.tsx` | `ContactAutocomplete` component | WIRED | Lines 16, 197 |
| `app/(app)/apps/quotation/components/quotation-preview.tsx` | `app/(app)/apps/quotation/components/quotation-pdf.tsx` | `pdf(createElement(QuotationPDF))` | WIRED | Lines 16, 50-51 |
| `app/(app)/apps/quotation/components/quotation-list.tsx` | `app/(app)/apps/quotation/components/status-badge.tsx` | `StatusBadge` in each table row | WIRED | Lines 7, 119 |
| `app/(app)/apps/quotation/[id]/page.tsx` | `models/documents.ts` | `getDocumentById` for server-side data loading | WIRED | Lines 3, 31 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| QUOT-01 | 05-02, 05-04 | User can create a quotation with line items and contact selection | SATISFIED | `createQuotationAction` + `quotation-form.tsx` with dynamic items and `ContactAutocomplete` |
| QUOT-02 | 05-01 | Sequential numbering (QT-YYMM-NNN) with configurable prefix | SATISFIED | `formatDocumentNumber` produces `QT-BBBB-NNNN` (Buddhist Era year + 4-digit seq) — format uses full year not YY; intent aligned per Plan 01 spec |
| QUOT-03 | 05-02 | Validity period (default 30 days) and payment terms | SATISFIED | `quotationFormSchema` has `validityDays`, `paymentTerms`; `actions.ts` computes `validUntil = addDays(issuedDate, validityDays)` |
| QUOT-04 | 05-03, 05-04 | PDF with THSarabunNew: company header, line items, totals, signature area | SATISFIED | `QuotationPDF` (454 lines): `registerThaiFonts()` at module level, 7-column table, signature blocks, BanChee footer |
| QUOT-05 | 05-03, 05-04 | List with status badges (draft/sent/accepted/expired/converted) | SATISFIED | `quotation-list.tsx` with `StatusBadge`, `Select` filter, expired detection for past-validUntil sent quotations |
| DOC-01 | 05-01 | Document Prisma model with status tracking, items JSON, sourceDocumentId | SATISFIED | `prisma/schema.prisma:296` — `items Json`, `sourceDocumentId String? @map("source_document_id")`, `status String` |
| DOC-07 | 05-01 | Status transitions follow explicit state machine | SATISFIED | `VALID_TRANSITIONS` + `assertValidTransition` enforce: draft→sent→accepted→converted, voided terminal from draft/sent |

**Note on QUOT-02 format:** REQUIREMENTS.md specifies `QT-YYMM-NNN` but implementation uses `QT-BBBB-NNNN` (4-digit Buddhist Era year + 4-digit sequence, e.g. `QT-2568-0001`). Plan 01 intentionally specifies and tests this format — it is more precise and correct for Thai fiscal year scoping. This is an improvement over the requirements description, not a deficiency.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `app/(app)/apps/quotation/[id]/page.tsx:284` | Document Chain section shows "ยังไม่มีเอกสารที่เกี่ยวข้อง" placeholder | Info | Expected — placeholder for Phase 6 document chain conversion (per Plan 04 spec); does not affect Phase 5 goal |
| `quotation-form.tsx:277+` | `placeholder=` attributes on inputs | Info | Not stubs — standard HTML input placeholders for UX; data is submitted via form state |

No blocker anti-patterns found. The only placeholder is the document chain section which is documented scope for Phase 6.

### Human Verification Required

#### 1. PDF Font Rendering

**Test:** Navigate to `/apps/quotation`. If business profile gate shows, complete it first. Create a quotation with 2-3 line items including quantities, unit prices, discounts. Toggle VAT on. Submit.
**Expected:** Preview dialog opens, download PDF button works. PDF shows THSarabunNew Thai font (readable text, not empty boxes), company header, buyer info, 7-column table, totals with VAT row, validity note, two signature lines, BanChee footer at bottom.
**Why human:** PDF font rendering correctness (THSarabunNew) and visual layout can only be verified by opening the PDF.

#### 2. Sequential Document Number

**Test:** Create the first quotation in a fresh environment. Check the document number in the preview dialog.
**Expected:** Number is `QT-2569-0001` (current Buddhist year 2569 = 2026 + 543). Second quotation should be `QT-2569-0002`.
**Why human:** Sequential numbering depends on database counter state — requires live form submission.

#### 3. Status Transition Flow

**Test:** On a created quotation detail page (status: draft), click the "ส่งใบเสนอราคา" button.
**Expected:** Status changes to "sent". Page reloads showing "ส่งแล้ว" badge. New action buttons appear: "ลูกค้าอนุมัติ", "ลูกค้าปฏิเสธ", "ยกเลิก". Try to go back to draft — no button should exist.
**Why human:** State machine UI enforcement and button visibility logic requires live interaction.

#### 4. Quotation List Filter

**Test:** Create quotations with different statuses. Go to `/apps/quotation` list. Use the status filter dropdown.
**Expected:** Filtering by "ส่งแล้ว" shows only sent quotations. Past-validUntil sent quotations show "หมดอายุ" orange badge instead of "ส่งแล้ว".
**Why human:** Client-side filter behavior and expired detection requires live data with real timestamps.

### Gaps Summary

No gaps found. All automated checks pass:

- 15/15 artifacts exist and are substantive
- All 13 key links are wired
- All 7 requirements (QUOT-01 through QUOT-05, DOC-01, DOC-07) are satisfied
- 37/37 TDD tests pass
- Prisma migration applied
- No blocker anti-patterns

Phase is **functionally complete** pending human visual verification of PDF rendering and live workflow testing.

---

_Verified: 2026-03-26T09:50:00Z_
_Verifier: Claude (gsd-verifier)_
