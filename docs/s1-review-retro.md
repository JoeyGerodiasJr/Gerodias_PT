# Gerodias PT — Sprint 1 Review & Retrospective Report (Task S1-SM-05)

- **Sprint:** Sprint 1 (Oct 27 – Nov 7, 2026; Completed Nov 9, 2026)
- **Review & Retro Date:** November 9, 2026
- **Scrum Master:** Gerodias, Joey

## 1. Sprint Velocity, PR Metrics & Commit Activity

- **Planned Sprint 1 PRs:** 30 tasks across 5 roles (Developer: 8, DB Admin: 6, Tester: 6, UI/UX: 5, Scrum Master: 5).
- **Completed & Merged Deliverables (27 / 30 Tasks Completed - 90%):**
  - **DB Admin (S1-DBA-01 to S1-DBA-06):** 6/6 merged (Database setup, HOPE base tables, user/role/rights schemas, reset tokens, 36-right seed data, audit triggers).
  - **UI/UX Designer (S1-UIX-01 to S1-UIX-05):** 5/5 merged (Design system, wireframes, high-fidelity mockups, usability review).
  - **Developer (S1-DEV-01 to S1-DEV-08):** 8/8 completed and merged into main via foundational PRs and feature PRs #92 (S1-DEV-05), #93 (S1-DEV-06), #94 (S1-DEV-08), and #98 (S1-DEV-07 Rights dialog & udit_log tracking)[cite: 1, 8].
  - **Tester (S1-TST-01 to S1-TST-03):** Sprint 1 Test Plan (S1-TST-01), Authentication Test Cases (S1-TST-02, PR #95 covering 17 test cases), and User Management Test Cases (S1-TST-03, PR #99 covering 13 UI test scenarios) merged; remaining QA tasks (S1-TST-04 to S1-TST-06) executing.
  - **Scrum Master (S1-SM-01 to S1-SM-05):** 5/5 completed (Repo setup, Sprint 1 board/roadmap, working agreement, mid-sprint impediment log, and Sprint 1 review/retro report)[cite: 3, 4, 9].
- **Repository Commit Breakdown (85+ Total Commits):**
  - **Joey Gerodias Jr. (Scrum Master):** 47+ commits (Repo governance, PR merges, issue templates, sprint documentation)
  - **Steven Aborde (Developer):** 21 commits (Express backend, Supabase auth, RBAC, User Management, Rights Dialog PR #98, Dashboard UI)
  - **Kenji Ray Traqueña (DB Admin):** 11 commits (Schema migrations, HOPE base tables, 36-right seed data, audit triggers)
  - **Matthew Henry Young (UI/UX Designer):** 7 commits (Design system tokens, wireframes, high-fidelity mockups)
  - **Hazel Ann Espiso (Tester):** 3 commits (Sprint 1 QA test plan, S1-TST-02 auth test suite in PR #95, and S1-TST-03 User Management test suite in PR #99)

## 2. Sprint 1 Review (Demo Highlights)

1. **Authentication & Session Lifecycle:** Verified registration flow (/register), login/logout session handling (/login), password reset token validation, and redirect guards[cite: 1, 2, 3].
2. **Role-Based Dashboard (/dashboard):** Confirmed live summary metric cards across all core modules (Employees: 32, Departments: 8, Jobs: 14, Job history and salaries: 54, Customers: 82, Products: 57, Price history: 79, Sales: 124, Sales details: 313, Payments: 165) and record browsing filters[cite: 1].
3. **User Management & 36-Right Matrix (PR #98, PR #99):** Integrated Admin/Superadmin account controls, pending user approvals, last-superadmin safeguard, per-action module rights dialog (Customer, Product, Human Resources, Sales, Reports) with module checkboxes, udit_log tracking, and verified QA test passes (UM-001 to UM-013)[cite: 1].
4. **QA Verification (PR #95):** Documented 17 structured authentication test cases in docs/testing/S1-TST-02-Auth-Test-Cases.md with verified passes on login, forgot password link generation, password reset, and reused token rejection.

## 3. Sprint 1 Retrospective

**What Went Well**
- **Database & Design Readiness:** Finishing 100% of DB Admin migrations and UI/UX mockups early unblocked backend and frontend integration.
- **Collaborative PR Verification:** Live local smoke testing by the Scrum Master and structured test case documentation by QA (PR #95, PR #99) ensured clean integration across PRs #92, #93, #94, #98, and #99.

**What Caused Delays (Nov 7 Target -> Nov 9 Completion)**
- **Late-Sprint PR Bottleneck:** Sequencing interdependent Developer tasks (DEV-05 through DEV-08) at the end of Week 2 compressed the QA execution window (TST-02 to TST-06) and pushed final merge verification to November 9.

**Action Items for Sprint 2**
1. Enforce incremental PR merges by Sprint Day 5 so QA testing runs in parallel rather than waiting for end-of-sprint bundles.
2. Complete remaining execution entries for S1-TST-04 through S1-TST-06 against main prior to starting Sprint 2 Customer and Product CRUD modules.
