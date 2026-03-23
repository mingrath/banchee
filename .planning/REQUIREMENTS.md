# Requirements: BanChee (บัญชี)

**Defined:** 2026-03-23
**Core Value:** A Thai SME owner can snap a receipt, have AI handle the rest, and generate monthly tax filings in 5 minutes — zero accountant needed, zero tax penalties.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Thai Localization (I18N)

- [ ] **I18N-01**: UI displays in Thai with official Revenue Department tax terminology
- [ ] **I18N-02**: Buddhist Era (พ.ศ.) date display alongside Gregorian dates
- [ ] **I18N-03**: Thai number/currency formatting (฿ prefix, comma separators, 2 decimal places)
- [ ] **I18N-04**: Thai font support in all generated PDF documents (THSarabunNew)

### AI Receipt Scanning (SCAN)

- [ ] **SCAN-01**: AI extracts Thai tax invoice fields (vendor name, Tax ID, branch, date, items, VAT amount)
- [ ] **SCAN-02**: AI validates that uploaded receipt qualifies as valid tax invoice (8 required fields per Section 86/4)
- [ ] **SCAN-03**: AI auto-categorizes expenses into user-defined Thai categories
- [ ] **SCAN-04**: AI auto-suggests WHT rate based on payment/service type
- [ ] **SCAN-05**: AI flags non-deductible expenses (Section 65 Tri) with explanation

### VAT Compliance (VAT)

- [ ] **VAT-01**: Track input VAT (ภาษีซื้อ) and output VAT (ภาษีขาย) per transaction
- [ ] **VAT-02**: Auto-calculate 7% VAT with correct base amount (pre-VAT from /107 formula when price includes VAT)
- [ ] **VAT-03**: Auto-detect VAT registration requirement based on revenue threshold (1.8M baht)
- [ ] **VAT-04**: Generate Purchase Tax Report (รายงานภาษีซื้อ) with all required columns
- [ ] **VAT-05**: Generate Sales Tax Report (รายงานภาษีขาย) with all required columns
- [ ] **VAT-06**: Generate PP30 (ภ.พ.30) monthly VAT return data
- [ ] **VAT-07**: Flag input tax invoices approaching 6-month expiry for VAT credit claims

### Withholding Tax (WHT)

- [ ] **WHT-01**: WHT rate selection per payment type (1% transport, 2% advertising, 3% services/professional, 5% rent)
- [ ] **WHT-02**: Auto-calculate WHT on pre-VAT amount (not total — critical correctness requirement)
- [ ] **WHT-03**: Generate WHT certificate (50 Tawi / หนังสือรับรองหัก ณ ที่จ่าย) as PDF with all 11 required fields
- [ ] **WHT-04**: Generate PND3 (ภ.ง.ด.3) monthly WHT report for payments to individuals
- [ ] **WHT-05**: Generate PND53 (ภ.ง.ด.53) monthly WHT report for payments to companies

### Corporate Income Tax (CIT)

- [ ] **CIT-01**: SME tax rate calculation (0% on first 300K, 15% on 300K-3M, 20% above 3M)
- [ ] **CIT-02**: PND50 (ภ.ง.ด.50) annual CIT data helper — calculate from income/expense totals
- [ ] **CIT-03**: PND51 (ภ.ง.ด.51) half-year estimated CIT data helper

### Tax Invoice Management (INV)

- [ ] **INV-01**: Create Thai tax invoices (ใบกำกับภาษี) with all 8 required fields per Section 86/4
- [ ] **INV-02**: Sequential document numbering per document type
- [ ] **INV-03**: Credit note and debit note creation for invoice corrections
- [ ] **INV-04**: Contact/vendor management with Tax ID and branch number storage

### Filing & Deadlines (FILE)

- [ ] **FILE-01**: Thai tax calendar showing all filing deadlines (PP30 by 15th/23rd, PND3/53 by 7th/15th)
- [ ] **FILE-02**: Filing deadline reminders (visual alerts on dashboard)
- [ ] **FILE-03**: Filing status tracker per form per month (pending/filed/overdue)
- [ ] **FILE-04**: Thai public holiday awareness for deadline adjustment

### Reports & Export (RPT)

