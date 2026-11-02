-- Migration: Initial Seed Data (DBA-05)
-- Description: Seeds default roles, 5 modules, 36 per-action rights, and Superadmin accounts for team members.

-- 1. Seed Default Roles
INSERT INTO role (role_name, description)
VALUES 
    ('Superadmin', 'Full system access and administration rights'),
    ('Administrator', 'Module management and user oversight'),
    ('Staff', 'Standard operational access')
ON CONFLICT DO NOTHING;

-- 2. Seed the 5 ERP Modules
INSERT INTO module (module_code, module_name)
VALUES 
    ('AUTH', 'Authentication & User Management'),
    ('HR', 'Human Resources & Employee Management'),
    ('CUST', 'Customer & Sales Management'),
    ('INV', 'Inventory & Product Catalog'),
    ('FIN', 'Financials & Payments')
ON CONFLICT DO NOTHING;

-- 3. Seed the 36 Per-Action Rights Catalogue
INSERT INTO rights (module_id, action_code, description)
SELECT m.module_id, r.action_code, r.description
FROM module m
JOIN (
    VALUES
        -- AUTH (7 rights)
        ('AUTH', 'VIEW_USERS', 'View list of application users'),
        ('AUTH', 'CREATE_USER', 'Create a new user account'),
        ('AUTH', 'EDIT_USER', 'Edit user profile and status'),
        ('AUTH', 'DELETE_USER', 'Soft-delete a user account'),
        ('AUTH', 'MANAGE_ROLES', 'Assign and modify user roles'),
        ('AUTH', 'MANAGE_PERMISSIONS', 'Assign module rights to users'),
        ('AUTH', 'VIEW_AUDIT_LOG', 'View system audit trails'),

        -- HR (8 rights)
        ('HR', 'VIEW_EMPLOYEES', 'View employee directory'),
        ('HR', 'CREATE_EMPLOYEE', 'Add a new employee record'),
        ('HR', 'EDIT_EMPLOYEE', 'Update employee details'),
        ('HR', 'DELETE_EMPLOYEE', 'Soft-delete an employee record'),
        ('HR', 'VIEW_DEPARTMENTS', 'View department structures'),
        ('HR', 'MANAGE_DEPARTMENTS', 'Create and edit departments'),
        ('HR', 'VIEW_JOB_HISTORY', 'View employee job history records'),
        ('HR', 'MANAGE_JOB_HISTORY', 'Update job history entries'),

        -- CUST (7 rights)
        ('CUST', 'VIEW_CUSTOMERS', 'View customer database'),
        ('CUST', 'CREATE_CUSTOMER', 'Register a new customer'),
        ('CUST', 'EDIT_CUSTOMER', 'Update customer information'),
        ('CUST', 'DELETE_CUSTOMER', 'Soft-delete a customer record'),
        ('CUST', 'VIEW_SALES', 'View sales orders and history'),
        ('CUST', 'CREATE_SALE', 'Record a new sales transaction'),
        ('CUST', 'EDIT_SALE', 'Modify existing sales order details'),

        -- INV (7 rights)
        ('INV', 'VIEW_PRODUCTS', 'View product catalogue'),
        ('INV', 'CREATE_PRODUCT', 'Add a new product to inventory'),
        ('INV', 'EDIT_PRODUCT', 'Update product attributes'),
        ('INV', 'DELETE_PRODUCT', 'Soft-delete a product'),
        ('INV', 'VIEW_PRICING', 'View product price history'),
        ('INV', 'MANAGE_PRICING', 'Update product pricing records'),
        ('INV', 'MANAGE_STOCK', 'Adjust inventory and stock counts'),

-- FIN (7 rights)
        ('FIN', 'VIEW_PAYMENTS', 'View payment transactions'),
        ('FIN', 'CREATE_PAYMENT', 'Record a payment transaction'),
        ('FIN', 'EDIT_PAYMENT', 'Update payment records'),
        ('FIN', 'DELETE_PAYMENT', 'Void or soft-delete a payment entry'),
        ('FIN', 'VIEW_FIN_REPORTS', 'View revenue and financial reports'),
        ('FIN', 'APPROVE_TRANS', 'Approve financial transactions'),
        ('FIN', 'MANAGE_BILLING', 'Manage billing configurations')
) AS r(module_code, action_code, description) ON m.module_code = r.module_code
ON CONFLICT DO NOTHING;

-- 4. Seed Superadmin Accounts for Team Members (Using secure bcrypt password hashes)
INSERT INTO app_user (username, password_hash, role_id, full_name, email)
SELECT u.username, u.password_hash, r.role_id, u.full_name, u.email
FROM (
    VALUES
        ('kenji_admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J08L4Wc4G', 'Kenji Ray Traquena', 'kenji@hope.inc'),
        ('joey_admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J08L4Wc4G', 'Joey Gerodias', 'joey@hope.inc'),
        ('matthew_admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J08L4Wc4G', 'Matthew Young', 'matthew@hope.inc'),
        ('steven_admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J08L4Wc4G', 'Steven Aborde', 'steven@hope.inc'),
        ('hazel_admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J08L4Wc4G', 'Hazel Espiso', 'hazel@hope.inc')
) AS u(username, password_hash, full_name, email)
CROSS JOIN role r
WHERE r.role_name = 'Superadmin'
ON CONFLICT DO NOTHING;

-- 5. Grant All 36 Rights to All Superadmin Users via user_permission
INSERT INTO user_permission (user_id, right_id)
SELECT au.user_id, r.right_id
FROM app_user au
JOIN role rol ON au.role_id = rol.role_id
CROSS JOIN rights r
WHERE rol.role_name = 'Superadmin'
ON CONFLICT DO NOTHING;