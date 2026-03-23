# Feature Landscape: Thai SME Accounting/Tax Tools

**Domain:** AI-powered self-hosted Thai SME tax compliance
**Researched:** 2026-03-23
**Overall confidence:** HIGH (based on official Revenue Department sources, competitor product pages, and multiple cross-referenced articles)

---

## Competitor Landscape Summary

| Platform | Focus | Users/Scale | Pricing | Key Strength |
|----------|-------|-------------|---------|-------------|
| **FlowAccount** | Full cloud accounting for SMEs | 130,000+ active users | Free tier; paid from 300 THB/mo | Market leader, broadest feature set, Sequoia-backed |
| **PEAK** | Modern cloud accounting + accountant collaboration | ~100K transactions/mo managed | 500-3,500 THB/mo | Bank reconciliation AI, UOB lending integration |
| **AccRevo** | Digital accounting platform bridging owners and accountants | Growing SME base | ~5,500 THB/yr (Accistant+Book bundle) | AI-powered OCR, accountant collaboration model |
| **Leceipt** | e-Tax Invoice and e-Receipt specialist | Niche e-commerce focus | Volume-based (300-3,000+ docs) | PDF/A-3 + XML generation, digital signatures, marketplace integrations |
| **SME Move** | Budget-friendly Thai accounting | SME/startup focused | Competitive (below FlowAccount) | Complete tax form generation (PND1/3/53, PP30) |

---

## Table Stakes

Features users expect from any Thai SME accounting/tax tool. Missing any of these means the product feels incomplete and users leave.

### Document Management

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Quotation creation** | Standard Thai business workflow starts with quotation | Low | All competitors support. Template-based. |
| **Invoice generation** | Core billing document | Low | Must support THB + multi-currency |
| **Tax invoice (ใบกำกับภาษี) creation** | Legal requirement for VAT-registered businesses | Medium | Must include all 8 required fields per Section 86/4 of Revenue Code |
| **Receipt issuance** | Proof of payment received | Low | Generated after payment confirmation |
| **Delivery note / billing note** | Goods delivery documentation | Low | FlowAccount, PEAK, SME Move all support |
| **Credit note / debit note** | Corrections to previously issued tax invoices | Medium | Required when invoice amounts change post-issuance |
| **Document status tracking** | Track lifecycle: pending -> approved -> paid | Low | FlowAccount tracks 6 states. Essential for cash flow visibility. |
| **Document numbering/sequencing** | Legally required sequential numbering for tax documents | Low | Revenue Dept requires sequential serial numbers on tax invoices |

### Tax Compliance - VAT

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **7% VAT auto-calculation** | Thailand's standard VAT rate | Low | Apply on document line items, auto-calculate totals |
| **Input/output VAT tracking (ภาษีซื้อ/ภาษีขาย)** | Foundation of monthly VAT filing | Medium | Track VAT paid (purchases) vs VAT collected (sales) per month |
| **Purchase tax report (รายงานภาษีซื้อ)** | Required supporting document for PP30 filing | High | Must include: date, tax invoice number, vendor name, vendor Tax ID, tax base amount, VAT amount |
| **Sales tax report (รายงานภาษีขาย)** | Required supporting document for PP30 filing | High | Mirror of purchase report for sales side |
| **PP30 VAT return generation** | Monthly VAT filing form | High | Calculate output VAT minus input VAT; file by 15th of following month (paper) or 23rd (e-filing). Even zero months require filing. |
| **6-month input tax invoice validity** | Legal constraint on VAT credit claims | Medium | Input tax invoices expire after 6 months; system must flag/warn |

### Tax Compliance - Withholding Tax (WHT)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **WHT rate selection per payment type** | Different rates for different service types | Medium | Services: 3%, Rent: 5%, Transport: 1%, Professional: 3%, Advertising: 2% |
| **WHT certificate generation (50 Tawi)** | Legal requirement when withholding tax | High | Must include: payer/payee details, Tax ID, WHT rate, product category, payment condition. Two copies required. |
| **PND3 filing report** | Monthly WHT return for payments to individuals | High | File within 7 days of month end (paper) or 15 days (e-filing) |
| **PND53 filing report** | Monthly WHT return for payments to companies | High | Same deadlines as PND3, different form/recipient type |
| **WHT amount auto-calculation** | Deduct correct WHT from payment amounts | Medium | Calculate pre-VAT, apply WHT rate, show net payable |

