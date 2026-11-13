# Sprint 2 Planning Notes, Backlog & Project Board (Task S2-SM-01)

- **Sprint:** Sprint 2 (November 8 – November 19, 2026)
- **Scrum Master:** Gerodias, Joey
- **Task ID:** `S2-SM-01`
- **Issue:** Closes #128
- **Milestone:** Sprint 2 (30 Tasks / 30 PRs Total)
- **Branch:** `docs/S2-SM-01-planning-and-board`

---

## 1. Sprint 2 Goal & Objectives

> **Sprint 2 Goal:** Implement, test, and deliver robust, production-grade business operations for **Module 1: Customers** and **Module 2: Products + Effective-Date Price History** (`customer`, `product`, `pricehist`), strictly governed by Hope, Inc. ERP role-based access control (36 per-action rights), soft delete/restore compliance, child-record referential integrity checks, and automated audit logging.

### Key Objectives
1. **Module 1 (Customers):** Provide customer list with live search, Active/Inactive/All filters, Add/Edit modals with input validation (`payTerms`), soft delete with child sales check, and restore functionality.
2. **Module 2 (Products):** Provide product catalog with search, unit constraints (`unit`), Add/Edit modals, soft delete with child salesdetail/pricehist checks, and restore functionality.
3. **Price History Engine:** Implement effective-date price lookup (`effDate <= asOfDate`), allowing users to record, edit, and view chronological unit price adjustments for each product.
4. **Security & Auditing:** Enforce per-action rights on both UI elements and backend Express routes, logging every insert, update, and soft deletion into `audit_log` with user stamping (`stamp` / `audit_user()`).
5. **Quality & Usability Assurance:** Complete comprehensive test suites (customer, product, soft-delete, and permission matrix tests) and conduct WCAG AA usability reviews on built screens.

---

## 2. Team Role Capacity & PR Targets (30 PRs Total)

In accordance with our Team Working Agreement and 12-day sprint cadence, each planned task represents exactly **1 Pull Request (PR)**.

| Role | Team Member | GitHub Handle | Sprint 2 Target PRs | Cumulative PRs (S1 + S2) | Primary Focus Areas |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Developer (`DEV`)** | Aborde, Steven | `@StevenAborde17` | **8** | 16 | Express CRUD API routes, UI screens, search/filter logic, price engine |
| **DB Admin (`DBA`)** | Traqueña, Kenji | `@KenjiRayTraquena` | **6** | 12 | Active views, date-effective pricing query, child-record check triggers, seed data |
| **Tester (`TST`)** | Espiso, Hazel | `@hazelespiso` | **6** | 12 | Customer & Product test cases, child-record delete tests, permission matrix, regression |
| **UI/UX Designer (`UIX`)** | Young, Matthew | `@MatthewYoung23` | **5** | 10 | Wireframes, hi-fi mockups, empty/error/confirm dialog states, usability reviews |
| **Scrum Master (`SM`)** | Gerodias, Joey | `@JoeyGerodiasJr` | **5** | 10 | Sprint 2 planning & board, retro follow-up, mid-sprint impediment removal, review/retro |
| **Team Total** | **5 Members** | — | **30 PRs** | **60 PRs** | **100% Sprint 2 Scope** |

---

## 3. Complete 30-Task Sprint 2 Backlog Table

All 30 tasks are tracked on the GitHub Project Board under milestone **Sprint 2** mapped to live GitHub Issues `#103` through `#132`:

| Task ID | Issue | Role | Assignee | Task Title & Scope | Target Day |
| :--- | :---: | :---: | :--- | :--- | :---: |
| `S2-DEV-01` | [#103](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/103) | DEV | Steven Aborde | Customer list with search and filter (permission-checked) | Day 2 |
| `S2-DEV-02` | [#104](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/104) | DEV | Steven Aborde | Customer create and edit form | Day 3 |
| `S2-DEV-03` | [#105](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/105) | DEV | Steven Aborde | Customer soft delete and restore | Day 4 |
| `S2-DEV-04` | [#106](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/106) | DEV | Steven Aborde | Product list with search and filter | Day 5 |
| `S2-DEV-05` | [#107](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/107) | DEV | Steven Aborde | Product create and edit form | Day 6 |
| `S2-DEV-06` | [#108](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/108) | DEV | Steven Aborde | Product soft delete and restore | Day 7 |
| `S2-DEV-07` | [#109](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/109) | DEV | Steven Aborde | Price history: add, edit and delete price with effective date | Day 8 |
| `S2-DEV-08` | [#110](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/110) | DEV | Steven Aborde | Current-price display on product page; per-action rights checks (Add/Edit/Delete) | Day 9 |
| `S2-DBA-01` | [#111](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/111) | DBA | Kenji Traqueña | Customer and product active views, indexes | Day 1 |
| `S2-DBA-02` | [#112](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/112) | DBA | Kenji Traqueña | Query: current price as of a given date | Day 2 |
| `S2-DBA-03` | [#113](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/113) | DBA | Kenji Traqueña | Validation constraints (payTerms, unit) | Day 3 |
| `S2-DBA-04` | [#114](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/114) | DBA | Kenji Traqueña | Verify child-record delete checks for customer and product | Day 4 |
| `S2-DBA-05` | [#115](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/115) | DBA | Kenji Traqueña | Demo data for customer, product, price history | Day 5 |
| `S2-DBA-06` | [#116](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/116) | DBA | Kenji Traqueña | Search performance check and index tuning | Day 7 |
| `S2-TST-01` | [#117](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/117) | TST | Hazel Espiso | Test cases: customer module | Day 3 |
| `S2-TST-02` | [#118](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/118) | TST | Hazel Espiso | Test cases: product and price history | Day 5 |
| `S2-TST-03` | [#119](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/119) | TST | Hazel Espiso | Soft delete/restore tests, incl. delete blocked by active children | Day 7 |
| `S2-TST-04` | [#120](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/120) | TST | Hazel Espiso | Per-right permission tests for customer and product (Add/Edit/Delete, price rights) | Day 8 |
| `S2-TST-05` | [#121](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/121) | TST | Hazel Espiso | Regression test of Sprint 1 (Auth, User Management, Session) | Day 9 |
| `S2-TST-06` | [#122](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/122) | TST | Hazel Espiso | Bug reports and fix verification | Day 10 |
| `S2-UIX-01` | [#123](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/123) | UIX | Matthew Young | Wireframes: customer screens | Day 1 |
| `S2-UIX-02` | [#124](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/124) | UIX | Matthew Young | Wireframes: product and price history screens | Day 2 |
| `S2-UIX-03` | [#125](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/125) | UIX | Matthew Young | Hi-fi mockups and handoff notes | Day 4 |
| `S2-UIX-04` | [#126](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/126) | UIX | Matthew Young | Empty, error and confirm-delete states | Day 6 |
| `S2-UIX-05` | [#127](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/127) | UIX | Matthew Young | Usability review of built screens | Day 10 |
| `S2-SM-01` | [#128](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/128) | SM | Joey Gerodias Jr. | Sprint 2 planning notes and board | Day 1 |
| `S2-SM-02` | [#129](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/129) | SM | Joey Gerodias Jr. | Follow up Sprint 1 retro actions (Completed & Merged) | Day 1 |
| `S2-SM-03` | [#130](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/130) | SM | Joey Gerodias Jr. | Mid-sprint check and impediment log | Day 6 |
| `S2-SM-04` | [#131](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/131) | SM | Joey Gerodias Jr. | Update velocity and burndown | Day 11 |
| `S2-SM-05` | [#132](https://github.com/JoeyGerodiasJr/Gerodias_PT/issues/132) | SM | Joey Gerodias Jr. | Sprint 2 review and retrospective report | Day 12 |

---

## 4. Sprint 2 12-Day Execution Schedule

- **Day 1 (Sun, Nov 8):** `S2-SM-01`, `S2-SM-02` *(Merged)*, `S2-DBA-01`, `S2-UIX-01`
- **Day 2 (Mon, Nov 9):** `S2-DEV-01`, `S2-DBA-02`, `S2-UIX-02`
- **Day 3 (Tue, Nov 10):** `S2-DEV-02`, `S2-DBA-03`, `S2-TST-01`
- **Day 4 (Wed, Nov 11):** `S2-DEV-03`, `S2-DBA-04`, `S2-UIX-03`
- **Day 5 (Thu, Nov 12):** `S2-DEV-04`, `S2-DBA-05`, `S2-TST-02`
- **Day 6 (Fri, Nov 13):** `S2-DEV-05`, `S2-UIX-04`, `S2-SM-03` *(Mid-Sprint Check)*
- **Day 7 (Sat, Nov 14):** `S2-DEV-06`, `S2-DBA-06`, `S2-TST-03`
- **Day 8 (Sun, Nov 15):** `S2-DEV-07`, `S2-TST-04`
- **Day 9 (Mon, Nov 16):** `S2-DEV-08`, `S2-TST-05`
- **Day 10 (Tue, Nov 17):** `S2-TST-06`, `S2-UIX-05`
- **Day 11 (Wed, Nov 18):** `S2-SM-04` *(Velocity & Burndown Check)*
- **Day 12 (Thu, Nov 19):** `S2-SM-05` *(Sprint 2 Review & Retrospective)*

---

## 5. Definition of Done (DoD) Checklist

Every Sprint 2 Pull Request must satisfy:
- [x] **Single-Task Alignment:** Exactly 1 GitHub Issue per Pull Request (`Closes #X`).
- [x] **Relational Schema Compliance:** Uses established `customer`, `product`, and `pricehist` tables with soft delete (`is_deleted = true/false`) and audit stamping (`stamp = 'ADD/EDIT/DELETE <user> <timestamp>'`).
- [x] **No Hard Deletes:** `DELETE` and `TRUNCATE` operations are blocked by PostgreSQL triggers.
- [x] **Child-Record Guards:** Prevent soft deleting customers with sales, or products with sales details / price history.
- [x] **Role & Rights Protection:** 
  - Standard Users only see Active records without status or stamp columns.
  - Admins and Superadmins have access to Active/Inactive/All filters and Restore buttons.
  - Backend API verifies per-action rights (`can_add_customer`, `can_edit_customer`, `can_delete_customer`, `can_add_product`, `can_edit_product`, `can_delete_product`, `can_add_price`, `can_edit_price`, `can_delete_price`).
- [x] **Automated Testing:** Passes existing automated smoke test suite (`npm test`).