- [ ] **RPT-01**: Monthly tax summary dashboard (VAT payable, WHT withheld, upcoming deadlines)
- [ ] **RPT-02**: Income/expense summary with profit calculation
- [ ] **RPT-03**: Excel export in standard Thai accountant format
- [ ] **RPT-04**: Revenue Department-compatible export format for PP30, PND3, PND53
- [ ] **RPT-05**: FlowAccount-compatible CSV export

### Business Profile (BIZ)

- [ ] **BIZ-01**: Business profile with company name, Tax ID, branch, address (Thai)
- [ ] **BIZ-02**: VAT registration status toggle (registered/not registered) — controls which features are active
- [ ] **BIZ-03**: Accounting period configuration (calendar year default)
- [ ] **BIZ-04**: Base currency set to THB with multi-currency support for foreign transactions

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### e-Tax Invoice

- **ETAX-01**: Generate e-Tax Invoice in PDF/A-3 format with digital signature
- **ETAX-02**: Integration with Revenue Department e-Tax Invoice by Email system
- **ETAX-03**: XML generation per ETDA standard 3-2560

### Advanced Features

- **ADV-01**: Bank statement import and auto-reconciliation
- **ADV-02**: Quotation → Invoice → Receipt document workflow chain
- **ADV-03**: Delivery note and billing note generation
- **ADV-04**: PND1 employee withholding tax management
- **ADV-05**: Multi-user access with owner/bookkeeper roles
- **ADV-06**: Cloud SaaS deployment option (multi-tenant)
- **ADV-07**: LINE/SMS notification for filing deadlines
- **ADV-08**: Full general ledger (chart of accounts)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full double-entry general ledger | Anti-feature: adds complexity that non-accountant users don't need. Expense/income tracking is sufficient. |
| Payroll management (PND1, Social Security) | Separate domain, high complexity, defer to v2+ |
| Direct Revenue Dept e-Filing submission | No public API exists — manual upload of generated files is sufficient |
| Native mobile app | Web responsive design is sufficient for v1 |
| Multi-company management in one instance | Keep simple for v1 — one instance per company |
| Inventory/stock management | Different domain, not tax-related |
| PDPA consent management UI | Self-hosted model means data stays with user — minimal PDPA risk |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| I18N-01 | Phase 1 | Pending |
| I18N-02 | Phase 1 | Pending |
| I18N-03 | Phase 1 | Pending |
| I18N-04 | Phase 1 | Pending |
| SCAN-01 | Phase 1 | Pending |
| SCAN-02 | Phase 1 | Pending |
| SCAN-03 | Phase 1 | Pending |
| SCAN-04 | Phase 2 | Pending |
| SCAN-05 | Phase 3 | Pending |
| VAT-01 | Phase 1 | Pending |
| VAT-02 | Phase 1 | Pending |
| VAT-03 | Phase 1 | Pending |
| VAT-04 | Phase 1 | Pending |
| VAT-05 | Phase 1 | Pending |
| VAT-06 | Phase 1 | Pending |
| VAT-07 | Phase 1 | Pending |
| WHT-01 | Phase 2 | Pending |
| WHT-02 | Phase 2 | Pending |
| WHT-03 | Phase 2 | Pending |
| WHT-04 | Phase 2 | Pending |
| WHT-05 | Phase 2 | Pending |
| CIT-01 | Phase 3 | Pending |
| CIT-02 | Phase 3 | Pending |
| CIT-03 | Phase 3 | Pending |
| INV-01 | Phase 2 | Pending |
| INV-02 | Phase 2 | Pending |
| INV-03 | Phase 3 | Pending |
| INV-04 | Phase 2 | Pending |
| FILE-01 | Phase 2 | Pending |
| FILE-02 | Phase 2 | Pending |
| FILE-03 | Phase 2 | Pending |
| FILE-04 | Phase 2 | Pending |
| RPT-01 | Phase 3 | Pending |
| RPT-02 | Phase 3 | Pending |
| RPT-03 | Phase 4 | Pending |
| RPT-04 | Phase 4 | Pending |
| RPT-05 | Phase 4 | Pending |
| BIZ-01 | Phase 1 | Pending |
| BIZ-02 | Phase 1 | Pending |
| BIZ-03 | Phase 1 | Pending |
| BIZ-04 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 41 total
- Mapped to phases: 41
- Unmapped: 0

---
*Requirements defined: 2026-03-23*
*Last updated: 2026-03-23 after roadmap creation*
