# Sprint 1 Automated Smoke Test: Login and Main Page

**Project:** Gerodias PT (Hope, Inc. ERP)  
**Task ID:** S1-TST-05  
**Prepared by:** Hazel Espiso  
**Role:** Test Engineer  
**Status:** Completed (Passed)

## 1. Objective

To verify that the login functionality, main dashboard, user management controls, and server-side route architecture work correctly through automated smoke testing. The tests identify major issues that may prevent users from accessing the system.

## 2. Testing Scope

- Login page accessibility
- Valid login credentials
- Invalid login credentials & blocked status rejection
- Password setup and reset token validation (SHA-256 alignment)
- Successful login redirection
- Main dashboard loading & metric tiles
- Essential page elements & role-based UI controls
- Server-side route authorization middleware
- Logout session termination & cookie destruction

## 3. Test Cases

| Test ID | Test Scenario | Expected Result | Status |
|---|---|---|:---:|
| SMK-SYN | Backend Syntax Validation | `index.js` passes Node syntax validation without parse errors | **PASS** |
| SMK-001 | Open login page | Login page loads successfully with `loginForm` and static route | **PASS** |
| SMK-002 | Login using valid credentials | Login route handler exists and performs bcrypt validation | **PASS** |
| SMK-003 | Login using invalid/blocked credentials | Blocked check enforces HTTP 403 and initial setup checks `$2` hash prefix | **PASS** |
| SMK-004 | Password Reset Flow | Hashed token stored in `password_reset_token` with SHA-256 and fallback | **PASS** |
| SMK-005 | Load main dashboard | Dashboard loads with `metric-card` grid elements and `/dashboard` route | **PASS** |
| SMK-006 | Verify essential page elements | User management modal, 36-right dialog, and role option filtering present | **PASS** |
| SMK-007 | Server-side permission middleware | `checkPermission` enforces RBAC with Superadmin bypass and `user_permission` | **PASS** |
| SMK-008 | Logout from the system | Session destroyed and `connect.sid` cookie cleared | **PASS** |

## 4. Automation Requirements & Runner Configuration

- Executable script: `tests/smoke.test.js`
- Test command in `package.json`: `"test": "node tests/smoke.test.js"`
- Fast execution (<1 second) with no external network side-effects or mutations to production records.

## 5. Test Results

Automated execution via `npm test` on November 13, 2026:

```text
> gerodias_pt@1.0.0 test
> node tests/smoke.test.js

======================================================
 Gerodias PT — Automated Smoke Test Suite (S1-TST-05)
======================================================

  ✔ [SMK-SYN] Backend Syntax Validation (index.js)
  ✔ [SMK-001] Login Page Assets (public/login.html & route)
  ✔ [SMK-002] Login Route Handler & Validation (/api/auth/login)
  ✔ [SMK-003] Blocked User & First-Login Password Guard Verification
  ✔ [SMK-004] Password Reset Flow with SHA-256 Token Hash Alignment
  ✔ [SMK-005] Main Dashboard Template & Metric Tiles (public/dashboard.html)
  ✔ [SMK-006] User Management & Role-Based UI Controls (public/users.html)
  ✔ [SMK-007] Server-Side Permission Middleware (checkPermission & user_permission)
  ✔ [SMK-008] Logout Endpoint Session Lifecycle (/api/auth/logout)

------------------------------------------------------
 Results: 9/9 tests passed (100%)
------------------------------------------------------

✔ All Sprint 1 Smoke Test Scenarios Passed Successfully.
```

**Overall Result:** 9/9 Tests Passed (100%)

## 6. Conclusion

The Sprint 1 automated smoke test suite executed cleanly without errors. All core routes, authentication guards, template assets, and role-based permissions satisfy Sprint 1 Acceptance Criteria and the Hope, Inc. ERP specification.