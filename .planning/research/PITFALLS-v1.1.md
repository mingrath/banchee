# Pitfalls Research: v1.1 Document Workflow & Bank Reconciliation

**Domain:** Adding quotation system, document workflow chain, and bank reconciliation to existing Thai SME tax accounting app (BanChee)
**Researched:** 2026-03-25
**Confidence:** HIGH (based on codebase analysis, Thai business document requirements, and accounting software patterns)

---

## Critical Pitfalls

### Pitfall 1: Satang Double-Division in Quotation Line Items

**What goes wrong:**
The existing `formatCurrency()` in `lib/utils.ts` already divides by 100 (satang to baht). When building the quotation line item UI, developers pass a baht-denominated value through `formatCurrency()` which divides again, displaying 1/100th of the correct amount. A 5,000 THB item shows as 50.00 THB.

**Why it happens:**
The existing invoice system (`invoice-page.tsx` line 149) manually multiplies by 100 before calling `formatCurrency()` -- e.g. `formatCurrency(item.subtotal * 100, currency)`. This workaround exists because the generic invoice component stores amounts in baht (user-facing), but the tax invoice system stores in satang (database convention). New quotation code that copies one pattern but not the other will mismatch.

The codebase has two conflicting amount conventions:
- **Tax invoice actions** (`tax-invoice/actions.ts`): `unitPrice` stored in satang, `computeVATOnSubtotal(subtotal)` expects satang
- **Generic invoice** (`invoices/components/invoice-page.tsx`): `unitPrice` stored in baht, multiplied by 100 at display/save time

**How to avoid:**
1. Pick ONE convention for the quotation model: satang (recommended, matches the rest of the DB). Document it in the type definition with a JSDoc comment.
2. All quotation line item amounts (unitPrice, subtotal, total, discount) must be stored in satang in the database. Convert baht-to-satang at form input boundary only.
3. Never call `formatCurrency()` on a baht value. Always pass satang values directly.
4. Add a naming convention: variables holding satang use plain names (`unitPrice`, `total`), variables holding baht use a `_baht` suffix (`unitPrice_baht`).

**Warning signs:**
- Line item totals displaying as fractions of the expected amount
- Quotation total not matching the sum of line items
- Values 100x too large or too small in the PDF output

**Phase to address:**
Phase 1 (Quotation System) -- must be established before any amount logic is written.

---

### Pitfall 2: FIRST_CLASS_COLUMNS Not Updated for Quotation/Document Fields

**What goes wrong:**
New fields added to the Transaction schema (e.g. `quotationId`, `documentType`, `documentStatus`, `bankStatementRef`) are silently swallowed by `splitTransactionDataExtraFields()` because they are not in the `FIRST_CLASS_COLUMNS` set in `models/transactions.ts`. Data appears to save successfully but the new columns remain NULL in the database.

**Why it happens:**
The `splitTransactionDataExtraFields()` function (line 225-259) splits transaction data into `standard` and `extra` fields. Any key NOT in `FIRST_CLASS_COLUMNS` AND not matching a user-defined Field with `isExtra: false` is either routed to the `extra` JSON blob or silently dropped. When adding new DB columns via migration, developers update the Prisma schema but forget to add the new column names to `FIRST_CLASS_COLUMNS`.

This already happened during v1.0 development and is listed as a known pitfall.

**How to avoid:**
1. Whenever a new column is added to the Transaction model in `schema.prisma`, immediately add it to `FIRST_CLASS_COLUMNS` in `models/transactions.ts`.
2. Write a checklist or lint rule: "New Transaction column? Update FIRST_CLASS_COLUMNS."
3. Consider a compile-time check: derive `FIRST_CLASS_COLUMNS` from the Prisma-generated Transaction type fields, minus known extra-field candidates.

**Warning signs:**
- New fields save as `null` despite being set in the form
- Data appears in the `extra` JSON column instead of the dedicated column
- Queries filtering by the new column return no results

**Phase to address:**
Every phase that adds Transaction columns -- Phase 1 (quotation fields), Phase 2 (document status fields), Phase 3 (reconciliation reference fields).

