# ADePT System

**A localized Document Request Tracking and Printing System for the Provincial Assessor's Office**

ADePT is a web-based system designed to streamline document preparation, request tracking, document verification, payment-related processing, printing/release, transaction recording, and administrative management for the Provincial Assessor's Office.

The system supports document workflows involving **Tax Declarations, Certificates of Landholding, and Certificates of No Landholding**, together with user/account management, notifications, audit logging, reports, and transaction records.

## Live Application

- **Production / Demo:** https://adept-portal.vercel.app/
- **Repository:** https://github.com/chxxxanndev/ADePT-System

## Technology Stack

### Frontend
- React 19
- TypeScript
- Vite
- React Router
- Axios
- Supabase JavaScript client
- React PDF Renderer
- Lucide React
- Recharts
- Oxlint

### Backend
- Node.js
- Express.js
- Supabase JavaScript client
- CORS
- dotenv
- Multer
- Nodemon

### Database
- Supabase / PostgreSQL
- SQL migration scripts are stored in `database/migrations/`

### Development and Collaboration
- Visual Studio Code
- Git
- GitHub
- Figma for UI/UX design

## Repository Structure

```text
ADePT-System/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── database/
│   │   ├── middleware/
│   │   └── modules/
│   │       ├── account/
│   │       ├── auditLog/
│   │       ├── auth/
│   │       ├── landholding/
│   │       ├── nolandholding/
│   │       ├── notification/
│   │       ├── requests/
│   │       ├── taxDeclarations/
│   │       └── users/
│   ├── .env.example
│   └── package.json
│
├── database/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_rename_title_to_position.sql
│       ├── 003_add_suffix_columns.sql
│       └── 004_add_middle_initial.sql
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── admin/
│   │   │   └── pages/
│   │   └── users/
│   │       └── pages/
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── Folder-Structure.md
├── package.json
└── README.md
```

## Requirements

Install the following before running the project:

- Node.js and npm
- Git
- Visual Studio Code or another code editor
- Modern web browser
- Access to the project's Supabase environment
- Access to the GitHub repository

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/chxxxanndev/ADePT-System.git
cd ADePT-System
```

### 2. Install All Dependencies

The root `package.json` provides a convenience script:

```bash
npm run install:all
```

This installs the root dependencies and the dependencies in both `backend` and `frontend`.

You may also install them separately:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Environment Configuration

The backend contains an `.env.example` file. Create the local environment file from the example and supply the authorized project values.

Do **not** commit real credentials, secrets, service-role keys, or private tokens.

Example structure:

```env
PORT=5000
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_KEY=YOUR_SUPABASE_KEY
```

Use the exact variable names required by the current backend configuration.

## Running the System

### Run Backend Only

From the project root:

```bash
npm run dev:backend
```

Or:

```bash
cd backend
npm run dev
```

The backend development script starts `nodemon src/server.js`.

### Run Frontend Only

From the project root:

```bash
npm run dev:frontend
```

Or:

```bash
cd frontend
npm run dev
```

The frontend is served by Vite.

### Run Frontend and Backend Together

From the project root:

```bash
npm run dev
```

The root script uses `concurrently` to run the backend and frontend development servers together.

## Frontend Commands

Inside `frontend/`:

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

- `dev` starts Vite development mode.
- `build` runs TypeScript build checking and creates the production build.
- `lint` runs Oxlint.
- `preview` previews the production build locally.

## Backend Commands

Inside `backend/`:

```bash
npm run dev
npm start
```

- `dev` runs the server through Nodemon.
- `start` runs the server using Node.js.

## Main Backend Modules

The backend is organized into modules including:

- `account` – account-related functionality
- `auditLog` – audit logging
- `auth` – authentication
- `landholding` – landholding document operations
- `nolandholding` – no-landholding document operations
- `notification` – notification-related operations
- `requests` – request processing
- `taxDeclarations` – tax declaration operations
- `users` – user-related functionality

## Major Frontend Areas

### User/Staff Pages

The current repository includes pages for:

- Dashboard
- Document Request Dashboard
- Request Form Entry
- Pending Payment
- Payment Details
- Pending for Release
- Document Verification
- Document Release
- Transaction Registry
- Transaction Details
- Archive Management
- Reports
- Notifications
- Void and Amend
- Certified True Copy reprint

### Administrative Pages

The current repository includes:

- Account Request
- Staff Accounts
- Admin Dashboard
- Admin Reports
- Admin Audit Log
- Admin Account Settings
- Request Queue

## Database Migrations

The repository currently includes:

```text
database/migrations/
├── 001_initial_schema.sql
├── 002_rename_title_to_position.sql
├── 003_add_suffix_columns.sql
└── 004_add_middle_initial.sql
```

Apply migrations in the correct order in the authorized Supabase environment.

## Git Workflow

Before starting work:

```bash
git status
git switch main
git pull origin main
```

For feature development:

```bash
git switch -c feature/your-feature-name
```

After making changes:

```bash
git status
git add .
git commit -m "Describe the change"
git push -u origin feature/your-feature-name
```

Do not commit `.env` files or secrets.

## Troubleshooting

### Frontend dependencies are missing

```bash
cd frontend
npm install
```

### Backend dependencies are missing

```bash
cd backend
npm install
```

### Vite does not start

Verify Node.js/npm installation and reinstall frontend dependencies.

### Backend does not start

Check the terminal error, verify backend dependencies, and confirm that required environment variables are configured.

### Authentication or JWT errors

Verify that the session/token is valid and that the frontend and backend are using the correct environment and authentication configuration.

### Database constraint errors

Check the referenced records and foreign-key relationships before inserting dependent data.

### Git conflicts

Do not blindly overwrite files. Review the conflicting sections, resolve the intended version, test the system, and then commit the resolution.

## Security

- Never commit `.env` files.
- Never expose Supabase service-role credentials.
- Never publish passwords or JWT secrets.
- Keep authentication and authorization checks on the backend.
- Validate user-controlled input.
- Review database permissions and Row Level Security policies.
- Keep dependencies updated.
- Use separate credentials for development and production.

## Developer Documentation

The project includes a `Folder-Structure.md` file describing the repository organization. The recommended technical documentation areas include:

- System Architecture
- ER Diagram
- Database Design
- API Documentation
- Security Documentation
- Installation Guide
- Deployment Guide
- User Manual
- Admin Manual
- Developer Guide
- Change Log

## Contribution Notes

When modifying ADePT:

1. Pull the latest source code.
2. Work on a dedicated branch.
3. Keep changes focused.
4. Test frontend and backend behavior.
5. Check database impacts before changing schemas.
6. Avoid committing secrets.
7. Update documentation when architecture or setup changes.
8. Review the changes before merging to the main branch.

## Project Status

The repository is actively organized as a full-stack application with separate frontend, backend, and database migration areas. Always use the current `main` branch and the repository's package files as the source of truth for setup commands and dependencies.

## License

Add the project's official license here if one is adopted.

## Maintainers

Add the authorized development team, project adviser, or technical maintainer information here.
