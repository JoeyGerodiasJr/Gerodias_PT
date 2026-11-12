# Sprint 1 Permission Matrix Tests

**Project:** Gerodias PT (Hope, Inc. ERP)  
**Task ID:** S1-TST-04  
**Prepared by:** Hazel Espiso  
**Role:** Test Engineer  
**Status:** Completed (Passed)

## 1. Objective

To verify that the system correctly enforces role-based access control for Superadmin, Admin, and User accounts across all 36 granular permissions and 5 core modules.

## 2. Testing Scope

- Sidebar & navbar menu visibility
- Page and module access
- Action button permissions in User Management dialog
- Server/API authorization middleware (`checkPermission`, `requireUserManagementAccess`, `requireAuth`)
- Unauthorized access rejection (HTTP 401 and 403 responses)
- Permission enforcement across all three roles (Superadmin, Admin, User)

## 3. Test Roles

| Role | Description |
|---|---|
| Superadmin | Full system access; bypasses granular checks, approves pending users, assigns roles, and manages permissions |
| Admin | Manages standard Users only; Superadmin accounts hidden; cannot assign Superadmin role |
| User | Standard access governed strictly by individual module and action permission assignments |

## 4. Test Cases & 36-Right Catalogue Mapping

The 36 per-action rights spanning the 5 Hope, Inc. ERP modules were tested:
- **Customer Management (3 rights):** Add Customer, Edit Customer, Delete Customer
- **Product Management (6 rights):** Add Product, Edit Product, Delete Product, Add Price, Edit Price, Delete Price
- **Human Resources (13 rights):** Add Job, Edit Job, Delete Job, Add Department, Edit Department, Delete Department, Add Employee, Edit Employee, Delete Employee, View Job History, Add Job History, Edit Job History, Delete Job History
- **Sales (7 rights):** Add Sale, Edit Sale, Delete Sale, View Sale Details, Add Sale Detail, Edit Sale Detail, Delete Sale Detail
- **Reports (7 rights):** Top Customers, Product Master List, Top Products, Active Employees, All Employees, Employee Job History, Top Sales

## 5. Expected Results

- Unauthorized modules must not appear in the dashboard/navbar.
- Unauthorized action buttons must not be clickable or visible.
- Direct API requests must reject unauthorized actions with HTTP 403.
- Authorized actions must work according to assigned permissions in `user_permission` / `user_rights`.
- Permission restrictions must be consistently enforced on both frontend and backend.

## 6. Test Results Summary

| Test ID | Module | Permission / Action Tested | Superadmin Access | Admin Access | User (Unassigned) | User (Granted) | Status |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| PM-01 | Customer | `can_add_customer` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-02 | Customer | `can_edit_customer` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-03 | Customer | `can_delete_customer` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-04 | Product | `can_add_product` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-05 | Product | `can_edit_product` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-06 | Product | `can_delete_product` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-07 | Product | `can_add_price` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-08 | Product | `can_edit_price` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-09 | Product | `can_delete_price` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-10 | Human Resources | `can_add_job` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-11 | Human Resources | `can_edit_job` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-12 | Human Resources | `can_delete_job` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-13 | Human Resources | `can_add_department` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-14 | Human Resources | `can_edit_department` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-15 | Human Resources | `can_delete_department` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-16 | Human Resources | `can_add_employee` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-17 | Human Resources | `can_edit_employee` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-18 | Human Resources | `can_delete_employee` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-19 | Human Resources | `can_view_job_history` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-20 | Human Resources | `can_add_job_history` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-21 | Human Resources | `can_edit_job_history` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-22 | Human Resources | `can_delete_job_history` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-23 | Sales | `can_add_sale` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-24 | Sales | `can_edit_sale` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-25 | Sales | `can_delete_sale` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-26 | Sales | `can_view_sale_details` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-27 | Sales | `can_add_sale_detail` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-28 | Sales | `can_edit_sale_detail` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-29 | Sales | `can_delete_sale_detail` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-30 | Reports | `can_view_top_customers` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-31 | Reports | `can_view_product_master_list` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-32 | Reports | `can_view_top_products` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-33 | Reports | `can_view_active_employees` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-34 | Reports | `can_view_all_employees` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-35 | Reports | `can_view_employee_job_history` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |
| PM-36 | Reports | `can_view_top_sales` | Allowed | Allowed | 403 Denied | Allowed | **PASS** |

### Additional Security & Navigation Verification
- **User Management Page Access (`/users`):** Rejected with HTTP 403 for `User` / `Staff`; allowed for `Admin` and `Superadmin`.
- **Superadmin Account Visibility:** Hidden from `Admin` in `/api/admin/users`; visible to `Superadmin`.
- **Superadmin Role Selection in UI:** Dynamically hidden and disabled in `<select id="userRoleSelect">` for non-Superadmins.
- **Audit Logging:** Every permission save records an `audit_log` row with `table_name: 'user_permission'`, `action: 'EDIT'`, and `action_by` user ID.

## 7. Conclusion

All 36 granular permissions and role hierarchy rules have been verified. The server-side middleware `checkPermission()` correctly enforces rights at the API layer, while the client-side UI dynamically adjusts visibility. Status is **Passed / Merged**.
