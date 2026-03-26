# BanChee (บัญชี)

## What This Is

BanChee is an AI-powered, self-hosted accounting app built for Thai SME owners who want to handle their own tax compliance without hiring an accountant. Upload a receipt or invoice photo, and BanChee extracts all data, calculates VAT and withholding tax, categorizes expenses, flags non-deductible items, and generates Revenue Department-ready reports and exports — all in Thai, with a simple interface designed for non-accountants.

Built as a fork of [TaxHacker](https://github.com/vas3k/TaxHacker), extending its AI receipt scanning foundation with a complete Thai tax compliance layer covering VAT, WHT, CIT, tax invoices, filing deadlines, and multi-format export.

## Core Value

A Thai SME owner can snap a receipt, have AI handle the rest, and generate monthly tax filings in 5 minutes — zero accountant needed, zero tax penalties.

## Requirements

### Validated

- ✓ AI receipt/invoice scanning with data extraction — existing (TaxHacker)
- ✓ Multi-currency support with historical exchange rates — existing (TaxHacker)
- ✓ Custom fields with AI extraction prompts — existing (TaxHacker)
- ✓ Custom categories and projects — existing (TaxHacker)
- ✓ File upload, storage, and preview (PDF + images) — existing (TaxHacker)
- ✓ User authentication and session management — existing (TaxHacker)
- ✓ CSV import/export — existing (TaxHacker)
- ✓ Dashboard with filtering and search — existing (TaxHacker)
- ✓ Docker self-hosted deployment — existing (TaxHacker)
- ✓ Multi-LLM provider support (OpenAI, Gemini, Mistral) — existing (TaxHacker)
- ✓ Thai language UI with Revenue Department terminology — v1.0
- ✓ Buddhist Era date display — v1.0
- ✓ Thai number/currency formatting — v1.0
- ✓ THSarabunNew PDF font support — v1.0
- ✓ AI Thai receipt scanning with Tax ID, branch, VAT extraction — v1.0
- ✓ Section 86/4 tax invoice validation (11 fields) — v1.0
- ✓ AI auto-categorization into Thai categories — v1.0
- ✓ AI WHT rate suggestion per service type — v1.0
- ✓ AI Section 65 tri non-deductible expense flagging — v1.0
- ✓ VAT input/output tracking with /107 formula — v1.0
- ✓ 1.8M VAT registration threshold detection — v1.0
- ✓ PP30 monthly VAT return generation — v1.0
- ✓ Purchase/Sales tax reports — v1.0
- ✓ 6-month input tax expiry warnings — v1.0
- ✓ WHT calculator with 5-tier rate table — v1.0
- ✓ 50 Tawi WHT certificate PDF — v1.0
- ✓ PND3/PND53 monthly WHT reports — v1.0
- ✓ CIT calculator with SME tiered rates — v1.0
- ✓ PND50/PND51 CIT estimation reports — v1.0
- ✓ Entertainment 0.3% and charitable 2% cap tracking — v1.0
- ✓ Tax invoice creation with sequential numbering — v1.0
- ✓ Credit/debit note creation — v1.0
- ✓ Contact management with Tax ID and branch — v1.0
- ✓ Filing deadline dashboard with Thai holiday awareness — v1.0
- ✓ Filing status tracker (pending/filed/overdue) — v1.0
- ✓ Monthly tax summary dashboard (VAT/WHT/CIT/flags) — v1.0
- ✓ Revenue Department pipe-delimited TXT export — v1.0
- ✓ FlowAccount-compatible CSV export — v1.0
- ✓ Thai accountant Excel workbook export — v1.0
- ✓ 7-step business profile setup wizard — v1.0
- ✓ BanChee branding (logo, self-hosted page) — v1.0
- ✓ Quotation system with line items, sequential numbering, PDF — v1.1
- ✓ Document workflow chain: quotation → invoice → receipt → delivery note — v1.1
- ✓ One-click document conversion with immutable source — v1.1
- ✓ Invoice with due date, overdue detection, standalone + from quotation — v1.1
- ✓ Receipt with partial payments (4 methods), auto-paid detection — v1.1
- ✓ Delivery note (items only, no financials) — v1.1
- ✓ Unified document list with chain badges and filters — v1.1
- ✓ Bank reconciliation: CSV/Excel import with column mapping — v1.1
- ✓ Bank presets (KBank, SCB, BBL) with B.E. date auto-detection — v1.1
- ✓ Multi-factor matching (amount + date + description scoring) — v1.1
- ✓ Match review UI with confirm/reject/create/skip — v1.1
- ✓ README rebranded to BanChee (Thai + English) — v1.1
- ✓ Docker production build verified — v1.1

### Active

- [ ] Quotation (ใบเสนอราคา) creation and management
- [ ] Quotation-to-tax-invoice conversion workflow
- [ ] e-Tax Invoice PDF/A-3 with digital signature
- [ ] Revenue Department e-Tax Invoice by Email integration
- [ ] Bank statement import and auto-reconciliation
- [ ] PND1 employee withholding tax management
- [ ] Multi-user access with owner/bookkeeper roles
- [ ] Cloud SaaS deployment option (multi-tenant)
- [ ] LINE/SMS notification for filing deadlines
- [ ] README.md rebrand (TaxHacker to BanChee)
- [ ] Docker production build verification

### Out of Scope

- Full double-entry general ledger — adds complexity non-accountant users don't need
- Direct Revenue Dept e-Filing API submission — no public API exists, manual upload sufficient
- Native mobile app — web responsive design sufficient
- Multi-company management — one instance per company for v1
- Inventory/stock management — different domain, not tax-related
- PDPA consent management UI — self-hosted model minimizes PDPA risk
- Social Security Fund tracking — separate system, not directly tax-related
- Payroll management — different domain, too complex for current scope
- Integration with DRX/DoctorDog or other vertical PMS — generic SME tool first

## Context

**Shipped v1.1** with 43,300+ LOC TypeScript across 300 commits.
GitHub: https://github.com/mingrath/banchee

**Tech stack:** Next.js 15 + Prisma + PostgreSQL 17 + shadcn/ui + LangChain (OpenAI/Gemini/Mistral)
**Deployment:** Docker self-hosted (docker-compose with postgres:17-alpine)
**Dev server:** http://localhost:7331

**Market Gap:**
- No open-source AI-powered Thai tax tool exists
- FlowAccount and PEAK are closed-source SaaS with monthly fees
- 3.1M+ Thai SMEs need affordable alternatives
- Self-hosted option appeals to privacy-conscious businesses

**Target Users:**
- Thai SME owners (non-accountants) with <30M annual revenue
- Both micro (<1.8M, below VAT threshold) and small (VAT registered)
- Users who currently hire accountants (5-15K/month) or struggle with manual tracking

## Constraints

- **Tech Stack**: Must stay on Next.js + Prisma + PostgreSQL (TaxHacker foundation)
- **Language**: Thai UI primary — all tax terms use official Revenue Department terminology
- **LLM Provider**: Must remain provider-agnostic (OpenAI, Gemini, Mistral)
- **Deployment**: Docker self-hosted first — must work on a single VPS
- **License**: MIT (inherited from TaxHacker) — must remain open source
- **Tax Compliance**: All calculations follow current Thai Revenue Code — accuracy is critical
- **Data Privacy**: Financial data never leaves the self-hosted instance

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fork TaxHacker as foundation | 60% of work done (AI scanning, file management, auth, UI), MIT license | ✓ Good — saved massive effort |
| Thai UI first, not bilingual | Target user is Thai SME owner, Thai tax terms don't translate well | ✓ Good — simpler, focused |
| Self-hosted Docker first | Data privacy for financial data, no infrastructure cost for users | ✓ Good — zero monthly cost |
| Satang integer arithmetic | Prevents floating-point rounding errors in tax calculations | ✓ Good — zero precision issues |
| VAT /107 extraction formula | `total * 7 / 107` is correct for VAT-inclusive prices | ✓ Good — mathematically correct |
| WHT on pre-VAT amount | Thai Revenue Code requirement | ✓ Good — legally compliant |
| THSarabunNew for PDFs | Required for Thai government document compatibility | ✓ Good — renders perfectly |
| ExcelJS for accountant export | Supports multi-worksheet, formatting, Thai headers | ✓ Good — single new dependency |
| Cookie-based setup gate | Edge runtime cannot run Prisma — cookie middleware works | ✓ Good — clean workaround |
| Business profile in Settings model | Reuses existing key-value storage — no schema change needed | ✓ Good — zero migration risk |
| Pipe-delimited TXT for RD export | Revenue Dept uses pipe-delimited format for most e-filing forms | ⚠ Revisit — needs validation against live RD portal |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-03-26 after v1.1 milestone*
