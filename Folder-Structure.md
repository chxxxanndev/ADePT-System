backend/
├── src/
│   ├── config/             # Environment & Third-party initializations (Supabase)
│   ├── constants/          # Static strings, status codes, error messages
│   ├── controllers/        # Request handling & Response formatting
│   ├── database/           # Mock data and (later) database schemas
│   ├── middleware/         # Auth guards, logging, error handlers
│   ├── routes/             # Route definitions & mapping
│   ├── services/           # CORE Business logic (The "Brain")
│   ├── utils/              # Helper functions (Validators, formatters)
│   ├── app.js              # Express app configuration
│   └── server.js           # Server entry point
├── .env                    # Environment variables
└── package.json

frontend/
├── node modules/
├── public/
├── src/
│   ├── assets/             
│   ├── components/ 
│   │   ├── AlertBanner.tsx
│   │   ├── AnalyticsOverview.tsx
│   │   ├── AuthBanner.tsx
│   │   ├── DashboardFooter.tsx
│   │   ├── DocumentDistribution.tsx
│   │   ├── icons.tsx
│   │   ├── LockDisclaimer.tsx
│   │   ├── PasswordInput.tsx
│   │   ├── QuickActions.tsx
│   │   ├── RecentTransactions.tsx
│   │   ├── Sidebar.tsx
│   │   ├── StatCard.tsx
│   ├── data/             
│   ├── hooks/   
│   │   ├── useAuth.ts
│   ├── pages/ 
│   │   ├── Dashboard.tsx
│   │   ├── ForgotPasswordForm.tsx
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   ├── styles/ 
│   │   ├── dashboard.css
│   ├── types/ 
│   │   ├── App.css
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── main.tsx
|   
├── .gitignore
├── .oxlintrc.json
├── index.html
├── package-lock.json
├── README.md
└── package.json

recommended:
docs/
│
├── System Architecture
├── ER Diagram
├── Database Design
├── API Documentation
├── Security Documentation
├── Installation Guide
├── Deployment Guide
├── User Manual
├── Admin Manual
├── Developer Guide
└── Change Log

├── database/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_lookup_tables.sql
│   │   ├── 003_indexes.sql
│   │   ├── 004_functions.sql
│   │   ├── 005_triggers.sql
│   │   ├── 006_rls.sql
│   │   └── 007_seed_data.sql
│   │
│   ├── schema.sql
│   ├── seeds.sql
│   └── README.md


backend
│
├── src
│
├── config
│   ├── supabase.js
│   ├── env.js
│   └── constants.js
│
├── middleware
│   ├── auth.middleware.js
│   ├── role.middleware.js
│   ├── validation.middleware.js
│   ├── error.middleware.js
│   └── audit.middleware.js
│
├── modules
│
│   ├── auth
│   │      auth.controller.js
│   │      auth.service.js
│   │      auth.routes.js
│   │      auth.validation.js
│   │
│   ├── staff
│   │      staff.controller.js
│   │      staff.service.js
│   │      staff.routes.js
│   │
│   ├── requests
│   │      request.controller.js
│   │      request.service.js
│   │      request.routes.js
│   │
│   ├── tax-declarations
│   │      td.controller.js
│   │      td.service.js
│   │
│   ├── landholding
│   │      landholding.controller.js
│   │
│   ├── no-landholding
│   │      noLandholding.controller.js
│   │
│   ├── payments
│   │      payment.controller.js
│   │
│   ├── printing
│   │      printing.controller.js
│   │
│   ├── dashboard
│   │      dashboard.controller.js
│   │
│   └── audit
│          audit.controller.js
│
├── shared
│      validators.js
│      helpers.js
│      logger.js
│      response.js
│
├── database
│      mockData.js
│
├── app.js
└── server.js