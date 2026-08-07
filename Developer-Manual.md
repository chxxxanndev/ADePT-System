# ADePT System — Developer Manual

> **ADePT** stands for **A localized Document Request Tracking and Printing System for the Provincial Assessor's Office**.
>
> This manual is written for developers who will maintain, extend, or deploy the system. All content was verified against the current codebase at the time of writing. Anything that could not be confirmed is explicitly marked **`To be verified`**.

---

## Table of Contents

1. [Overview of the System](#1-overview-of-the-system)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Repository Structure](#4-repository-structure)
5. [Prerequisites](#5-prerequisites)
6. [Installation & Local Setup](#6-installation--local-setup)
7. [Running the Application](#7-running-the-application)
8. [Backend (API) Overview](#8-backend-api-overview)
9. [Frontend Overview](#9-frontend-overview)
10. [Database Schema & Migrations](#10-database-schema--migrations)
11. [Authentication & Authorization](#11-authentication--authorization)
12. [Business Workflows](#12-business-workflows)
13. [PDF Generation & Printing](#13-pdf-generation--printing)
14. [Notifications System](#14-notifications-system)
15. [Audit Logging](#15-audit-logging)
16. [Security Considerations](#16-security-considerations)
17. [Testing](#17-testing)
18. [Deployment](#18-deployment)
19. [Troubleshooting & Known Issues](#19-troubleshooting--known-issues)
20. [Version Control & Contribution Guidelines](#20-version-control--contribution-guidelines)

---

## 1. Overview of the System

ADePT is a document request tracking and printing system built for the Provincial Assessor's Office. It lets staff:

- Create and track document requests (e.g., Certified True Copies of Tax Declarations).
- Validate and pay document requests (Official Receipt validation).
- Generate PDF versions of documents for printing.
- Track print history, reprints, releases, voids, and cancellations.
- Manage staff accounts, roles, and audit logs.
- Receive notifications on document request status changes.

The system has two runtime components plus a managed database:

| Component | Purpose | Location |
|---|---|---|
| `backend/` | Express REST API + Supabase integration | Backend service |
| `frontend/` | React single-page application (Vite) | Web client |
| `database/` | SQL migrations for the Supabase/PostgreSQL schema | Managed PostgreSQL |

Production deployment: the frontend is published to Vercel at **https://adept-portal.vercel.app/** (`To be verified` whether the backend is hosted or runs on-premises).

---

## 2. Technology Stack

### Frontend (`frontend/package.json`)

| Technology | Version | Purpose |
|---|---|---|
| React | ^19.2.7 | UI framework |
| React DOM | ^19.2.7 | DOM bindings |
| TypeScript | ~6.0.2 | Typed JavaScript |
| Vite | ^8.1.1 | Build tool / dev server |
| @vitejs/plugin-react | ^6.0.3 | React plugin for Vite |
| react-router-dom | ^7.18.1 | Routing library (see note in §9) |
| axios | ^1.18.1 | HTTP client for the backend API |
| @supabase/supabase-js | ^2.110.8 | Supabase client (auth / direct DB access) |
| @react-pdf/renderer | ^4.5.1 | Client-side PDF generation |
| lucide-react | ^1.25.0 | Icon set |
| recharts | ^3.9.2 | Charts on the dashboard |
| xlsx | ^0.18.5 | Spreadsheet export |
| buffer | ^6.0.3 | Browser polyfill for Buffer |
| oxlint | ^1.71.0 | Linter (`npm run lint`) |
| @types/node, @types/react, @types/react-dom | latest | Type definitions |

### Backend (`backend/package.json`)

| Technology | Version | Purpose |
|---|---|---|
| Node.js | ES modules (`"type": "module"`) | Runtime |
| Express | ^4.19.2 | HTTP framework |
| @supabase/supabase-js | ^2.43.4 | Supabase client |
| cors | ^2.8.5 | CORS middleware |
| dotenv | ^16.4.5 | `.env` loading |
| multer | ^2.2.0 | File uploads (`To be verified` which endpoints accept uploads) |
| nodemon | ^3.1.0 (dev) | Auto-restart during development |

### Database

- Supabase (managed PostgreSQL) — see §10.
- Extensions: `pgcrypto`, `pg_trgm`.

---

## 3. System Architecture

The system follows a classic three-tier architecture:

```
┌─────────────┐   HTTPS (Axios)   ┌──────────────────┐   Service Role   ┌──────────────┐
│  React SPA   │ ────────────────► │  Express Backend │ ───────────────► │   Supabase    │
│  (Vite)      │ ◄──────────────── │  (port 5000)     │ ◄─────────────── │ (PostgreSQL)  │
└─────────────┘   JSON responses   └──────────────────┘   Supabase JS     └──────────────┘
        │                                                     ▲
        │      VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY      │
        └──────────────────────────────────────────────────────┘
                 (direct Supabase usage from the browser)
```

Key architectural facts verified in the code:

- The frontend calls the backend API directly. **Vite is configured with no dev-server proxy and no fixed port** — the API base URL is resolved at runtime from the `VITE_API_URL` environment variable, defaulting to `http://localhost:5000`.
- The backend exposes REST endpoints and communicates with Supabase using `@supabase/supabase-js` with **two clients**: a regular client (anon key, in `backend/src/config/supabase.js`) and an **admin client** (service-role key, in `backend/src/config/supabaseAdmin.js`) used for higher-privilege operations.
- **Mock mode**: if Supabase credentials are missing/invalid, the backend falls back to serving mock data from `backend/src/database/mockData.js` (`useMock` flag in `config/supabase.js`) — see §6.4.
- The frontend also talks to Supabase directly from the browser for some operations (auth and data reads/writes) using the anon key from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- `frontend/src/App.tsx` performs **state-based view switching rather than URL-based routing** (there is no `<Routes>`/`<Router>` declaration in `App.tsx`). See §9.

> **To be verified**: the exact split of responsibilities between backend-API calls and direct-frontend-Supabase calls.

---

## 4. Repository Structure

```
ADePT-System/
├── backend/                     # Express API service
│   ├── .env                     # Local environment (git-ignored)
│   ├── .env.example             # Template with variable names
│   ├── package.json
│   └── src/
│       ├── app.js               # Express app setup
│       ├── server.js            # Entry point
│       ├── config/
│       │   ├── supabase.js      # Anon-key client
│       │   └── supabaseAdmin.js # Service-role client
│       ├── database/
│       │   └── mockData.js      # Mock/seed data
│       ├── middleware/
│       │   ├── auth.middleware.js
│       │   └── requireAuth.js
│       ├── modules/             # One folder per feature
│       │   ├── account/
│       │   ├── auditLog/
│       │   ├── auth/
│       │   ├── landholding/
│       │   ├── nolandholding/
│       │   ├── notification/
│       │   ├── requests/
│       │   ├── taxDeclarations/
│       │   └── users/
│       ├── routes/
│       │   └── health.routes.js # Health check endpoint
│       └── utils/
│           ├── permissions.js
│           └── validators.js
├── database/
│   └── migrations/              # SQL schema migrations (001–004)
├── frontend/                    # React SPA
│   ├── .env                     # Local environment (git-ignored)
│   ├── .oxlintrc.json
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx             # Entry point
│       ├── App.tsx              # State-based view switching
│       ├── App.css
│       ├── auth-folder/         # Auth-related assets/pages (e.g., login)
│       ├── admin/               # Admin pages and components
│       ├── users/               # Main app areas
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── pages/
│       │   ├── services/
│       │   ├── styles/
│       │   ├── types/
│       │   └── utils/
│       └── public/              # Static assets (favicons, etc.)
├── Folder-Structure.md          # Detailed folder documentation
├── README.md                    # Project overview
├── Developer-Manual.md          # This document
├── package.json                 # Root scripts (concurrently)
└── .gitignore
```

> The `frontend/` folder also contains `public/` — note that in this repository Vite's static assets live under `frontend/` rather than at the repo root (`To be verified` exact Vite `publicDir` settings).

---

## 5. Prerequisites

| Tool | Minimum version (verified) | Notes |
|---|---|---|
| Node.js | 18+ (exact minimum not specified in repo) | **`To be verified`** — LTS recommended |
| npm | bundled with Node.js | Used for all package management |
| Supabase project | — | URL + keys required (see §6) |
| Git | any recent version | For cloning the repository |
| VS Code (optional) | — | Recommended editor |

No other system-level dependencies (e.g., local PostgreSQL, Docker) are required because the database is hosted on Supabase.

---

## 6. Installation & Local Setup

### 6.1 Clone the repository

```bash
git clone https://github.com/chxxxanndev/ADePT-System.git
cd ADePT-System
```

### 6.2 Install dependencies

The root `package.json` provides an all-in-one install script (uses `concurrently` for running both apps):

```bash
npm run install:all
```

Or install manually:

```bash
npm install            # backend (root workspace deps if used)
cd backend && npm install
cd ../frontend && npm install
```

### 6.3 Configure environment variables

**Backend** — create `backend/.env` from the template:

```bash
cd backend
cp .env.example .env   # Windows: copy .env.example .env
```

The `.env.example` defines these variables (names only — never commit real values):

| Variable | Purpose |
|---|---|
| `PORT` | Backend listen port (default `5000`) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Public anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key for admin client (keep secret; never commit) |

**Frontend** — create/edit `frontend/.env`:

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon/publishable key |
| `VITE_API_URL` *(optional)* | Backend base URL; defaults to `http://localhost:5000` |

> **Security note**: `.env` files are git-ignored (`.gitignore` keeps `!.env.example`). Never commit `.env` or any real key.

### 6.4 Mock mode (no Supabase credentials)

The backend supports a **Mock Mode** for development without a database:

- If `SUPABASE_URL` is missing, contains the literal word `placeholder`, or the Supabase client fails to initialize, the backend sets `useMock = true` (`backend/src/config/supabase.js`) and controllers serve data from `backend/src/database/mockData.js`.
- The health endpoint reports the active mode (see §8.1).

So for a purely local, database-free run, you can omit `SUPABASE_URL`/keys entirely — but expect mock data instead of real records.

---

## 7. Running the Application

From the repository root (both apps at once):

```bash
npm run dev
```

Individually:

| Command | What it does |
|---|---|
| `npm run dev:backend` | Runs `nodemon src/server.js` inside `backend/` (auto-reload on change) |
| `npm run dev:frontend` | Runs `vite` inside `frontend/` (dev server with HMR) |

Backend-only scripts (inside `backend/`):

| Script | Command | Description |
|---|---|---|
| dev | `nodemon src/server.js` | Development with auto-restart |
| start | `node src/server.js` | Production start |

Frontend-only scripts (inside `frontend/`):

| Script | Command | Description |
|---|---|---|
| dev | `vite` | Dev server |
| build | `tsc -b && vite build` | Type-check then production build |
| lint | `oxlint` | Lint with oxlint |
| preview | `vite preview` | Preview the production build locally |

Typical URL layout while developing:

- Frontend dev server: `http://localhost:5173` (Vite default — **no port is set in `vite.config.ts`**)
- Backend API: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health` (`To be verified` exact path prefix)

---

## 8. Backend (API) Overview

### 8.1 App entry & middleware

- `backend/src/server.js` — bootstraps the HTTP server.
- `backend/src/app.js` — Express app configuration: `cors()`, `express.json()`, route mounting, and a global error handler that returns the error stack only in development (`NODE_ENV === 'development'`).
- `backend/src/routes/health.routes.js` — health check at `GET /api/health`; responds `{ status: 'healthy', mode: 'mock' | 'supabase' }` where `mode` reflects whether the backend is running against Supabase or in mock mode.
- `backend/src/middleware/auth.middleware.js` — JWT/token verification middleware.
- `backend/src/middleware/requireAuth.js` — guard requiring an authenticated user.
- `backend/src/utils/permissions.js` — role/permission helpers.
- `backend/src/utils/validators.js` — input validation helpers.

### 8.2 API route map (verified from `backend/src/app.js`)

| Prefix | Module (routes file) |
|---|---|
| `/api/auth` | `auth/` — login, logout, password |
| `/api/account` | `account/` — account self-service |
| `/api/users` | `users/` — user management |
| `/api/requests` | `requests/` — document request lifecycle |
| `/api/tax-declarations` | `taxDeclarations/` |
| `/api/landholding` | `landholding/` |
| `/api/nolandholding` | `nolandholding/` |
| `/api/notifications` | `notification/` |
| `/api/audit-log` | `auditLog/` |
| `/api/health` | `health.routes.js` |

Each module follows a `controller` + `routes` (+ `service`) file pattern.

> **`To be verified`**: the individual endpoints (method + path) inside each module's `*.routes.js` file. A full endpoint table will be added here once each routes file has been enumerated.

### 8.3 Known quirk

There is an orphaned file at `backend/src/modules/auditLog/` named **`auditLog.controller .js`** (note the space in the filename). It is never imported and appears to be a stray duplicate — **do not delete without confirming** it is unused.

---

## 9. Frontend Overview

### 9.1 Bootstrap

- `frontend/src/main.tsx` — entry point: polyfills `Buffer`, wraps the app in `<StrictMode>` and `AuthProvider` (from `users/hooks`), and mounts `App`.
- `frontend/src/App.tsx` — top-level component that switches views based on application state. **There is no `<Routes>`/`<Router>` block**; `react-router-dom` is installed but the app currently uses state-driven navigation. **`To be verified`**: whether react-router is used anywhere (e.g., inside auth flows) or is simply an unused dependency.

### 9.2 Key areas

| Area | Contents |
|---|---|
| `auth-folder/` | Login page, auth assets (logo, favicon) |
| `users/` | Main application: pages, components, hooks, services, styles, types, utils |
| `admin/` | Admin-only pages/components |

### 9.3 Main pages (verified file names)

| Page file | Purpose |
|---|---|
| `users/pages/Dashboard.tsx` | Main dashboard with stats, charts (recharts), and quick access |
| `users/pages/DocumentRequestPage.tsx` | Create/track document requests |
| `users/pages/TransactionRegistryPage.tsx` | Registry of transactions with statuses |
| `users/pages/DocumentVerificationPage.tsx` | Verify documents / O.R. validation |
| `users/pages/PaymentPage.tsx` | Pending payment / pending-for-release handling |
| `users/pages/CeritifiedTrueCopy-Reprint.tsx` | Reprint Certified True Copies *(filename is misspelled — kept as-is)* |
| `users/pages/ArchiveManagement.tsx` | Archive/cancelled request management |
| `users/pages/ReceiptsPage.tsx` | Receipts listing |
| `users/pages/NotificationsPage.tsx` | Notifications inbox |
| `users/pages/accountSettings.tsx` | Profile + security settings |
| `users/pages/AboutADePT.tsx` | About page (system info, architects, stack) |
| `users/pages/UsersPage.tsx` | User management (admin) |
| `users/pages/AuditLogPage.tsx` | Audit log viewer (admin) |
| `users/pages/LandholdingsPage.tsx` | Land holding management (admin) |

### 9.4 Services & hooks

- `users/services/` — API layer (axios) + Supabase client. `api.js` resolves the base URL from `VITE_API_URL` (default `http://localhost:5000`).
- `users/hooks/` — `AuthProvider` and related auth hooks; shared state hooks.
- `users/components/` — shared components (e.g., `DashboardHeader`, `DashboardFooter`, sidebar/navigation, `ExpandableText`, `NameTooltip`).
- `users/styles/` — CSS modules/stylesheets per page/component.

### 9.5 Theming

The app is styled with plain CSS (files under `users/styles/` and `App.css`). Class naming follows a page-prefix convention (e.g., `tr-*` for Transaction Registry, `as-*` for Account Settings, `aa-*` for About ADePT). The visual identity uses the system color palette defined in the root `App.css` and page stylesheets.

---

## 10. Database Schema & Migrations

The schema is managed by SQL migrations in `database/migrations/` and applied to a Supabase (PostgreSQL) project.

### 10.1 Migration list

| File | Contents |
|---|---|
| `001_initial_schema.sql` | Full initial schema: 2 extensions, 7 enums, **21 tables** (956 lines) |
| `002_rename_title_to_position.sql` | Renames a `title` column to `position` |
| `003_add_suffix_columns.sql` | Adds suffix columns |
| `004_add_middle_initial.sql` | Adds a middle-initial column |

> **Important**: migrations `002–004` reference schema objects (e.g., a `staff.title` column and signatory-related tables) that **do not exist in migration `001`**. They were written against the *live* Supabase schema, which evolved separately. Do not run the migration folder sequentially on a fresh database — **`To be verified`** how the production database was actually migrated.

### 10.2 Extensions and enums (verified from `001`)

```sql
create extension if not exists pgcrypto;   -- gen_random_uuid(), crypt()
create extension if not exists pg_trgm;    -- trigram search
```

| Enum | Values |
|---|---|
| `action_taken_enum` | `PENDING`, `APPROVED`, `DISAPPROVED` |
| `request_status_enum` | `DRAFT`, `PENDING_PAYMENT`, `OR_VALIDATED`, `READY_FOR_SIGNATURE`, `SIGNED`, `RELEASED`, `VOID` |
| `taxability_enum` | `TAXABLE`, `EXEMPT` |
| `area_unit_enum` | `SQM`, `HECTARE` |
| `request_document_status_enum` | `PENDING`, `PDF_GENERATED`, `PRINTED`, `RELEASED` |
| `account_status_enum` | `PENDING_APPROVAL`, `ACTIVE`, `DISABLED`, `REJECTED` |
| `audit_action_enum` | `CREATE`, `UPDATE`, `VIEW`, `PRINT`, `RELEASE`, `VOID`, `LOGIN`, `LOGOUT`, `PASSWORD_CHANGE`, `OR_VALIDATION`, `CLONE`, `AMEND` |

### 10.3 Tables (21, verified from `001_initial_schema.sql`)

| Table | Likely purpose |
|---|---|
| `lookup_categories` | Lookup groupings |
| `lookup_values` | Lookup option values |
| `document_types` | Types of documents (CTCs, etc.) |
| `municipalities` | Municipality list |
| `barangays` | Barangay list |
| `roles` | User roles |
| `staff` | Staff members |
| `authorized_signatories` | Signatories for documents |
| `control_number_counters` | Control-number sequence counters |
| `requests` | Document request headers |
| `encoded_tax_declarations` | Encoded tax declaration records |
| `encoded_property_types` | Property type lookups for declarations |
| `encoded_assessment_rows` | Assessment data rows for declarations |
| `request_documents` | Per-document records inside a request |
| `generated_documents` | Generated PDF/file records |
| `or_usage_log` | Official Receipt usage log |
| `print_history` | Print tracking |
| `request_status_history` | Status-change history per request |
| `audit_logs` | Audit trail |
| `system_settings` | Key-value system settings |
| `login_sessions` | Login session records |

Conventions observed in `001` (verified):

- Primary keys are `uuid` columns with default `gen_random_uuid()` (pgcrypto).
- Foreign keys are declared **without `ON DELETE` clauses** (PostgreSQL default: `NO ACTION`).
- Enum values are uppercase.

> **`To be verified`**: full column-level details (column names/types per table) — add an appendix table per table once columns are enumerated from `001_initial_schema.sql`.

---

## 11. Authentication & Authorization

### 11.1 Login flow (verified)

1. The user signs in through the login page (`auth-folder/`).
2. The backend `auth` module validates credentials and issues a session token.
3. `login_sessions` records the login; `audit_logs` records a `LOGIN` action.

### 11.2 Backend guards (verified)

- `requireAuth.js` and `auth.middleware.js` protect backend routes.
- `utils/permissions.js` centralizes permission checks.
- Roles are stored in the `roles` table; the frontend conditionally shows admin pages (e.g., `UsersPage`, `AuditLogPage`, `LandholdingsPage`) based on the logged-in user's role.

### 11.3 Account lifecycle (verified via enums)

- New accounts start at `PENDING_APPROVAL`, become `ACTIVE`, or are `REJECTED`.
- Accounts can be `DISABLED` (see `accountSettings.tsx` — "Disable Account").
- Password changes exist in the backend `auth` module and are recorded as `PASSWORD_CHANGE` audit actions.

> **`To be verified`**: exact token format (JWT vs session), expiry, and how the frontend stores the session (localStorage/sessionStorage/cookie).

---

## 12. Business Workflows

### 12.1 Document request lifecycle (verified from `request_status_enum`)

```
DRAFT ──► PENDING_PAYMENT ──► OR_VALIDATED ──► READY_FOR_SIGNATURE ──► SIGNED ──► RELEASED
                                                                                  │
                                                                                  └── (VOID possible at various stages)
```

Per-document status (`request_document_status_enum`):

```
PENDING ──► PDF_GENERATED ──► PRINTED ──► RELEASED
```

### 12.2 O.R. validation (verified)

Payments are matched against Official Receipts; the `or_usage_log` table tracks O.R. usage. Validation of an O.R. is recorded as an `OR_VALIDATION` audit action, and `approval` decisions use `action_taken_enum` (`PENDING` / `APPROVED` / `DISAPPROVED`).

### 12.3 Printing & reprints (verified)

- `print_history` records each print.
- `CeritifiedTrueCopy-Reprint.tsx` implements the reprint workflow with summary cards (Total Reprinted, Released, Pending).

### 12.4 Void / cancel / archive (verified)

- Voiding a transaction records a `VOID` audit action.
- `ArchiveManagement.tsx` handles archived/cancelled requests.

> **`To be verified`**: exact API endpoints and permission matrix for each transition (which roles may approve, validate O.R., void, etc.).

---

## 13. PDF Generation & Printing

- PDFs are generated **client-side** with `@react-pdf/renderer` (e.g., the Certificate of Payment).
- Generated files are tracked in the `generated_documents` table.
- `print_history` logs each printing event; the Transaction Registry and Reprint pages surface print/reprint counts.

> **`To be verified`**: which exact documents are PDF-generated (Certificate of Payment, Certified True Copies, etc.), how PDFs are served/downloaded, and whether the backend is involved at all in file storage (Multer is a backend dependency — its upload endpoints are **`To be verified`**).

---

## 14. Notifications System

- Backend `notification` module + `notifications`-related tables (per migration `001` there are notification tables — see §10.3; `To be verified` exact table names and columns).
- Frontend: `NotificationsPage.tsx` + a notifications hook in `users/hooks/`; the sidebar shows an unread badge.
- Notification triggers: status changes on document requests (created, paid, validated, signed, released, voided, etc.).

> **`To be verified`**: delivery mechanism (in-app only vs email/SMS), polling vs realtime (Supabase Realtime), and read/unread semantics.

---

## 15. Audit Logging

- Central table: `audit_logs` with `audit_action_enum` (`CREATE`, `UPDATE`, `VIEW`, `PRINT`, `RELEASE`, `VOID`, `LOGIN`, `LOGOUT`, `PASSWORD_CHANGE`, `OR_VALIDATION`, `CLONE`, `AMEND`).
- Backend module: `auditLog/` (controller + routes + service).
- Frontend viewer: `AuditLogPage.tsx` (admin).
- Session tracking: `login_sessions` + `LOGIN`/`LOGOUT` audit entries.

> **`To be verified`**: what metadata is captured (actor, IP, timestamp — likely; exact columns in `001_initial_schema.sql`).

---

## 16. Security Considerations

- **Never commit secrets**: `.env` files are git-ignored; only `.env.example` templates are committed. The service-role key must live only in the backend's `.env` (see the warning inside `backend/.env.example`).
- Frontend uses only the **anon/publishable** key; sensitive operations run through the backend with the service-role/admin client (`supabaseAdmin.js`).
- Backend routes are guarded by `requireAuth.js` / `auth.middleware.js`; permissions are centralized in `utils/permissions.js`.
- Passwords are hashed server-side (pgcrypto is available; exact hashing method **`To be verified`**).
- CORS is enabled globally with `app.use(cors())` — **all origins are currently allowed** (`backend/src/app.js`). Consider restricting origins before production.
- The global error handler returns `err.stack` when `NODE_ENV === 'development'`; it is stripped otherwise.
- Validate inputs with `utils/validators.js` before persisting.

---

## 17. Testing

**Current state: no automated test framework is present** in either `package.json` (frontend, backend, or root). There is no `test` script.

Practical verification currently relies on:

- Type checking: `cd frontend && npx tsc -b` (also part of `npm run build`).
- Linting: `cd frontend && npm run lint` (oxlint).
- Manual/API testing against the running backend and Supabase.

> **Recommendation**: introduce a test runner (e.g., Vitest for the frontend, Jest/Vitest + Supertest for the backend) and a CI pipeline. This is **`To be verified`/future work**, not current functionality.

---

## 18. Deployment

### 18.1 Frontend (verified)

- Hosted on **Vercel**: https://adept-portal.vercel.app/
- Build command: `npm run build` (runs `tsc -b && vite build`) inside `frontend/`.
- Environment variables required on Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_API_URL` pointing at the production backend URL.

> **`To be verified`**: exact Vercel project config (framework preset, root directory, output directory) — no `vercel.json` exists in the repository root.

### 18.2 Backend (verified partially)

- Production start command: `npm start` → `node src/server.js` inside `backend/`.
- Requires `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the environment.

> **`To be verified`**: where the production backend is hosted (Vercel serverless, Render, Railway, on-premises server, etc.) and its public URL as configured in production `VITE_API_URL`.

### 18.3 Database

- Managed Supabase project. Migrations in `database/migrations/` — see §10.1 for the caveat that 002–004 target the live schema.

---

## 19. Troubleshooting & Known Issues

| Symptom | Likely cause / remedy |
|---|---|
| Frontend can't reach the API in dev | Backend not running, or `VITE_API_URL` misconfigured. Default backend URL is `http://localhost:5000`. Verify with `curl http://localhost:5000/api/health`. |
| Backend runs in mock mode unexpectedly | `SUPABASE_URL` missing or contains `placeholder`, or the client failed to initialize — check `backend/.env` and the health endpoint's `mode` field. |
| Login fails | Wrong `SUPABASE_URL`/keys in `backend/.env`; check Supabase project keys and account status (`PENDING_APPROVAL` accounts cannot act). |
| Build fails in `frontend/` | Run `tsc -b` and `npm run lint` first; the build script type-checks before bundling. |
| Migrations 002–004 fail on a fresh DB | They reference live-schema-only objects; apply them only to the production schema or reconstruct the diff. |
| Backend doesn't restart on changes | Use `npm run dev` (nodemon), not `npm start`. |
| Orphan file `auditLog.controller .js` | Never imported; ignore or remove after confirming it's unused. |
| Hover tooltips on long names not showing | The system uses `NameTooltip` (portal-based) — if names in a table lack tooltips, ensure the cell uses the shared `ExpandableText`/`NameTooltip` component rather than a plain string. |
| PDF doesn't generate | `@react-pdf/renderer` runs client-side; check browser console and that the request's document status permits generation (`PENDING` → `PDF_GENERATED`). |

---

## 20. Version Control & Contribution Guidelines

### 20.1 Repository

- Remote: `https://github.com/chxxxanndev/ADePT-System.git` (origin)
- Branches observed locally: `main`, `jeds`, `moy` — feature/developer branches per collaborator.
- Branching convention: **`To be verified`** (no contributing guide or PR template found in the repo).

### 20.2 Contribution workflow (recommended)

1. Always branch from the latest `main`: `git checkout main && git pull && git checkout -b <feature-branch>`.
2. Keep secrets out of every commit (`.env`, keys).
3. Follow existing conventions:
   - Backend: one module folder per feature (`controller/routes/service`), ES modules.
   - Frontend: page-prefixed CSS classes, components under `users/components/`, services under `users/services/`.
4. Run `npx tsc -b` and `npm run lint` in `frontend/` before pushing.
5. Open a pull request to `main` and get it reviewed before merging.

### 20.3 Commit message style

The repository has no enforced convention (`To be verified`). Existing history uses concise conventional-style messages; prefer `type(scope): summary` (e.g., `fix(registry): restore tooltip on long names`).

---

## Appendix A — Environment Variable Reference

| File | Variable | Required | Notes |
|---|---|---|---|
| `backend/.env` | `PORT` | No | Default `5000` |
| `backend/.env` | `SUPABASE_URL` | Yes | Supabase project URL |
| `backend/.env` | `SUPABASE_ANON_KEY` | Yes | Publishable key |
| `backend/.env` | `SUPABASE_SERVICE_ROLE_KEY` | Yes (for admin ops) | Never commit |
| `frontend/.env` | `VITE_SUPABASE_URL` | Yes | Must match backend project |
| `frontend/.env` | `VITE_SUPABASE_ANON_KEY` | Yes | Publishable key |
| `frontend/.env` | `VITE_API_URL` | No | Defaults to `http://localhost:5000` |

## Appendix B — Quick Command Cheat Sheet

```bash
# Full local dev (both apps)
npm run dev

# Backend only
npm run dev:backend          # nodemon, port 5000

# Frontend only
npm run dev:frontend         # vite dev server

# Production build + typecheck
cd frontend && npm run build

# Lint
cd frontend && npm run lint

# Health check
curl http://localhost:5000/api/health   # → { "status": "healthy", "mode": "mock" | "supabase" }
```