---

### Pitfall 3: Sequential Document Numbering Race Condition Across Document Types

**What goes wrong:**
The quotation system needs its own sequential numbering (QT-2569-0001), separate from tax invoices (INV-2569-0001) and credit notes (CN-2569-0001). If the quotation numbering copies the tax invoice pattern but uses the same setting key, or if two concurrent requests hit the same sequence, numbers get duplicated or skipped.

**Why it happens:**
The existing pattern in `tax-invoice/actions.ts` uses `prisma.$transaction()` with a read-parse-increment-save pattern on the `Setting` model. This is correct for single-user self-hosted mode but has subtle risks:
- The `Setting.value` is a `String` field parsed to int -- not an atomic counter
- Two concurrent browser tabs creating quotations can read the same sequence value before either writes the increment
- Different document types sharing similar sequence code names (e.g. `seq_quotation` vs `seq_tax_invoice`) could be confused during copy-paste development

**How to avoid:**
1. Use unique, descriptive setting codes for each document type: `seq_quotation`, `seq_delivery_note`, `seq_billing_note`, `seq_receipt`
2. Keep the `prisma.$transaction()` pattern from tax invoices -- it provides serializable isolation on PostgreSQL
3. Add a unique constraint on `(userId, documentType, documentNumber)` at the database level as a safety net
4. Test with concurrent requests: open two tabs and create documents simultaneously

**Warning signs:**
- Duplicate document numbers in the document list
- Gaps in the numbering sequence (less critical, but indicates issues)
- "Unique constraint violation" errors in production logs

**Phase to address:**
Phase 1 (Quotation System) -- establish the numbering pattern early so later document types follow the same convention.

---

### Pitfall 4: Quotation-to-Invoice Conversion Mutates Original Quotation Data

**What goes wrong:**
When converting a quotation to an invoice, the conversion logic mutates the original quotation record (changing its status, overwriting line items, or linking it destructively), making it impossible to view the original quotation or trace changes. Worse, if the conversion fails mid-way, the quotation is left in a corrupted half-converted state.

**Why it happens:**
Developers model the conversion as "update the quotation to become an invoice" rather than "create a new invoice from the quotation data." This feels efficient but violates immutability and audit trail requirements. Thai businesses need to keep the original quotation for reference and may need to create multiple invoices from one quotation (partial deliveries).

The existing credit note system (`credit-note/actions.ts`) correctly reads the original invoice from AppData without modifying it. The quotation system must follow the same pattern.

**How to avoid:**
1. Conversion must CREATE a new document record (invoice), never UPDATE the quotation
2. Link the new invoice back to the quotation via a `sourceDocumentId` foreign key
3. Update the quotation status to "converted" only AFTER the invoice is successfully created
4. Wrap the entire conversion (create invoice + update quotation status) in a `prisma.$transaction()`
5. Allow partial conversion: a quotation with 10 items can generate an invoice for 3 items, leaving the quotation partially fulfilled

**Warning signs:**
- Cannot view original quotation after conversion
- Quotation line items differ from what the customer originally agreed to
- "Undo conversion" requires restoring data from nowhere

**Phase to address:**
Phase 2 (Document Workflow Chain) -- the conversion logic is the core of this phase.

---

### Pitfall 5: Document Status State Machine Without Explicit Transitions

**What goes wrong:**
Document statuses (draft, sent, accepted, rejected, converted, cancelled) are stored as free-text strings with no validation of valid transitions. A quotation can jump from "draft" directly to "converted" without being "sent" or "accepted" first. A cancelled quotation can be accidentally reactivated.

**Why it happens:**
Developers store status as a simple string column and allow any value. Business logic for transitions is scattered across multiple actions/components instead of being centralized. Thai business document workflows have specific legal requirements:
- A quotation must be accepted before it can become a tax invoice
- A tax invoice cannot be cancelled -- it requires a credit note
- A receipt can only be issued after payment is confirmed

