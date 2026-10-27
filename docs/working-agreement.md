# Gerodias PT — Team Working Agreement, Role Guide & Definition of Done

## 1. Team Roles & Responsibilities

| Role | Assigned Member | Primary Responsibilities |
| :--- | :--- | :--- |
| **Scrum Master (`SM`)** | **Gerodias, Joey** | Sprint planning, GitHub Project board curation, issue authoring, velocity & burndown tracking, mid-sprint impediment removal, sprint reviews & retrospectives. |
| **UI/UX Designer (`UIX`)** | **Young, Matthew** | Design system tokens (colors, typography, badges), wireframes, high-fidelity mockups, WCAG AA accessibility compliance, and usability reviews of implemented screens. |
| **Developer (`DEV`)** | **Aborde, Steven** | Next.js frontend/backend implementation, authentication & session security, CRUD screens, modal dialogs, and enforcing role & per-action permissions on both UI and server APIs. |
| **DB Admin (`DBA`)** | **Traqueña, Kenji** | PostgreSQL database setup, schema migrations (`HopeDB_audit.sql`), soft-delete & `audit_log` triggers, relational integrity constraints, seed scripts, and SQL query optimization. |
| **Tester (`TST`)** | **Espiso, Hazel** | Sprint test plans, manual and automated test execution, 36-right permission matrix verification, regression testing, defect logging, and fix verification. |

## 2. Git & Pull Request Workflow
1. **One Task ID = One Pull Request:** Every row in `Gerodias PT.xlsx` corresponds to exactly one GitHub Issue and one merged Pull Request.
2. **No Direct Commits to `main`:** All work must be done on a feature branch created from the latest `main`.
3. **Branch Naming Convention:**
   - Features/Code: `feat/<Task-ID>-<short-slug>` (e.g., `feat/S1-DEV-01-project-scaffold`)
   - Database/SQL: `db/<Task-ID>-<short-slug>` (e.g., `db/S1-DBA-02-base-tables`)
   - UI/UX & Docs: `docs/<Task-ID>-<short-slug>` (e.g., `docs/S1-SM-02-roadmap`)
   - QA/Tests: `test/<Task-ID>-<short-slug>` (e.g., `test/S1-TST-01-test-plan`)
4. **Commit Message Format:** `<type>(<Task-ID>): <concise summary>` (e.g., `docs(S1-SM-02): add sprint roadmap and working agreement`).

## 3. Definition of Done (DoD)
A task is only marked **Merged (Done)** when all of the following are true:
- [ ] **Requirement Alignment:** All Acceptance Criteria on the GitHub Issue are satisfied according to the *Hope, Inc. ERP Student Guide*.
- [ ] **Soft Delete & Audit Compliance:** No hard `DELETE` or `TRUNCATE` statements are used; `is_deleted` and `stamp` columns update properly, and `audit_log` records the acting user.
- [ ] **Role & Rights Security:**
  - Regular `User` views never display `Status` or `Stamp` columns or soft-deleted (`Inactive`) rows.
  - `Admin` and `Superadmin` views display `Active / Inactive / All` tabs, `Status` badges, `Stamp` audit strings, and `Restore` buttons.
  - All 36 per-action permissions are checked on the server, not just hidden on the client.
- [ ] **Code Quality & Review:** PR template is completed, linked to the Issue (`Closes #X`), reviewed by at least 1 teammate, and passes QA verification without regressions.
