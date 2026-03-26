# Phase 8: Ship-Ready Polish - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Make BanChee presentable to the public: README tells the story, Docker build works end-to-end, and real Thai receipt workflows render correctly. No new features — polish only.

Requirements: SHIP-01, SHIP-02, SHIP-03

</domain>

<decisions>
## Implementation Decisions

### README Rebrand (SHIP-01)
- **D-01:** Rewrite README.md from TaxHacker to BanChee — Thai primary, English secondary
- **D-02:** Include: project description, feature overview (v1.0 + v1.1), installation guide (Docker), configuration (.env), screenshots placeholder, Thai tax terminology reference
- **D-03:** Keep MIT license attribution to TaxHacker as upstream fork
- **D-04:** GitHub repo is now mingrath/banchee (renamed from TaxHacker)

### Docker Build (SHIP-02)
- **D-05:** Verify full cycle: `docker build` → `docker compose up` → migrations run → app serves at port 7331
- **D-06:** Test that new Prisma models (Document, BankStatement, BankEntry) are included in the build
- **D-07:** Verify ExcelJS dependency is included in production image

### Visual QA (SHIP-03)
- **D-08:** Test with dev server — no live LLM needed for QA (AI scanning tested separately)
- **D-09:** Verify all app routes respond: quotation, invoice, receipt, delivery-note, documents, bank-reconciliation
- **D-10:** Verify PDF generation works for quotation and invoice (THSarabunNew font renders)
- **D-11:** Verify Thai text displays correctly throughout UI (no encoding issues)

### Claude's Discretion
- README structure and exact wording
- Which screenshots to reference (can use placeholder text)
- Docker build optimization (if needed)
- Visual QA test case selection

</decisions>

<specifics>
## Specific Ideas

- README should highlight the v1.1 additions: quotation → invoice → receipt workflow, bank reconciliation
- Docker section should include both `docker-compose.yml` (self-hosted) and `docker-compose.build.yml` (local build)
- Include a "Quick Start" section at the top for impatient users

</specifics>

<canonical_refs>
## Canonical References

No external specs — requirements fully captured in decisions above.

### Existing files
- `README.md` — Current TaxHacker README, needs full rewrite
- `Dockerfile` — Multi-stage build (node:23-slim)
- `docker-compose.yml` — Self-hosted setup
- `docker-compose.build.yml` — Local build variant
- `docker-entrypoint.sh` — Container startup script

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- BanChee logo already installed in all icon sizes (from v1.0 Phase 4)
- docker-entrypoint.sh already runs `prisma generate` + `prisma migrate deploy`

### Integration Points
- All 6 app routes need verification: /apps/quotation, /apps/invoice, /apps/receipt, /apps/delivery-note, /apps/documents, /apps/bank-reconciliation
- PDF generation uses client-side @react-pdf/renderer — needs browser testing

</code_context>

<deferred>
## Deferred Ideas

None — this is the final polish phase.

</deferred>

---

*Phase: 08-ship-ready-polish*
*Context gathered: 2026-03-26*
