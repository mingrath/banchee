# Feature Research: v1.1 Document Workflow & Bank Reconciliation

**Domain:** Thai SME accounting - document workflow chain, quotation system, bank reconciliation
**Researched:** 2026-03-25
**Confidence:** HIGH (Thai Revenue Department sources, FlowAccount/PEAK competitor analysis, industry standard patterns)
**Scope:** NEW features only for v1.1 milestone. Does not repeat v1.0 features already built.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that FlowAccount, PEAK, and SME Move all provide. Missing these makes BanChee feel like "just a receipt scanner" rather than a real accounting tool.

#### Quotation System (ใบเสนอราคา)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Quotation creation with line items** | Every Thai accounting app starts the sales cycle with quotation. FlowAccount, PEAK, SME Move all support this. | MEDIUM | Reuse existing InvoiceFormData line item structure. Must add Thai labels (รายการ, จำนวน, ราคาต่อหน่วย, จำนวนเงิน). |
| **Quotation PDF generation** | Customers expect professional Thai-language PDF to review and sign | LOW | Extend existing InvoicePDF component. Add THSarabunNew font, Buddhist Era dates, Thai number formatting. |
| **Quotation validity period** | Standard business practice to set expiry date on quotes | LOW | Simple date field. Default 30 days from issue. Show "expired" badge after date passes. |
| **Contact picker from existing contacts** | Users already have contacts with Tax ID and branch in BanChee | LOW | Wire existing Contact model to quotation form. Auto-populate name, Tax ID, address, branch. |
| **Sequential quotation numbering** | Document traceability requires sequential numbering. Common prefix: QT-YYMM-NNN or user-customizable format. | LOW | Separate number series from tax invoices. Store last-used number per document type. |
| **Quotation status tracking** | FlowAccount offers 6 statuses. Users need to know which quotes are pending, accepted, or expired. | LOW | Statuses: draft, sent, accepted, rejected, expired. Simple enum field. |

#### Document Workflow Chain

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Quotation-to-invoice conversion** | FlowAccount's core value prop: "fill in information ONCE." PEAK supports same flow. Eliminates re-entry. | MEDIUM | Copy all line items, contact, amounts from quotation to new invoice. Link documents via reference. |
| **Invoice/billing note creation (ใบแจ้งหนี้/ใบวางบิล)** | Distinct from tax invoice. Used to request payment before goods/services are fully delivered. | MEDIUM | Separate document type from tax invoice. Different numbering series (INV-YYMM-NNN). Thai businesses commonly combine invoice + delivery note as single document. |
| **Invoice-to-receipt conversion (ใบเสร็จรับเงิน)** | Receipt confirms payment received. Standard Thai document chain step after invoice is paid. | LOW | Copy amounts from invoice, add payment date and payment method. New numbering series (RC-YYMM-NNN). |
| **Invoice-to-tax-invoice conversion** | VAT-registered businesses need to convert billing invoice into a proper tax invoice (ใบกำกับภาษี). BanChee already has tax invoice creation - this adds the "convert from" workflow. | MEDIUM | Reuse existing tax invoice generator. Pre-fill from invoice data. Must validate all 11 Section 86/4 fields. |
| **Document reference chain** | Each downstream document must reference the originating document number. Receipt references invoice number, invoice references quotation number. | LOW | Add `referenceDocumentId` and `referenceDocumentNumber` fields. Display as "อ้างอิงเลขที่" on PDF. |
| **Document lifecycle statuses per type** | FlowAccount tracks: Pending Approval, Completed, Billing Issued, Billed, Receipt Issued, Cash Collected. Users need at-a-glance status. | LOW | Quotation: draft/sent/accepted/rejected/expired. Invoice: draft/sent/partially_paid/paid/overdue. Receipt: issued. Tax Invoice: issued/voided. |

