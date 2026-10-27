# Gerodias PT — Sprint 1 Mid-Sprint Check & Impediment Log (Task S1-SM-04)

- **Sprint:** Sprint 1 (Weeks 1–2: Oct 20, 2026 – Nov 2, 2026)
- **Check Date:** October 26–27, 2026 (Mid-Sprint / Sprint Day 5–6)
- **Scrum Master:** Gerodias, Joey

---

## 1. Mid-Sprint Progress Summary by Role

| Role | Assigned Member | Week 1 Planned Tasks | Current Status | Notes / Next Focus |
| :--- | :--- | :--- | :--- | :--- |
| **Scrum Master (`SM`)** | Gerodias, Joey | `S1-SM-01`, `S1-SM-02`, `S1-SM-03`, `S1-SM-04` | **In Progress / Merged** | Repo reset, Copilot agents, roadmap, and working agreement completed. |
| **UI/UX Designer (`UIX`)** | Young, Matthew | `S1-UIX-01`, `S1-UIX-02`, `S1-UIX-03` | **Ready / In Progress** | Design system tokens and Sprint 1 wireframes (Auth + User Management + Rights dialog). |
| **Developer (`DEV`)** | Aborde, Steven | `S1-DEV-01`, `S1-DEV-02` | **Ready / In Progress** | App scaffold, DB connection, and pending user registration flow. |
| **DB Admin (`DBA`)** | Traqueña, Kenji | `S1-DBA-01` to `S1-DBA-05` | **Ready / In Progress** | Database setup, `HopeDB_audit.sql` base migration, User Mgmt tables, reset tokens, and 36-right seed data. |
| **Tester (`TST`)** | Espiso, Hazel | `S1-TST-01` | **Ready / In Progress** | Sprint 1 QA test plan and acceptance criteria for Auth & 36-right matrix. |

---

## 2. Impediment Log & Resolutions

| ID | Date Logged | Affected Member / Role | Impediment Description | Resolution / Action Taken | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **IMP-01** | 2026-10-26 | Entire Team (`All`) | Initial repository structure and branches were not aligned with the Scrum Master Task Plan (`Gerodias PT.xlsx`). | Reset repository structure on `main`, added `.github/copilot-instructions.md`, 5 role sub-agents, PR/Issue templates, and 8-week module roadmap. | **Resolved** |
| **IMP-02** | 2026-10-27 | Scrum Master (`SM`) | Local VS Code PowerShell did not recognize `git` command in system `PATH` and had unrelated branch commit histories. | Added `C:\Program Files\Git\cmd` to User `PATH` and rebased branch histories onto `main`. | **Resolved** |
| **IMP-03** | 2026-10-27 | All Roles (`All`) | Existing 30 GitHub Issues had blank descriptions and needed role mapping and Acceptance Criteria. | Authored copy-pasteable Issue templates with full Acceptance Criteria mapped to `S1-DEV`, `S1-DBA`, `S1-UIX`, `S1-TST`, and `S1-SM`. | **In Progress** |
