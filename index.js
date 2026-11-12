const express = require("express");
const path = require("path");
const supabase = require("./src/config/supabaseClient");
const session = require("express-session");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const app = express();
app.use(express.json());

// Log incoming requests to terminal for debugging
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

// Serve static frontend files from 'public'
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: process.env.SESSION_SECRET || "default-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, 
    httpOnly: true, 
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Unauthorized access." });
  }
  next();
}

const PERMISSION_MODULE_ALIASES = {
  Customer: ['Customer', 'Customer Management', 'CUST'],
  Product: ['Product', 'Product Management', 'INV'],
  'Human Resources': ['Human Resources', 'HR'],
  Sales: ['Sales'],
  Reports: ['Reports', 'FIN']
};

const ACTION_CODE_MAP = {
  // Customer
  can_add_customer: ['CREATE_CUSTOMER', 'can_add_customer'],
  can_edit_customer: ['EDIT_CUSTOMER', 'can_edit_customer'],
  can_delete_customer: ['DELETE_CUSTOMER', 'can_delete_customer'],
  // Product
  can_add_product: ['CREATE_PRODUCT', 'can_add_product'],
  can_edit_product: ['EDIT_PRODUCT', 'can_edit_product'],
  can_delete_product: ['DELETE_PRODUCT', 'can_delete_product'],
  can_add_price: ['MANAGE_PRICING', 'can_add_price'],
  can_edit_price: ['VIEW_PRICING', 'can_edit_price'],
  can_delete_price: ['can_delete_price'],
  // HR
  can_add_job: ['can_add_job'],
  can_edit_job: ['can_edit_job'],
  can_delete_job: ['can_delete_job'],
  can_add_department: ['MANAGE_DEPARTMENTS', 'can_add_department'],
  can_edit_department: ['can_edit_department'],
  can_delete_department: ['can_delete_department'],
  can_add_employee: ['CREATE_EMPLOYEE', 'can_add_employee'],
  can_edit_employee: ['EDIT_EMPLOYEE', 'can_edit_employee'],
  can_delete_employee: ['DELETE_EMPLOYEE', 'can_delete_employee'],
  can_view_job_history: ['VIEW_JOB_HISTORY', 'can_view_job_history'],
  can_add_job_history: ['MANAGE_JOB_HISTORY', 'can_add_job_history'],
  can_edit_job_history: ['can_edit_job_history'],
  can_delete_job_history: ['can_delete_job_history'],
  // Sales
  can_add_sale: ['CREATE_SALE', 'can_add_sale'],
  can_edit_sale: ['EDIT_SALE', 'can_edit_sale'],
  can_delete_sale: ['can_delete_sale'],
  can_view_sale_details: ['VIEW_SALES', 'can_view_sale_details'],
  can_add_sale_detail: ['can_add_sale_detail'],
  can_edit_sale_detail: ['can_edit_sale_detail'],
  can_delete_sale_detail: ['can_delete_sale_detail'],
  // Reports
  can_view_top_customers: ['can_view_top_customers'],
  can_view_product_master_list: ['can_view_product_master_list'],
  can_view_top_products: ['can_view_top_products'],
  can_view_active_employees: ['VIEW_EMPLOYEES', 'can_view_active_employees'],
  can_view_all_employees: ['can_view_all_employees'],
  can_view_employee_job_history: ['can_view_employee_job_history'],
  can_view_top_sales: ['VIEW_FIN_REPORTS', 'can_view_top_sales']
};

function parseGranularPermissions(value) {
  const permissions = typeof value === 'string' ? JSON.parse(value) : value;
  if (permissions == null) return {};
  if (typeof permissions !== 'object' || Array.isArray(permissions)) {
    throw new Error('Invalid granular permissions data.');
  }
  return permissions;
}