### Tax Compliance - Corporate Income Tax

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **SME tax rate calculation** | Reduced rates for qualifying SMEs | Medium | 0% on first 300K net profit, 15% on 300K-3M, 20% above 3M. Must verify SME eligibility (capital <=5M, revenue <=30M). |
| **PND50 annual CIT helper** | Annual corporate income tax return data | High | Due within 150 days after accounting year end (typically May 30). Calculate from P&L. |
| **PND51 half-year CIT helper** | Half-year estimated CIT | High | Due within 2 months after first 6 months (typically August 31) |

### Reporting & Dashboard

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Income/expense summary dashboard** | At-a-glance business health | Medium | All competitors provide this. Real-time P&L view. |
| **Monthly tax summary** | Know what's owed before filing | Medium | VAT payable, WHT withheld, upcoming deadlines |
| **Excel/CSV export** | Data portability, accountant handoff | Low | Standard Thai accountant expects Excel format |
| **Contact/vendor management** | Store supplier/customer details with Tax IDs | Low | Reuse across documents; pre-populate tax forms |
| **Product/service catalog** | Reusable line items for documents | Low | Price, description, VAT applicability, WHT category |

### Filing Deadline Management

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Tax calendar with Thai deadlines** | Prevent penalties (1,000-2,000 THB/month + 1.5% interest) | Medium | See calendar below |
| **Filing reminders/notifications** | Proactive deadline alerts | Low | Push/email notifications before deadlines |
| **Filing status tracking** | Track which months are filed vs pending | Low | Per-form tracking: PP30, PND3, PND53 per month |

#### Thai Tax Filing Calendar

| Obligation | Form | Deadline (Paper) | Deadline (e-Filing) | Frequency |
|------------|------|-------------------|---------------------|-----------|
| VAT return | PP30 | 15th of following month | 23rd of following month | Monthly (even if zero) |
| WHT on individuals | PND3 | 7th of following month | 15th of following month | Monthly (when payments made) |
| WHT on companies | PND53 | 7th of following month | 15th of following month | Monthly (when payments made) |
| WHT on employees | PND1 | 7th of following month | 15th of following month | Monthly |
| Half-year CIT estimate | PND51 | Within 2 months of half-year end | +8 days extension | Once per year |
| Annual CIT return | PND50 | Within 150 days of year end | +8 days extension | Once per year |
| WHT certificates to recipients | 50 Tawi | Feb 15 for current employees; 1 month for departing | N/A | Annual / on departure |

### Receipt/Document Scanning

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Photo/PDF upload of receipts** | Digitize paper documents | Low | Already exists in TaxHacker foundation |
| **AI data extraction from receipts** | Reduce manual entry | High | Already exists in TaxHacker. FlowAccount has "AutoKey" (AI OCR). AccRevo has "Accounting Image" + "Accounting Intelligence". |
| **Thai text extraction** | Receipts are in Thai | High | Must handle Thai script, mixed Thai/English, Thai date formats |
| **Tax invoice field validation** | Verify receipt is valid tax invoice | Medium | Check all 8 required fields per Section 86/4 |

### User Experience

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Thai language UI** | Target users are Thai SME owners | Medium | All competitors are Thai-first. Tax terminology must match Revenue Dept official terms. |
| **Mobile-responsive design** | Business owners work from phones | Medium | FlowAccount has native mobile app. Web responsive is minimum. |
| **Multi-user access** | Owner + accountant/bookkeeper access | Low | PEAK supports 5-10 users per plan. Basic role separation needed. |

---

## Differentiators

Features that set BanChee apart from competitors. Not expected, but create competitive advantage.

