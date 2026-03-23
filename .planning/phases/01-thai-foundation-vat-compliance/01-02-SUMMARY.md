---
phase: 01-thai-foundation-vat-compliance
plan: 02
subsystem: ui
tags: [setup-wizard, shadcn, react-pdf, thai-font, THSarabunNew, zod, server-actions]

# Dependency graph
requires:
  - phase: 01-thai-foundation-vat-compliance
    provides: "Business profile model and Zod schema (Plan 01 interface contract)"
provides:
  - "Setup wizard at /setup with 7-step business profile configuration"
  - "Server actions: saveBusinessProfileAction, saveLLMSettingsAction"
  - "Business profile model (models/business-profile.ts) and Zod schema (forms/business-profile.ts)"
  - "THSarabunNew font registration for @react-pdf/renderer"
  - "Shared Thai PDF styles for Revenue Department document formatting"
  - "shadcn progress, switch, tabs components installed"
affects: [01-03, 01-04, 01-05, dashboard, vat-report, pdf-generation]

# Tech tracking
tech-stack:
  added: ["@radix-ui/react-progress", "@radix-ui/react-switch", "@radix-ui/react-tabs", "THSarabunNew TTF (SIPA open-source)"]
  patterns: ["Setup wizard multi-step pattern", "PDF font registration at module load", "Business profile via Settings key-value pairs"]

key-files:
  created:
    - "app/(app)/setup/page.tsx"
    - "app/(app)/setup/actions.ts"
    - "app/(app)/setup/components/setup-wizard.tsx"
    - "app/(app)/setup/components/wizard-step-indicator.tsx"
    - "components/ui/progress.tsx"
    - "components/ui/switch.tsx"
    - "components/ui/tabs.tsx"
    - "models/business-profile.ts"
    - "forms/business-profile.ts"
    - "exports/pdf/fonts.ts"
    - "exports/pdf/thai-pdf-styles.ts"
    - "public/fonts/THSarabunNew.ttf"
    - "public/fonts/THSarabunNew-Bold.ttf"
  modified: []

key-decisions:
  - "Created business-profile model and form schema inline (Rule 3) since Plan 01 runs in parallel and has not created them yet"
  - "Downloaded THSarabunNew from SIPA via nscimysci/THSarabunNew GitHub repo (open-source, free for commercial use)"
  - "Used raw.githubusercontent.com for font download to avoid GitHub HTML page redirect"
  - "Installed shadcn dependencies manually via npm due to shadcn CLI rmdir error on mistralai package"

patterns-established:
  - "Setup wizard multi-step pattern: useState for step/formData, validateCurrentStep per step, WizardStepIndicator component"
  - "PDF font registration: import exports/pdf/fonts.ts to auto-register THSarabunNew at module load"
  - "Thai PDF styles: import thaiPdfStyles from exports/pdf/thai-pdf-styles.ts for all Revenue Department documents"

requirements-completed: [I18N-04, BIZ-01, BIZ-02, BIZ-03]

# Metrics
duration: 7min
completed: 2026-03-23
---

# Phase 1 Plan 2: Setup Wizard and PDF Font Infrastructure Summary

**7-step setup wizard at /setup with Thai business profile fields, THSarabunNew font registration for PDF generation, and shared Thai PDF styles for Revenue Department documents**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-23T11:21:49Z
- **Completed:** 2026-03-23T11:29:14Z
- **Tasks:** 2
- **Files created:** 13

## Accomplishments
- Setup wizard at /setup with all 7 steps: Company Name, Tax ID, Branch, Address, VAT Registration, Accounting Period, LLM API Key
- Server actions for business profile persistence and LLM settings with Zod validation
- THSarabunNew Regular and Bold font files downloaded and registered for @react-pdf/renderer
- Shared Thai PDF styles matching Revenue Department document typography specification
- shadcn progress, switch, and tabs components installed

## Task Commits

Each task was committed atomically:

1. **Task 1: Setup wizard route, server actions, and multi-step wizard component** - `4a2ba44` (feat)
2. **Task 2: THSarabunNew PDF font registration and Thai PDF style foundation** - `e5d4f03` (feat)

