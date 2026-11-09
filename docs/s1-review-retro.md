# Gerodias PT — Sprint 1 Review & Retrospective Report (Task S1-SM-05)

- **Sprint:** Sprint 1 (Oct 27 – Nov 7, 2026; Completed Nov 9, 2026)
- **Review & Retro Date:** November 9, 2026
- **Scrum Master:** Gerodias, Joey

## 1. Sprint Velocity, PR Metrics & Commit Activity

- **Planned Sprint 1 PRs:** 30 tasks across 5 roles (Developer: 8, DB Admin: 6, Tester: 6, UI/UX: 5, Scrum Master: 5).
- **Completed / Merged Deliverables:**
  - **DB Admin (S1-DBA-01 to S1-DBA-06):** 6/6 merged (Database setup, HOPE base tables, user/role/rights schemas, reset tokens, 36-right seed data, audit triggers).
  - **UI/UX Designer (S1-UIX-01 to S1-UIX-05):** 5/5 merged (Design system, wireframes, high-fidelity mockups, usability review).
  - **Developer (S1-DEV-01 to S1-DEV-08):** 8/8 completed and merged into main via foundational PRs and bundled feature PRs (#92, #93, #94).
  - **Tester (S1-TST-01, S1-TST-02):** Sprint 1 Test Plan (S1-TST-01) and Authentication Test Cases (S1-TST-02, PR #95 covering 17 test cases across Registration, Login, Logout, Password Setup, Forgot Password, and Reset Password) merged; remaining RBAC/UI test execution (S1-TST-03 to S1-TST-06) in progress.
  - **Scrum Master (S1-SM-01 to S1-SM-05):** 5/5 completed (Repo setup, Sprint 1 board/roadmap, working agreement, mid-sprint impediment log, and Sprint 1 review/retro report).
- **Repository Commit Breakdown:**
  - **Joey Gerodias Jr. (Scrum Master):** 47+ commits (Repo governance, PR merges, issue templates, sprint documentation)
  - **Steven Aborde (Developer):** 19 commits (Express backend, Supabase auth, RBAC, User Management, Dashboard UI)
  - **Kenji Ray Traqueña (DB Admin):** 11 commits (Schema migrations, HOPE base tables, 36-right seed data, audit triggers)
  - **Matthew Henry Young (UI/UX Designer):** 7 commits (Design system tokens, wireframes, high-fidelity mockups)
  - **Hazel Ann Espiso (Tester):** 2 commits (Sprint 1 QA test plan and S1-TST-02 370-line authentication test suite in PR #95)

## 2. Sprint 1 Review (Demo Highlights)

1. **Authentication & Session Lifecycle:** Verified registration flow (/register), login/logout session handling (/login), password reset token validation (rejecting reused tokens), and redirect guards.
2. **Role-Based Dashboard (/dashboard):** Confirmed live summary metric cards across all core modules (Employees: 32, Departments: 8, Jobs: 14, Job history and salaries: 54, Customers: 82, Products: 57, Price history: 79, Sales: 124, Sales details: 313, Payments: 165) and record browsing filters.
3. **User Management & 36-Right Matrix:** Integrated Admin/Superadmin account controls, pending user approvals, last-superadmin safeguard, per-action module rights assignment, and udit_log tracking.
4. **QA Verification (S1-TST-02):** Documented 17 structured authentication test cases in docs/testing/S1-TST-02-Auth-Test-Cases.md (PR #95) with verified passes on valid login (TC-LOG-01), forgot password link generation (TC-FGT-01), valid token password reset (TC-RST-01), and reused token rejection (TC-RST-03).

## 3. Sprint 1 Retrospective

**What Went Well**
- **Database & Design Readiness:** Finishing 100% of DB Admin migrations and UI/UX mockups early unblocked backend and frontend integration.
- **Collaborative PR Verification:** Live local smoke testing by the Scrum Master and structured test case documentation by QA (PR #95) caught routing edge cases (such as the /register link patch in commit 40e6275 on PR #94) before final sign-off.

**What Caused Delays (Nov 7 Target -> Nov 9 Completion)**
- **Late-Sprint PR Bottleneck:** Bundling interdependent Developer tasks (DEV-05 through DEV-08) at the end of Week 2 compressed the QA execution window (TST-02 to TST-06) and pushed final merge verification to November 9.

**Action Items for Sprint 2**
1. Enforce incremental PR merges by Sprint Day 5 so QA testing runs in parallel rather than waiting for end-of-sprint bundles.
2. Complete remaining execution entries for S1-TST-02 through S1-TST-06 against the newly merged main branch prior to starting Sprint 2 Customer and Product CRUD modules.
