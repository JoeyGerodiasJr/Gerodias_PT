# Gerodias PT — Enterprise Resource Planning (ERP) System

[![Sprint 1 Status](https://img.shields.io/badge/Sprint_1-100%25_Merged_(30%2F30)-brightgreen)](docs/s1-review-and-retro.md)
[![Sprint 2 Status](https://img.shields.io/badge/Sprint_2-In_Progress_(DBA_Track_Complete)-blue)](docs/s2-planning-and-board.md)
[![Backend](https://img.shields.io/badge/Backend-Node.js_%7C_Express-339933?logo=node.js&logoColor=white)](index.js)
[![Database](https://img.shields.io/badge/Database-Supabase_PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](supabase/)
[![Security](https://img.shields.io/badge/Security-36--Right_RBAC_Catalogue-7057ff)](docs/s2-planning-and-board.md)
[![Tests](https://img.shields.io/badge/Smoke_Tests-Passing-success)](tests/smoke.test.js)

> A modern, role-based Enterprise Resource Planning (ERP) platform built for **Hope, Inc.**, engineered with a **Node.js (Express)** backend, a responsive client dashboard, and a shared cloud **Supabase PostgreSQL** database. The system delivers strict module-level Role-Based Access Control (RBAC), fine-grained per-action permissions (36-right catalogue), point-in-time pricing, soft deletion with child-record safeguards, and comprehensive database audit logging.

---

## 📑 Table of Contents
- [Executive Overview & Architecture](#executive-overview-architecture)
- [System Features & Security Highlights](#system-features-security-highlights)
  - [Authentication & User Lifecycle Governance](#authentication-user-governance)
  - [Granular 36-Right Per-Action RBAC Catalogue](#36-right-rbac-catalogue)
  - [Master Data Integrity & Point-in-Time Pricing](#master-data-pricing)
- [Technology Stack](#technology-stack)
- [Team Roster & Roles](#team-roster-roles)
- [Agile Roadmap & Milestone Tracking](#agile-roadmap-milestone-tracking)
- [Local Development Quickstart](#local-development-quickstart)
  - [Prerequisites](#prerequisites)
  - [Clone and Install](#clone-and-install)
  - [Environment Configuration](#environment-configuration)
  - [Run the Application](#run-the-application)
- [Automated Testing & QA Verification](#automated-testing-qa-verification)
  - [Run Smoke Tests](#run-smoke-tests)
  - [QA Test Documentation](#qa-test-documentation)
- [Database Management (Supabase, No-Docker)](#database-management)
  - [Day-to-Day Supabase Workflow](#day-to-day-supabase-workflow)
  - [Golden Rules for Database Integrity](#golden-rules-for-database-integrity)
- [Repository Directory Structure](#repository-directory-structure)
- [Git Workflow & Definition of Done](#git-workflow-definition-of-done)
  - [Branch Naming Convention](#branch-naming-convention)
  - [Pull Request & Auto-Close Requirements](#pull-request-auto-close-requirements)
- [License & Attribution](#license-attribution)

---

## <a id="executive-overview-architecture"></a>🏛️ Executive Overview & Architecture

Gerodias PT modernizes the operational workflows of **Hope, Inc.** by centralizing master catalogs, human resources, sales orders, accounts receivable, and analytical reporting into an integrated, secure web system.

```
                          ┌────────────────────────┐
                          │   Client Web Browser   │
                          │ (HTML5 / JS / Tailwind)│
                          └───────────┬────────────┘
                                      │ HTTP / REST / Sessions
                                      ▼
                          ┌────────────────────────┐
                          │   Express API Server   │
                          │      (Node.js)         │
                          │ ────────────────────── │
                          │ • Session & Auth Guard │
                          │ • 36-Right Middleware  │
                          │ • Business Validations │
                          └───────────┬────────────┘
                                      │ PostgreSQL Connection Pool
                                      ▼
                          ┌────────────────────────┐
                          │  Supabase Cloud DB     │
                          │      (PostgreSQL)      │
                          │ ────────────────────── │
                          │ • Trigram Search (GIN) │
                          │ • Point-in-Time Views  │
                          │ • Soft-Delete Triggers │
                          │ • Immutable Audit Logs │
                          └────────────────────────┘
```

---

## <a id="system-features-security-highlights"></a>🛡️ System Features & Security Highlights

### <a id="authentication-user-governance"></a>1. Authentication & User Lifecycle Governance
- **Role Hierarchy:** Supports `Superadmin`, `Admin`, and `User` roles.
- **Pending User Approvals:** Self-registered accounts start in `pending` status and cannot access application features until approved by a Superadmin.
- **Role Isolation & Superadmin Protection:** Admin users manage standard users only; Superadmin accounts remain completely hidden from standard Admins. Server-side middleware strictly prevents deleting or blocking the last remaining Superadmin.
- **Secure Password Reset:** Uses crypto-randomized, SHA-256 hashed tokens stored in a dedicated `password_reset_token` table with single-use and expiration checks.

### <a id="36-right-rbac-catalogue"></a>2. Granular 36-Right Per-Action RBAC Catalogue
Permissions are evaluated across five distinct business modules:
1. **Customer:** `View`, `Add`, `Edit`, `Delete`
2. **Product:** `View`, `Add`, `Edit`, `Delete`
3. **Human Resources:** `View Employees`, `Add Employee`, `Edit Employee`, `Delete Employee`, `View Job History`, `Add/Edit/Delete Job History`, `View Salary`
4. **Sales & Orders:** `View Sales`, `Add Sale`, `Edit Sale`, `Delete Sale`, `View Line Items`, `Add/Edit/Delete Line Items`, `Record Payment`
5. **Reports & Audit:** Independent view/export rights for each of the 7 enterprise reports plus Superadmin Audit Log viewer.

> [!NOTE]
> Per-action permissions are enforced dynamically on the client UI (action buttons and navigation links are hidden/disabled) **and** redundantly validated on every API endpoint via server-side permission middleware.

### <a id="master-data-pricing"></a>3. Master Data Integrity & Point-in-Time Pricing
- **Search Optimization:** Powered by PostgreSQL `pg_trgm` extension with GIN trigram indexes (`idx_customer_custname_trgm`, `idx_product_description_trgm`) for sub-millisecond case-insensitive `ILIKE` catalog searches.
- **Point-in-Time Pricing Function:** `get_product_price_as_of(prodcode, target_date)` resolves historical effective prices from `pricehist` backed by composite descending B-tree indexes (`idx_pricehist_prodcode_effdate_desc`).
- **Data Validation Constraints:** Enforced database check constraints (`chk_customer_payterm` for `'COD'`, `'30D'`, `'45D'`; `chk_product_unit` for `'pc'`, `'ea'`, `'mtr'`, `'pkg'`, `'ltr'`).
- **Referential Integrity Safeguards:** Physical `DELETE` operations on catalog entities are completely blocked by database triggers (`blk_customer_hard_del`, `blk_product_hard_del`). Soft deletion (`is_deleted = true`) is blocked if active dependent child records (`sales`, `salesdetail`, `pricehist`) exist.
- **Tamper-Evident Audit Trail:** Every insert, update, soft-delete, and restore operation automatically records user identity (`audit_user()`), timestamp, table name, and full before/after JSON snapshots in the append-only `audit_log` table.

---

## <a id="technology-stack"></a>💻 Technology Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend Runtime** | [Node.js](https://nodejs.org/) (v20+) | Asynchronous server execution environment |
| **Web Framework** | [Express.js](https://expressjs.com/) (v4.19+) | REST API routing, session management, and middleware |
| **Database** | [Supabase PostgreSQL](https://supabase.com/) | Cloud relational database with triggers, views, and RLS |
| **Authentication** | `express-session`, `bcryptjs`, `crypto` | Cookie-based sessions, bcrypt password hashing, and token encryption |
| **Database Client** | `@supabase/supabase-js`, `pg` | Connection pooling and transactional SQL queries |
| **Frontend UI** | HTML5, JavaScript (ES6+), Tailwind CSS | Responsive dashboard, dynamic modals, and permission-aware views |
| **Testing** | Node.js Test Runner / Jest Smoke Suite | Syntax validation, route smoke tests, and permission verification |
| **CLI & Tooling** | `supabase-cli`, `gh` (GitHub CLI) | Cloud migrations and agile GitHub project automation |

---

## <a id="team-roster-roles"></a>👥 Team Roster & Roles

| Member Name | Role | GitHub Handle | Core Responsibilities |
| :--- | :--- | :--- | :--- |
| **Joey Gerodias Jr.** | Scrum Master | [@JoeyGerodiasJr](https://github.com/JoeyGerodiasJr) | Sprint governance, backlog refinement, review/retrospectives, PR audits, and release tracking |
| **Steven Aborde** | Developer | [@StevenAborde17](https://github.com/StevenAborde17) | Express API routes, session middleware, RBAC enforcement, CRUD controllers, and UI wiring |
| **Kenji Ray Traqueña** | DB Admin | [@KenjiRayTraquena](https://github.com/KenjiRayTraquena) | Supabase migrations, SQL views, validation constraints, composite indexes, and audit triggers |
| **Matthew Henry Young** | UI/UX Designer | [@MatthewYoung23](https://github.com/MatthewYoung23) | Design tokens, wireframes, high-fidelity mockups, responsive layouts, and usability reviews |
| **Hazel Ann Espiso** | QA / Tester | [@hazelespiso](https://github.com/hazelespiso) | Test plans, auth/RBAC test suites, smoke testing, regression verification, and defect tracking |

---

## <a id="agile-roadmap-milestone-tracking"></a>🚀 Agile Roadmap & Milestone Tracking

The project follows a strict 8-week agile schedule divided into four 2-week sprints. Each sprint delivers exactly 30 peer-reviewed Pull Requests (6 PRs per role) mapped 1:1 with GitHub Issues:

| Sprint | Timeline | Scope & Core Modules | Target PRs | Status | Documentation |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Sprint 1** | Weeks 1–2 | Authentication, Registration, Password Reset, User Management, 36-Right Dialog, Dashboard | 30 | **100% Merged (30/30)** | [Sprint 1 Review & Retro](docs/s1-review-and-retro.md) |
| **Sprint 2** | Weeks 3–4 | Customer CRUD, Product CRUD, Price History as of Date, Child Delete Checks, Search Tuning | 30 | **In Progress (DBA Complete)** | [Sprint 2 Planning Board](docs/s2-planning-and-board.md) |
| **Sprint 3** | Weeks 5–6 | Human Resources: Department & Job CRUD, Employees, Job History Timeline, Salary Visibility Rights | 30 | Planned | Backlog Initialized |
| **Sprint 4** | Weeks 7–8 | Sales Orders, Line Items, Payments & Balances, 7 Printable PDF Reports, Superadmin Audit Viewer | 30 | Planned | Backlog Initialized |

---

## <a id="local-development-quickstart"></a>⚡ Local Development Quickstart

### <a id="prerequisites"></a>1. Prerequisites
- [Node.js](https://nodejs.org/) v20.x or higher
- [Git](https://git-scm.com/)
- Access to the team's shared Supabase cloud project

### <a id="clone-and-install"></a>2. Clone and Install
```bash
git clone https://github.com/JoeyGerodiasJr/Gerodias_PT.git
cd Gerodias_PT
npm install
```

### <a id="environment-configuration"></a>3. Environment Configuration
Create a `.env` file in the project root:
```env
PORT=3000
SUPABASE_URL=https://ntwvaxvaxsxhecssltgh.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
APP_BASE_URL=http://localhost:3000
DATABASE_URL=your_supabase_postgres_connection_string
SESSION_SECRET=your_secure_session_secret
```

> [!CAUTION]
> Never commit `.env` or sensitive database connection strings to GitHub. The `.gitignore` file is pre-configured to exclude it.

Password reset token access requires `SUPABASE_SERVICE_ROLE_KEY`; keep it server-side and never expose it in browser code. In local development, the reset link is written to the server log. Production email delivery is not configured yet, so the forgot-password endpoint returns an error in production until an email provider is set up.

For Vercel, `vercel.json` routes requests to the exported Express app in `index.js`. Configure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_BASE_URL`, and `SESSION_SECRET` in the Vercel project settings before deployment.

### <a id="run-the-application"></a>4. Run the Application
```bash
# Start the production/staging server
npm start

# Run with nodemon for live reload (development)
npm run dev
```
Open your browser and navigate to **`http://localhost:3000`**.

---

## <a id="automated-testing-qa-verification"></a>🧪 Automated Testing & QA Verification

The repository includes lightweight automated smoke tests and extensive QA documentation to verify server integrity, authentication guards, and the 36-right permission matrix.

### <a id="run-smoke-tests"></a>Run Smoke Tests
```bash
npm test
```
The smoke test suite (`tests/smoke.test.js`) verifies:
- `index.js` syntax and static code integrity
- Express server route definitions (auth, users, customer, product, health checks)
- Session and security middleware presence

### <a id="qa-test-documentation"></a>QA Test Documentation
Detailed test plans and test case execution logs are maintained in `docs/testing/`:
- [S1-TST-01: Sprint 1 Test Plan](docs/testing/S1-TST-01-Test-Plan.md)
- [S1-TST-02: Authentication Test Cases](docs/testing/S1-TST-02-Auth-Test-Cases.md)
- [S1-TST-03: User Management Test Cases](docs/testing/S1-TST-03-User-Management-Test-Cases.md)
- [S1-TST-04: Permission Matrix Tests](docs/testing/S1-TST-04-Permission-Matrix-Tests.md)
- [S1-TST-05: Automated Smoke Test](docs/testing/S1-TST-05-Automated-Smoke-Test.md)
- [S1-TST-06: Bug Reports & Fix Verification](docs/testing/S1-TST-06-Bug-Reports-Fix-Verification.md)

---

## <a id="database-management"></a>🗄️ Database Management (Supabase, No-Docker)

The project connects to a hosted cloud PostgreSQL instance on Supabase. **No local Docker daemon is required.** All schema changes are tracked as immutable, sequential migration files in `supabase/migrations/`.

> [!IMPORTANT]
> The **DB Admin (Kenji Ray Traqueña)** is the designated team member responsible for applying migrations to the cloud database (`supabase db push --linked`). Team members should not push migrations directly.

### <a id="day-to-day-supabase-workflow"></a>Day-to-Day Supabase Workflow
| Task | Command | Permitted Role |
| :--- | :--- | :---: |
| Check migration sync status | `supabase migration list --linked` | All Members |
| Generate new timestamped migration | `supabase migration new <name>` | DB Admin |
| Dry-run migration preview | `supabase db push --linked --dry-run` | DB Admin |
| Apply migrations to cloud database | `supabase db push --linked` | **DB Admin Only** |

### <a id="golden-rules-for-database-integrity"></a>Golden Rules for Database Integrity
1. **Never edit an existing applied migration:** Always create a new migration with `supabase migration new <name>`.
2. **Always write non-destructive SQL:** Use `CREATE OR REPLACE`, `IF NOT EXISTS`, and `DROP CONSTRAINT IF EXISTS`.
3. **Do not use Docker-dependent commands:** Avoid `supabase start`, `supabase db reset`, `supabase db diff`, or `supabase db pull`.

---

## <a id="repository-directory-structure"></a>📂 Repository Directory Structure

```text
Gerodias_PT/
├── .github/                       # Issue templates, PR templates, and workflow configs
├── docs/                          # Agile governance, sprint planning, and retrospectives
│   ├── testing/                   # QA test plans, permission matrices, and bug reports
│   ├── s1-review-and-retro.md     # Sprint 1 evaluation and retro actions
│   ├── s2-planning-and-board.md   # Sprint 2 planning notes, capacity, and backlog table
│   └── s2-retro-actions-followup.md # Audit follow-up report
├── public/                        # Client-side web application views and assets
│   ├── css/                       # Stylesheets and UI tokens
│   ├── js/                        # Client-side controllers and rights handlers
│   ├── dashboard.html             # Role-filtered main application portal
│   ├── login.html                 # User authentication interface
│   ├── register.html              # New user registration form
│   ├── reset-password.html        # Secure password reset interface
│   └── users.html                 # Superadmin/Admin user management and rights dialog
├── src/                           # Backend application modules
│   ├── controllers/               # Business logic controllers
│   ├── middleware/                # Auth guards, role checks, and 36-right validators
│   └── routes/                    # Express API route declarations
├── supabase/                      # Database configuration and migration management
│   ├── config.toml                # Supabase CLI project configuration
│   └── migrations/                # Timestamped, sequential PostgreSQL migrations
├── tests/                         # Automated test scripts
│   └── smoke.test.js              # Server route and syntax smoke test runner
├── index.js                       # Express application entrypoint and server bootstrap
├── package.json                   # Project manifest, scripts, and dependencies
└── README.md                      # Primary project documentation
```

---

## <a id="git-workflow-definition-of-done"></a>🔄 Git Workflow & Definition of Done

To maintain high code quality and zero regressions across all 120 project tasks, team members adhere to strict branching and Pull Request standards:

### <a id="branch-naming-convention"></a>1. Branch Naming Convention
```text
feat/S<Sprint>-<ROLE>-<ID>-<kebab-description>   # Feature development
docs/S<Sprint>-<ROLE>-<ID>-<kebab-description>   # Documentation and planning
test/S<Sprint>-<ROLE>-<ID>-<kebab-description>   # Test plans and test suites
fix/S<Sprint>-<ROLE>-<ID>-<kebab-description>    # Bug fixes and audit alignments
```

### <a id="pull-request-auto-close-requirements"></a>2. Pull Request & Auto-Close Requirements
Every PR title must follow the pattern:
```text
[S#-ROLE-##] Task Title (#<IssueNumber>)
```
The PR description must explicitly include:
- `Closes #<IssueNumber>` (to trigger automatic card movement on the GitHub Project Board)
- A fully checked Definition of Done (DoD) checklist:
  - [x] Branch follows team naming convention
  - [x] Linked to corresponding GitHub Issue
  - [x] Respects soft-delete (`is_deleted`) and audit logging (`stamp` / `audit_log`) rules
  - [x] Enforces 36-right RBAC permissions on client and server
  - [x] Tested locally with zero build or console errors
  - [x] Reviewed and approved by the Scrum Master prior to merging

---

## <a id="license-attribution"></a>📄 License & Attribution

Developed as an academic enterprise software engineering project for **Hope, Inc.**.  
All rights reserved © 2026 **Gerodias PT Team**.
