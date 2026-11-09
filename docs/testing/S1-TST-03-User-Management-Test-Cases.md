    # Sprint 1 User Management Test Cases

    **Project:** Gerodias PT (Hope, Inc. ERP)  
    **Task ID:** S1-TST-03  
    **Issue:** #53  
    **Prepared by:** Hazel Espiso  
    **Role:** Test Engineer  
    **Status:** Draft  
    **Test Environment:** Localhost (`http://localhost:3000`)

    ## 1. Test Objective

    Verify the User Management features, including user access, visibility, editing, account approval and rejection, blocking, deletion, and user rights management.

    ## 2. Test Results

    | Test ID | Test Scenario | Expected Result | Actual Result | Status |
    |---|---|---|---|---|
    | UM-001 | Staff accesses `/users` | Access denied | Displayed: "Access denied: Only Admins or Superadmins can access User Management." | PASS |
    | UM-002 | Administrator opens User Management | Page opens successfully | Administrator accessed the User Management page. | PASS |
    | UM-003 | Administrator views Superadmin accounts | Superadmin accounts are hidden | Superadmin accounts did not appear in the Administrator's user table. | PASS |
    | UM-004 | Administrator opens Add User form | Form displays required fields and role options | First Name, Last Name, Email Address, and Role fields were displayed. | PASS |
    | UM-005 | Administrator attempts to create a Superadmin account | Administrator must not be able to assign unauthorized Superadmin privileges | Test account appeared as User with Pending status. The selected role and server-side behavior require further verification. | NEEDS VERIFICATION |
    | UM-006 | Administrator edits a Staff account | Administrator must not gain unauthorized role privileges | Superadmin appeared as a selectable role in the Edit User dropdown. No changes were saved. | NEEDS VERIFICATION |
    | UM-007 | Administrator clicks Block | Confirmation prompt appears | Displayed: "Are you sure you want to block this user?" | PASS |
    | UM-008 | Superadmin views User Management | Superadmin can view user accounts, including other Superadmins | Both Superadmin accounts and other user roles were visible. | PASS |
    | UM-009 | Superadmin clicks Reject on a pending account | Confirmation prompt appears | Displayed: "Reject the pending user acc?" | PASS |
    | UM-010 | Superadmin opens Edit User | Edit form displays user details and role options | First Name, Last Name, Email Address, and Role were displayed. | PASS |
    | UM-011 | Superadmin opens User Rights | Permission modules and individual permissions are displayed | Customer Management, Product Management, Human Resources, Sales, and Reports were displayed with their permissions. | PASS |
    | UM-012 | Superadmin clicks Delete | Confirmation prompt appears | Displayed: "Are you sure you want to delete?" | PASS |
    | UM-013 | Superadmin clicks Approve on a pending account | Confirmation prompt appears | Displayed: "Approve this pending acc?" | PASS |

    ## 3. Not Tested / Blocked Test Cases

    | Test ID | Test Scenario | Reason |
    |---|---|---|
    | UM-014 | Confirm user approval | Confirmation was canceled to preserve the test account. |
    | UM-015 | Confirm user rejection | Confirmation was canceled to preserve the test account. |
    | UM-016 | Confirm user blocking | Confirmation was canceled to avoid affecting an actual team member. |
    | UM-017 | Verify user unblocking | No account was blocked during testing. |
    | UM-018 | Confirm user deletion and verify soft deletion | Confirmation was canceled to preserve the account. |
    | UM-019 | Verify last-Superadmin protection | Requires an approved disposable test setup and authorization. |
    | UM-020 | Verify audit trail (`stamp` / `audit_log`) | Requires approved operations that modify user records and access to audit records. |
    | UM-021 | Verify server-side role and permission enforcement | Requires additional authorized API testing. |
    | UM-022 | Verify Admin cannot edit or manage Superadmin accounts | Superadmin accounts were hidden from Admin view; further authorized API verification is needed. |

    ## 4. Observations and Issues

    1. Staff accounts cannot access the User Management page.
    2. Administrators can access User Management but cannot see Superadmin accounts.
    3. Superadmins can see both Superadmin accounts and other user accounts.
    4. The Superadmin role appeared in the Administrator's Add User and Edit User role options. Server-side enforcement still needs verification.
    5. The logged-in Superadmin account displayed only the Edit action beside its own account.
    6. User Rights displayed five permission modules with individual permission options.
    7. Approval, rejection, blocking, and deletion displayed confirmation prompts before proceeding.

    ## 5. Overall Test Summary

    The initial UI testing confirmed that the main User Management page, role visibility restrictions, edit form, user rights modal, and action confirmation prompts are available.

    However, several operations were intentionally not completed to avoid modifying or deleting actual team accounts. Security enforcement, audit trail behavior, and the last-Superadmin protection still require further verification.

    **Overall Status:** Draft / Partially Tested