#### Bank Reconciliation

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Bank statement CSV/Excel import** | Thai banks primarily export PDF statements. Users will manually export or convert to CSV/Excel. PEAK supports PDF and Excel import. | MEDIUM | Support CSV and Excel formats. Configurable column mapping (date, description, debit, credit, balance). Must handle Thai date formats and Thai bank description text. |
| **Transaction list from imported statement** | Display imported bank transactions in a reviewable list before matching | LOW | Parse imported file, display in table with date, description, amount, and match status columns. |
| **Manual transaction matching** | Core reconciliation: user selects a bank transaction and matches it to a BanChee transaction (income/expense) | MEDIUM | Side-by-side view: bank transactions on left, BanChee transactions on right. Click to match. Show matched/unmatched counts. |
| **Auto-suggest matches by amount + date** | PEAK and FlowAccount both offer auto-matching. Users expect the system to suggest likely matches. | MEDIUM | Match algorithm: exact amount match within +/- 3 day window. Rank by date proximity. Show confidence score. |
| **Reconciliation summary report** | Show reconciled vs unreconciled totals per bank account per month | LOW | Display: total bank balance, total book balance, difference, matched count, unmatched count. |

### Differentiators (Competitive Advantage)

Features that go beyond what competitors offer, leveraging BanChee's AI capabilities and self-hosted advantage.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AI-powered bank statement description parsing** | Thai bank descriptions are cryptic (e.g., "TFR/BAAC/0123456789"). AI can extract payee name, detect transaction type, suggest matching transaction. Neither FlowAccount nor PEAK do this with AI. | HIGH | Use existing LLM pipeline. Parse Thai bank descriptions to extract: counterparty, transaction type (transfer/payment/deposit), reference number. Suggest best match. |
| **One-click quotation-to-full-chain** | Instead of converting one step at a time (QT to INV to RC), offer "Mark as Paid" on a quotation that auto-creates invoice + receipt + tax invoice in one action. Competitors require step-by-step. | MEDIUM | Shortcut for simple transactions. Create all documents with proper references in single server action. Show all generated documents after completion. |
| **AI quotation line item suggestion** | When creating a quotation for a returning contact, AI suggests previously used line items and prices from past quotations/invoices. | MEDIUM | Query past transactions for same contact. Use LLM to rank relevance. Pre-populate with "use previous items" button. |
| **Delivery note (ใบส่งของ) generation** | Goods-based businesses need delivery notes. Can be combined as "ใบส่งของ/ใบแจ้งหนี้" (delivery note + invoice) on single document. | LOW | Add delivery note template. Same line items, add delivery address, receiver signature field. Optional - only for product-based businesses. |
| **Purchase order (ใบสั่งซื้อ) creation** | Purchase side of document chain. Less common in basic SME tools, but expected by businesses that buy from suppliers regularly. | MEDIUM | Mirror of quotation but for purchases. PO-YYMM-NNN numbering. Links to expense transactions when goods received. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but should NOT be built for v1.1.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Direct bank API/Open Banking connection** | "Auto-import statements without manual upload" | Thai banks have no public Open Banking API. SCB, KBank, BBL all require corporate agreements. Maintaining bank integrations is a full-time job. PEAK only supports Krungthai via special API deal. | CSV/Excel import covers 95% of use cases. Keep it simple. Revisit when Thai Open Banking standards mature. |
| **Full accounts receivable aging report** | "Show me 30/60/90 day aging buckets" | Requires proper double-entry accounting foundation that BanChee deliberately avoids. Complex to implement correctly without a general ledger. | Simple "overdue invoices" list filtered by due date. Flag invoices past due by 30+ days. Good enough for SME needs. |
| **Multi-currency quotation with live exchange rates** | "I sell to international clients" | BanChee's target is Thai SMEs selling domestically. Multi-currency adds complexity to the document chain (which currency for tax invoice? which rate for VAT calculation?). | Thai Baht only for v1.1 document workflow. Existing multi-currency support in transactions is sufficient for expense tracking. |
| **Inventory management tied to delivery notes** | "Auto-deduct stock when delivery note is issued" | Inventory is a separate domain. Mixing it with document workflow creates tight coupling and scope explosion. FlowAccount charges separately for inventory. | Delivery notes track quantities but don't manage inventory. Add inventory as a separate milestone if market demands it. |
| **Customer approval portal / e-signature** | "Let customers accept quotations online via link" | Requires hosting a public-facing page, email infrastructure, signature validation. Massive scope for a self-hosted tool. | Generate PDF, user sends via LINE/email manually. Mark as "accepted" in the app. Thai SMEs communicate via LINE anyway. |
| **Automatic bank statement PDF parsing** | "Upload the bank PDF directly, skip CSV conversion" | PDF parsing is extremely fragile across Thai bank formats (SCB, KBank, BBL, KTB all different). Layout changes break parsing. High maintenance burden. | Provide a recommended CSV format template. Link to free tools like MintConvert for PDF-to-CSV conversion. Support Excel import since some banks offer that. |
| **Partial payment tracking with installments** | "Split an invoice into 3 monthly payments" | Installment tracking requires payment schedule management, automatic reminders, partial receipt generation. Complex AR system. | Track payment status as paid/unpaid only for v1.1. Note partial payment amount in a free-text field. Full installment tracking for v2+. |