## Files Created/Modified
- `app/(app)/setup/page.tsx` - Server Component loading profile and rendering wizard
- `app/(app)/setup/actions.ts` - Server actions: saveBusinessProfileAction, saveLLMSettingsAction
- `app/(app)/setup/components/setup-wizard.tsx` - 7-step wizard with Thai labels, client-side validation, transitions
- `app/(app)/setup/components/wizard-step-indicator.tsx` - Step progress indicator with numbered circles
- `components/ui/progress.tsx` - shadcn Progress component (Radix UI)
- `components/ui/switch.tsx` - shadcn Switch component (Radix UI)
- `components/ui/tabs.tsx` - shadcn Tabs component (Radix UI)
- `models/business-profile.ts` - Business profile CRUD via Settings key-value pairs
- `forms/business-profile.ts` - Zod schema with 13-digit Tax ID validation
- `exports/pdf/fonts.ts` - THSarabunNew font registration for @react-pdf/renderer
- `exports/pdf/thai-pdf-styles.ts` - Shared PDF styles: page, title, heading, body, small, tableHeader, tableCell, amountCell, footer
- `public/fonts/THSarabunNew.ttf` - Regular weight (473KB, static TTF, SIPA open-source)
- `public/fonts/THSarabunNew-Bold.ttf` - Bold weight (360KB, static TTF, SIPA open-source)

## Decisions Made
- Created business-profile model and Zod schema as part of this plan (Rule 3: blocking dependency) since Plan 01 was running in parallel. If Plan 01 creates identical files, the later commit wins -- interfaces match the contract.
- Used nscimysci/THSarabunNew GitHub repo as font source (SIPA open-source license, free for commercial use).
- Installed shadcn component dependencies via npm directly instead of shadcn CLI due to npm rmdir error on mistralai package.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created business-profile model and form schema**
- **Found during:** Task 1 (Setup wizard component needs BusinessProfile type and businessProfileSchema)
- **Issue:** Plan 01 (schema migration) runs in parallel and has not yet created models/business-profile.ts or forms/business-profile.ts
- **Fix:** Created both files matching the interface contract defined in Plan 02's context section
- **Files modified:** models/business-profile.ts, forms/business-profile.ts
- **Verification:** Setup wizard imports compile, types match contract
- **Committed in:** 4a2ba44 (Task 1 commit)

**2. [Rule 3 - Blocking] Manual shadcn component installation**
- **Found during:** Task 1 (shadcn CLI failed with npm rmdir error)
- **Issue:** `npx shadcn@latest add progress switch tabs` failed due to npm ENOTEMPTY error on mistralai examples directory
- **Fix:** Installed Radix UI dependencies via npm directly, created component files manually following shadcn new-york style
- **Files modified:** components/ui/progress.tsx, components/ui/switch.tsx, components/ui/tabs.tsx, package.json
- **Verification:** All three component files exist and follow shadcn patterns
- **Committed in:** 4a2ba44 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking)
**Impact on plan:** Both auto-fixes were necessary to unblock parallel execution. No scope creep.

## Issues Encountered
- GitHub raw file download initially returned HTML page when using github.com/raw URLs. Resolved by switching to raw.githubusercontent.com format.
- First THSarabunNew download source (ArtifexSoftware/fontoforget) contained invalid files. Switched to nscimysci/THSarabunNew which has verified SIPA-licensed static TTF files.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Setup wizard is ready for integration with layout gate (Pattern 5 from RESEARCH.md -- redirect to /setup when profile incomplete)
- PDF font infrastructure is ready for PP30 report templates and tax document generation (Plans 04-05)
- Business profile model supports getBusinessProfile, updateBusinessProfile, isBusinessProfileComplete for use by other plans

## Self-Check: PASSED

All 13 created files verified present. Both commit hashes (4a2ba44, e5d4f03) verified in git history.

---
*Phase: 01-thai-foundation-vat-compliance*
*Completed: 2026-03-23*
