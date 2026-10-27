# Gerodias PT (Hope, Inc. ERP) — 12-Day Sprint & Module Roadmap

## 1. Project Overview
**Gerodias PT** is a database-driven Enterprise Resource Planning (ERP) web system built on the **Hope, Inc. ERP** specification. It unifies 6 core business modules under a single relational database with role-based access control (3 roles, 36 per-action rights), soft deletion (`is_deleted`), and automated audit logging (`stamp` and `audit_log`).

## 2. Team Roster & PR Targets
Project start date: **October 27, 2026**. Each task in the Sprint Plan equals **1 Pull Request (PR)** (30 PRs per sprint = 120 total PRs).

| Role | Team Member | S1 PRs | S2 PRs | S3 PRs | S4 PRs | Total PRs |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Scrum Master (`SM`)** | Gerodias, Joey | 5 | 5 | 5 | 5 | **20** |
| **UI/UX Designer (`UIX`)** | Young, Matthew | 5 | 5 | 5 | 5 | **20** |
| **Developer (`DEV`)** | Aborde, Steven | 8 | 8 | 8 | 8 | **32** |
| **DB Admin (`DBA`)** | Traqueña, Kenji | 6 | 6 | 6 | 6 | **24** |
| **Tester (`TST`)** | Espiso, Hazel | 6 | 6 | 6 | 6 | **24** |
| **Team Total** | **5 Members** | **30** | **30** | **30** | **30** | **120** |

## 3. Mapping All 6 Guide Modules Across 4 Sprints (12 Days per Sprint)

| Sprint | Calendar Dates | Modules Covered | Key Deliverables & Database Tables |
| :--- | :---: | :--- | :--- |
| **Sprint 1** | Oct 27 – Nov 7, 2026 | **Foundation, Auth & Module 6: User Management** | Base schema (`HopeDB_audit.sql`), `audit_log` triggers, Registration (pending status), Login/Logout, Password Reset, User Management screen (Approve, Block/Unblock, Designate Admin), Rights Dialog (36 per-action rights), Role-based Dashboard & Sidebar (`app_user`, `role`, `module`, `rights`, `user_permission`). |
| **Sprint 2** | Nov 8 – Nov 19, 2026 | **Module 1: Customers & Module 2: Products + Price History** | Full CRUD, search, Active/Inactive filters, soft delete & restore, child-record delete checks, and effective-date price history lookup (`customer`, `product`, `pricehist`). |
| **Sprint 3** | Nov 20 – Dec 1, 2026 | **Module 3: Human Resources** | Departments CRUD, Jobs CRUD, Employees CRUD (with separation date vs. soft-delete status), Job History promotions/transfers timeline, and salary visibility protection (`department`, `job`, `employee`, `jobhistory`). |
| **Sprint 4** | Dec 2 – Dec 13, 2026 | **Module 4: Sales & Payments + Module 5: Reports + Audit Viewer** | Master-detail Sales transactions (`sales`, `salesdetail`), historical unit price auto-fill as of sale date, Official Receipt payments & customer balance views (`payment`), all 7 Reports with date range/Top N filters and Print/Save as PDF, plus Superadmin `audit_log` viewer. |