**How to avoid:**
1. Define an explicit state machine with allowed transitions:
   ```
   Quotation: draft -> sent -> accepted -> converted | rejected -> cancelled
   Invoice: draft -> issued -> paid -> voided (via credit note only)
   Receipt: draft -> issued
   ```
2. Create a `validateStatusTransition(currentStatus, newStatus, documentType)` function
3. Store `statusHistory` as a JSON array with timestamps for audit trail
4. Block invalid transitions at the model layer, not just the UI

**Warning signs:**
- Documents appearing with unexpected statuses
- "How did this quotation become 'converted' when the customer rejected it?"
- No audit trail of who changed the status and when

**Phase to address:**
Phase 2 (Document Workflow Chain) -- must be designed before any status updates are implemented.

---

### Pitfall 6: Bank Statement Import Assumes Consistent CSV Format

**What goes wrong:**
The bank statement import expects a specific column order (date, description, debit, credit, balance) but Thai banks each use different formats, column names (in Thai), date formats (Buddhist Era vs Gregorian), and encodings (TIS-620 vs UTF-8). The parser silently imports garbage data.

**Why it happens:**
Thai bank CSV exports have no standard format:
- **KBank (กสิกร):** Date format DD/MM/YYYY (BE), columns in Thai, TIS-620 encoding
- **SCB (ไทยพาณิชย์):** Date format DD/MM/YYYY (CE), UTF-8, different column order
- **BBL (กรุงเทพ):** Excel XLS format (not CSV), date as serial number
- **Krungthai (กรุงไทย):** Mixed Thai/English headers, Buddhist Era dates
- **BAY (กรุงศรี):** PDF only, no CSV export available for some account types

The existing CSV import (`import/csv/actions.ts`) uses `@fast-csv/parse` with no column mapping, encoding detection, or date format handling.

**How to avoid:**
1. Build a column mapping UI: let users match CSV columns to fields (date, description, amount, balance) -- do not hardcode column positions
2. Detect encoding: check for TIS-620 vs UTF-8 in the first bytes, convert to UTF-8 before parsing
3. Handle Buddhist Era dates: if year > 2500, subtract 543 (same pattern as `ai/prompt.ts` already uses)
4. Support both single-amount (positive/negative) and dual-column (debit/credit) formats
5. Show a preview of parsed data before committing -- let user confirm the mapping is correct
6. Start with the 3 most common banks (KBank, SCB, KTB) and add others based on user feedback

**Warning signs:**
- Thai characters appearing as mojibake in imported descriptions
- Dates off by 543 years
- Debit/credit amounts swapped
- Balance column imported as transaction amount

**Phase to address:**
Phase 3 (Bank Reconciliation) -- parser design is the first step.

---

### Pitfall 7: Auto-Reconciliation Matching on Amount Alone Produces False Positives

**What goes wrong:**
The auto-reconciliation algorithm matches bank transactions to accounting records by amount only, producing incorrect matches. Multiple transactions with the same amount (e.g. monthly subscriptions, recurring payments) get matched to the wrong records. A 1,500 THB bank debit matches to the wrong 1,500 THB expense.

**Why it happens:**
Amount-only matching works well for unique amounts but fails for:
- Recurring payments (rent, subscriptions, utilities) with identical amounts
- Multiple invoices for the same amount to different customers
- Split payments where a single bank transaction covers multiple invoices
- Round-number transactions (1,000, 5,000, 10,000 THB) which are extremely common in Thai business

**How to avoid:**
1. Multi-factor matching: combine amount + date proximity (within 3-7 days) + description text similarity
2. Score-based matching: assign confidence scores instead of binary match/no-match:
   - Exact amount + exact date + description match = 95% confidence (auto-match)
   - Exact amount + close date (within 3 days) = 70% confidence (suggest match)
   - Exact amount only = 30% confidence (manual review)
3. Never auto-match without user confirmation for amounts that appear more than once in the matching window
4. Handle one-to-many and many-to-one: one bank transaction may pay multiple invoices, or multiple bank transfers may pay one invoice
5. Show unmatched items prominently -- users need to see what failed to match

