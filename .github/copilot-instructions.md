# Global Copilot Instructions

- Tech Stack: Next.js (App Router), Tailwind CSS, Supabase Auth & Database.
- User Roles: superadmin, admin, user. Default role for all signups in DEV is 'superadmin'.
- Security: Enable Row Level Security (RLS) on all Supabase tables.
- Git Strategy: Never commit directly to main branch. Always create feature branches.

## Gerodias PT (Hope, Inc. ERP) Sprint & Schema Rules
- Modules (6): Customers, Products (with Price History), Human Resources, Sales (with Payments), Reports (7 printable/PDF reports), and User Management (36 per-action rights).
- Seeded Team Accounts (S1-DBA-05): All 5 team members default to 'superadmin' in seed data; public registration form (S1-DEV-02) creates 'user' accounts starting as 'pending'.
- Soft Delete & Audit Trail (HopeDB_audit.sql): Every table uses `is_deleted` (soft delete) and `stamp` (`ACTION user YYYY-MM-DD HH:MI AM`), logged automatically to `audit_log`. Hard DELETE and TRUNCATE are blocked by triggers.
