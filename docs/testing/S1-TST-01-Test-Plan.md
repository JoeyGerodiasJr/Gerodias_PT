# Sprint 1 Test Plan and Acceptance Criteria

**Project:** Gerodias PT (Hope, Inc. ERP)  
**Task ID:** S1-TST-01  
**Sprint:** Sprint 1  
**Sprint Duration:** October 27 – November 7, 2026  
**Prepared by:** Hazel Espiso  
**Role:** Test Engineer (TST)  
**Status:** Ready for Review

---

## 1. Introduction

This document presents the testing plan for Sprint 1 of the Gerodias PT (Hope, Inc. ERP) project. It defines the testing objectives, scope, approach, acceptance criteria, test environment, and expected testing deliverables.

Sprint 1 focuses on the system foundation, authentication, and Module 6: User Management. The testing activities aim to verify that the implemented features function according to the Hope, Inc. ERP specifications and the team's agreed requirements.

This test plan will serve as the primary reference for preparing, executing, and documenting Sprint 1 testing activities.

## 2. Testing Objectives

The objectives of Sprint 1 testing are to:

- Verify that implemented features meet their specified requirements.
- Identify and document defects, errors, and unexpected system behavior.
- Verify registration, login, logout, and password reset functionality.
- Check user management operations and their access restrictions.
- Verify the three user roles and all 36 per-action permissions.
- Ensure that permissions are enforced on the server side.
- Verify soft deletion and audit logging according to the project requirements.
- Perform regression testing after relevant fixes and changes.
- Provide testing results and feedback to the development team.

## 3. Scope of Testing

Testing will cover the foundation, authentication, and User Management features scheduled for Sprint 1.

### 3.1 System Foundation

- Verify the application's connection to the PostgreSQL database.
- Check the required database tables and relationships used by Sprint 1 features.
- Verify that applicable database operations work as expected.
- Check the execution of applicable audit log triggers.

### 3.2 Authentication

- User registration with pending account status.
- User login using valid credentials.
- Handling of invalid login credentials.
- User logout.
- Password reset functionality.
- Access restrictions for pending and blocked accounts.

### 3.3 User Management (Module 6)

- Viewing registered user records.
- Approving pending user accounts.
- Blocking and unblocking users.
- Designating an administrator.
- Verifying that user management actions are restricted to authorized roles.
- Checking available user management actions based on assigned permissions.

### 3.4 Role-Based Access Control (RBAC)

- Verification of the three defined roles: User, Admin, and Superadmin.
- Verification of all 36 per-action rights.
- Checking assigned user permissions.
- Testing access restrictions for unauthorized users.
- Verification of the Rights Dialog.
- Checking role-based dashboard and sidebar visibility.
- Verifying that permissions are enforced on the server side and not only through the user interface.

### 3.5 Soft Deletion and Audit Logging

- Verify that applicable deletion operations use the `is_deleted` field instead of physically deleting records.
- Verify that hard `DELETE` and `TRUNCATE` operations are not used.
- Verify that the `stamp` field updates according to the project requirements.
- Check whether applicable audit events are recorded in the `audit_log` table.
- Verify that audit records identify the acting user.
- Check applicable audit log triggers and their recorded information.

### 3.6 Role-Specific User Interface

**Regular User**
- Status and Stamp columns are not displayed.
- Inactive or soft-deleted records are not displayed.

**Admin and Superadmin**
- Active, Inactive, and All tabs are displayed.
- Status badges are displayed.
- Stamp audit strings are displayed.
- Restore buttons are available where applicable.
- Available actions follow the assigned permissions.

## 4. Testing Approach

The following testing methods will be used during Sprint 1:

- **Functional Testing:** Verify that each feature performs its intended function according to the project requirements.
- **Positive Testing:** Check whether the system accepts valid inputs and authorized actions.
- **Negative Testing:** Check how the system handles invalid inputs and unauthorized actions.
- **Permission Testing:** Verify that users can only perform actions allowed by their assigned roles and permissions.
- **Smoke Testing:** Check whether the main application functions, particularly login and the main page, are working.
- **Regression Testing:** Recheck previously tested features after relevant changes or fixes.
- **Database Testing:** Verify database operations, soft deletion, audit logging, and applicable data integrity requirements.
- **Fix Verification:** Retest reported defects after developers provide fixes.

## 5. Test Environment and Tools

| Item | Description |
|---|---|
| Application | Gerodias PT (Hope, Inc. ERP) |
| Frontend and Backend | Next.js |
| Database | PostgreSQL |
| Source Code Repository | GitHub |
| Development Environment | Visual Studio Code |
| Browser | To be confirmed |
| Test Documentation | Markdown and Google Sheets |
| Test Execution | Manual testing and automated smoke testing |
| Defect Tracking | GitHub Issues |
| Collaboration | GitHub Pull Requests and Project Board |

## 6. Acceptance Criteria

The following acceptance criteria are based on the Sprint 1 Roadmap and Team Working Agreement.

