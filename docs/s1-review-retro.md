# Gerodias PT — Sprint 1 Review & Retrospective Report (Task S1-SM-05)

- **Sprint:** Sprint 1 (Oct 27 – Nov 7, 2026; Completed Nov 9, 2026)
- **Review & Retro Date:** November 9, 2026
- **Scrum Master:** Gerodias, Joey

## 1. Sprint Velocity, PR Metrics & Commit Activity

- **Planned Sprint 1 PRs:** 30 tasks across 5 roles (Developer: 8, DB Admin: 6, Tester: 6, UI/UX: 5, Scrum Master: 5).
- **Completed / Merged Deliverables:** All database migrations (DBA-01 to DBA-06), UI/UX deliverables (UIX-01 to UIX-05), core Developer auth/RBAC/dashboard features (DEV-01 to DEV-08 merged through PRs #92, #93, and #94), QA Test Plan (TST-01), and Scrum Master governance/reports (SM-01 to SM-05).
- **Repository Commit Breakdown (85 Total Commits):**
  - **Joey Gerodias Jr. (Scrum Master):** 47 commits (Repo governance, branch merges, issue templates, sprint docs)
  - **Steven Aborde (Developer):** 19 commits (Express backend, Supabase auth, RBAC, User Management, Dashboard UI)
  - **Kenji Ray Traqueña (DB Admin):** 11 commits (Schema migrations, HOPE base tables, 36-right seed data, audit triggers)
  - **Matthew Henry Young (UI/UX Designer):** 7 commits (Design system tokens, wireframes, high-fidelity mockups)
  - **Hazel Ann Espiso (Tester):** 1 commit (Sprint 1 QA test plan and acceptance criteria)

## 2. Sprint 1 Review (Demo Highlights)

1. **Authentication & Session Lifecycle:** Verified registration flow (/register), login/logout session handling (/login), and redirect guards[cite: 1, 2, 3].
2. **Role-Based Dashboard (/dashboard):** Confirmed live summary metric cards across all core modules (Employees: 32, Departments: 8, Jobs: 14, Job history and salaries: 54, Customers: 82, Products: 57, Price history: 79, Sales: 124, Sales details: 313, Payments: 165) and record browsing filters[cite: 1].
3. **User Management & 36-Right Matrix:** Integrated Admin/Superadmin account controls, pending user approvals, last-superadmin safeguard, per-action module rights assignment, and udit_log tracking.

## 3. Sprint 1 Retrospective

**What Went Well**
- **Database & Design Readiness:** Finishing 100% of DB Admin migrations and UI/UX mockups early unblocked backend and frontend integration.
- **Collaborative PR Verification:** Live local smoke testing by the Scrum Master caught routing edge cases (such as the /register link patch in commit 40e6275 on PR #94) before merging to main[cite: 3, 10].

**What Caused Delays (Nov 7 Target -> Nov 9 Completion)**
- **Late-Sprint PR Bottleneck:** Bundling interdependent Developer tasks (DEV-05 through DEV-08) at the end of Week 2 compressed the QA testing window (TST-02 to TST-06) and pushed final merge verification to November 9.

**Action Items for Sprint 2**
1. Enforce smaller, incremental PR merges by Sprint Day 5 so QA testing runs in parallel rather than waiting for end-of-sprint bundles.
2. Maintain strict branch hygiene by branching directly off main for every single task ID.
