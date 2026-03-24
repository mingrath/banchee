# Phase 4: Export + Interoperability - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Export tax data in three formats: Revenue Department-compatible format for PP30/PND3/PND53 (pipe-delimited TXT per research), FlowAccount-compatible CSV for import, and standard Thai accountant Excel with formatted worksheets. All tax calculations already exist from Phases 1-3. This phase serializes existing data into output files.

</domain>

<decisions>
## Implementation Decisions

### Revenue Department Export (RPT-04)
- **D-01:** Export PP30, PND3, PND53 data in pipe-delimited TXT format compatible with RD Prep / rd.go.th e-filing upload. Per stack research, RD uses pipe-delimited TXT (not XML) for most forms.
- **D-02:** One-click export from existing report pages — add "ส่งออกสำหรับ e-Filing" button alongside existing PDF download buttons in VAT and WHT report apps.
- **D-03:** Include a brief instruction text in Thai explaining how to upload the file to rd.go.th.

### FlowAccount Export (RPT-05)
- **D-04:** CSV export matching FlowAccount's import template. Columns: date, document number, description, amount, VAT, category. Since no public spec exists, provide a well-structured CSV that any accounting tool can import.
- **D-05:** Export accessible from a dedicated "ส่งออกข้อมูล" (Export Data) page or from the existing CSV export route with format selector.

### Thai Accountant Excel (RPT-03)
- **D-06:** Use ExcelJS library for .xlsx generation. Multiple worksheets: รายงานภาษีซื้อ (Purchase Tax Report), รายงานภาษีขาย (Sales Tax Report), สรุป ภ.พ.30 (PP30 Summary), สรุปภาษีหัก ณ ที่จ่าย (WHT Summary), รายได้-รายจ่าย (Income/Expense).
- **D-07:** Formatted with Thai headers, proper column widths, number formatting (฿), and a cover sheet with business profile info. Professional enough to hand directly to an accountant.

### Claude's Discretion
- Exact pipe-delimited TXT column layout (best-effort from research, may need real-world testing)
- FlowAccount CSV column naming
- Excel cell formatting, colors, borders
- Export page UI layout
- File naming convention for downloads

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Thai Tax Export Formats
- `.planning/research/THAI_TAX_REFERENCE.md` — Section 4 (purchase/sales tax report columns), Section 5 (PP30 fields), Section 7 (PND3/PND53 structure)
- `.planning/research/STACK.md` — ExcelJS recommendation, pipe-delimited TXT finding for RD e-filing

### Existing Export Infrastructure
- `app/(app)/export/transactions/route.ts` — Existing CSV export (extend or clone)
- `app/(app)/apps/vat-report/actions.ts` — VAT report data generation (reuse for export)
- `app/(app)/apps/wht-report/actions.ts` — WHT report data generation (reuse for export)

### Prior Phase Patterns
- `exports/pdf/` — PDF export infrastructure (reference for export service pattern)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `@fast-csv/format` — Already installed, used for existing CSV export
- `models/stats.ts` — getVATSummary, getWHTSummary, getCITEstimate (all data sources ready)
- `app/(app)/apps/vat-report/actions.ts` — Transaction query for VAT data
- `app/(app)/apps/wht-report/actions.ts` — Transaction query for WHT data
- `models/business-profile.ts` — Business profile for cover sheets

### New Dependency Needed
- `exceljs` — For .xlsx generation with formatted worksheets (per stack research)

### Integration Points
- Add export buttons to existing report pages (vat-report, wht-report)
- New export page at `app/(app)/export/` or extend existing export route
- Download via server action → generate file → return as response

</code_context>

<specifics>
## Specific Ideas

- Export should feel like "one more button" on existing report pages — not a separate workflow
- Thai accountant Excel is the most important export — it's how most SME owners hand off to their accountant
- RD format export is best-effort — exact format may need testing with real rd.go.th upload

</specifics>

<deferred>
## Deferred Ideas

None — this is the final phase. All future improvements are v2.

</deferred>

---

*Phase: 04-export-interoperability*
*Context gathered: 2026-03-24*