### AI-Powered Intelligence (BanChee's Primary Differentiator)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AI auto-categorization of expenses** | Snap receipt, AI handles categorization | High | TaxHacker foundation supports this. Train for Thai expense categories. Competitors require manual categorization. |
| **AI tax invoice validation** | AI checks 8 required fields, flags missing/invalid | High | No competitor does this automatically. Huge value -- prevents rejected tax credits. |
| **AI-detected VAT registration threshold** | Auto-alert when revenue approaches 1.8M THB | Medium | Track cumulative revenue, notify before crossing threshold. Unique feature. |
| **AI Section 65 Tri flagging** | Auto-flag non-deductible expenses | High | Flag entertainment >0.3% of revenue, personal expenses, unidentifiable recipients. No competitor does this. |
| **AI WHT rate suggestion** | Suggest correct WHT rate based on vendor/service type | Medium | Reduce most common SME mistake. Pre-fill from vendor history. |
| **Multi-LLM provider support** | No vendor lock-in for AI features | Medium | Already in TaxHacker. OpenAI, Gemini, Mistral. Unique among Thai tools. |

### Self-Hosted / Open Source

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Self-hosted Docker deployment** | Financial data never leaves user's server | Low | Unique in Thai market. All competitors are cloud SaaS. Appeals to privacy-conscious businesses. |
| **Open source (MIT license)** | Free forever, community-driven | Low | No Thai open-source accounting tool exists. Zero monthly fees vs FlowAccount 300+/mo, PEAK 500+/mo. |
| **Offline-capable operation** | Works without internet after setup | Medium | Self-hosted naturally works on LAN. Competitors require internet. |

### Export & Interoperability

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **FlowAccount-compatible export** | Easy migration path, accountant familiarity | Medium | Many accountants already use FlowAccount. CSV format compatibility. |
| **Revenue Department e-Filing XML export** | Generate upload-ready files for rd.go.th | High | XML format per ETDA standard 3-2560. No direct API (rd.go.th has no public API). |
| **Standard Thai accountant Excel format** | Handoff to external accountant when needed | Medium | Accountants expect specific column layouts for tax reports |
| **Purchase/Sales tax ledger export** | Supporting documents for PP30 filing | Medium | Required columns: date, invoice#, vendor/customer name, Tax ID, base amount, VAT amount |

### Smart Workflow Features

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Receipt-to-report pipeline** | Upload receipt -> auto-extract -> categorize -> generate report | High | End-to-end automation. FlowAccount does partial (AutoKey scans, manual categorization). BanChee should do full pipeline. |
| **Monthly filing checklist** | Guided workflow: "Here's what you need to file this month" | Medium | Context-aware: show relevant forms based on business activity that month |
| **Penalty calculator** | Show cost of late filing to motivate compliance | Low | 1,000-2,000 THB fine + 1.5%/month interest. Strong motivator. |
| **Year-over-year comparison** | Compare tax obligations across periods | Medium | Helps plan cash flow for tax payments |

---

## Anti-Features

Features to explicitly NOT build. Building these would waste effort, increase complexity, or conflict with BanChee's positioning.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full double-entry bookkeeping / general ledger** | Accounting software territory. Massive complexity. BanChee is a tax compliance tool, not a replacement for PEAK/FlowAccount. | Generate tax-specific reports only. Export to FlowAccount/PEAK for full accounting. |
| **e-Tax Invoice digital signatures (PDF/A-3 + CA cert)** | Requires Revenue Dept registration, CA certificate purchase, complex PKI infrastructure. Leceipt's entire business is this one feature. | Generate standard tax invoices. Recommend Leceipt for e-Tax Invoice signing. Possible v2 integration. |
| **Direct Revenue Dept API submission** | rd.go.th has NO public API. Would require browser automation (fragile, possibly illegal). | Generate upload-ready XML/files. User manually uploads to rd.go.th e-filing portal. |
| **Payroll management** | Different domain entirely. FlowAccount, PEAK, and SME Move all treat this as a separate module/add-on. | Out of scope. Recommend FlowAccount Payroll or PEAK Payroll for this. |
| **Inventory/stock management** | Warehouse management is a separate system. Not tax-related. | Track product catalog for invoicing only. No stock levels, FIFO, or warehouse features. |
| **Social Security Fund (SSO) filing** | Separate system from tax. Different deadlines, different portal. | Out of scope. Document why in onboarding. |
| **Multi-tenant SaaS hosting** | Self-hosted is the differentiator. Multi-tenant adds auth complexity, data isolation concerns, hosting costs. | Single-tenant Docker first. SaaS mode deferred to v2 if demand exists. |
| **Bank reconciliation** | Requires Thai bank API integrations (K-Bank, SCB, BBL). Each bank is a separate integration project. PEAK's main differentiator. | Allow manual bank statement CSV import. Don't build real-time bank connectivity. |
| **E-commerce marketplace integration** | Shopee/Lazada/TikTok Shop integration is Leceipt's specialty. Complex, platform-specific APIs. | Allow CSV/manual import of marketplace sales data. |
| **PND1 employee withholding tax** | Requires payroll data, employee records, salary calculations. Payroll domain. | Out of scope for v1. Focus on PND3 (individuals) and PND53 (companies) which are vendor payment related. |
| **Real-time collaboration** | Multi-seat editing adds WebSocket complexity, conflict resolution. Target user is single SME owner. | Single-user with basic role-based access (owner + accountant viewer). |

