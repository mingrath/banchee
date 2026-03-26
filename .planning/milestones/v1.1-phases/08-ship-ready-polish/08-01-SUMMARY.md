---
phase: 08-ship-ready-polish
plan: 01
subsystem: infra
tags: [docker, readme, branding, prisma, typescript]

# Dependency graph
requires:
  - phase: 07-bank-reconciliation
    provides: BankStatement/BankEntry models and bank-statement-parser service
provides:
  - Rebranded README.md with Thai + English sections, feature overview, installation guide
  - All Docker compose files referencing mingrath/banchee
  - Verified Docker production build (banchee:test image)
  - Type-safe Prisma Json null handling pattern
affects: [08-ship-ready-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prisma.DbNull for nullable Json fields instead of raw null"
    - "ExcelJS Buffer cast to ArrayBuffer for Node.js 23 compatibility"
    - "vitest.config.ts excluded from production tsconfig to avoid devDependency type errors"

key-files:
  created: []
  modified:
    - README.md
    - .env.example
    - docker-compose.yml
    - docker-compose.build.yml
    - docker-compose.production.yml
    - models/bank-statements.ts
    - services/bank-statement-parser.ts
    - tsconfig.json

key-decisions:
  - "Prisma.DbNull used instead of raw null for Json? fields to satisfy strict Prisma typing"
  - "ExcelJS load() receives ArrayBuffer cast to handle Node.js 23 Buffer type changes"
  - "vitest.config.ts and __tests__ excluded from tsconfig to prevent devDependency errors in production build"
  - "docker-compose.production.yml also rebranded (discovered during execution, not in original plan)"

patterns-established:
  - "Prisma.DbNull pattern: use Prisma.DbNull instead of null for optional Json fields in update operations"

requirements-completed: [SHIP-01, SHIP-02]

# Metrics
duration: 37min
completed: 2026-03-26
---

# Phase 08 Plan 01: README Rebrand and Docker Build Summary

**README rebranded from TaxHacker to BanChee with Thai+English sections, Docker files updated to mingrath/banchee, production build verified with 3 type fixes**

## Performance

- **Duration:** 37 min
- **Started:** 2026-03-26T10:38:16Z
- **Completed:** 2026-03-26T11:15:57Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- README.md fully rewritten with Thai description, English description, v1.0 + v1.1 feature overviews, 3 installation methods, env vars table, Thai tax terminology reference, and TaxHacker upstream attribution
- All 3 Docker compose files (docker-compose.yml, docker-compose.build.yml, docker-compose.production.yml) rebranded to BanChee with mingrath/banchee image references
- Docker production build verified end-to-end (banchee:test image created successfully)
- 3 type errors fixed that blocked production build: Prisma Json null, ExcelJS Buffer, vitest config

## Task Commits

Each task was committed atomically:

1. **Task 1: Rebrand README.md and .env.example** - `3215ce9` (feat)
2. **Task 2: Update Docker files and verify production build** - `86511f5` (feat)

## Files Created/Modified
- `README.md` - Complete rewrite: Thai + English sections, feature overview, installation guide, tax terminology
- `.env.example` - Updated database name to banchee, RESEND_FROM_EMAIL to BanChee
- `docker-compose.yml` - Image: ghcr.io/mingrath/banchee:latest, DB: banchee
- `docker-compose.build.yml` - Container: banchee-postgres, DB: banchee
- `docker-compose.production.yml` - Image: ghcr.io/mingrath/banchee:latest, container/network rebranded
- `models/bank-statements.ts` - Added Prisma import, used Prisma.DbNull for matchReasons
- `services/bank-statement-parser.ts` - Cast Buffer to ArrayBuffer for ExcelJS load()
- `tsconfig.json` - Excluded vitest.config.ts and __tests__ from build

## Decisions Made
- Used Prisma.DbNull instead of raw null for optional Json fields -- satisfies strict Prisma InputJsonValue typing
- Cast Buffer to ArrayBuffer for ExcelJS xlsx.load() -- Node.js 23 Buffer type differs from what ExcelJS expects
- Excluded vitest.config.ts and __tests__ from tsconfig.json -- vitest is a devDependency not available in production npm ci
- Also rebranded docker-compose.production.yml which was not in the original plan but contained TaxHacker references

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Prisma Json null type error in bank-statements.ts**
- **Found during:** Task 2 (Docker build verification)
- **Issue:** `matchReasons: data.matchReasons ?? null` fails Prisma strict typing -- `null` is not assignable to `InputJsonValue | NullableJsonNullValueInput`
- **Fix:** Changed to `Prisma.DbNull` and added `Prisma` import
- **Files modified:** models/bank-statements.ts
- **Verification:** Docker build passes type check
- **Committed in:** 86511f5 (Task 2 commit)

**2. [Rule 1 - Bug] ExcelJS Buffer type incompatibility**
- **Found during:** Task 2 (Docker build verification)
- **Issue:** `workbook.xlsx.load(buffer)` fails in Node.js 23 -- `Buffer<ArrayBufferLike>` missing properties from ExcelJS expected `Buffer` type
- **Fix:** Cast buffer as `unknown as ArrayBuffer`
- **Files modified:** services/bank-statement-parser.ts
- **Verification:** Docker build passes type check
- **Committed in:** 86511f5 (Task 2 commit)

**3. [Rule 3 - Blocking] vitest.config.ts blocks production build**
- **Found during:** Task 2 (Docker build verification)
- **Issue:** `vitest/config` module not found during Next.js type checking -- vitest is devDependency only
- **Fix:** Added `vitest.config.ts` and `__tests__` to tsconfig.json exclude array
- **Files modified:** tsconfig.json
- **Verification:** Docker build completes successfully
- **Committed in:** 86511f5 (Task 2 commit)

**4. [Rule 1 - Bug] docker-compose.production.yml still referenced TaxHacker**
- **Found during:** Task 2 (Docker file updates)
- **Issue:** docker-compose.production.yml had TaxHacker image, container name, network name, and BASE_URL
- **Fix:** Rebranded all references to BanChee/mingrath
- **Files modified:** docker-compose.production.yml
- **Verification:** grep confirms zero TaxHacker references
- **Committed in:** 86511f5 (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (3 bugs, 1 blocking)
**Impact on plan:** All fixes necessary for production build to succeed. No scope creep.

## Issues Encountered
- Docker build required 3 iterations to fix all type errors (each surfaced sequentially after the previous was fixed)
- Build takes ~10 minutes per iteration due to Next.js compilation of all routes

## Known Stubs
None -- no stubs or placeholder data in modified files.

## User Setup Required
None -- no external service configuration required.

## Next Phase Readiness
- README fully rebranded and ready for public visibility
- Docker production build verified -- image can be pushed to GHCR
- Visual QA (Phase 08 Plan 02) can proceed independently

## Self-Check: PASSED

All 8 modified files exist, both task commits verified (3215ce9, 86511f5), Docker image banchee:test confirmed (3.01GB), SUMMARY.md created.

---
*Phase: 08-ship-ready-polish*
*Completed: 2026-03-26*
