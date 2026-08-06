# ADePT System — Folder Structure

Current source-of-truth structure of the ADePT System repository, which is split
into a React + Vite **frontend**, a Node.js/Express **backend**, and a
**database** folder holding SQL migrations.

ADePT-System/
├── backend/              Node.js/Express API (JWT auth, Supabase data access)
├── database/            SQL migration scripts for the Supabase schema
├── frontend/            React + Vite single-page application
├── package.json         Root scripts (dev, install:all) + workspace metadata
├── package-lock.json
├── README.md            Project overview and setup guide
├── .gitignore
└── Folder-Structure.md  This document

Generated output (`node_modules/`, `dist/`, cache folders) is intentionally
excluded from this structure.

---

## Frontend Structure

`frontend/` holds the React application built with Vite and TypeScript. It is
split into three logical areas: the **admin** console, the **auth** screens,
and the staff-facing **users** application.

```
frontend/
├── public/                         # Static assets served as-is
│   ├── fonts/                      # Certificate fonts (Bookos, Georgia, Castellar)
│   ├── images/                     # Certificate headers & background images
│   ├── templates/                  # PDF templates (landholding, no-landholding, tax declaration)
│   ├── favicon.svg
│   └── icons.svg
│
├── src/
│   ├── admin/                      # Admin console (dashboards, staff & audit management)
│   │   ├── components/           # Admin UI blocks
│   │   ├── data/                 # Admin types/static data
│   │   ├── hooks/                # Admin data hooks
│   │   ├── pages/                # Admin screens (AdminDashboard, StaffAccounts, RequestQueue, AdminReports, AdminAuditLog, ...)
│   │   ├── services/             # API layer (user management, audit log, presence)
│   │   └── styles/               # Per-page stylesheets
│   │
│   ├── auth-folder/                # Authentication & account screens
│   │   ├── assets/                # Auth page images
│   │   ├── components/            # AlertBanner, AuthBanner, PasswordInput, LockDisclaimer, DeveloperCredit
│   │   ├── types/                 # auth.ts
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   ├── ForgotPasswordForm.tsx
│   │   └── ResetPasswordForm.tsx
│   │
│   ├── lib/                        # Library clients
│   │   ├── apiClient.ts          # Axios API client
│   │   └── supabaseClient.ts     # Supabase browser client
│   │
│   ├── users/                      # Staff-facing application
│   │   ├── assets/team/            # Team photos
│   │   ├── components/             # Reusable UI blocks & modals
│   │   │   ├── common/             # Shared: ExpandableText, Skeleton
│   │   │   └── templates/          # LandholdingPDF, NoLandholdingPDF, TaxDeclarationPDF, textFit
│   │   ├── constants/              # roles.ts
│   │   ├── data/                   # Static/mock data & navigation
│   │   ├── hooks/                  # useAuth, useNotifications, useReportsAnalytics, AuthProvider, TransactionCartContext
│   │   ├── pages/                  # Screens (dashboard, queues, registry, reports, archive, ...)
│   │   │   └── request-processing/ # Request forms (TaxDeclaration, Landholding & NoLandholding certs, TransactionSummary)
│   │   ├── services/               # API layer per domain
│   │   ├── styles/                 # Per-page CSS files
│   │   └── types/                  # Domain TypeScript types
│   │
│   ├── utils/                      # Shared helpers
│   │   ├── documentType.tsx        # Document-type icons/pills and prefix helpers
│   │   └── permissions.ts          # Role/permission helpers
│   │
│   ├── App.tsx                     # Root application component / routing
│   ├── App.css
│   ├── config.ts                   # Shared config
│   ├── index.css
│   └── main.tsx                    # React entry point
│
├── .env                            # Frontend environment variables
├── .gitignore
├── .oxlintrc.json                  # Lint configuration
├── index.html                      # Vite HTML entry
├── package.json
├── package-lock.json
├── README.md
├── tsconfig.json                   # TypeScript config (references)
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
```

Key files

- `public/templates/` — PDF templates used by the certificate reprint / PDF
  generation features.
- `src/users/pages/request-processing/` — the multi-step request forms for the
  three certificate types and the transaction summary screen.
- `src/admin/` — everything serving the admin role: staff account management,
  request queues, audit log, and admin reports.

---

## Backend Structure

`backend/` is the Express API that authenticates users, enforces permissions,
and reads/writes Supabase. It uses a modular layout: each feature under
`src/modules/` owns its controller, routes, and service.

```
backend/
├── src/
│   ├── config/                     # Client/initialization modules
│   │   ├── supabase.js             # Supabase client
│   │   └── supabaseAdmin.js        # Supabase admin (service-role) client
│   │
│   ├── database/
│   │   └── mockData.js             # Mock/sample data
│   │
│   ├── middleware/                 # Request guards
│   │   ├── auth.middleware.js      # JWT authentication guard
│   │   └── requireAuth.js          # Requires an authenticated user
│   │
│   ├── modules/                    # Feature modules (controller/routes/service per module)
│   │   ├── account/                # Account management
│   │   ├── auditLog/               # Audit logging
│   │   ├── auth/                   # Login/signup & token handling
│   │   ├── landholding/            # Landholding certificates/requests
│   │   ├── nolandholding/          # No-land-holding certificates/requests
│   │   ├── notification/           # Notifications
│   │   ├── requests/               # Document requests & registry
│   │   ├── taxDeclarations/        # Tax declaration records
│   │   └── users/                  # User management
│   │
│   ├── routes/                     # Non-module routes
│   │   └── health.routes.js        # Health-check route
│   │
│   ├── utils/                      # Shared helpers
│   │   ├── permissions.js          # Role/permission checks
│   │   └── validators.js           # Input validation helpers
│   │
│   ├── app.js                     # Express application setup
│   └── server.js                  # Server entry point
│
├── .env                            # Backend environment variables (secrets)
├── .env.example
├── package.json
└── package-lock.json
```

Key files

- `src/middleware/auth.middleware.js` — guards protected routes and resolves the
  authenticated user.
- `src/modules/*/` — the folder pattern is uniform: `<name>.controller.js`
  (HTTP handling), `<name>.routes.js` (route definitions), `<name>.service.js`
  (business logic / Supabase access).
- `src/app.js` — Express app configuration; `src/server.js` boots the server.

---

## Database Structure

`database/` holds the SQL migration scripts applied to the Supabase schema.

```
database/
└── migrations/
    ├── 001_initial_schema.sql       # Initial tables & schema
    ├── 002_rename_title_to_position.sql
    ├── 003_add_suffix_columns.sql
    └── 004_add_middle_initial.sql
```