---

## Feature Dependencies

```
[Contact Management] (EXISTING)
    |
    v
[Quotation System] (NEW)
    |
    +-- requires --> [Contact Picker] (reuse existing Contact model)
    +-- requires --> [Document Numbering Service] (NEW - shared across doc types)
    +-- requires --> [Line Item Component] (reuse existing InvoiceItem)
    |
    v
[Document Workflow Chain] (NEW)
    |
    +-- Quotation --> Invoice conversion
    +-- Invoice --> Receipt conversion
    +-- Invoice --> Tax Invoice conversion (reuse existing tax invoice generator)
    +-- requires --> [Document Reference Linking] (NEW)
    +-- requires --> [Document Status Tracking] (NEW)
    |
    v
[Tax Invoice] (EXISTING - enhanced with conversion workflow)

[Bank Statement Import] (NEW - independent of document chain)
    |
    +-- requires --> [CSV/Excel Parser] (NEW)
    +-- requires --> [Bank Transaction Model] (NEW Prisma model)
    |
    v
[Transaction Matching] (NEW)
    |
    +-- requires --> [Existing Transactions] (query existing Transaction model)
    +-- enhances --> [Bank Reconciliation Report] (NEW)
    +-- optional --> [AI Description Parser] (uses existing LLM pipeline)
```

### Dependency Notes

- **Quotation requires Contact Picker:** Quotations always have a recipient. The existing Contact model (with Tax ID, branch, address) provides exactly what's needed. No new model required.
- **Document Workflow requires Document Numbering Service:** All document types need independent sequential numbering. Build a shared service that manages number series per document type (QT, INV, RC, etc.).
- **Invoice-to-Tax-Invoice requires existing tax invoice generator:** The v1.0 tax invoice creator already validates Section 86/4 fields. The workflow just pre-fills it from invoice data.
- **Bank Reconciliation is independent of document chain:** Can be built in parallel. No dependency on quotation/invoice features.
- **AI Description Parser enhances matching but is optional:** Auto-suggest matching works with amount+date alone. AI parsing of bank descriptions is a bonus, not a blocker.

---

## v1.1 Milestone Definition

### Phase 1: Quotation System + Document Model Foundation

Build the document model and quotation features first because all downstream conversions depend on having a proper document abstraction.

- [ ] **Document model (Prisma)** -- New model to unify quotations, invoices, receipts, delivery notes under one schema with `documentType` discriminator
- [ ] **Document numbering service** -- Sequential numbering per document type per user, with configurable prefix format
- [ ] **Quotation creation form** -- Thai-language line items, contact picker, validity date, notes, bank details
- [ ] **Quotation PDF generation** -- THSarabunNew font, Buddhist Era dates, Section-compliant layout
- [ ] **Quotation list with status tracking** -- Filter by status (draft/sent/accepted/rejected/expired)
- [ ] **Quotation status management** -- Update status, auto-expire past validity date

### Phase 2: Document Workflow Chain

Build conversion flows after the document model exists.

- [ ] **Quotation-to-invoice conversion** -- One-click with pre-filled data, editable before saving
- [ ] **Invoice creation (standalone)** -- For cases without a prior quotation
- [ ] **Invoice-to-receipt conversion** -- Mark as paid, generate receipt with payment date/method
- [ ] **Invoice-to-tax-invoice conversion** -- Pre-fill existing tax invoice form from invoice data
- [ ] **Document reference linking** -- Display chain: QT-001 -> INV-001 -> RC-001 with clickable navigation
- [ ] **One-click full-chain shortcut** -- Quotation -> mark paid -> auto-create invoice + receipt + tax invoice (differentiator)