**Warning signs:**
- Reconciliation report shows 100% match rate (too good to be true)
- Revenue or expense totals change after reconciliation
- User reports "wrong invoice was marked as paid"

**Phase to address:**
Phase 3 (Bank Reconciliation) -- matching algorithm is the core logic.

---

### Pitfall 8: Document Workflow Breaks the Existing Transaction Model

**What goes wrong:**
Quotations, delivery notes, and receipts are crammed into the existing `Transaction` model by adding a `documentType` discriminator field. This creates confusion: a quotation is NOT a transaction (no money changed hands), a delivery note is NOT a transaction, but they share the same table. Queries for "all transactions" now return non-financial documents, breaking tax reports, dashboard stats, and export functions.

**Why it happens:**
The path of least resistance is to reuse the existing Transaction model because it already has line items, contacts, amounts, and VAT fields. Adding a `documentType` column seems simpler than creating a new model. But:
- The `stats.ts` model queries all transactions for dashboard totals -- quotations would inflate income
- Tax reports (PP30, PND3/53) filter by type but not by documentType
- Export functions would include non-financial documents in accounting exports

**How to avoid:**
1. Create a separate `Document` model (or `Quotation` model) that is NOT a Transaction
2. Documents and Transactions are separate entities linked by a `sourceDocumentId`:
   ```
   Quotation (Document) --[converts to]--> Tax Invoice (Transaction)
   Tax Invoice (Transaction) --[payment confirmed]--> Receipt (Document)
   ```
3. Share line item structure via a common type (TypeScript interface), not via table inheritance
4. Keep the Transaction model strictly for financial events (income/expense that affect tax calculations)
5. If you must use the same table, add `isFinancialTransaction: boolean` and update ALL existing queries to filter by it

**Warning signs:**
- Dashboard shows inflated income from quotations
- Tax reports include quotation amounts in VAT calculations
- Export files contain non-transaction rows

**Phase to address:**
Phase 1 (Quotation System) -- the data model decision must be made before writing any code. This is the highest-impact architectural decision in v1.1.

---

### Pitfall 9: AppData JSON Pattern Cannot Scale for Document Queries

**What goes wrong:**
Following the existing pattern of storing full document data in the `AppData` model (used by tax invoices and credit notes), quotations are stored as JSON blobs keyed by document number. This works for display but makes it impossible to query: "show all quotations for contact X" or "find all quotations expiring this week" or "list quotations by status."

**Why it happens:**
The tax invoice system stores invoice data in `AppData` as `tax-invoice-INV-2569-0001`. This pattern works because tax invoices are also saved as Transactions (queryable). But quotations are NOT transactions, so without a proper model, they live only in AppData JSON with no queryable fields.

**How to avoid:**
1. Create a proper Prisma model for documents/quotations with indexed columns for: `userId`, `contactId`, `status`, `documentType`, `documentNumber`, `issuedAt`, `expiresAt`, `total`
2. Store line items as a JSON column within the model (acceptable for non-queryable nested data)
3. Use AppData only for UI preferences and templates (its original purpose), never for business entities that need querying
4. Design the model to accommodate all document types (quotation, delivery note, billing note, receipt) or create separate models per type

**Warning signs:**
- Adding loops that iterate all AppData entries to find matching documents
- Building "indexes" in application code instead of using database queries
- Performance degradation as document count grows beyond a few hundred

**Phase to address:**
Phase 1 (Quotation System) -- model design must support querying from day one.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store quotations in AppData JSON | No migration needed, follows existing pattern | Cannot query, filter, or sort quotations; must iterate all records | Never -- quotations are a core business entity |
| Reuse Transaction model for all document types | No new model, share existing UI | Breaks tax reports, inflates dashboard stats, complex discriminator queries | Only if `isFinancialTransaction` filter is added to ALL existing queries |
| Hardcode column positions for bank CSV import | Fast to implement for one bank | Breaks for every other bank; Thai banks all use different formats | Only for initial prototype with column-mapping UI planned for next iteration |
| Skip document status validation | Faster development, fewer constraints | Invalid state transitions, audit trail gaps, confused users | Never -- status integrity is a business requirement |
| Copy-paste sequential numbering from tax invoices without parameterizing | Quick to implement | Each new document type duplicates the same transaction pattern code | Only for first document type; refactor to shared utility before second type |
| Store converted document as mutation of original | One fewer record in DB | Cannot view original, no audit trail, partial conversion leaves corrupt state | Never -- immutability is required for Thai business documents |

