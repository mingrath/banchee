# Technology Stack

**Project:** BanChee - Thai Tax Compliance Extension
**Researched:** 2026-03-23

## Recommended Stack

### Core Framework (Inherited from TaxHacker -- No Changes)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15+ | App framework | Inherited, App Router + Server Actions |
| Prisma | Latest | ORM + migrations | Inherited, schema-driven, type-safe |
| PostgreSQL | 17 | Database | Inherited, robust JSON support for extra fields |
| shadcn/ui | Latest | UI components | Inherited, Tailwind-based |
| Better Auth | Latest | Authentication | Inherited, self-hosted mode bypasses |
| LangChain | Latest | LLM orchestration | Inherited, multi-provider fallback |

### New Dependencies for Thai Tax Features

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| next-intl | ^4.x | i18n (Thai/English) | Best App Router support, localePrefix:"never" avoids route restructuring, Server Component native |
| ExcelJS | ^4.x | Excel report generation | Server-side .xlsx creation with styling, MIT license, streaming support |
| THSarabunNew font | N/A | Thai font for PDFs | Standard Thai government document font, free, required for @react-pdf/renderer Thai rendering |

### Existing Dependencies Leveraged (No New Install Needed)

| Technology | Current Version | New Purpose |
|------------|-----------------|-------------|
| @react-pdf/renderer | 4.3.0 | Thai tax form PDFs (PP.30, WHT certificates) -- already installed for invoice generation |
| Zod | Existing | Validation schemas for tax forms, TIN format validation |
| date-fns | Existing | Filing period computation, deadline calculations |
| sonner (toast) | Existing | Filing deadline warning notifications |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| i18n | next-intl | react-i18next | react-i18next requires client-side provider wrapping, worse Server Component support |
| i18n | next-intl | next.js built-in i18n | Next.js 15 App Router has no built-in i18n support (removed from pages router) |
| Excel | ExcelJS | SheetJS (community) | SheetJS community edition lacks cell styling -- Thai accountant format needs borders, colors, merged cells |
| Excel | ExcelJS | xlsx-populate | Less maintained, smaller community, fewer features |
| PDF | @react-pdf/renderer (keep) | pdfmake | Already in codebase, switching adds migration risk. Font.register() solves Thai rendering. |
| PDF | @react-pdf/renderer (keep) | Puppeteer/Playwright | Heavyweight, requires headless Chrome in Docker, overkill for structured form PDFs |
| Scheduling | Dashboard-load check | node-cron | Adds background process to Docker, complicates deployment for single-user self-hosted app |
| Tax calc | Pure TypeScript functions | External tax API | No Thai tax calculation API exists; self-hosted requirement means no external dependencies |

## Installation

```bash
# New dependencies
npm install next-intl exceljs

# Thai font (manual download to project)
# Download THSarabunNew.ttf and THSarabunNew-Bold.ttf from:
# https://www.f0nt.com/release/th-sarabun-new/ (official Thai government release)
# Place in: public/fonts/ or assets/fonts/
```

## No Additional Infrastructure

BanChee runs as a single Docker container with PostgreSQL. The Thai tax extension does NOT require:
- Redis or message queues
- Background worker processes
- External APIs (all tax calculation is local)
- Additional file storage services (uses existing local filesystem)
- Cloud services of any kind

## Sources

- [next-intl official docs](https://next-intl.dev/docs/getting-started/app-router) -- confirmed App Router + Server Component support
- [ExcelJS GitHub](https://github.com/exceljs/exceljs) -- feature comparison, styling support
- [@react-pdf/renderer font docs](https://react-pdf.org/fonts) -- Font.register API for custom fonts

---

*Stack research: 2026-03-23*