### Phase 3: Bank Reconciliation

Independent workstream, can run in parallel with Phase 2.

- [ ] **Bank account model** -- Name, bank name, account number, currency
- [ ] **Bank statement import (CSV/Excel)** -- Column mapping UI, preview before import, Thai date format handling
- [ ] **Imported transaction list** -- Sortable, filterable, with match status indicator
- [ ] **Manual matching UI** -- Side-by-side view, click to match bank tx to BanChee tx
- [ ] **Auto-suggest matching** -- Amount + date proximity algorithm, confidence score display
- [ ] **Reconciliation summary** -- Per-account per-month: matched/unmatched counts, balance comparison
- [ ] **AI description parsing** -- Optional differentiator: parse Thai bank descriptions for counterparty and type (defer if time-constrained)

### Future Consideration (v2+)

Features to defer until v1.1 core is working.

- [ ] **e-Tax Invoice PDF/A-3 with digital signature** -- Revenue Department e-Tax compliance, requires XML generation and certificate management
- [ ] **Partial payment and installment tracking** -- Full AR management with payment schedules
- [ ] **Purchase order workflow** -- Mirror of sales document chain for procurement
- [ ] **Direct bank API integration** -- When Thai Open Banking matures
- [ ] **Customer-facing quotation approval portal** -- Online acceptance with e-signature

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Phase |
|---------|------------|---------------------|----------|-------|
| Document model + numbering service | HIGH | MEDIUM | P1 | 1 |
| Quotation creation + PDF | HIGH | MEDIUM | P1 | 1 |
| Quotation status tracking | MEDIUM | LOW | P1 | 1 |
| Quotation-to-invoice conversion | HIGH | LOW | P1 | 2 |
| Invoice creation (standalone) | HIGH | MEDIUM | P1 | 2 |
| Invoice-to-receipt conversion | HIGH | LOW | P1 | 2 |
| Invoice-to-tax-invoice conversion | HIGH | LOW | P1 | 2 |
| Document reference chain | MEDIUM | LOW | P1 | 2 |
| Bank statement CSV/Excel import | HIGH | MEDIUM | P1 | 3 |
| Manual matching UI | HIGH | MEDIUM | P1 | 3 |
| Auto-suggest matching | MEDIUM | MEDIUM | P2 | 3 |
| Reconciliation summary | MEDIUM | LOW | P2 | 3 |
| One-click full-chain shortcut | MEDIUM | LOW | P2 | 2 |
| AI bank description parsing | LOW | HIGH | P3 | 3 |
| Delivery note generation | LOW | LOW | P3 | 2 |
| AI quotation line item suggestion | LOW | MEDIUM | P3 | Future |
| Purchase order creation | LOW | MEDIUM | P3 | Future |

**Priority key:**
- P1: Must have for v1.1 launch
- P2: Should have, adds significant value
- P3: Nice to have, defer if time-constrained

---

## Competitor Feature Analysis

| Feature | FlowAccount | PEAK | BanChee v1.1 Approach |
|---------|-------------|------|----------------------|
| **Quotation creation** | Full template system, mobile app | Full template system | Template-based with Thai defaults, reuse invoice line item component |
| **Document conversion** | QT -> INV -> Tax INV -> Receipt, one-click | QT -> INV -> Receipt, step-by-step | Step-by-step conversion + one-click shortcut for simple cases |
| **Document statuses** | 6 statuses (Pending Approval through Cash Collected) | Similar status set | 4-5 statuses per doc type, auto-expire for quotations |
| **Numbering** | Auto-sequential per type | Auto-sequential per type | Configurable prefix format per type (QT-YYMM-NNN default) |
| **Bank reconciliation** | Manual matching, basic import | API with Krungthai, PDF/Excel import | CSV/Excel import, auto-suggest matching, optional AI parsing |
| **Bank statement format** | CSV import | PDF + Excel import, Krungthai API | CSV + Excel import. No PDF parsing (too fragile). |
| **Partial payments** | Supported | Supported | Deferred to v2 - paid/unpaid only for v1.1 |
| **Delivery notes** | Supported, combined with invoice | Supported | Optional, combined format available |
| **Purchase orders** | Supported | Supported | Deferred to v2 |
| **AI features** | OCR receipt scanning | Bank API auto-import | AI receipt scanning (existing) + AI bank description parsing (new) + AI line item suggestions (future) |

