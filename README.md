# Gerodias PT — Enterprise Resource Planning & Management System

![Sprint 1 Status](https://img.shields.io/badge/Sprint_1-100%25_Merged_(30%2F30)-brightgreen)
![Node.js](https://img.shields.io/badge/Backend-Node.js_%7C_Express-339933)
![Database](https://img.shields.io/badge/Database-Supabase_PostgreSQL-3ECF8E)
![Security](https://img.shields.io/badge/RBAC-36--Right_Catalogue-blue)

A role-based Enterprise Resource Planning (ERP) web application engineered with **Node.js (Express.js)**, a responsive client-side dashboard, and a shared cloud **Supabase PostgreSQL** database. Built with strict module-level Role-Based Access Control (RBAC), per-action permissions, session tracking, and automated database audit logging.

---

## Team Roster & Responsibilities

| Member Name | Role | GitHub Handle | Core Responsibilities |
| :--- | :--- | :--- | :--- |
| **Joey Gerodias Jr.** | Scrum Master | `@JoeyGerodiasJr` | Sprint governance, project boards, velocity tracking, PR reviews, and documentation |
| **Steven Aborde** | Backend Developer | `@StevenAborde17` | Express API routes, authentication/session middleware, RBAC enforcement, and frontend wiring |
| **Kenji Ray Traqueña** | DB Admin | `@KenjiRayTraquena` | Supabase schema migrations, SQL views, constraints, indexing, and audit triggers |
| **Matthew Henry Young** | UI/UX Designer | `@MatthewYoung23` | Design system tokens, wireframes, high-fidelity mockups, and usability reviews |
| **Hazel Ann Espiso** | Tester / QA | `@hazelespiso` | Test plans, 36-right permission matrix verification, smoke testing, and bug tracking |

---

## 8-Week Sprint Roadmap & Milestone Status

| Sprint | Timeline | Core ERP Modules & Deliverables | Target PRs | Status |
| :--- | :--- | :--- | :---: | :---: |
| **Sprint 1** | Weeks 1–2 | Authentication, Registration, Password Reset, User Management, 36-Right Dialog, Role-Based Dashboard | 30 | **100% Merged (30/30)** |
| **Sprint 2** | Weeks 3–4 | Customer CRUD, Product CRUD, Effective-Date Price History, Child-Record Delete Guards | 30 | In Progress |
| **Sprint 3** | Weeks 5–6 | Human Resources (Departments, Jobs, Employees, Job History Timeline, Salary Visibility Rights) | 30 | Planned |
| **Sprint 4** | Weeks 7–8 | Sales Transactions, Line Items, Payments & Balances, 7 Printable PDF Reports, Superadmin Audit Viewer | 30 | Planned |

---

## System Architecture & Security Highlights

* **Role Hierarchy & Account Guards:** Supports `Superadmin`, `Admin`, and `User` roles. New registrations default to `pending` until approved by a Superadmin. Admins manage standard Users only (Superadmin accounts are hidden from Admin views), and a server-side guard prevents removing or blocking the last remaining Superadmin.
* **36-Right Per-Action Matrix:** Granular permission checks across five modules (`Customer`, `Product`, `Human Resources`, `Sales`, `Reports`) enforced on both client-side UI elements and server-side API endpoints.
* **Redacted Audit Logging:** Every state-changing operation and permission update is recorded in `audit_log` via `audit_user()` triggers while redacting sensitive credentials and tokens.

---

## Local Application Quickstart

1. **Clone the repository and install dependencies:**
   ```bash
   git clone [https://github.com/JoeyGerodiasJr/Gerodias_PT.git](https://github.com/JoeyGerodiasJr/Gerodias_PT.git)
   cd Gerodias_PT
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file in the root directory (ask the Scrum Master or Backend Developer for the team values — **never commit `.env` to GitHub**):
   ```env
   PORT=3000
   SUPABASE_URL=your_project_url
   SUPABASE_ANON_KEY=your_anon_key
   DATABASE_URL=your_supabase_connection_string
   SESSION_SECRET=your_session_secret
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```
   Open `http://localhost:3000` in your browser.

---

## Database Setup (Supabase, no Docker)

The database is managed with SQL migration files in `supabase/migrations/`.
The **DB Admin (Traqueña, Kenji Ray)** is the only person who applies migrations to the shared Supabase project.

### Prerequisites
- Git and VS Code
- Supabase CLI 
- The database password, which you get from the DB Admin privately. **Never commit it or paste it in GitHub.**

### One-time setup
1. Clone the repo and open it in VS Code.
2. Log in to Supabase (a browser window opens; paste the verification code into the terminal):
   ```bash
   supabase login
   ```
3. Link the CLI to the team project:
   ```bash
   supabase link --project-ref ntwvaxvaxsxhecssltgh
   ```
   Paste the database password when asked. The cursor will not move while you type; this is normal.
4. Verify the connection:
   ```bash
   supabase migration list --linked
   ```
   You should see a table of migrations and no errors.

### Day-to-day commands
| Task | Command | Who |
| :--- | :--- | :---: |
| See applied migrations | `supabase migration list --linked` | Everyone |
| Create a migration file | `supabase migration new <name>` | DB Admin |
| Preview changes | `supabase db push --linked --dry-run` | DB Admin |
| Apply migrations | `supabase db push --linked` | **DB Admin only** |

### Rules
- Only the DB Admin runs `supabase db push` against the shared project.
- Never edit a migration that has already been applied. Create a new one instead.
- Never commit passwords, `.env` files, or API keys.
- Need a schema change? Open a GitHub issue for the DB Admin.

### Do not use (these need Docker)
`supabase start`, `supabase db reset`, `supabase db diff`, `supabase db pull`

### Folder layout
```text
supabase/
  config.toml        CLI configuration
  migrations/        Timestamped SQL files, applied in order
```

### Troubleshooting
- **Password authentication failed:** the database password is wrong. Ask the DB Admin.
- **Connection timeout or IPv6 error:** try a different network, then re-run `supabase link`.
- **"Cannot connect to the Docker daemon":** you ran a Docker-only command (see the list above).
- **Yellow `--linked` warning:** harmless. Always add `--linked` so commands target the shared project.

---

## Repository Directory Structure

```text
Gerodias_PT/
├── .github/                  # PR templates, issue templates, and agent configurations
├── docs/                     # Sprint governance logs, review/retro reports, and roadmaps
│   └── testing/              # QA test plans, permission matrix tests, and smoke test suites
├── public/                   # Frontend HTML views, CSS design tokens, and client scripts
├── src/                      # Express backend server, routes, controllers, and RBAC middleware
├── supabase/
│   ├── config.toml           # Supabase CLI configuration
│   └── migrations/           # Sequential SQL schema and seed migrations
└── README.md                 # Project documentation and setup guide
```