---

## Feature Dependencies

```
Receipt Upload -> AI Data Extraction -> Thai Text Extraction
                                     -> Tax Invoice Field Validation

AI Data Extraction -> Expense Categorization -> Section 65 Tri Flagging
                   -> VAT Amount Extraction -> Input VAT Tracking -> Purchase Tax Report -> PP30 Generation
                   -> WHT Detection -> WHT Certificate (50 Tawi) -> PND3/PND53 Reports

Contact Management -> Tax Invoice Creation -> Output VAT Tracking -> Sales Tax Report -> PP30 Generation

Income Tracking -> Revenue Threshold Detection (1.8M VAT registration)
               -> SME Eligibility Check -> CIT Rate Calculation -> PND50/PND51 Helpers

Tax Calendar -> Filing Reminders -> Filing Status Tracking -> Monthly Filing Checklist

All Tax Reports -> Excel Export
               -> FlowAccount-Compatible Export
               -> Revenue Dept XML Export
```

### Critical Path

1. **Receipt scanning + Thai AI extraction** (foundation -- already partially exists in TaxHacker)
2. **VAT input/output tracking** (enables PP30, the most frequent filing obligation)
3. **WHT management** (enables PND3/PND53, the second most frequent obligation)
4. **Tax report generation** (the core output users need)
5. **Export formats** (how users actually file with Revenue Dept)

---

## MVP Recommendation

### Must Have for Launch (Table Stakes)

1. **Thai language UI** -- non-negotiable for target users
2. **AI receipt scanning with Thai extraction** -- core differentiator, extends TaxHacker
3. **Tax invoice validation** -- AI checks 8 required fields
4. **VAT input/output tracking** -- enables monthly VAT workflow
5. **PP30 VAT report generation** -- most critical monthly filing
6. **WHT management with 50 Tawi certificates** -- second most critical monthly task
7. **PND3 and PND53 report generation** -- monthly WHT filing
8. **Tax calendar with reminders** -- prevent penalties
9. **Excel export** -- accountant handoff

### High Priority (Phase 2)

1. **SME CIT calculation helpers** (PND50/PND51) -- annual/semi-annual, less urgent
2. **Section 65 Tri expense flagging** -- annual CIT optimization
3. **Revenue Dept XML export** -- advanced users want direct e-filing
4. **FlowAccount-compatible export** -- migration path
5. **Purchase/Sales tax ledger** -- formal tax audit support

### Defer to v2

1. **e-Tax Invoice digital signatures** -- requires CA infrastructure
2. **Bank statement import** -- manual CSV first
3. **Multi-user roles beyond basic** -- single user sufficient initially
4. **Revenue threshold auto-detection** -- nice but not blocking

---

## Revenue Department Required Fields Reference

### Tax Invoice (ใบกำกับภาษี) - Section 86/4

Per Revenue Code Section 86/4, a standard tax invoice must contain:

1. The word "Tax Invoice" (ใบกำกับภาษี) prominently displayed
2. Name, address, and Tax ID of the issuer (VAT registrant)
3. Name and address of the buyer
4. Serial number and book number (if applicable)
5. Description, type, category, quantity, and value of goods/services
6. VAT amount clearly separated from the goods/services value
7. Date of issuance
8. Any additional particulars prescribed by the Director-General

**Language requirement:** Must be in Thai language, Thai currency (Baht), and Thai or Arabic numerals.

### WHT Certificate (50 Tawi) Required Fields