---

## Thai Document Types Reference

Complete list of Thai business documents relevant to v1.1, with Thai names and purposes.

| Document | Thai Name | Purpose | Revenue Dept Required? | BanChee v1.1 |
|----------|-----------|---------|----------------------|--------------|
| Quotation | ใบเสนอราคา | Price proposal for customer review | No | YES - new |
| Invoice / Billing Note | ใบแจ้งหนี้ / ใบวางบิล | Request payment for goods/services | No | YES - new |
| Delivery Note | ใบส่งของ / ใบส่งสินค้า | Proof of goods delivery | No | Optional |
| Tax Invoice | ใบกำกับภาษี | Legal VAT document per Section 86/4 | YES (VAT registered) | EXISTING - enhanced |
| Receipt | ใบเสร็จรับเงิน | Proof of payment received | No (but standard practice) | YES - new |
| Tax Invoice / Receipt | ใบกำกับภาษี/ใบเสร็จรับเงิน | Combined document, common in retail | YES (when combined) | Future enhancement |
| Credit Note | ใบลดหนี้ | Reduce previously invoiced amount | YES (VAT registered) | EXISTING |
| Debit Note | ใบเพิ่มหนี้ | Increase previously invoiced amount | YES (VAT registered) | EXISTING |
| WHT Certificate | หนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ) | Tax withholding proof | YES | EXISTING |
| Purchase Order | ใบสั่งซื้อ | Procurement request to supplier | No | Future |

### Document Numbering Conventions

Standard Thai business numbering prefixes (not legally mandated, but widely used):

| Document Type | Common Prefix | Format Example | BanChee Default |
|---------------|--------------|----------------|-----------------|
| Quotation | QT / ใบ.สน. | QT-2603-001 | QT-YYMM-NNN |
| Invoice | INV / ใบ.จน. | INV-2603-001 | INV-YYMM-NNN |
| Delivery Note | DN / ใบ.สข. | DN-2603-001 | DN-YYMM-NNN |
| Tax Invoice | TAX / ใบ.กภ. | TAX-2603-001 | Existing system (already built) |
| Receipt | RC / ใบ.สร. | RC-2603-001 | RC-YYMM-NNN |

### Document Status Definitions

| Document Type | Statuses | Auto-Transitions |
|---------------|----------|-----------------|
| Quotation | draft -> sent -> accepted / rejected / expired | Auto-expire past validity date |
| Invoice | draft -> sent -> overdue / paid | Auto-overdue past due date |
| Receipt | issued | Terminal state |
| Tax Invoice | issued / voided | Manual void only |

---

## Bank Reconciliation Technical Details

### Thai Bank Statement Formats

Thai banks primarily export statements as PDF. CSV/Excel export availability varies:

| Bank | PDF | CSV | Excel | Notes |
|------|-----|-----|-------|-------|
| SCB (ไทยพาณิชย์) | Yes | No (needs converter) | No | Third-party tools like scb-statement-converter exist |
| KBank (กสิกร) | Yes | No (needs converter) | Some formats | VeryPDF and similar tools can convert |
| Bangkok Bank (กรุงเทพ) | Yes | No | Limited | dStatement service via NDID |
| Krungthai (กรุงไทย) | Yes | No | Yes (some) | PEAK has API deal for direct import |
| TMBThanachart (ทีทีบี) | Yes | No | Some | Limited export options |

**Implication for BanChee:** Must support flexible CSV column mapping because every bank's export format differs. Provide a "template" CSV format and instructions for users to convert their bank PDFs.

### Recommended CSV Import Format

```
Date,Description,Debit,Credit,Balance
25/03/2569,TFR/KBANK/นายสมชาย ใจดี,,50000.00,1250000.00
25/03/2569,ค่าไฟฟ้า/MEA,3500.00,,1246500.00
```

Support both Thai date format (DD/MM/BBBB with Buddhist Era) and international format (YYYY-MM-DD). Auto-detect format on import.

### Matching Algorithm Design