async function getUserRightsMap(userId) {
  const ALL_MODULE_KEYS = ['Customer', 'Product', 'Human Resources', 'Sales', 'Reports'];
  const rightsMap = {};

  ALL_MODULE_KEYS.forEach(mod => {
    rightsMap[mod] = {
      module_name: mod,
      enabled: false,
      can_create: false,
      can_read: false,
      can_update: false,
      can_delete: false,
      granular_permission: {}
    };
  });

  // 1. Try querying DBA normalized user_permission join with rights & module
  try {
    const { data: perms, error: permErr } = await supabase
      .from('user_permission')
      .select('right_id, is_deleted, rights (right_id, module_id, action_code, right_name, description, is_deleted, module (module_id, module_code, module_name, is_deleted))')
      .eq('user_id', userId);

    if (!permErr && Array.isArray(perms) && perms.length > 0) {
      perms.forEach(p => {
        if (p.is_deleted === true) return;
        const r = p.rights;
        if (!r || r.is_deleted === true) return;
        const modName = r.module?.module_name || r.module?.module_code;
        const actionCode = (r.action_code || r.right_name || '').trim();

        const matchedMod = ALL_MODULE_KEYS.find(m => {
          const aliases = PERMISSION_MODULE_ALIASES[m] || [m];
          return aliases.some(a => String(modName || '').toLowerCase().includes(a.toLowerCase()));
        }) || 'Customer';

        rightsMap[matchedMod].enabled = true;
        rightsMap[matchedMod].can_read = true;

        Object.entries(ACTION_CODE_MAP).forEach(([permKey, codes]) => {
          if (
            codes.some(c => c.toLowerCase() === actionCode.toLowerCase()) ||
            actionCode.toLowerCase() === permKey.toLowerCase()
          ) {
            rightsMap[matchedMod].granular_permission[permKey] = true;
            rightsMap[matchedMod][permKey] = true;
            if (/^can_(add|create)_/.test(permKey)) rightsMap[matchedMod].can_create = true;
            if (/^can_(edit|update)_/.test(permKey)) rightsMap[matchedMod].can_update = true;
            if (/^can_delete_/.test(permKey)) rightsMap[matchedMod].can_delete = true;
          }
        });
      });
    }
  } catch (e) {
    console.warn('user_permission query notice:', e.message);
  }

  // 2. Safe fallback / complement: user_rights table
  try {
    const { data: rightsRows, error: rightsError } = await supabase
      .from('user_rights')
      .select('*')
      .eq('user_id', userId);

    if (!rightsError && Array.isArray(rightsRows) && rightsRows.length > 0) {
      rightsRows.forEach(r => {
        const modKey = ALL_MODULE_KEYS.find(m => {
          const aliases = PERMISSION_MODULE_ALIASES[m] || [m];
          return aliases.some(a => a.toLowerCase() === String(r.module_name || '').toLowerCase());
        }) || r.module_name;

        const granular = parseGranularPermissions(r.granular_permission);
        const isEnabled = typeof r.enabled === 'boolean' ? r.enabled : Boolean(r.can_read);

        if (!rightsMap[modKey]) {
          rightsMap[modKey] = {
            module_name: modKey,
            enabled: isEnabled,
            can_create: Boolean(r.can_create),
            can_read: Boolean(r.can_read),
            can_update: Boolean(r.can_update),
            can_delete: Boolean(r.can_delete),
            granular_permission: granular,
            ...granular
          };
        } else {
          rightsMap[modKey].enabled = rightsMap[modKey].enabled || isEnabled;
          rightsMap[modKey].can_read = rightsMap[modKey].can_read || Boolean(r.can_read);
          rightsMap[modKey].can_create = rightsMap[modKey].can_create || Boolean(r.can_create);
          rightsMap[modKey].can_update = rightsMap[modKey].can_update || Boolean(r.can_update);
          rightsMap[modKey].can_delete = rightsMap[modKey].can_delete || Boolean(r.can_delete);
          rightsMap[modKey].granular_permission = {
            ...rightsMap[modKey].granular_permission,
            ...granular
          };
          Object.assign(rightsMap[modKey], granular);
        }
      });
    }
  } catch (e) {
    console.warn('user_rights query notice:', e.message);
  }

  return rightsMap;
}

function checkPermission(moduleName, permissionKey) {
  return async (req, res, next) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized access." });
      }

      // 1. Fetch requester role for Superadmin bypass
      const { data: userRecord, error: userError } = await supabase
        .from('app_user')
        .select('role (role_name)')
        .eq('user_id', userId)
        .maybeSingle();

      if (userError) throw userError;

      const roleName = userRecord?.role?.role_name;

      // Superadmins automatically bypass module permission checks
      if (isSuperadminRole(roleName)) {
        return next();
      }

      // 2. Query target user's rights (user_permission + user_rights fallback)
      const rightsMap = await getUserRightsMap(userId);
      const modKey = Object.keys(rightsMap).find(m => {
        const aliases = PERMISSION_MODULE_ALIASES[m] || [m];
        return aliases.some(a => a.toLowerCase() === moduleName.toLowerCase());
      }) || moduleName;

      const moduleRights = rightsMap[modKey];
      const hasGranular = Boolean(
        moduleRights?.granular_permission?.[permissionKey] === true ||
        moduleRights?.[permissionKey] === true
      );

      if (moduleRights && (moduleRights.can_read === true || moduleRights.enabled === true) && hasGranular) {
        return next();
      }

      // 4. Deny access if permission flag is false or record doesn't exist
      return res.status(403).json({
        message: `Access denied: You do not have '${permissionKey}' rights for the ${moduleName} module.`
      });
    } catch (err) {
      console.error(`Permission check error (${moduleName} - ${permissionKey}):`, err);
      return res.status(500).json({ message: 'Server error checking user rights.' });
    }
  };
}

app.get('/api/sales', requireAuth, checkPermission('Sales', 'can_view_sale_details'), async (req, res) => {});
app.post('/api/sales', requireAuth, checkPermission('Sales', 'can_add_sale'), async (req, res) => {});
app.delete('/api/sales/:id', requireAuth, checkPermission('Sales', 'can_delete_sale'), async (req, res) => {});

// Role-Based Access Control (RBAC) Helper Functions
function isSuperadminRole(roleName) {
  if (!roleName) return false;
  const name = String(roleName).toLowerCase().trim();
  return name.includes('super') || name.includes('system admin') || name.includes('sysadmin');
}

