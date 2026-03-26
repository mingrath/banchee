---
phase: 05-document-model-quotation-system
plan: 01
subsystem: database
tags: [prisma, document-model, state-machine, quotation, tdd, vitest]

requires:
  - phase: 04-branding-polish
    provides: "Existing Prisma schema with User, Setting, Contact models"
provides:
  - "Document Prisma model with all columns (D-15 through D-21)"
  - "Document workflow service (canTransition, assertValidTransition, formatDocumentNumber, getCounterKey)"
  - "DOCUMENT_PREFIXES and QUOTATION_STATUSES constants"
  - "QuotationLineItem and QuotationData types"
  - "Document CRUD model layer (createDocument, getDocumentById, listDocuments, updateDocumentStatus)"
  - "CreateDocumentInput type"
affects: [05-02, 05-03, 05-04, 06-document-chain]

tech-stack:
  added: []
  patterns: ["Document state machine via transition table", "Sequential numbering with year-scoped counters via Setting model", "vi.hoisted() for Prisma mock setup in Vitest"]

key-files:
  created:
    - "prisma/migrations/20260326014142_add_document_model/migration.sql"
    - "services/document-workflow.ts"
    - "services/__tests__/document-workflow.test.ts"
    - "models/documents.ts"
    - "models/__tests__/documents.test.ts"
  modified:
    - "prisma/schema.prisma"

key-decisions:
  - "State machine uses plain transition table (Record<string, Record<string, string[]>>) -- no XState dependency"
  - "Document number format QT-BBBB-NNNN with Buddhist Era year and zero-padded 4-digit sequence"
  - "Counter keys stored in Setting model as seq_{prefix}_{year} for year-scoped numbering"
  - "vi.hoisted() pattern required for mocking Prisma client in Vitest tests"

patterns-established:
  - "Document status transitions: define VALID_TRANSITIONS map, use canTransition/assertValidTransition"
  - "Sequential document numbering: getCounterKey + formatDocumentNumber with prisma.$transaction atomic increment"
  - "Model layer pattern: userId as first param, Prisma queries scoped to user, ActionState-compatible returns"
  - "Test mocking: vi.hoisted() to define mock objects before vi.mock() factory hoisting"

requirements-completed: [DOC-01, DOC-07, QUOT-02]

duration: 5min
completed: 2026-03-26
---

# Phase 05 Plan 01: Document Model and Workflow Service Summary

**Document Prisma model with QUOTATION state machine (draft->sent->accepted->converted), QT-BBBB-NNNN sequential numbering, and CRUD layer -- 37 tests passing via TDD**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-26T01:39:57Z
- **Completed:** 2026-03-26T01:45:01Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Document Prisma model with all required fields (type, number, status, amounts in satang, items JSON, seller/buyer data, document chain self-relation)
- Status transition state machine enforcing QUOTATION flow: draft->sent->accepted->converted with voided as terminal from draft/sent
- Sequential document numbering in QT-BBBB-NNNN format with year-scoped counters using prisma.$transaction for atomicity
- Full CRUD model layer (create, getById, list with filters, updateStatus) with userId scoping
- 37 passing tests across 2 test suites via TDD (26 workflow + 11 CRUD)

## Task Commits

Each task was committed atomically:

1. **Task 1: Document model schema + migration + workflow service with TDD** - `bdc23aa` (feat)
2. **Task 2: Document CRUD model layer with TDD** - `1bfcbc6` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added Document model with all columns and User back-relation
- `prisma/migrations/20260326014142_add_document_model/migration.sql` - Migration for documents table
- `services/document-workflow.ts` - Status transitions, document number formatting, type definitions
- `services/__tests__/document-workflow.test.ts` - 26 tests for workflow functions and constants
- `models/documents.ts` - Document CRUD functions with sequential numbering
- `models/__tests__/documents.test.ts` - 11 tests for CRUD layer with mocked Prisma

## Decisions Made
- Used plain TypeScript transition table (`Record<string, Record<string, string[]>>`) instead of XState library -- 20 lines replaces 15kB dependency, per v1.1 research decision
- Document number format uses Buddhist Era year (QT-BBBB-NNNN) matching existing tax invoice pattern (INV-YYYY-NNNN)
- Counter keys stored in existing Setting model as `seq_{prefix}_{year}` -- reuses infrastructure, no new table needed
- Used `vi.hoisted()` for Prisma mock definition to work with Vitest's factory hoisting behavior

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Vitest mock hoisting with vi.hoisted()**
- **Found during:** Task 2 (Document CRUD tests)
- **Issue:** `vi.mock()` factory is hoisted above `const mockPrisma` declaration, causing `ReferenceError: Cannot access 'mockPrisma' before initialization`
- **Fix:** Used `vi.hoisted()` to define mock objects in a block that is also hoisted, ensuring they are available when the factory runs
- **Files modified:** `models/__tests__/documents.test.ts`
- **Verification:** All 11 tests pass after fix
- **Committed in:** `1bfcbc6` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix was necessary for test infrastructure correctness. No scope creep.

## Issues Encountered
None beyond the mock hoisting fix documented above.

## Known Stubs
None -- all functions are fully implemented with real logic and wired data sources.

## User Setup Required
None -- no external service configuration required.

## Next Phase Readiness
- Document model and CRUD layer ready for quotation server actions (Plan 05-02)
- Status transitions and numbering service ready for UI integration (Plan 05-03)
- Types (QuotationLineItem, QuotationData) ready for form and PDF components

## Self-Check: PASSED

All 5 created files verified on disk. Both task commits (bdc23aa, 1bfcbc6) verified in git log.

---
*Phase: 05-document-model-quotation-system*
*Completed: 2026-03-26*