**Tier 1 - Exact Match (HIGH confidence):**
- Amount matches exactly (to satang)
- Date within +/- 1 day
- Auto-match if only one candidate

**Tier 2 - Probable Match (MEDIUM confidence):**
- Amount matches exactly
- Date within +/- 3 days
- Multiple candidates: show ranked list

**Tier 3 - Possible Match (LOW confidence):**
- Amount within +/- 1% tolerance
- Date within +/- 7 days
- Requires manual review

**Unmatched:**
- No amount match found
- User must create new transaction or skip

---

## Data Model Implications

### New Prisma Models Required

**Document model** (unifies quotation, invoice, receipt, delivery note):
```
- id, userId, documentType, documentNumber, status
- contactId (FK to Contact)
- issueDate, dueDate, validUntil (for quotations)
- referenceDocumentId (FK to self - for chain linking)
- lineItems (JSON - same structure as existing InvoiceItem)
- subtotal, vatAmount, vatRate, totalAmount (satang integers)
- notes, bankDetails, paymentMethod
- pdfPath (generated PDF location)
- createdAt, updatedAt
```

**BankAccount model:**
```
- id, userId, bankName, accountName, accountNumber, currency
- createdAt
```

**BankTransaction model:**
```
- id, userId, bankAccountId (FK)
- transactionDate, description, debitAmount, creditAmount, balance
- matchedTransactionId (FK to Transaction, nullable)
- matchConfidence (high/medium/low/none)
- importBatchId (group imported rows)
- createdAt
```

### Existing Models to Extend

**Contact model:** No changes needed. Already has name, taxId, branch, address, type.

**Transaction model:** Add optional `documentId` field to link transactions to documents when created via document workflow.

---

## Sources

### Official / Government
- [Thai Revenue Code Section 86 - Tax Invoice Requirements](https://library.siam-legal.com/thai-law/revenue-code-tax-invoice-debit-note-credit-note-section-86/)
- [Revenue Department e-Tax Invoice & e-Receipt](https://etax.rd.go.th/)
- [Thailand e-Tax Invoice Compliance Checklist 2025](https://www.gentlelawibl.com/post/thailand-e-tax-invoice-and-e-receipt-2025-a-compliance-checklist-for-smes)
- [How to Issue Tax Invoice/Receipt in Thailand 2025](https://vbapartners.com/how-to-issue-a-tax-invoice-receipt-in-thailand/)

### Competitor Analysis
- [FlowAccount - Quotation Features](https://flowaccount.com/en/functions/quotation)
- [FlowAccount - Invoice Features](https://flowaccount.com/en/functions/invoice)
- [FlowAccount - Tax Invoice Features](https://flowaccount.com/en/functions/tax-invoice)
- [FlowAccount - Business Document Guide](https://flowaccount.com/blog/basic-business-document/)
- [FlowAccount - Quotation Software Blog](https://flowaccount.com/blog/cloud-accounting-software-thailand-quotation/)
- [PEAK - Create Invoice from Quotation](https://www.peakaccount.com/peak-manual/sales-document/invoice/create-invoice-from-quotation)
- [PEAK - Receipt/Tax Invoice Creation](https://www.peakaccount.com/peak-manual/sales-document/receipt/create-receipt-tax-invoice)
- [PEAK - Bank Reconciliation](https://www.peakaccount.com/blog/accounting/gen-acct/accounting-bank-reconciliation)
- [FlowAccount - Bank Reconciliation](https://flowaccount.com/blog/what-is-bank-reconciliation/)

### Technical / Industry
- [SCB Statement Converter (GitHub)](https://github.com/shlomki/scb-statement-converter)
- [Thai Banks CSV Export Limitations (ASEAN NOW)](https://aseannow.com/topic/1297452-thai-banks-dont-give-out-statements-in-excel-or-csv-format/)
- [Best Accounting Software Thailand](https://vbapartners.com/accounting-software-for-businesses-in-thailand/)
- [Top Accounting Software Thailand (Pimaccounting)](https://pimaccounting.com/blog/accounting/249-top-accounting-software-for-small-businesses-in-thailand)

---
*Feature research for: BanChee v1.1 Document Workflow & Bank Reconciliation*
*Researched: 2026-03-25*
