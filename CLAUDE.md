<!-- GSD:project-start source:PROJECT.md -->
## Project

**BanChee (บัญชี)**

BanChee is an AI-powered, self-hosted accounting app built for Thai SME owners who want to handle their own tax compliance without hiring an accountant. Upload a receipt or invoice photo, and BanChee extracts all data, calculates VAT and withholding tax, categorizes expenses, and generates Revenue Department-ready reports — all in Thai, with a simple interface designed for non-accountants.

Built as a fork of [TaxHacker](https://github.com/vas3k/TaxHacker), extending its AI receipt scanning foundation with a complete Thai tax compliance layer.

**Core Value:** A Thai SME owner can snap a receipt, have AI handle the rest, and generate monthly tax filings in 5 minutes — zero accountant needed, zero tax penalties.

### Constraints

- **Tech Stack**: Must stay on Next.js + Prisma + PostgreSQL (TaxHacker foundation)
- **Language**: Thai UI primary, English secondary — all tax terms must use official Thai Revenue Department terminology
- **LLM Provider**: Must remain provider-agnostic (OpenAI, Gemini, Mistral) — no vendor lock-in
- **Deployment**: Docker self-hosted first — must work on a single VPS
- **License**: MIT (inherited from TaxHacker) — must remain open source
- **Tax Compliance**: All tax calculations must follow current Thai Revenue Code — accuracy is critical, incorrect calculations could result in fines
- **Data Privacy**: Financial data never leaves the self-hosted instance — no external analytics or tracking
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript ^5 - All application code (frontend, backend, AI, models)
- SQL (PostgreSQL) - Database migrations in `prisma/migrations/`
- Shell (Bash) - `docker-entrypoint.sh` for container startup
## Runtime
- Node.js 23 (Docker base image: `node:23-slim`)
- No `.nvmrc` or `.node-version` file pinning local Node version
- npm (lockfileVersion 3)
- Lockfile: `package-lock.json` present
- ESM (`"type": "module"` in `package.json`)
## Frameworks
- Next.js ^15.2.4 - Full-stack React framework (App Router)
- React ^19.0.0 - UI library
- React DOM ^19.0.0 - DOM rendering
- Turbopack enabled (`next dev -p 7331 --turbopack`)
- Default dev port: 7331
- No test framework detected (no jest, vitest, or testing-library in dependencies)
- No test scripts in `package.json`
- TypeScript ^5 - Type checking
- ESLint ^9 with `eslint-config-next` 15.1.7 - Linting (currently disabled during builds via `ignoreDuringBuilds: true`)
- PostCSS ^8 - CSS processing
- Tailwind CSS ^3.4.1 - Utility-first CSS
## Database
- PostgreSQL 17 (Docker image: `postgres:17-alpine`)
- Connection: `DATABASE_URL` environment variable
- Prisma ^6.6.0 (`@prisma/client` ^6.6.0)
- Schema: `prisma/schema.prisma`
- Generated client output: `prisma/client/` (custom output directory)
- Migrations: `prisma/migrations/` (10 migrations, first: 2025-04-03, latest: 2025-05-23)
- DB client singleton: `lib/db.ts` (global instance pattern for dev hot-reload)
- UUID primary keys on all models (`@db.Uuid`)
- Column name mapping: camelCase in code, snake_case in DB (`@map()`)
- `User` - Core user with membership, storage, AI balance, business info
- `Session` - Auth sessions (Better Auth managed)
- `Account` - OAuth/credential accounts (Better Auth managed)
- `Verification` - Email/OTP verification tokens (Better Auth managed)
- `Setting` - User key-value settings (unique per user+code)
- `Category` - Transaction categories with LLM prompts
- `Project` - Transaction projects with LLM prompts
- `Field` - Custom user-defined fields with LLM prompts, types, visibility flags
- `File` - Uploaded file metadata with cached parse results
- `Transaction` - Financial transactions with items (JSON), files (JSON), categories, projects
- `Currency` - User currencies
- `AppData` - Per-user app-specific JSON data (unique per user+app)
- `Progress` - Background task progress tracking
- `docker-entrypoint.sh` runs `prisma generate` + `prisma migrate deploy` before app start
- `npm start` script: `prisma migrate deploy && next start`
## Authentication
- Better Auth ^1.2.10 (`better-auth` package)
- Adapter: `prismaAdapter` with PostgreSQL
- Config: `lib/auth.ts`
- JWT sessions (180-day expiry, 24h update age, 365-day cookie cache)
- Cookie prefix: `taxhacker`
- ID generation: UUID
- Email OTP (6-digit code, 10-minute expiry)
- OTP emails sent via Resend
- Signup can be disabled via `DISABLE_SIGNUP` env var
- Automatically disabled in self-hosted mode
- `SELF_HOSTED_MODE=true` bypasses auth entirely
- Uses a hardcoded self-hosted user (from `models/users.ts`)
- Redirects to `/self-hosted/redirect` if no user
- `getSession()` - Get current session (self-hosted aware)
- `getCurrentUser()` - Get current User model or redirect to login
- `isSubscriptionExpired(user)` - Check membership expiry
- `isAiBalanceExhausted(user)` - Check AI credit balance
## AI / LLM Integration
- LangChain ^0.3.30 - LLM orchestration
- NOT using Vercel AI SDK
- `@langchain/openai` ^0.6.1 - OpenAI (default model: `gpt-4o-mini`)
- `@langchain/google-genai` ^0.2.14 - Google Gemini (default model: `gemini-2.5-flash`)
- `@langchain/mistralai` ^0.2.1 - Mistral (default model: `mistral-medium-latest`)
- Provider abstraction: `ai/providers/llmProvider.ts`
- Supports 3 providers: `openai`, `google`, `mistral` (type: `LLMProvider`)
- Fallback chain: tries providers in priority order; if one fails, falls next
- Provider priority configured per user via settings (`llm_providers` setting)
- All providers use `temperature: 0` for deterministic output
- Structured output via LangChain `.withStructuredOutput()` (JSON schema)
- Vision support: images sent as base64 `image_url` in HumanMessage content
- `ai/analyze.ts` - Server action for transaction analysis
- `ai/providers/llmProvider.ts` - Multi-provider LLM client with fallback
- `ai/prompt.ts` - Dynamic prompt builder (fields, categories, projects templating)
- `ai/schema.ts` - Converts user-defined `Field` models to JSON Schema for structured output
- `ai/attachments.ts` - Loads file attachments as base64 for vision analysis
- `lib/llm-providers.ts` - Provider metadata (labels, defaults, API doc links, logos)
- `models/settings.ts` - Extracts LLM config from user settings
## UI Components
- shadcn/ui (New York style variant)
- Config: `components.json`
- RSC support: enabled (`rsc: true`)
- Base color: zinc
- CSS variables: enabled
- Icon library: Lucide React ^0.475.0
- alert, avatar, badge, breadcrumb, button, calendar, card, checkbox
- collapsible, colored-text, dialog, dropdown-menu, input, label
- pagination, popover, resizable, select, separator, sheet, sidebar
- skeleton, sonner, table, textarea, tooltip
- `@radix-ui/react-avatar` ^1.1.3
- `@radix-ui/react-checkbox` ^1.1.4
- `@radix-ui/react-collapsible` ^1.1.3
- `@radix-ui/react-dialog` ^1.1.6
- `@radix-ui/react-dropdown-menu` ^2.1.6
- `@radix-ui/react-label` ^2.1.2
- `@radix-ui/react-popover` ^1.1.6
- `@radix-ui/react-select` ^2.1.6
- `@radix-ui/react-separator` ^1.1.2
- `@radix-ui/react-slot` ^1.2.0
- `@radix-ui/react-tooltip` ^1.1.8
- `@radix-ui/colors` ^3.0.0
- `class-variance-authority` ^0.7.1 - Component variant management
- `clsx` ^2.1.1 - Conditional class names
- `tailwind-merge` ^3.0.1 - Tailwind class deduplication
- `@/components` -> `components/`
- `@/components/ui` -> `components/ui/`
- `@/lib` -> `lib/`
- `@/hooks` -> `hooks/`
## CSS
- Tailwind CSS ^3.4.1
- Config: `tailwind.config.ts`
- Dark mode: class-based (`darkMode: ["class"]`)
- Theme switching: `next-themes` ^0.4.4
- `tailwindcss-animate` ^1.0.7 - Animation utilities
- HSL CSS variable based color system (shadcn/ui standard)
- Custom semantic colors: background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring
- Chart colors: `chart-1` through `chart-5`
- Sidebar-specific colors: background, foreground, primary, accent, border, ring
- Border radius: CSS variable based (`--radius`)
- `./pages/**/*.{js,ts,jsx,tsx,mdx}`
- `./components/**/*.{js,ts,jsx,tsx,mdx}`
- `./app/**/*.{js,ts,jsx,tsx,mdx}`
## Payment
- Stripe ^18.0.0 (`stripe` package)
- Config: `lib/stripe.ts`
- API version: `2025-03-31.basil`
- Conditionally initialized (null if no `STRIPE_SECRET_KEY`)
- `unlimited` - Internal/special plan (not purchasable): unlimited storage + AI
- `early` - Early Adopter plan: 512 MB storage, 1000 AI analyses, EUR 35/year
- Price ID: `price_1RHTj1As8DS4NhOzhejpTN3I`
- Webhook endpoint: `app/api/stripe/` route
- Customer ID stored on User model (`stripeCustomerId`)
- Membership plan + expiry tracked on User model
- Payment success/cancel redirect URLs configured in `lib/config.ts`
- `STRIPE_SECRET_KEY` - API key
- `STRIPE_WEBHOOK_SECRET` - Webhook signature verification
## Email
- Resend ^4.2.0 (`resend` package)
- Config: `lib/email.ts`
- `components/emails/otp-email.tsx` - OTP verification code
- `components/emails/newsletter-welcome-email.tsx` - Newsletter welcome
- `components/emails/email-layout.tsx` - Shared layout
- `sendOTPCodeEmail({ email, otp })` - Send 6-digit OTP
- `sendNewsletterWelcomeEmail(email)` - Newsletter subscription welcome
- `RESEND_API_KEY` - API key
- `RESEND_FROM_EMAIL` - Sender address
- `RESEND_AUDIENCE_ID` - Newsletter audience
## File Handling
- Local filesystem (no cloud storage)
- Upload path: `UPLOAD_PATH` env var (default: `./uploads`)
- Per-user directories: `{UPLOAD_PATH}/{user.email}/`
- Sub-directories: `unsorted/`, `previews/`, `static/`, `csv/`
- Transaction files organized by date: `{YYYY}/{MM}/{uuid}{ext}`
- `sharp` ^0.33.5 - Image resize, format conversion (webp, png, jpeg, avif)
- `lib/uploads.ts` - Static image upload with resize
- `lib/previews/images.ts` - Image preview generation (resize to webp)
- Max dimensions: 1800x1800 (images), 1500x1500 (PDF pages)
- Quality: 90 (configurable)
- `pdf2pic` ^3.1.4 - PDF page to image conversion
- `lib/previews/pdf.ts` - Convert PDF pages to webp previews
- System dependencies: Ghostscript + GraphicsMagick (installed in Docker)
- Max pages: 10, DPI: 150
- Caches converted pages in previews directory
- PDF -> webp page images (via pdf2pic/Ghostscript)
- Images -> resized webp (via sharp)
- Other files -> passed through as-is
- `@react-pdf/renderer` ^4.3.0 - Generate PDF documents from React components
- `@fast-csv/format` ^5.0.2 - CSV writing
- `@fast-csv/parse` ^5.0.2 - CSV parsing
- `jszip` ^3.10.1 - ZIP file creation
- `storageUsed` + `storageLimit` on User model
- `isEnoughStorageToUploadFile()` checks capacity before upload
- Unlimited storage in self-hosted mode or when `storageLimit < 0`
## Observability
- Sentry ^9.11.0 (`@sentry/nextjs`)
- Server config: `sentry.server.config.ts`
- Edge config: `sentry.edge.config.ts`
- Conditionally enabled (requires `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`)
- Trace sample rate: 100% (1.0)
- Monitoring tunnel route: `/monitoring`
- `console.log` / `console.error` / `console.info` (no structured logging library)
- Prisma client logging: query, info, warn, error (in `lib/db.ts`)
## Build / Deploy
- Multi-stage Dockerfile (`node:23-slim` base)
- Build stage: `npm ci` + `next build`
- Production stage: slim image with system deps (Ghostscript, GraphicsMagick, libwebp, postgresql-client, openssl)
- Entrypoint: `docker-entrypoint.sh` (waits for PostgreSQL, runs migrations, starts app)
- Exposed port: 7331
- `docker-compose.yml` - Default self-hosted setup (app + postgres:17-alpine)
- `docker-compose.build.yml` - Local build variant (builds from Dockerfile)
- `docker-compose.production.yml` - Production config (external DB via `.env`, no postgres container, network bridge)
- `ghcr.io/vas3k/taxhacker:latest`
- `./data:/app/data` - Upload storage
- `./pgdata:/var/lib/postgresql/data` - PostgreSQL data (self-hosted)
- ESLint disabled during builds (`ignoreDuringBuilds: true`)
- Image optimization disabled (`unoptimized: true`)
- Server actions body size limit: 256 MB
- Sentry integration conditional on env vars
## Key Dependencies Summary
- `next` ^15.2.4 - Application framework
- `react` / `react-dom` ^19.0.0 - UI rendering
- `@prisma/client` ^6.6.0 - Database ORM
- `better-auth` ^1.2.10 - Authentication
- `langchain` ^0.3.30 - AI orchestration
- `stripe` ^18.0.0 - Payment processing
- `resend` ^4.2.0 - Email delivery
- `sharp` ^0.33.5 - Image processing
- `pdf2pic` ^3.1.4 - PDF to image conversion
- `@react-pdf/renderer` ^4.3.0 - PDF generation
- `@fast-csv/format` / `@fast-csv/parse` ^5.0.2 - CSV import/export
- `jszip` ^3.10.1 - ZIP archive creation
- `zod` ^3.24.2 - Schema validation (config, forms)
- `@radix-ui/*` - Headless UI primitives (12 packages)
- `lucide-react` ^0.475.0 - Icons
- `sonner` ^2.0.1 - Toast notifications
- `react-resizable-panels` ^2.1.7 - Resizable panel layouts
- `@dnd-kit/core` ^6.3.1 / `@dnd-kit/sortable` ^10.0.0 - Drag and drop
- `react-day-picker` ^8.10.1 - Date picker
- `next-themes` ^0.4.4 - Dark/light mode
- `date-fns` ^3.6.0 - Date formatting
- `slugify` ^1.6.6 - String slug generation
- `mime-types` ^3.0.1 - MIME type detection
- `class-variance-authority` ^0.7.1 - Component variants
- `clsx` ^2.1.1 - Conditional classnames
- `tailwind-merge` ^3.0.1 - Tailwind class merging
## Configuration
- Validated via Zod schema in `lib/config.ts`
- `.env.example` provided as template
- Self-hosted mode: `SELF_HOSTED_MODE=true` (default)
- All config accessed via `config` object from `lib/config.ts`
- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Auth secret (min 16 chars)
- `OPENAI_API_KEY` / `OPENAI_MODEL_NAME` - OpenAI provider
- `GOOGLE_API_KEY` / `GOOGLE_MODEL_NAME` - Google Gemini provider
- `MISTRAL_API_KEY` / `MISTRAL_MODEL_NAME` - Mistral provider
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` - Payment
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL` / `RESEND_AUDIENCE_ID` - Email
- `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_ORG` / `SENTRY_PROJECT` - Error tracking
- `UPLOAD_PATH` - File upload directory (default: `./uploads`)
- `PORT` - Server port (default: 7331)
- `BASE_URL` - Public URL (default: `http://localhost:7331`)
- `DISABLE_SIGNUP` - Disable new user registration
- `SELF_HOSTED_MODE` - Enable self-hosted single-user mode
## Platform Requirements
- Node.js 23+ (to match Docker image)
- PostgreSQL 17+
- Ghostscript + GraphicsMagick (for PDF preview generation)
- Docker with Docker Compose
- Persistent volume for uploads (`./data`)
- Persistent volume for PostgreSQL data (`./pgdata`)
- Port 7331 exposed
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Components: `kebab-case.tsx` (e.g., `components/transactions/edit.tsx`, `components/dashboard/stats-widget.tsx`)
- Lib/utilities: `kebab-case.ts` (e.g., `lib/auth-client.ts`, `lib/llm-providers.ts`)
- Models: `kebab-case.ts` singular or compound (e.g., `models/transactions.ts`, `models/export_and_import.ts`)
- Forms (Zod schemas): `kebab-case.ts` plural (e.g., `forms/transactions.ts`, `forms/settings.ts`)
- Server actions: `actions.ts` co-located with the route that uses them
- API routes: `route.ts` in the standard Next.js App Router convention
- Use `camelCase` for all functions: `getCurrentUser()`, `getTransactionById()`, `safePathJoin()`
- Server actions: `verbNounAction` pattern (e.g., `createTransactionAction`, `deleteUnsortedFileAction`, `uploadFilesAction`)
- Model functions: `verbNoun` without "Action" suffix (e.g., `createTransaction`, `updateUser`, `getFields`)
- React components: `PascalCase` default exports (e.g., `TransactionEditForm`, `DashboardDropZoneWidget`)
- `camelCase` throughout: `formData`, `userUploadsDirectory`, `totalFileSize`
- Constants: `UPPER_SNAKE_CASE` (e.g., `FILE_UPLOAD_PATH`, `SELF_HOSTED_USER`, `MAX_BACKUP_SIZE`, `TRANSACTIONS_CHUNK_SIZE`)
- Boolean variables: `is` prefix (e.g., `isSubscriptionExpired`, `isEnoughStorageToUploadFile`, `isFileExists`)
- `PascalCase` for all types and interfaces: `ActionState<T>`, `TransactionData`, `UserProfile`, `LLMProvider`
- Prisma types imported directly from `@/prisma/client`: `User`, `Transaction`, `Category`, `Field`, `File`
- Zod schemas: `camelCase` with `Schema` suffix (e.g., `transactionFormSchema`, `settingsFormSchema`, `userFormSchema`)
- Prisma schema uses `camelCase` in the model with `@map("snake_case")` for the database column name
- Example: `issuedAt DateTime? @map("issued_at")`
## Code Style
- Prettier with config at `.prettierrc`
- Key settings:
- ESLint 9 flat config at `eslint.config.mjs`
- Extends `next/core-web-vitals` and `next/typescript`
- **CRITICAL:** ESLint is DISABLED during builds via `ignoreDuringBuilds: true` in `next.config.ts`
- No custom rules added beyond Next.js defaults
- No Prettier ESLint integration
- `strict: true` enabled in `tsconfig.json`
- Target: ES2017
- Module resolution: `bundler`
- Path alias: `@/*` maps to project root
- `skipLibCheck: true`
## Import Organization
- `@/*` -- the only alias, maps to project root
- All internal imports use `@/` prefix: `@/lib/auth`, `@/models/transactions`, `@/components/ui/button`
## Error Handling
## Logging
- `console.error("Failed to X:", error)` in catch blocks
- `console.log("X results:", data)` for debug output (multiple instances left in production code)
- `console.info("Use provider:", config.provider)` for informational messages in AI module
- **Sentry** is configured for error tracking (`@sentry/nextjs`) with conditional initialization
## Comments
- Comments are sparse -- code is mostly self-documenting
- JSDoc used only in `lib/cache.ts` (the `PoorManCache` class)
- `// TODO:` and `// FIXME:` used for known issues (3 instances found)
- Inline comments for non-obvious logic (e.g., `// convert to cents`, `// fix for CI, do not remove`)
- Minimal usage. Only `lib/cache.ts` has proper JSDoc comments on methods.
- All other modules lack documentation.
## Function Design
- Server actions receive `FormData` or typed objects
- Model functions receive `userId: string` as first parameter consistently
- No parameter objects pattern -- positional parameters throughout
- Server actions return `ActionState<T>`
- Model functions return Prisma types directly or `null`
- No exception: `deleteTransaction` returns `Transaction | undefined` (inconsistent with other deletes)
## Module Design
- Named exports used everywhere except React page components
- Page components use `export default async function`
- Client components use `export default function`
- No default exports in lib/models/forms
- Not used. Every import references the specific file path.
## Form Validation
- Schemas defined in `forms/` directory
- `.safeParse()` used in server actions, never `.parse()`
- Form data converted via `Object.fromEntries(formData.entries())`
- Transform functions used for cents conversion and JSON parsing
## State Management
- React `useState` for local component state
- React `useActionState` for server action form submissions
- No global state management library (no Redux, Zustand, Jotai)
- Custom `useProgress` hook for SSE-based progress tracking
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Server Components as the default rendering strategy; pages fetch data directly via model functions
- Server Actions (`"use server"`) handle all mutations (form submissions, file uploads, CRUD)
- Prisma ORM as the sole data access layer, wrapped in a `models/` directory
- Dual deployment mode: cloud (multi-tenant with better-auth + Stripe billing) and self-hosted (single-user, no auth)
- Local filesystem storage for uploaded files (not cloud object storage)
- AI document analysis pipeline using LangChain with multi-provider fallback (OpenAI, Google, Mistral)
## Layers
- Purpose: Route definitions, page rendering, client interactivity
- Location: `app/` for routes and server actions, `components/` for reusable UI
- Contains: Server Components (pages), Client Components (forms, interactive elements), route handlers
- Depends on: `models/`, `lib/`, `forms/`, `hooks/`
- Used by: End users via browser
- Purpose: Server-side mutation handlers invoked by client forms and components
- Location: `app/(app)/unsorted/actions.ts`, `app/(app)/transactions/actions.ts`, `app/(app)/files/actions.ts`, `app/(app)/settings/actions.ts`, `app/(app)/settings/backups/actions.ts`, `app/(app)/settings/danger/actions.ts`, `app/(app)/apps/invoices/actions.ts`, `app/(auth)/actions.ts`, `app/landing/actions.ts`
- Contains: `"use server"` functions that validate input via Zod schemas, call model functions, handle file I/O, and call `revalidatePath()` to refresh data
- Depends on: `models/`, `forms/`, `lib/auth`, `lib/files`, `ai/`
- Used by: Client components via `useActionState` or direct invocation
- Purpose: Data access layer wrapping Prisma queries
- Location: `models/`
- Contains: CRUD functions, query builders, and business logic per entity
- Depends on: `lib/db` (Prisma client), `lib/utils`
- Used by: Server actions and Server Component pages
- Key files: `models/transactions.ts`, `models/files.ts`, `models/users.ts`, `models/settings.ts`, `models/categories.ts`, `models/projects.ts`, `models/fields.ts`, `models/currencies.ts`, `models/stats.ts`, `models/defaults.ts`, `models/backups.ts`, `models/export_and_import.ts`, `models/progress.ts`, `models/apps.ts`
- Purpose: Document analysis via LLM providers
- Location: `ai/`
- Contains: LLM request orchestration, prompt building, schema generation, file-to-attachment conversion
- Depends on: `models/settings`, `models/files`, `lib/files`, LangChain SDKs
- Used by: `app/(app)/unsorted/actions.ts` (analyzeFileAction)
- Purpose: Zod schemas for input validation
- Location: `forms/`
- Contains: Schema definitions shared between client-side form validation and server-side action validation
- Depends on: `zod`, `lib/utils`
- Used by: Server actions, some client components
- Key files: `forms/transactions.ts`, `forms/settings.ts`, `forms/users.ts`
- Purpose: Infrastructure, configuration, and shared utilities
- Location: `lib/`
- Contains: Auth setup, DB client, file path helpers, config, Stripe client, uploads, cache, email
- Depends on: External SDKs (better-auth, Prisma, Stripe, sharp, Resend)
- Used by: All other layers
- Purpose: Client-side React hooks for shared stateful logic
- Location: `hooks/`
- Contains: Progress tracking (SSE), transaction filter URL sync, download helper, mobile detection, persistent form state
- Depends on: React, Next.js router
- Used by: Client components
## Data Flow
- No client-side global state store (no Redux, Zustand, etc.)
- Server Components re-fetch data on every request (all pages use `export const dynamic = "force-dynamic"`)
- React `cache()` deduplicates identical model queries within a single request
- Client-side state is local: React `useState` in form components
- URL-driven state for transaction filters via `hooks/use-transaction-filters.tsx` (syncs filter state to URL search params)
- `NotificationContext` in `app/(app)/context.tsx` provides a simple toast/banner notification system
- SSE-based progress tracking for long operations (export) via `hooks/use-progress.tsx` + `app/api/progress/[progressId]/route.ts`
## Key Abstractions
- Purpose: Standard return type for all Server Actions
- Defined in: `lib/actions.ts`
- Pattern: `{ success: boolean; error?: string | null; data?: T | null }`
- Used by: Every action file; client components check `success` to show notifications or errors
- Purpose: Represents transaction input data (from forms, AI analysis, CSV import)
- Defined in: `models/transactions.ts`
- Pattern: Flexible record with known fields + `[key: string]: unknown` for extra fields
- The model layer splits this into standard DB columns and the `extra` JSON column via `splitTransactionDataExtraFields()`
- Purpose: User-configurable transaction fields that drive both the AI prompt and the UI
- Defined in: `prisma/schema.prisma` (Field model), `models/fields.ts`, `models/defaults.ts`
- Pattern: Each Field has `code`, `name`, `type`, `llm_prompt`, visibility flags, and `isExtra` flag
- Fields with `isExtra: true` are stored in the Transaction's `extra` JSON column
- Fields with `llm_prompt` set are included in the AI analysis prompt and JSON schema
- Fields with `isVisibleInList: true` appear in the transaction list table
- Default fields are seeded via `models/defaults.ts` -> `createUserDefaults()`
- Purpose: Try multiple AI providers in priority order until one succeeds
- Defined in: `ai/providers/llmProvider.ts`
- Pattern: User configures priority order in settings (`llm_providers` setting). `requestLLM()` iterates through providers, skipping those without API keys, returning first successful response
- Purpose: Organize uploaded files on disk per user
- Defined in: `lib/files.ts`
- Pattern: `uploads/{userEmail}/unsorted/{uuid}.{ext}` for new uploads; `uploads/{userEmail}/{YYYY}/{MM}/{uuid}.{ext}` for reviewed files; `uploads/{userEmail}/previews/{uuid}.{page}.webp` for preview images; `uploads/{userEmail}/static/` for avatar and business logo
- Security: `safePathJoin()` prevents path traversal attacks
## Entry Points
- Location: `app/layout.tsx`
- Triggers: Every page request
- Responsibilities: HTML shell, global CSS, metadata, Open Graph tags
- Location: `app/(app)/layout.tsx`
- Triggers: All authenticated app pages
- Responsibilities: Load current user via `getCurrentUser()`, render sidebar, notifications, subscription check, file drop area
- Location: `app/(auth)/layout.tsx`
- Triggers: Login, self-hosted setup, cloud payment pages
- Responsibilities: Minimal dark-themed layout without sidebar
- Location: `middleware.ts`
- Triggers: Requests to `/transactions/*`, `/settings/*`, `/export/*`, `/import/*`, `/unsorted/*`, `/files/*`, `/dashboard/*`
- Responsibilities: In cloud mode, check for `taxhacker` session cookie and redirect to login if missing. In self-hosted mode, pass through all requests.
- Location: `app/api/auth/[...all]/route.ts`
- Triggers: All `/api/auth/*` requests
- Responsibilities: Delegates to better-auth handler for session management, email OTP flow
- Location: `app/(auth)/self-hosted/redirect/route.ts`
- Triggers: GET to `/self-hosted/redirect`
- Responsibilities: Ensure self-hosted user exists and has defaults, redirect to dashboard
## Auth Flow
## API Routes
- `app/api/stripe/checkout/route.ts` - Create Stripe checkout session
- `app/api/stripe/portal/route.ts` - Create Stripe billing portal session
- `app/api/stripe/webhook/route.ts` - Handle Stripe webhook events (checkout.session.completed, subscription CRUD)
- `app/(app)/files/preview/[fileId]/route.ts` - Serve file preview images (generates previews on-the-fly)
- `app/(app)/files/download/[fileId]/route.ts` - Serve original file for download
- `app/(app)/files/static/[filename]/route.ts` - Serve static user assets (avatars, logos)
## Error Handling
- Server Actions wrap all logic in try/catch, return `{ success: false, error: "message" }` on failure
- Client components check `result.success` and display error via toast (`sonner`) or inline
- API routes return appropriate HTTP status codes (400, 401, 404, 500)
- Sentry integration for error tracking (conditional, only when `NEXT_PUBLIC_SENTRY_DSN` is set)
- `lib/config.ts` validates all environment variables at startup via Zod schema with defaults
## Cross-Cutting Concerns
- React `cache()` wraps model query functions for per-request deduplication
- `PoorManCache` class in `lib/cache.ts` provides in-memory TTL cache (used for currency rates, 24h TTL)
- All pages use `export const dynamic = "force-dynamic"` (no static generation)
- Images: resized via `sharp` to max 1800x1800, quality 90
- PDFs: converted to images via `pdf2pic` (max 10 pages, 150 DPI, max 1500x1500)
- Previews stored in `uploads/{userEmail}/previews/` as WebP
- For AI analysis, max 4 pages are sent as base64-encoded image attachments
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