### 6.1 System Foundation

- The application connects successfully to the configured PostgreSQL database.
- Required Sprint 1 database tables and operations function as expected.
- Applicable audit log triggers execute when corresponding events occur.

### 6.2 Authentication

- Users can register by providing the required information.
- Newly registered accounts receive a pending status.
- Users with valid and approved credentials can log in successfully.
- Invalid login credentials are handled appropriately.
- Users can log out successfully.
- Password reset follows the expected process.
- Pending and blocked accounts cannot access restricted areas according to the project requirements.

### 6.3 User Management

- Authorized users can view registered user records.
- Authorized users can approve pending accounts.
- Authorized users can block and unblock accounts.
- Authorized users can designate an administrator.
- Unauthorized users cannot perform restricted user management actions.

### 6.4 Role-Based Access Control

- The system recognizes the three defined roles: User, Admin, and Superadmin.
- All 36 per-action permissions are represented according to the approved permissions specification.
- Users can perform only the actions allowed by their assigned permissions.
- Unauthorized actions are rejected by the server, even when attempted outside the normal user interface.
- The Rights Dialog displays and handles permissions correctly.
- The dashboard and sidebar reflect the user's assigned role and permissions.

### 6.5 Soft Deletion and Audit Logging

- Applicable deletion operations update the `is_deleted` field instead of physically removing records.
- Hard `DELETE` and `TRUNCATE` operations are not used.
- The `stamp` field updates according to the project requirements.
- Applicable activities are recorded in the `audit_log` table.
- Audit records correctly identify the acting user.
- Soft-deleted records are handled according to the assigned role and project rules.

### 6.6 Role-Specific User Interface

**Regular User**
- Status and Stamp columns are not displayed.
- Inactive or soft-deleted records are not displayed.

**Admin and Superadmin**
- Active, Inactive, and All tabs are available.
- Status badges are displayed.
- Stamp audit strings are displayed.
- Restore buttons are available where applicable.
- Available actions follow the assigned permissions.

## 7. Entry Criteria

Testing may begin when:

- The feature is implemented and available in the agreed test environment.
- The corresponding development task is ready for testing.
- The necessary test accounts and user permissions are available.
- The expected behavior and acceptance criteria have been provided.
- The database environment is accessible when database testing is required.
- The required test data is available.

## 8. Exit Criteria

Testing for a feature may be considered complete when:

- The planned test cases have been executed.
- Test results have been recorded in the test documentation.
- Identified defects have been reported through the agreed tracking method.
- Critical defects have been fixed or formally acknowledged by the team.
- Reported fixes have been verified through retesting.
- Relevant regression tests have been performed.
- Testing results have been communicated to the Scrum Master and relevant developers.

## 9. Roles and Responsibilities

| Role | Assigned Member | Responsibility |
|---|---|---|
| Scrum Master | Joey Gerodias | Sprint planning, GitHub Project board management, issue tracking, progress monitoring, and sprint reviews. |
| UI/UX Designer | Matthew Young | Design system, wireframes, mockups, accessibility compliance, and usability reviews. |
| Developer | Steven Aborde | Frontend and backend implementation, authentication, session security, CRUD features, and server-side permission enforcement. |
| Database Administrator | Kenji Traqueña | PostgreSQL setup, database migrations, soft-delete and audit log triggers, relational integrity, and SQL optimization. |
| Test Engineer | Hazel Espiso | Sprint test plans, manual and automated test execution, 36-right permission verification, regression testing, defect logging, and fix verification. |

## 10. Testing Deliverables

The following testing deliverables are assigned for Sprint 1:

| Task ID | Deliverable |
|---|---|
| S1-TST-01 | Sprint 1 Test Plan and Acceptance Criteria |
| S1-TST-02 | Authentication Test Cases |
| S1-TST-03 | User Management Test Cases |
| S1-TST-04 | Permission Matrix Tests |
| S1-TST-05 | Automated Smoke Test for Login and Main Page |
| S1-TST-06 | Bug Reports and Fix Verification |

## 11. Risks and Considerations

- Testing may be delayed if features are not yet available in the test environment.
- Changes in project requirements may require updates to the test plan and test cases.
- Missing test accounts or permissions may affect test execution.
- Database changes may affect the behavior of features under testing.
- Permission issues may occur if restrictions are implemented only on the client side.
- Incorrect soft-delete or audit logging behavior may affect data integrity and accountability.
- Defects discovered during testing may require coordination with the Developer and Database Administrator.
- Testing activities and code submissions must follow the team's agreed Git and Pull Request workflow.

## 12. Approval and Review

This test plan is prepared by the Test Engineer for review by the Scrum Master and project team.

The testing scope and acceptance criteria are based on the Sprint 1 Roadmap, Team Working Agreement, and applicable Hope, Inc. ERP project requirements.

Any changes to the approved requirements or implementation must be reflected in the relevant test cases and testing documentation.

Final approval is subject to review and verification by the Scrum Master and project team.