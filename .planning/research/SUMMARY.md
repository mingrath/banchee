# Research Summary: BanChee Thai SME Tax Features

**Domain:** Thai SME accounting/tax compliance tool features
**Researched:** 2026-03-23
**Overall confidence:** HIGH

## Executive Summary

The Thai SME accounting software market is dominated by FlowAccount (130K+ users, Sequoia-backed) and PEAK (500-3,500 THB/mo, strong bank reconciliation), with AccRevo and SME Move serving niche segments. Leceipt occupies the e-Tax Invoice specialist space. All competitors are cloud SaaS with monthly fees. No open-source, self-hosted, AI-powered Thai tax tool exists -- this is BanChee's clear market gap.

Thai SME owners face three recurring monthly obligations: VAT filing (PP30 by 15th), WHT filing (PND3/PND53 by 7th), and document management (tax invoices, WHT certificates). These are table stakes that must work correctly on day one. The annual obligations (CIT via PND50/PND51) are important but less frequent and can ship in phase 2.

BanChee's primary differentiation is the AI pipeline: auto-extract Thai receipts, auto-validate tax invoice fields, auto-categorize expenses, auto-flag non-deductible items (Section 65 Tri), and auto-suggest WHT rates. No competitor offers this level of automation. FlowAccount's AutoKey does basic OCR scanning but requires manual categorization and offers no tax validation.

The self-hosted Docker model is a secondary differentiator. Thai SME owners handling sensitive financial data will value keeping it on their own server, and the zero monthly cost (vs 300-3,500 THB/mo for competitors) is compelling for cost-conscious micro businesses.

## Key Findings

**Features:** 30+ table stakes features identified across 7 categories (document management, VAT, WHT, CIT, reporting, deadlines, scanning). 12 differentiating features centered on AI intelligence and self-hosted model.
**Critical compliance:** Tax invoice must have 8 required fields per Section 86/4. WHT certificate (50 Tawi) has 11 required fields. PP30 must be filed monthly even when zero.
**Market gap:** No tool combines AI receipt scanning + Thai tax compliance + self-hosted. BanChee fills this.

## Implications for Roadmap

Based on research, the feature implementation should follow tax obligation frequency (monthly first, then annual):

1. **Phase 1: Foundation + VAT** - Thai UI + AI receipt scanning + VAT tracking + PP30 generation
   - Addresses: Most frequent filing obligation (monthly VAT)
   - Avoids: Overbuilding accounting features (anti-feature: full GL)

2. **Phase 2: WHT Compliance** - WHT management + 50 Tawi certificates + PND3/PND53
   - Addresses: Second most frequent filing obligation
   - Depends on: Contact management from Phase 1

3. **Phase 3: CIT + Intelligence** - SME CIT helpers + Section 65 Tri flagging + revenue threshold detection
   - Addresses: Annual obligations + tax optimization intelligence
   - Avoids: Rush-building before annual filing season

4. **Phase 4: Export + Interop** - Revenue Dept XML, FlowAccount export, Thai accountant Excel format
   - Addresses: How users actually file and hand off data
   - Depends on: All tax calculations from Phases 1-3

**Phase ordering rationale:**
- Monthly obligations (VAT, WHT) before annual (CIT) -- users need monthly tools immediately
- AI features layered incrementally (scan first, then validate, then flag, then suggest)
- Export formats last because they depend on correct tax calculation logic being built first

**Research flags for phases:**
- Phase 1: Revenue Dept XML format (ETDA standard 3-2560) needs deeper technical research when implementing export
- Phase 2: WHT rate table by service type needs validation against current Revenue Department rate schedule
- Phase 3: Section 65 Tri rules have edge cases (entertainment expense 0.3% cap calculation) requiring careful implementation

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Competitor features | HIGH | Cross-referenced FlowAccount, PEAK, AccRevo, Leceipt, SME Move product pages |
| Tax invoice requirements | HIGH | Verified against Revenue Code Section 86/4 on rd.go.th |
| Filing deadlines | HIGH | Cross-referenced KPMG tax calendar, PWC guide, multiple law firm guides |
| WHT rates and rules | MEDIUM | Multiple sources agree, but rate tables may have recent changes |
| Section 65 Tri rules | MEDIUM | Based on VBA Partners guide and TMA Group analysis, not verified against latest Revenue Code amendments |
| e-Filing XML format | LOW | ETDA standard referenced but actual XML schema not obtained -- needs phase-specific research |

## Gaps to Address

- Exact XML schema for Revenue Department e-filing uploads (ETDA standard 3-2560) -- needs technical deep-dive when building export
- PEAK's exact feature list at each pricing tier -- their site loaded well but some features may have changed
- Current WHT rate schedule -- verify against rd.go.th before implementing rate selection
- Thai date format handling in AI extraction (Buddhist Era vs Gregorian) -- technical research needed
- FlowAccount export format specification -- no public documentation found, may need reverse-engineering from exported files