function isManagerRole(roleName) {
  if (!roleName) return false;
  const name = String(roleName).toLowerCase().trim();
  return name.includes('manager') || (name.includes('admin') && !name.includes('super'));
}

async function requireUserManagementAccess(req, res, next) {
  try {
    const { data: requester, error } = await supabase
      .from('app_user')
      .select('role (role_name)')
      .eq('user_id', req.session.user.id)
      .maybeSingle();

    if (error) throw error;

    const roleName = requester?.role?.role_name;
    if (!isSuperadminRole(roleName) && !isManagerRole(roleName)) {
      return res.status(403).json({ message: 'Access denied: Only Admins or Superadmins can access User Management.' });
    }

    return next();
  } catch (err) {
    console.error('User management access check error:', err);
    return res.status(500).json({ message: 'Server error checking user management access.' });
  }
}

function isStaffRole(roleName, roleId) {
  if (roleId && (Number(roleId) === 6 || Number(roleId) === 14)) {
    return true;
  }
  if (!roleName) return false;
  const name = String(roleName).toLowerCase().trim();
  return name.includes('staff') || name.includes('user') || name.includes('standard');
}

async function getRoleConfig() {
  const { data: roles, error } = await supabase
    .from('role')
    .select('role_id, role_name');

  if (error || !roles) {
    throw new Error('Failed to fetch user roles from database.');
  }

  const superadmin = roles.find(r => isSuperadminRole(r.role_name));
  const adminRole = roles.find(r => isManagerRole(r.role_name));
  const defaultUserRole = roles.find(r => String(r.role_name).trim().toLowerCase() === 'standard user')
    || roles.find(r => String(r.role_name).trim().toLowerCase() === 'user');

  return {
    superadminRoleId: superadmin ? String(superadmin.role_id) : null,
    adminRoleId: adminRole ? String(adminRole.role_id) : null,
    defaultUserRoleId: defaultUserRole ? String(defaultUserRole.role_id) : null,
    rolesMap: new Map(roles.map(r => [String(r.role_id), r.role_name]))
  };
}

// Helper to count active (non-blocked, non-deleted) Superadmins
async function countActiveSuperadmins(superadminRoleId) {
  if (!superadminRoleId) return 0;
  const { data: superadmins, error } = await supabase
    .from('app_user')
    .select('user_id, status, is_blocked, is_deleted')
    .eq('role_id', superadminRoleId);

  if (error || !superadmins) return 0;

  return superadmins.filter(u => {
    const status = (u.status || '').toLowerCase();
    const isBlocked = u.is_blocked === true || status === 'rejected' || status === 'blocked';
    return !u.is_deleted && !isBlocked;
  }).length;
}

// Static File Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get('/dashboard', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, "public", "register.html")));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get('/users', requireAuth, requireUserManagementAccess, (req, res) => res.sendFile(path.join(__dirname, 'public', 'users.html')));
app.get('/setPassword', (req, res) => res.sendFile(path.join(__dirname, "public", "setPassword.html")));
app.get('/forgotPassword', (req, res) => res.sendFile(path.join(__dirname, 'public', 'forgotPassword.html')));
app.get('/resetPassword', (req, res) => res.sendFile(path.join(__dirname, 'public', 'resetPassword.html')));