---

## Integration Gotchas

Common mistakes when connecting v1.1 features to existing v1.0 systems.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Quotation -> Tax Invoice | Copying line item amounts without satang conversion | Quotation stores satang; tax invoice expects satang; verify units match at boundary |
| Quotation -> Contact | Creating a new contact record instead of linking to existing | Use contact autocomplete (already exists in tax-invoice-form); link by contactId |
| Document status -> Dashboard | Including non-financial documents in income/expense totals | Filter dashboard queries by `type IN ('income', 'expense')` AND exclude non-transaction documents |
| Bank import -> formatCurrency | Bank amounts in baht displayed through formatCurrency (expects satang) | Convert imported baht to satang (`amount * 100`) immediately at parse time |
| Bank reconciliation -> Transaction.total | Matching bank amount (positive number) to Transaction.total (may be positive or negative) | Normalize: bank debits = negative, bank credits = positive; match absolute values with type checking |
| Document PDF -> THSarabunNew font | Using Inter font (from generic invoice) instead of THSarabunNew (required for Thai government docs) | Quotation PDFs that may become tax invoices must use THSarabunNew from the start |
| Sequential numbering -> fiscal year reset | Running numbers across calendar years without reset | Thai fiscal year aligns with calendar year; reset sequence or include year in number format (QT-2569-NNNN) |
| Document conversion -> revalidatePath | Forgetting to revalidate both source (quotation list) and target (transaction list) paths | Call `revalidatePath("/quotations")` AND `revalidatePath("/transactions")` after conversion |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all AppData to find documents | Slow document list page | Use proper Prisma model with indexes, not AppData | >50 documents per user |
| Bank reconciliation N*M matching | Reconciliation takes minutes | Pre-sort by amount, use date windowing, index on amount+date | >500 bank transactions or >200 unmatched records |
| Full table scan for document number uniqueness | Slow document creation | Unique index on `(userId, documentType, documentNumber)` | >1,000 documents |
| Loading all contacts for autocomplete | Slow quotation form load | Paginate or search-as-you-type with debounced query | >100 contacts |
| PDF generation blocking the main thread | UI freezes during quotation PDF generation | Use server action (already the pattern), but add progress indicator for multi-page documents | >20 line items per document |

---

## Security Mistakes

Domain-specific security issues for document workflow and bank import.

| Mistake | Risk | Prevention |
|---------|------|------------|
| No authorization check on document conversion | User A converts User B's quotation to an invoice | Always filter by `userId` in every document query and mutation (existing pattern, but must be applied to new models) |
| Bank CSV processed without size limit | Large CSV causes memory exhaustion, potential DoS | Limit file size (10MB max), limit row count (10,000 max), stream-parse instead of buffer-parse |
| Document numbers guessable and enumerable | Competitor can guess document numbers and infer business volume | Include random component or use non-sequential display numbers while keeping internal sequence |
| Bank statement data stored with full account number | Account numbers in database are a data breach target | Mask account numbers in storage and display (show last 4 digits only) |
| Quotation PDF accessible without authentication | Shared quotation URL leaks business details | If generating shareable links, use signed URLs with expiry; never serve PDFs from a public route |
| CSV injection in bank statement import | Malicious CSV with formulas (`=CMD()`) re-exported to Excel | Sanitize cell values: prefix cells starting with `=`, `+`, `-`, `@` with a single quote |

---

## UX Pitfalls

