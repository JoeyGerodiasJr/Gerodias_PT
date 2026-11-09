# Gerodias PT — Sprint 1 Mid-Sprint Check & Impediment Log (Task S1-SM-04)

- **Sprint:** Sprint 1 (Oct 27 – Nov 7, 2026; Finalized Nov 9, 2026)
- **Check Date:** November 2, 2026 (Updated through Sprint Close)
- **Scrum Master:** Gerodias, Joey

## 1. Mid-Sprint & Late-Sprint Progress Summary by Role

| Role | Assigned Member | Sprint 1 Planned Tasks | Current Status | Notes / Next Focus |
| :--- | :--- | :--- | :--- | :--- |
| **Scrum Master (SM)** | Gerodias, Joey | S1-SM-01 to S1-SM-05 | **In Progress / Finalizing** | Repo setup, roadmap, working agreement merged; finalizing SM-04 and SM-05 PRs. |
| **UI/UX Designer (UIX)** | Young, Matthew | S1-UIX-01 to S1-UIX-05 | **Completed / Merged** | Design system tokens, wireframes, hi-fi mockups, and usability review completed. |
| **Developer (DEV)** | Aborde, Steven | S1-DEV-01 to S1-DEV-08 | **Completed / Merged** | Scaffold, registration, login/session, user management, superadmin, rights dialog, and RBAC merged via PRs #92, #93, and #94. |
| **DB Admin (DBA)** | Traqueña, Kenji | S1-DBA-01 to S1-DBA-06 | **Completed / Merged** | DB setup, HOPE base tables, user/role/rights schemas, reset tokens, 36-right seed data, and audit triggers merged. |
| **Tester (TST)** | Espiso, Hazel | S1-TST-01 to S1-TST-06 | **In Progress / Executing** | Sprint 1 test plan merged; executing auth, user management, and permission matrix verification. |

## 2. Impediment Log & Resolutions

| ID | Date Logged | Affected Role | Impediment Description | Resolution / Action Taken | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **IMP-01** | 2026-10-26 | Entire Team | Initial repository structure and branches were not aligned with the Task Plan. | Reset repository structure on main, added Copilot instructions, 5 role sub-agents, PR/Issue templates, and 8-week roadmap. | **Resolved** |
| **IMP-02** | 2026-10-27 | Scrum Master | Local VS Code PowerShell did not recognize git in system PATH and had unrelated branch histories. | Added Git cmd to User PATH and rebased branch histories onto main. | **Resolved** |
| **IMP-03** | 2026-10-27 | All Roles | Existing 30 GitHub Issues had blank descriptions and needed role mapping and Acceptance Criteria. | Authored Issue templates with full Acceptance Criteria mapped to all 5 roles. | **Resolved** |
| **IMP-04** | 2026-10-29 | Developer | PowerShell security policy blocked local npm script execution. | Updated execution policy via Set-ExecutionPolicy RemoteSigned -Scope CurrentUser. | **Resolved** |
| **IMP-05** | 2026-11-08 | Dev / SM | Interdependent routes (/dashboard and RBAC permissions) across DEV-06, DEV-07, and DEV-08 delayed Nov 7 target to Nov 9. | Verified and merged PRs #92, #93, and #94 sequentially after local smoke testing of login, logout, and register links. | **Resolved** |
