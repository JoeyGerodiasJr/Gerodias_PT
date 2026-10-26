# Global Copilot Instructions — Gerodias PT (Hope, Inc. ERP)

- **Project Name:** Gerodias PT (based on Hope, Inc. ERP)
- **Tech Stack:** Next.js (App Router), Tailwind CSS, Supabase Auth & PostgreSQL Database.
- **User Roles:** `superadmin`, `admin`, `user`. New registrations start as `pending` (`user` role) and require administrator approval.
- **Core Modules (6):** Customers, Products (with Price History), Human Resources (Employees, Jobs, Departments, Job History), Sales (Header, Line Items, Payments), Reports (7 reports with Print/PDF), and User Management (36 per-action rights).
- **Audit & Soft Delete:** Every table includes `is_deleted` (boolean soft-delete flag) and `stamp` (e.g., `ADD system 2026-10-01 09:00 AM`). All mutations are logged in `audit_log`. Hard `DELETE` and `TRUNCATE` are strictly forbidden and blocked by database triggers.
- **Security:** Enable Row Level Security (RLS) / server-side permission checks on every route and action. Hiding a button in the UI is not enough; the server must verify the user's role and 36-right permissions.
- **Git Strategy:** Never commit directly to `main`. Always branch using `<type>/<Task-ID>-<short-description>` (e.g., `feat/S1-DEV-01-project-scaffold`) and open a Pull Request linked to its GitHub Issue.