Common user experience mistakes in document workflow systems.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No preview before quotation-to-invoice conversion | User converts wrong quotation, no undo | Show confirmation dialog with side-by-side preview of what will be created |
| Bank reconciliation auto-matches silently | User does not know which transactions were matched or why | Show each proposed match with confidence score; require explicit confirmation for low-confidence matches |
| Document status changes without feedback | User clicks "send quotation" but nothing visually changes | Show toast notification, update status badge immediately, log status change in activity timeline |
| Quotation expiry date not visible in list | User sends expired quotation to customer | Show expiry date and visual indicator (red/yellow/green) in quotation list; filter for expired quotations |
| Bank import replaces existing data | User imports same statement twice, duplicating all transactions | Detect duplicates by hash of (date, amount, description, balance); warn user before importing |
| No way to return from converted state | Quotation converted to invoice by mistake, cannot undo | Add "unlink" action that cancels the generated invoice and returns quotation to "accepted" state |
| PDF uses wrong font for Thai text | Thai characters render as boxes in PDF | Use THSarabunNew for quotation PDFs, test with actual Thai text including special characters |
| Line item editing loses scroll position | Editing item 15 of 20 scrolls to top after save | Use optimistic updates with local state; do not re-render the entire list on single item change |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Quotation System:** Often missing quotation expiry date handling -- verify quotation has `validUntil` field and expired quotations cannot be converted
- [ ] **Quotation System:** Often missing line item discount support -- verify per-item and document-level discounts work and display correctly in PDF
- [ ] **Quotation System:** Often missing quotation duplication -- verify user can duplicate a quotation to create a new one (common workflow)
- [ ] **Document Conversion:** Often missing partial conversion -- verify a quotation with 10 items can generate an invoice for only 5 items
- [ ] **Document Conversion:** Often missing original document link -- verify the generated invoice shows "Created from QT-2569-0001" with a clickable link back
- [ ] **Document Workflow:** Often missing status history -- verify each status change is logged with timestamp and user (for audit)
- [ ] **Bank Import:** Often missing duplicate detection -- verify importing the same CSV twice does not create duplicate records
- [ ] **Bank Import:** Often missing Buddhist Era date conversion -- verify dates with year > 2500 are correctly converted to Gregorian
- [ ] **Bank Reconciliation:** Often missing partial match handling -- verify a single bank transaction can match to multiple invoices (split payment)
- [ ] **Bank Reconciliation:** Often missing unmatch action -- verify a matched transaction can be unmatched if the match was wrong
- [ ] **Document PDF:** Often missing THSarabunNew font -- verify all document PDFs render Thai text correctly with the government-required font
- [ ] **Sequential Numbering:** Often missing year rollover handling -- verify that QT-2569-0001 correctly increments to QT-2570-0001 when the year changes

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Satang double-division in quotation amounts | LOW | Fix the conversion function; recalculate affected quotation totals via migration script |
| FIRST_CLASS_COLUMNS missing new fields | LOW | Add field to set; run UPDATE to move data from `extra` JSON to the proper column |
| Duplicate document numbers | MEDIUM | Add unique constraint (may fail if duplicates exist); rename duplicates with suffix; fix sequence counter |
| Mutated quotation data after conversion | HIGH | Data is lost; must restore from backup or re-enter quotations manually; prevent by using immutable pattern |
| Invalid document status transitions | MEDIUM | Audit all documents for invalid states; fix via migration script; add validation to prevent recurrence |
| Bank import with wrong encoding | LOW | Delete imported transactions; re-import with correct encoding; add encoding detection |
| False positive reconciliation matches | MEDIUM | Unmatch incorrectly matched transactions; re-run reconciliation with stricter matching; manual review queue |
| AppData used for documents (cannot query) | HIGH | Must create proper model, write migration to extract JSON data into new table; significant refactor |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Satang double-division (#1) | Phase 1: Quotation System | Unit test: `formatCurrency(500000, "THB")` displays "5,000.00" not "50.00" |
| FIRST_CLASS_COLUMNS (#2) | All phases adding Transaction columns | Grep test: every column in schema.prisma Transaction model is in FIRST_CLASS_COLUMNS |
| Sequential numbering race (#3) | Phase 1: Quotation System | Concurrent test: 10 rapid quotation creates produce unique sequential numbers |
| Conversion mutates original (#4) | Phase 2: Document Workflow Chain | After conversion: original quotation data unchanged; new invoice created as separate record |
| Status machine without transitions (#5) | Phase 2: Document Workflow Chain | Try invalid transition (draft -> converted): should throw error |
| Bank CSV format assumption (#6) | Phase 3: Bank Reconciliation | Import test: KBank CSV (TIS-620, BE dates) parses correctly |
| Amount-only reconciliation (#7) | Phase 3: Bank Reconciliation | Matching test: two transactions with same amount but different dates match to correct records |
| Transaction model pollution (#8) | Phase 1: Quotation System | Dashboard test: creating a quotation does not change income/expense totals |
| AppData cannot scale (#9) | Phase 1: Quotation System | Query test: "find all quotations for contact X" uses SQL index, not application-level filter |

---

## v1.0 Known Pitfalls to NOT Repeat

These were encountered during v1.0 development. They are documented here as reminders because the same patterns will be used in v1.1.

| v1.0 Pitfall | v1.1 Risk Area | Prevention |
|-------------|----------------|------------|
| `formatCurrency` already divides satang by 100 | Quotation line item display | Never double-divide; always pass satang to `formatCurrency()` |
| `FIRST_CLASS_COLUMNS` must include new Transaction fields | Any new Transaction column for documents | Checklist: new column -> update FIRST_CLASS_COLUMNS |
| Migration timestamps must be ordered for dependencies | Document model depends on Contact model | Ensure migration for Document model has timestamp AFTER Contact model migration |
| Module-level service instantiation crashes without API keys | New services for bank parsing or document workflow | Lazy-initialize services; never instantiate at module level |
| Edge runtime cannot run Prisma | Middleware for document access control | Use cookie-based checks in middleware; Prisma queries in server actions only |

---

## Sources

- BanChee codebase analysis: `models/transactions.ts` (FIRST_CLASS_COLUMNS pattern), `lib/utils.ts` (formatCurrency division), `app/(app)/apps/tax-invoice/actions.ts` (sequential numbering pattern), `app/(app)/apps/credit-note/actions.ts` (document reference pattern), `app/(app)/apps/invoices/components/invoice-page.tsx` (amount convention mismatch)
- [Most Common Invoicing Mistakes (QuickBooks)](https://quickbooks.intuit.com/r/invoicing/invoice-mistakes/)
- [Quote vs Invoice Key Differences (HighRadius)](https://www.highradius.com/resources/Blog/quote-vs-invoice/)
- [Quote-to-Invoice Reconciliation (Salesforce Ben)](https://www.salesforceben.com/quote-to-invoice-reconciliation-solving-the-cpq-to-billing-mismatch-in-salesforce/)
- [Guide to Automated Bank Reconciliation (Ramp)](https://ramp.com/blog/automated-bank-reconciliation)
- [Essential Sales Documents for Thai Businesses (SMEBaaS)](https://smebaas.com/essential-sales-documents-thailand-guide/)
- [How to Issue Tax Invoice/Receipt in Thailand (VBA Partners)](https://vbapartners.com/how-to-issue-a-tax-invoice-receipt-in-thailand/)
- [Thai Business Documents Guide (FlowAccount)](https://flowaccount.com/blog/business-document-thailand/)
- [ER Diagram for Invoice Management (Red Gate)](https://www.red-gate.com/blog/erd-for-invoice-management/)
- [Bank Statement Formats Explained (Data River)](https://www.datariver.co/blog/bank-statement-formats-explained-pdf-csv-ofx-qbo)
- [Common Pitfalls Prisma + Next.js (InfiniteJS)](https://infinitejs.com/posts/common-pitfalls-nextjs-prisma/)

---
*Pitfalls research for: BanChee v1.1 Document Workflow & Bank Reconciliation*
*Researched: 2026-03-25*
