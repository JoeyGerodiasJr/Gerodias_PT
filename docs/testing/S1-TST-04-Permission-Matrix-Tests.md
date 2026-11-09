# Sprint 1 Permission Matrix Tests

**Project:** Gerodias PT (Hope, Inc. ERP)  
**Task ID:** S1-TST-04  
**Prepared by:** Hazel Espiso  
**Role:** Test Engineer  
**Status:** Draft

## 1. Objective

To verify that the system correctly enforces role-based access control for Superadmin, Admin, and User accounts.

## 2. Testing Scope

- Sidebar menu visibility
- Page and module access
- Action button permissions
- Server/API authorization
- Unauthorized access prevention
- Permission enforcement across all three roles

## 3. Test Roles

| Role | Description |
|---|---|
| Superadmin | Full system access |
| Admin | Access based on assigned administrative permissions |
| User | Access based on assigned user permissions |

## 4. Test Cases

Test all 36 per-action permissions according to the project's permission matrix.

## 5. Expected Results

- Unauthorized modules must not appear in the sidebar.
- Unauthorized action buttons must not be accessible.
- Direct API requests must reject unauthorized actions.
- Authorized actions must work according to assigned permissions.
- Permission restrictions must be consistently enforced on both frontend and backend.

## 6. Test Results

To be completed after execution.

## 7. Conclusion

To be completed after all permission matrix tests have been performed.