1. Payer name, address, Tax ID
2. Payee name, address, Tax ID
3. Withholding method (at source / every time / one time)
4. WHT rate applied
5. Product/service category (Revenue Type code)
6. Payment condition
7. Gross amount paid
8. WHT amount deducted
9. Net amount after WHT
10. Date of payment and withholding
11. Sequential certificate number

### Non-Deductible Expenses (Section 65 Ter) - Key Categories for AI Flagging

1. Personal expenses and gifts (not business-related)
2. Tax penalties, surcharges, and criminal fines
3. Artificial or fictitious expenses
4. Expenses where recipient identity cannot be proven
5. Entertainment expenses exceeding 0.3% of gross revenue (cap: 10M THB)
6. Excessive shareholder/partner compensation
7. Capital improvements misclassified as maintenance
8. Donations exceeding 2% of net profit

---

## Sources

### Competitor Products
- [FlowAccount - Cloud Accounting Features](https://flowaccount.com/blog/cloud-accounting-software-thailand/)
- [FlowAccount - AutoKey Receipt Scanning](https://flowaccount.com/en/autokey)
- [FlowAccount - Tax Management](https://flowaccount.com/en/explore-more)
- [FlowAccount - Pricing](https://flowaccount.com/en/pricing)
- [PEAK Account - Pricing](https://www.peakaccount.com/pricing)
- [AccRevo Platform](https://www.accrevo.com/)
- [AccRevo - Innovation Thailand](https://www.innovationthailand.org/en/project-detail/AccRevo)
- [Leceipt - e-Tax Invoice & e-Receipt](https://www.leceipt.com/en)
- [Leceipt - Pricing](https://www.leceipt.com/en/pricing)
- [SME Move - Online Accounting](https://smemove.com/index-en.php)
- [VBA Partners - Best Accounting Software Thailand](https://vbapartners.com/accounting-software-for-businesses-in-thailand/)

### Thai Tax Law & Revenue Department
- [Revenue Code Section 86/4 - Tax Invoice Requirements](https://www.rd.go.th/english/37741.html) (HIGH confidence - official source)
- [Revenue Department - VAT Overview](https://www.rd.go.th/english/6043.html) (HIGH confidence)
- [Revenue Department - PP30 Form](https://www.rd.go.th/fileadmin/download/english_form/frm_pp30.pdf) (HIGH confidence)
- [Revenue Department - WHT Certificate Form](https://www.rd.go.th/fileadmin/download/english_form/frm_WTC.pdf) (HIGH confidence)
- [PKF Thailand - e-Tax Invoice Requirements](https://pkfthailand.asia/understanding-e-tax-invoice-in-thailand/) (MEDIUM confidence)

### Tax Compliance Guides
- [VBA Partners - Deductible Expenses Guide](https://vbapartners.com/deductible-expenses-for-thai-companies-ultimate-guide/) (MEDIUM confidence)
- [VBA Partners - WHT Certificates](https://vbapartners.com/withholding-tax-certificates-in-thailand/) (MEDIUM confidence)
- [VBA Partners - PND Forms & Filing](https://vbapartners.com/thailand-tax-submission-pnd-forms-filing-secrets/) (MEDIUM confidence)
- [ExpatDen - PP30 Filing Guide](https://www.expatden.com/thailand/pp30-thailand/) (MEDIUM confidence)
- [GentleLaw - WHT Filing 2026](https://www.gentlelawibl.com/post/thailand-withholding-tax-filing-2026-pnd3) (MEDIUM confidence)
- [GentleLaw - Compliance Calendar 2026](https://www.gentlelawibl.com/post/thailand-compliance-calendar-2026-for-foreign-smes-monthly-tax-sso-and-dbd-deadlines) (MEDIUM confidence)
- [KPMG - 2025 Thailand Tax Calendar](https://assets.kpmg.com/content/dam/kpmg/th/pdf/2024/12/2025-thailand-tax-calendar-english.pdf) (HIGH confidence)
- [PWC - Thailand Corporate Tax Administration](https://taxsummaries.pwc.com/thailand/corporate/tax-administration) (HIGH confidence)
- [TMA Group - Section 65 Ter Analysis](https://tmathaigroup.com/blogeng/index.php/post/45.html) (MEDIUM confidence)