// Auth API Endpoints
app.post('/api/auth/resetPassword', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: 'Invalid or missing reset token/email.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    const cleanedEmail = email.trim().toLowerCase();
    const { data: user, error: fetchError } = await supabase
      .from('app_user')
      .select('user_id, email, is_blocked')
      .eq('email', cleanedEmail)
      .maybeSingle();

    if (fetchError || !user) {
      return res.status(400).json({ message: 'Invalid or expired password reset link.' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ message: 'This account is blocked.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const nowIso = new Date().toISOString();
    let validTokenId = null;
    let isValid = false;

    // 1. Primary: Check DBA password_reset_token table with hashed token and expiry
    try {
      const { data: tokenRecord, error: tokenErr } = await supabase
        .from('password_reset_token')
        .select('token_id, user_id, expires_at, is_used, is_deleted')
        .eq('user_id', user.user_id)
        .eq('token_hash', tokenHash)
        .eq('is_used', false)
        .eq('is_deleted', false)
        .gt('expires_at', nowIso)
        .order('token_id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!tokenErr && tokenRecord) {
        isValid = true;
        validTokenId = tokenRecord.token_id;
      }
    } catch (e) {
      console.warn('password_reset_token query notice:', e.message);
    }

    // 2. Safe fallback: check app_user.reset_token
    if (!isValid) {
      try {
        const { data: fallbackUser } = await supabase
          .from('app_user')
          .select('reset_token, reset_token_expires')
          .eq('user_id', user.user_id)
          .maybeSingle();

        if (
          fallbackUser &&
          fallbackUser.reset_token === token &&
          fallbackUser.reset_token_expires &&
          new Date() <= new Date(fallbackUser.reset_token_expires)
        ) {
          isValid = true;
        }
      } catch (_) {}
    }

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired password reset link.' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await supabase
      .from('app_user')
      .update({ password_hash: newPasswordHash })
      .eq('user_id', user.user_id);

    if (updateError) throw updateError;

    // Mark token as used in password_reset_token
    if (validTokenId) {
      try {
        await supabase
          .from('password_reset_token')
          .update({ is_used: true })
          .eq('token_id', validTokenId);
      } catch (e) {
        console.warn('Could not mark password_reset_token as used:', e.message);
      }
    }

    // Clear reset_token on app_user fallback safely
    try {
      await supabase
        .from('app_user')
        .update({ reset_token: null, reset_token_expires: null })
        .eq('user_id', user.user_id);
    } catch (_) {}

    return res.status(200).json({ message: 'Password reset successful! Redirecting to login...' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Internal server error while resetting password.' });
  }
});

app.post('/api/auth/setPassword', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    const cleanedEmail = email.trim().toLowerCase();
    const { data: user, error: fetchError } = await supabase
      .from('app_user')
      .select('username, is_blocked')
      .ilike('username', cleanedEmail)
      .maybeSingle();

    if (fetchError || !user) {
      return res.status(400).json({ message: `Account for ${cleanedEmail} was not found.` });
    }

    if (user.is_blocked) {
      return res.status(403).json({ message: 'This account is blocked.' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await supabase
      .from('app_user')
      .update({ password_hash: newPasswordHash })
      .eq('username', user.username);

    if (updateError) throw updateError;

    return res.status(200).json({ message: 'Password updated successfully! Redirecting...' });
  } catch (err) {
    console.error('Set password endpoint error:', err);
    return res.status(500).json({ message: 'Internal server error while setting password.' });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const lastName = (req.body.lastName || "").trim();
    const firstName = (req.body.firstName || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();

    if (!lastName || !firstName || !email) {
      return res.status(400).json({ message: "Last name, first name, and email are required." });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    const fullName = `${firstName} ${lastName}`;
    if (email.length > 50) return res.status(400).json({ message: "Email must be 50 characters or fewer." });
    if (fullName.length > 100) return res.status(400).json({ message: "Name is too long." });

    const { defaultUserRoleId } = await getRoleConfig();
    if (!defaultUserRoleId) {
      return res.status(500).json({ message: "The default User role is not configured." });
    }

    const { error } = await supabase.from("app_user").insert({
      username: email,
      password_hash: "!pending-no-password",
      first_name: firstName,
      last_name: lastName,
      email: email,
      role_id: defaultUserRoleId,
      status: 'pending'
    });

    if (error) {
      if (error.code === "23505") return res.status(409).json({ message: "This email is already registered." });
      throw error;
    }

    res.status(201).json({ message: "Registration received. Your account is pending approval." });
  } catch (err) {
    console.error("Supabase insert error:", err);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

app.post('/api/auth/forgotPassword', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    const cleanedEmail = email.trim().toLowerCase();
    const { data: user, error: fetchError } = await supabase
      .from('app_user')
      .select('user_id, email, is_blocked')
      .eq('email', cleanedEmail)
      .maybeSingle();

    const genericSuccess = { message: 'If an account exists with that email, a password reset link has been sent.' };
    if (fetchError || !user) return res.status(200).json(genericSuccess);

    if (user.is_blocked) return res.status(403).json({ message: 'This account is blocked. Please contact support.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExpires = new Date(Date.now() + 3600000).toISOString();

    // 1. Primary: Insert hashed token into DBA password_reset_token table
    try {
      await supabase
        .from('password_reset_token')
        .insert([{
          user_id: user.user_id,
          token_hash: tokenHash,
          expires_at: resetExpires,
          is_used: false,
          is_deleted: false
        }]);
    } catch (e) {
      console.warn('password_reset_token insert notice:', e.message);
    }

    // 2. Safe fallback: update app_user.reset_token if present in schema
    try {
      await supabase
        .from('app_user')
        .update({ reset_token: resetToken, reset_token_expires: resetExpires })
        .eq('user_id', user.user_id);
    } catch (_) {}

    const resetLink = `http://localhost:3000/resetPassword?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
    console.log(`\nPASSWORD RESET LINK FOR ${user.email}:\n${resetLink}\n`);

    return res.status(200).json(genericSuccess);
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Internal server error processing request.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const { data: user, error: fetchError } = await supabase
      .from('app_user')
      .select('user_id, username, password_hash, is_blocked, status')
      .eq('username', email.toLowerCase())
      .maybeSingle();

    if (fetchError || !user) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    if (user.is_blocked || user.status === 'rejected') {
      return res.status(403).json({ message: 'This account is blocked. Please contact support.' });
    }

    const isPendingSetup = !user.password_hash || user.password_hash === '!pending-no-password' || !user.password_hash.startsWith('$2');
    if (isPendingSetup) {
      return res.status(400).json({
        message: 'Password setup required. Please set your password first.',
        requireSetPassword: true
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    req.session.user = { id: user.user_id, email: user.username };
    return res.status(200).json({ message: 'Login successful!', user: { email: user.username } });
  } catch (err) {
    console.error('Login server error:', err);
    return res.status(500).json({ message: 'Internal server error while logging in.' });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: "Could not log out." });
    res.clearCookie("connect.sid");
    res.status(200).json({ message: "Logged out successfully." });
  });
});

app.get("/api/auth/me", async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { data: user, error } = await supabase
    .from('app_user')
    .select('user_id, username, email, first_name, last_name, status, is_blocked, role (role_name)')
    .eq('user_id', req.session.user.id)
    .maybeSingle();

  if (error || !user || user.is_blocked || user.status === 'rejected') {
    req.session.destroy(() => {
      res.clearCookie("connect.sid", { path: '/' });
      return res.status(401).json({ message: "Account is blocked or rejected." });
    });
    return;
  }

  const userPayload = {
    id: user.user_id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    roleName: user.role?.role_name || 'User'
  };

  req.session.user = { ...req.session.user, ...userPayload };
  return res.json({ user: userPayload });
});

app.get('/api/auth/me/rights', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const { data: userRecord, error: userError } = await supabase
      .from('app_user')
      .select('role (role_name)')
      .eq('user_id', userId)
      .maybeSingle();

    if (userError) throw userError;

    const roleName = userRecord?.role?.role_name;
    const isSuperadmin = isSuperadminRole(roleName);
    const rightsMap = await getUserRightsMap(userId);

    res.json({
      isSuperadmin,
      isAdmin: isManagerRole(roleName),
      rights: rightsMap
    });
  } catch (err) {
    console.error('Fetch me/rights error:', err);
    res.status(500).json({ message: 'Failed to fetch user permissions.' });
  }
});

// Roles Endpoint for Frontend Select Options
app.use('/api/admin', requireAuth, requireUserManagementAccess);

app.get('/api/admin/roles', requireAuth, async (req, res) => {
  try {
    const { data: roles, error } = await supabase
      .from('role')
      .select('role_id, role_name')
      .order('role_id', { ascending: true });

    if (error) throw error;
    res.json(roles);
  } catch (err) {
    console.error('Fetch roles error:', err);
    res.status(500).json({ message: `Database error: ${err.message}` });
  }
});

// User Management Endpoints
// 1. Get All Users
app.get('/api/admin/users', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user?.id;
    if (!currentUserId) return res.status(401).json({ message: 'Unauthorized session.' });

    const { data: roles } = await supabase.from('role').select('role_id, role_name');
    const superadminRoleIdSet = new Set(
      (roles || []).filter(r => isSuperadminRole(r.role_name)).map(r => String(r.role_id))
    );

    const { data: currentUser } = await supabase
      .from('app_user')
      .select('user_id, role_id, role (role_name)')
      .eq('user_id', currentUserId)
      .maybeSingle();

    const currentRoleName = currentUser?.role?.role_name;
    const isCurrentSuperadmin = Boolean(
      isSuperadminRole(currentRoleName) ||
      (currentUser?.role_id && superadminRoleIdSet.has(String(currentUser.role_id)))
    );
    const isCurrentManager = isManagerRole(currentRoleName);

    const { data: users, error: fetchErr } = await supabase
      .from('app_user')
      .select('user_id, username, email, first_name, last_name, status, is_blocked, password_hash, is_deleted, role_id, role (role_name)')
      .order('user_id', { ascending: true });

    if (fetchErr) throw fetchErr;

    const formattedUsers = (users || [])
      .filter(u => u.is_deleted !== true)
      .filter(u => {
        const targetRoleName = u.role?.role_name;
        const targetIsSuperadmin = Boolean(
          isSuperadminRole(targetRoleName) ||
          (u.role_id && superadminRoleIdSet.has(String(u.role_id)))
        );

        if (!isCurrentSuperadmin && targetIsSuperadmin) return false;
        return true;
      })
      .map(u => {
        const targetRoleName = u.role?.role_name;
        const targetIsStaffOrUser = isStaffRole(targetRoleName, u.role_id);
        const userStatus = (u.status || '').toLowerCase();
        const isBlocked = u.is_blocked === true || userStatus === 'rejected' || userStatus === 'blocked';
        const isSelf = String(u.user_id) === String(currentUserId);

        const canManage = isCurrentSuperadmin || (isCurrentManager && targetIsStaffOrUser);

        return {
          id: u.user_id,
          email: u.email || u.username,
          firstName: u.first_name || '',
          lastName: u.last_name || '',
          roleId: u.role_id,
          roleName: targetRoleName || 'Staff',
          status: isBlocked ? 'rejected' : (u.status || 'active'),
          isPending: userStatus === 'pending',
          isBlocked: isBlocked,
          isPendingSetup: u.status === 'pending' || u.password_hash === '!pending-no-password',
          isSelf: isSelf,
          canEdit: isCurrentSuperadmin || (canManage && !isSelf),
          canBlock: canManage && !isSelf,
          canDelete: isCurrentSuperadmin && !isSelf,
          canChangeRole: isCurrentSuperadmin
        };
      });

    res.json(formattedUsers);
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ message: `Database error: ${err.message}` });
  }
});

// 2. Add New User
app.post('/api/admin/users', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user?.id;
    const { data: requester } = await supabase
      .from('app_user')
      .select('role(role_name)')
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (isStaffRole(requester?.role?.role_name)) {
      return res.status(403).json({ message: 'Action denied: Staff members cannot create users.' });
    }

    const { email, firstName, lastName } = req.body;
    if (!email || !firstName || !lastName) {
      return res.status(400).json({ message: 'First name, last name, and email are required.' });
    }

    const cleanedEmail = email.trim().toLowerCase();
    const { data: existingUser } = await supabase
      .from('app_user')
      .select('username')
      .or(`email.eq.${cleanedEmail},username.eq.${cleanedEmail}`)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const { defaultUserRoleId } = await getRoleConfig();
    if (!defaultUserRoleId) {
      return res.status(500).json({ message: 'The default User role is not configured.' });
    }

    const { data: newUser, error: insertError } = await supabase
      .from('app_user')
      .insert([{
        username: cleanedEmail,
        email: cleanedEmail,
        password_hash: '!pending-no-password',
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role_id: defaultUserRoleId,
        status: 'pending',
        is_blocked: false,
        is_deleted: false
      }])
      .select()
      .single();

    if (insertError) throw insertError;
    res.status(201).json({ message: 'User created successfully!', user: newUser });
  } catch (err) {
    console.error('Add user error:', err);
    res.status(500).json({ message: err.message || 'Failed to add user.' });
  }
});

// 3. Edit User Details
app.put('/api/admin/users/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.session.user?.id;
    const { email, firstName, lastName, roleId } = req.body;

    const { data: requester } = await supabase
      .from('app_user')
      .select('role(role_name)')
      .eq('user_id', currentUserId)
      .maybeSingle();

    const requesterRole = requester?.role?.role_name;

    if (isStaffRole(requesterRole)) {
      return res.status(403).json({ message: 'Action denied: Staff members cannot edit accounts.' });
    }

    const { data: targetUser } = await supabase
      .from('app_user')
      .select('role (role_name)')
      .eq('user_id', id)
      .maybeSingle();

    if (isManagerRole(requesterRole) && isStaffRole(targetUser?.role?.role_name)) {
      return res.status(403).json({ message: 'Action denied: Managers can only edit Staff accounts.' });
    }

    const cleanedEmail = email.trim().toLowerCase();
    const updateData = {
      username: cleanedEmail,
      email: cleanedEmail,
      first_name: firstName.trim(),
      last_name: lastName.trim()
    };

    if (roleId) {
      if (!isSuperadminRole(requesterRole) && String(roleId) === '4') {
        return res.status(403).json({ message: 'Action denied: Only Superadmins can assign the Superadmin role.' });
      }
      updateData.role_id = roleId;
    }

    const { error: updateError } = await supabase
      .from('app_user')
      .update(updateData)
      .eq('user_id', id);

    if (updateError) throw updateError;
    res.json({ message: 'User updated successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update user.' });
  }
});

// 4. Approve Pending User
app.patch('/api/admin/users/:id/approve', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.session.user?.id;
    const { data: requester } = await supabase
      .from('app_user')
      .select('role (role_name)')
      .eq('user_id', currentUserId)
      .maybeSingle();

    const requesterRole = requester?.role?.role_name;
    if (isStaffRole(requesterRole)) {
      return res.status(403).json({ message: 'Action denied: Staff members cannot approve users.' });
    }

    const { data: targetUser } = await supabase
      .from('app_user')
      .select('status, role_id, role (role_name)')
      .eq('user_id', id)
      .maybeSingle();

    if (!targetUser) return res.status(404).json({ message: 'User not found.' });
    if (String(targetUser.status || '').toLowerCase() !== 'pending') {
      return res.status(409).json({ message: 'Only pending users can be approved.' });
    }

    if (isManagerRole(requesterRole) && !isStaffRole(targetUser?.role?.role_name, targetUser?.role_id)) {
      return res.status(403).json({ message: 'Action denied: Managers can only approve Staff accounts.' });
    }

    const { error: updateError } = await supabase
      .from('app_user')
      .update({ status: 'active', is_blocked: false })
      .eq('user_id', id);

    if (updateError) throw updateError;
    res.json({ message: 'User account has been approved and activated.' });
  } catch (err) {
    console.error('Approve user error:', err);
    res.status(500).json({ message: err.message || 'Failed to approve user.' });
  }
});

// Reject a pending user
app.patch('/api/admin/users/:id/reject', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.session.user?.id;
    const { data: requester, error: requesterError } = await supabase
      .from('app_user')
      .select('role (role_name)')
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (requesterError) throw requesterError;
    const requesterRole = requester?.role?.role_name;
    if (isStaffRole(requesterRole)) {
      return res.status(403).json({ message: 'Action denied: Staff members cannot reject users.' });
    }

    const { data: targetUser, error: targetError } = await supabase
      .from('app_user')
      .select('status, role_id, role (role_name)')
      .eq('user_id', id)
      .maybeSingle();

    if (targetError) throw targetError;
    if (!targetUser) return res.status(404).json({ message: 'User not found.' });
    if (String(targetUser.status || '').toLowerCase() !== 'pending') {
      return res.status(409).json({ message: 'Only pending users can be rejected.' });
    }
    if (isManagerRole(requesterRole) && !isStaffRole(targetUser.role?.role_name, targetUser.role_id)) {
      return res.status(403).json({ message: 'Action denied: Managers can only reject Staff accounts.' });
    }

    const { error: updateError } = await supabase
      .from('app_user')
      .update({ status: 'rejected', is_blocked: true })
      .eq('user_id', id);

    if (updateError) throw updateError;
    res.json({ message: 'User account has been rejected.' });
  } catch (err) {
    console.error('Reject user error:', err);
    res.status(500).json({ message: err.message || 'Failed to reject user.' });
  }
});

// 5. Update User Role
app.patch('/api/admin/users/:id/role', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user?.id;
    const { data: requester } = await supabase
      .from('app_user')
      .select('role (role_name)')
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (!isSuperadminRole(requester?.role?.role_name)) {
      return res.status(403).json({ message: 'Action denied: Only Superadmins can change user roles.' });
    }

    const { id } = req.params;
    const { roleId } = req.body;
    const { superadminRoleId } = await getRoleConfig();
    const { data: targetUser } = await supabase.from('app_user').select('role_id').eq('user_id', id).maybeSingle();

    const isCurrentlySuperadmin = String(targetUser?.role_id) === String(superadminRoleId);
    if (isCurrentlySuperadmin && String(roleId) !== String(superadminRoleId)) {
      const activeSuperadmins = await countActiveSuperadmins(superadminRoleId);
      if (activeSuperadmins <= 1) {
        return res.status(400).json({ message: 'Action denied: Cannot demote the last remaining Superadmin.' });
      }
    }

    const { error: updateError } = await supabase.from('app_user').update({ role_id: roleId }).eq('user_id', id);
    if (updateError) throw updateError;
    res.json({ message: 'User role updated successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update role.' });
  }
});

// 6. Block / Unblock User
app.patch('/api/admin/users/:id/block', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;
    const currentUserId = req.session.user?.id;
    const { data: requester } = await supabase
      .from('app_user')
      .select('role (role_name)')
      .eq('user_id', currentUserId)
      .maybeSingle();

    const requesterRole = requester?.role?.role_name;
    if (isStaffRole(requesterRole)) {
      return res.status(403).json({ message: 'Action denied: Staff members cannot block accounts.' });
    }

    const { data: targetUser } = await supabase
      .from('app_user')
      .select('user_id, role_id, role (role_name)')
      .eq('user_id', id)
      .maybeSingle();

    if (!targetUser) return res.status(404).json({ message: 'User not found.' });

    if (isManagerRole(requesterRole) && isStaffRole(targetUser?.role?.role_name)) {
      return res.status(403).json({ message: 'Action denied: Managers can only block Staff accounts.' });
    }

    const { superadminRoleId } = await getRoleConfig();
    if (isBlocked && String(targetUser.role_id) === String(superadminRoleId)) {
      const activeSuperadmins = await countActiveSuperadmins(superadminRoleId);
      if (activeSuperadmins <= 1) {
        return res.status(400).json({ message: 'Action denied: Cannot block the last active Superadmin.' });
      }
    }

    const newStatus = isBlocked ? 'rejected' : 'active';
    const { error: updateError } = await supabase
      .from('app_user')
      .update({ status: newStatus, is_blocked: isBlocked })
      .eq('user_id', id);

    if (updateError) throw updateError;
    res.json({ message: `User status changed to ${newStatus}.` });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update block status.' });
  }
});

// 7. Soft-Delete User
app.delete('/api/admin/users/:id', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user?.id;
    const { data: requester } = await supabase
      .from('app_user')
      .select('role (role_name)')
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (!isSuperadminRole(requester?.role?.role_name)) {
      return res.status(403).json({ message: 'Action denied: Only Superadmins can delete user accounts.' });
    }

    const { id } = req.params;
    const { superadminRoleId } = await getRoleConfig();
    const { data: targetUser } = await supabase.from('app_user').select('role_id').eq('user_id', id).maybeSingle();

    if (String(targetUser?.role_id) === String(superadminRoleId)) {
      const activeSuperadmins = await countActiveSuperadmins(superadminRoleId);
      if (activeSuperadmins <= 1) {
        return res.status(400).json({ message: 'Action denied: Cannot delete the last remaining Superadmin.' });
      }
    }

    const { error: deleteError } = await supabase.from('app_user').update({ is_deleted: true }).eq('user_id', id);
    if (deleteError) throw deleteError;
    res.json({ message: 'User account deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete user.' });
  }
});

// 8. User Rights Endpoint 
app.get('/api/admin/users/:id/rights', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const rightsMap = await getUserRightsMap(id);
    res.json({ userId: id, rights: rightsMap });
  } catch (err) {
    console.error('Fetch user rights error:', err);
    res.status(500).json({ message: err.message || 'Failed to fetch user rights.' });
  }
});

// 9. Update User Rights Endpoint
app.post('/api/admin/users/:id/rights', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user?.id;
    const targetUserId = req.params.id;

    // Handle payload whether array or wrapped in updatedRights
    const updatedRights = Array.isArray(req.body) ? req.body : req.body.updatedRights;

    if (!Array.isArray(updatedRights)) {
      return res.status(400).json({ message: 'Invalid payload.' });
    }

    const { data: requester } = await supabase
      .from('app_user')
      .select('role (role_name)')
      .eq('user_id', currentUserId)
      .maybeSingle();

    const requesterRole = requester?.role?.role_name;
    const isAuthorized = isSuperadminRole(requesterRole) || isManagerRole(requesterRole);

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Action denied: Only Admins or Superadmins can assign user rights.' });
    }

    const previousRights = await getUserRightsMap(targetUserId);

    // 1. Primary: Upsert / update DBA normalized user_permission joined with rights
    try {
      const { data: dbRights } = await supabase
        .from('rights')
        .select('right_id, module_id, action_code, right_name')
        .eq('is_deleted', false);

      if (Array.isArray(dbRights) && dbRights.length > 0) {
        for (const mod of updatedRights) {
          const isEnabled = Boolean(mod.enabled);
          for (const [permKey, val] of Object.entries(mod)) {
            if (!permKey.startsWith('can_')) continue;
            const isGranted = isEnabled && val === true;
            const aliasCodes = ACTION_CODE_MAP[permKey] || [permKey];

            const matchedRight = dbRights.find(r => {
              const code = (r.action_code || r.right_name || '').toLowerCase();
              return aliasCodes.some(ac => ac.toLowerCase() === code) || code === permKey.toLowerCase();
            });

            if (matchedRight) {
              if (isGranted) {
                await supabase
                  .from('user_permission')
                  .upsert({
                    user_id: targetUserId,
                    right_id: matchedRight.right_id,
                    is_deleted: false,
                    stamp: `ASSIGN ${currentUserId}`
                  }, { onConflict: 'user_id, right_id' });
              } else {
                await supabase
                  .from('user_permission')
                  .update({ is_deleted: true, stamp: `REVOKE ${currentUserId}` })
                  .eq('user_id', targetUserId)
                  .eq('right_id', matchedRight.right_id);
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('user_permission synchronization notice:', e.message);
    }

    // 2. Safe fallback / mirror: user_rights table upsert
    const upsertPayload = updatedRights.map(r => {
      const isEnabled = Boolean(r.enabled);
      const permissions = Object.entries(r).filter(([key, value]) => key.startsWith('can_') && value === true);
      const hasPermission = pattern => permissions.some(([key]) => pattern.test(key));

      return {
        user_id: targetUserId,
        module_name: r.module_name,
        granular_permission: Object.fromEntries(
          Object.entries(r)
            .filter(([key]) => key.startsWith('can_') && !['can_create', 'can_read', 'can_update', 'can_delete'].includes(key))
            .map(([key, value]) => [key, isEnabled && value === true])
        ),
        can_create: isEnabled && (Boolean(r.can_create) || hasPermission(/^can_(add|create)_/)),
        can_read: isEnabled,
        can_update: isEnabled && (Boolean(r.can_update) || hasPermission(/^can_(edit|update)_/)),
        can_delete: isEnabled && (Boolean(r.can_delete) || hasPermission(/^can_delete_/)),
        updated_at: new Date().toISOString()
      };
    });

    try {
      await supabase
        .from('user_rights')
        .upsert(upsertPayload, { onConflict: 'user_id, module_name' });
    } catch (e) {
      console.warn('user_rights fallback notice:', e.message);
    }

    // 3. Record in audit_log
    let auditId = null;
    try {
      const { data: auditEntry } = await supabase
        .from('audit_log')
        .insert({
          table_name: 'user_permission',
          action: 'EDIT',
          record_key: String(targetUserId),
          old_values: { user_id: targetUserId, rights: previousRights || {} },
          new_values: { user_id: targetUserId, rights: updatedRights },
          action_by: String(currentUserId)
        })
        .select('audit_id')
        .maybeSingle();

      if (auditEntry?.audit_id) {
        auditId = auditEntry.audit_id;
      }
    } catch (e) {
      console.warn('Audit logging notice for user rights:', e.message);
    }

    res.json({ message: 'User rights updated and audit entry recorded.', auditId });
  } catch (err) {
    console.error('Update user rights error:', err);
    res.status(500).json({ message: err.message || 'Failed to update user rights.' });
  }
});

// Server Initialization
async function verifyConnection() {
  console.log("Checking connection...");
  const { error } = await supabase.from("test").select("*").limit(1);
  if (!error || error.code === "PGRST205") {
    console.log("Supabase connection OK");
  } else {
    console.error("Connection failed:", error.message);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 3000;
verifyConnection().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});