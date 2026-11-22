const express = require("express");
const path = require("path");
const supabase = require("./src/config/supabaseClient");
const cookieSession = require("cookie-session");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const nodemailer = require("nodemailer");

function isValidServiceKey(key) {
  return typeof key === 'string'
    && (key.startsWith('ey') || key.startsWith('sb_secret_'))
    && !key.includes('your-');
}

const supabaseAdmin = (process.env.SUPABASE_SERVICE_ROLE_KEY && isValidServiceKey(process.env.SUPABASE_SERVICE_ROLE_KEY))
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

let verificationEmailTransporter = null;
const pendingRegistrations = new Map();

const app = express();
app.use(express.json());
app.set("trust proxy", 1);

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set.");
}

// Log incoming requests to terminal for debugging
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

// Serve static frontend files from 'public'
app.use(express.static(path.join(__dirname, "public")));

app.use(cookieSession({
  name: "hope_session",
  keys: [process.env.SESSION_SECRET],
  signed: true,
  maxAge: 1000 * 60 * 60 * 24,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax"
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
  can_add_customer: ['CREATE_CUSTOMER', 'can_add_customer'],
  can_edit_customer: ['EDIT_CUSTOMER', 'can_edit_customer'],
  can_delete_customer: ['DELETE_CUSTOMER', 'can_delete_customer'],
  can_add_product: ['CREATE_PRODUCT', 'can_add_product'],
  can_edit_product: ['EDIT_PRODUCT', 'can_edit_product'],
  can_delete_product: ['DELETE_PRODUCT', 'can_delete_product'],
  can_add_price: ['MANAGE_PRICING', 'can_add_price'],
  can_edit_price: ['VIEW_PRICING', 'can_edit_price'],
  can_delete_price: ['can_delete_price'],
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
  can_add_sale: ['CREATE_SALE', 'can_add_sale'],
  can_edit_sale: ['EDIT_SALE', 'can_edit_sale'],
  can_delete_sale: ['can_delete_sale'],
  can_view_sale_details: ['VIEW_SALES', 'can_view_sale_details'],
  can_add_sale_detail: ['can_add_sale_detail'],
  can_edit_sale_detail: ['can_edit_sale_detail'],
  can_delete_sale_detail: ['can_delete_sale_detail'],
  can_view_top_customers: ['can_view_top_customers'],
  can_view_product_master_list: ['can_view_product_master_list'],
  can_view_top_products: ['can_view_top_products'],
  can_view_active_employees: ['VIEW_EMPLOYEES', 'can_view_active_employees'],
  can_view_all_employees: ['can_view_all_employees'],
  can_view_employee_job_history: ['can_view_employee_job_history'],
  can_view_top_sales: ['VIEW_FIN_REPORTS', 'can_view_top_sales']
};

function hasOtpHashSecret() {
  const secret = process.env.EMAIL_OTP_SECRET || process.env.SESSION_SECRET;
  return typeof secret === 'string' && secret.length >= 32;
}

function getSmtpPort() {
  const port = Number(process.env.SMTP_PORT || 465);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : null;
}

function hasEmailVerificationConfiguration() {
  return Boolean(
    process.env.SMTP_HOST
    && getSmtpPort()
    && process.env.SMTP_USER
    && process.env.SMTP_PASS
  );
}

function hashEmailVerificationCode(email, code) {
  const secret = process.env.EMAIL_OTP_SECRET || process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('EMAIL_OTP_SECRET or SESSION_SECRET must contain at least 32 characters.');
  }
  return crypto.createHmac('sha256', secret)
    .update(`${email.toLowerCase()}:${code}`)
    .digest('hex');
}

function getVerificationEmailTransporter() {
  if (verificationEmailTransporter) return verificationEmailTransporter;

  const port = getSmtpPort();
  if (!process.env.SMTP_HOST || !port || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS are required.');
  }

  verificationEmailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS.replace(/\s+/g, '')
    }
  });
  return verificationEmailTransporter;
}

async function sendEmailVerificationCode(email, code) {
  await getVerificationEmailTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Your Hope, Inc. verification code',
    text: `Your verification code is ${code}. It expires in 2 minutes.`,
    html: `<p>Your Hope, Inc. verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p><p>This code expires in 2 minutes. If you did not request it, ignore this email.</p>`
  });
}

async function issueAndSendEmailVerificationCode(userId, email) {
  const code = String(crypto.randomInt(100000, 1000000));
  const { data: issued, error } = await supabaseAdmin.rpc('issue_email_verification_otp', {
    p_user_id: userId,
    p_token_hash: hashEmailVerificationCode(email, code)
  });
  if (error) throw error;
  if (!issued) return false;

  try {
    await sendEmailVerificationCode(email, code);
  } catch (sendError) {
    await supabaseAdmin.rpc('release_email_verification_otp', { p_user_id: userId });
    throw sendError;
  }
  return true;
}

function parseGranularPermissions(value) {
  const permissions = typeof value === 'string' ? JSON.parse(value) : value;
  if (permissions == null) return {};
  if (typeof permissions !== 'object' || Array.isArray(permissions)) {
    throw new Error('Invalid granular permissions data.');
  }
  return permissions;
}

function isMissingPermissionRelation(error) {
  return ['PGRST200', 'PGRST205', '42P01'].includes(error?.code);
}

async function getUserRightsMap(userId) {
  const moduleKeys = ['Customer', 'Product', 'Human Resources', 'Sales', 'Reports'];
  const rightsMap = {};

  moduleKeys.forEach(moduleName => {
    rightsMap[moduleName] = {
      module_name: moduleName,
      enabled: false,
      can_create: false,
      can_read: false,
      can_update: false,
      can_delete: false,
      granular_permission: {}
    };
  });

  const { data: permissions, error: permissionError } = await supabase
    .from('user_permission')
    .select('right_id, is_deleted, rights (right_id, module_id, action_code, right_name, is_deleted, module (module_id, module_code, module_name, is_deleted))')
    .eq('user_id', userId);

  if (permissionError && !isMissingPermissionRelation(permissionError)) throw permissionError;

  (permissions || []).forEach(permission => {
    if (permission.is_deleted || !permission.rights || permission.rights.is_deleted) return;

    const right = permission.rights;
    const moduleName = right.module?.module_name || right.module?.module_code;
    const actionCode = (right.action_code || right.right_name || '').trim().toLowerCase();
    const matchedModule = moduleKeys.find(key => {
      const aliases = PERMISSION_MODULE_ALIASES[key] || [key];
      return aliases.some(alias => String(moduleName || '').toLowerCase().includes(alias.toLowerCase()));
    });

    if (!matchedModule) return;

    rightsMap[matchedModule].enabled = true;
    rightsMap[matchedModule].can_read = true;
    Object.entries(ACTION_CODE_MAP).forEach(([permissionKey, codes]) => {
      if (codes.some(code => code.toLowerCase() === actionCode) || permissionKey.toLowerCase() === actionCode) {
        rightsMap[matchedModule].granular_permission[permissionKey] = true;
        rightsMap[matchedModule][permissionKey] = true;
        if (/^can_(add|create)_/.test(permissionKey)) rightsMap[matchedModule].can_create = true;
        if (/^can_(edit|update)_/.test(permissionKey)) rightsMap[matchedModule].can_update = true;
        if (/^can_delete_/.test(permissionKey)) rightsMap[matchedModule].can_delete = true;
      }
    });
  });

  const { data: legacyRights, error: legacyError } = await supabase
    .from('user_rights')
    .select('*')
    .eq('user_id', userId);

  if (legacyError && !isMissingPermissionRelation(legacyError)) throw legacyError;

  (legacyRights || []).forEach(row => {
    const moduleName = moduleKeys.find(key => {
      const aliases = PERMISSION_MODULE_ALIASES[key] || [key];
      return aliases.some(alias => alias.toLowerCase() === String(row.module_name || '').toLowerCase());
    }) || row.module_name;
    const granular = parseGranularPermissions(row.granular_permission);
    const enabled = typeof row.enabled === 'boolean' ? row.enabled : Boolean(row.can_read);

    if (!rightsMap[moduleName]) {
      rightsMap[moduleName] = {
        module_name: moduleName,
        enabled,
        can_create: Boolean(row.can_create),
        can_read: Boolean(row.can_read),
        can_update: Boolean(row.can_update),
        can_delete: Boolean(row.can_delete),
        granular_permission: granular,
        ...granular
      };
      return;
    }

    const current = rightsMap[moduleName];
    current.enabled = current.enabled || enabled;
    current.can_read = current.can_read || Boolean(row.can_read);
    current.can_create = current.can_create || Boolean(row.can_create);
    current.can_update = current.can_update || Boolean(row.can_update);
    current.can_delete = current.can_delete || Boolean(row.can_delete);
    current.granular_permission = { ...current.granular_permission, ...granular };
    Object.assign(current, granular);
  });

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

      const rightsMap = await getUserRightsMap(userId);
      const normalizedModule = Object.keys(rightsMap).find(key => {
        const aliases = PERMISSION_MODULE_ALIASES[key] || [key];
        return aliases.some(alias => alias.toLowerCase() === moduleName.toLowerCase());
      }) || moduleName;
      const moduleRights = rightsMap[normalizedModule];
      const permissionGranted = moduleRights?.granular_permission?.[permissionKey] === true
        || moduleRights?.[permissionKey] === true;

      if (moduleRights && (moduleRights.can_read || moduleRights.enabled) && permissionGranted) {
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
  const dbClient = supabaseAdmin || supabase;
  let roles = null;

  try {
    const { data, error } = await dbClient
      .from('role')
      .select('role_id, role_name');

    if (error) {
      console.error('getRoleConfig query error:', error);
    } else if (Array.isArray(data) && data.length > 0) {
      roles = data;
    }
  } catch (err) {
    console.error('getRoleConfig error:', err);
  }

  // Fallback to standard seeded roles if database fetch encounters an issue
  if (!roles || roles.length === 0) {
    console.warn('[getRoleConfig] Using static fallback roles.');
    return {
      superadminRoleId: '4',
      adminRoleId: '5',
      defaultUserRoleId: '14',
      rolesMap: new Map([
        ['4', 'Superadmin'],
        ['5', 'Administrator'],
        ['6', 'Staff'],
        ['13', 'System Administrator'],
        ['14', 'User']
      ])
    };
  }

  const superadmin = roles.find(r => isSuperadminRole(r.role_name));
  const adminRole = roles.find(r => isManagerRole(r.role_name));
  const defaultUserRole = roles.find(r => String(r.role_name).trim().toLowerCase() === 'standard user')
    || roles.find(r => String(r.role_name).trim().toLowerCase() === 'user')
    || roles.find(r => isStandardUserRole(r.role_name, r.role_id));

  return {
    superadminRoleId: superadmin ? String(superadmin.role_id) : '4',
    adminRoleId: adminRole ? String(adminRole.role_id) : '5',
    defaultUserRoleId: defaultUserRole ? String(defaultUserRole.role_id) : '14',
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
app.get('/', (req, res) => res.sendFile(path.join(__dirname, "public", "splashindex.html")));
app.get('/splashindex', (req, res) => res.sendFile(path.join(__dirname, "public", "splashindex.html")));
app.get('/dashboard', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/users', requireAuth, requireUserManagementAccess, (req, res) => res.sendFile(path.join(__dirname, 'public', 'users.html')));

// Auth API Endpoints
app.post('/api/auth/resetPassword', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: 'Invalid or missing reset token/email.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }
    if (!supabaseAdmin) {
      return res.status(503).json({ message: 'Password reset is not configured on this server.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const { data: resetToken, error: tokenError } = await supabaseAdmin
      .from('password_reset_token')
      .select('token_id, user_id, expires_at, is_used, is_deleted')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (tokenError) throw tokenError;
    if (!resetToken || resetToken.is_used || resetToken.is_deleted
      || new Date(resetToken.expires_at).getTime() <= Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired password reset link.' });
    }

    const { data: user, error: userError } = await supabase
      .from('app_user')
      .select('user_id, email, is_blocked, is_deleted')
      .eq('user_id', resetToken.user_id)
      .maybeSingle();

    if (userError) throw userError;
    if (!user || user.is_deleted || user.email?.toLowerCase() !== email) {
      return res.status(400).json({ message: 'Invalid or expired password reset link.' });
    }
    if (user.is_blocked) {
      return res.status(403).json({ message: 'This account is blocked.' });
    }

    const { data: consumedToken, error: consumeError } = await supabaseAdmin
      .from('password_reset_token')
      .update({ is_used: true })
      .eq('token_id', resetToken.token_id)
      .eq('is_used', false)
      .select('token_id')
      .maybeSingle();
    if (consumeError) throw consumeError;
    if (!consumedToken) {
      return res.status(400).json({ message: 'Invalid or expired password reset link.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await supabase
      .from('app_user')
      .update({ password_hash: passwordHash })
      .eq('user_id', user.user_id);
    if (updateError) throw updateError;

    return res.status(200).json({ message: 'Password reset successful! Redirecting to login...' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Internal server error while resetting password.' });
  }
});

app.post('/api/auth/forgotPassword', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }
    if (!supabaseAdmin) {
      return res.status(503).json({ message: 'Password reset is not configured on this server.' });
    }
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ message: 'Password reset email delivery is not configured.' });
    }

    const { data: user, error: userError } = await supabase
      .from('app_user')
      .select('user_id, email, is_blocked, is_deleted')
      .eq('email', email)
      .maybeSingle();
    if (userError) throw userError;

    const response = {
      message: 'If an account exists with that email, a password reset link has been generated.'
    };
    if (!user || user.is_blocked || user.is_deleted) {
      return res.status(200).json(response);
    }

    const { error: invalidateError } = await supabaseAdmin
      .from('password_reset_token')
      .update({ is_used: true })
      .eq('user_id', user.user_id)
      .eq('is_used', false)
      .eq('is_deleted', false);
    if (invalidateError) throw invalidateError;

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { error: insertError } = await supabaseAdmin
      .from('password_reset_token')
      .insert({ user_id: user.user_id, token_hash: tokenHash, expires_at: expiresAt });
    if (insertError) throw insertError;

    const baseUrl = (process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const resetLink = `${baseUrl}/?view=reset&token=${token}&email=${encodeURIComponent(user.email)}`;
    console.info(`Password reset link for ${user.email}: ${resetLink}`);
    return res.status(200).json(response);
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Could not process the password reset request.' });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const body = req.body || {};
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "Full name, email, and password are required." });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    if (email.length > 50) return res.status(400).json({ message: "Email must be 50 characters or fewer." });
    if (fullName.length > 100) return res.status(400).json({ message: "Name is too long." });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters long." });
    if (!/[A-Z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ message: "Password must contain an uppercase letter and a number." });
    }
    if (password !== confirmPassword) return res.status(400).json({ message: "Passwords do not match." });

    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts.shift();
    const lastName = nameParts.join(" ");
    if (!lastName) return res.status(400).json({ message: "Enter your first and last name." });
    if (firstName.length > 50 || lastName.length > 50) {
      return res.status(400).json({ message: "First and last names must be 50 characters or fewer." });
    }

    const { defaultUserRoleId } = await getRoleConfig();
    if (!defaultUserRoleId) {
      return res.status(500).json({ message: "The default User role is not configured." });
    }

    // Check if an active user already exists with this email
    const dbClient = supabaseAdmin || supabase;
    const { data: existingUser, error: checkError } = await dbClient
      .from("app_user")
      .select("user_id")
      .eq("email", email)
      .eq("is_deleted", false)
      .maybeSingle();

    if (checkError) {
      console.error("User existence check error:", checkError);
    }
    if (existingUser) {
      return res.status(409).json({ message: "This email is already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const code = String(crypto.randomInt(100000, 1000000));
    const tokenHash = hashEmailVerificationCode(email, code);
    const expiresAt = Date.now() + 10 * 60 * 1000;

    const pendingData = {
      fullName,
      firstName,
      lastName,
      email,
      passwordHash,
      defaultUserRoleId,
      tokenHash,
      expiresAt,
      attempts: 0
    };

    pendingRegistrations.set(email, pendingData);
    if (req.session) {
      req.session.pendingRegistration = pendingData;
    }

    let emailSent = false;
    let emailWarning = null;
    if (hasEmailVerificationConfiguration()) {
      try {
        await sendEmailVerificationCode(email, code);
        emailSent = true;
      } catch (emailErr) {
        console.error('SMTP email delivery error:', emailErr.message);
        emailWarning = emailErr.message;
      }
    } else {
      console.warn(`[AUTH] SMTP is not fully configured. Code generated for terminal verification.`);
    }

    console.log(`\n======================================================`);
    console.log(`[VERIFICATION CODE] For: ${email}`);
    console.log(`[VERIFICATION CODE] Code: ${code}`);
    console.log(`======================================================\n`);

    res.status(201).json({
      message: emailSent
        ? 'A 6-digit verification code has been sent to your email.'
        : (emailWarning
            ? `Code generated! (Email delivery failed: ${emailWarning})`
            : 'A 6-digit verification code has been generated. Check your email or terminal.'),
      verificationRequired: true
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ message: err?.message || "Something went wrong. Please try again." });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(token)) {
      return res.status(400).json({ message: 'Enter a valid email address and 6-digit code.' });
    }

    // Check pending registration
    const pending = pendingRegistrations.get(email)
      || (req.session?.pendingRegistration?.email === email ? req.session.pendingRegistration : null);

    if (pending) {
      if (Date.now() > pending.expiresAt) {
        pendingRegistrations.delete(email);
        if (req.session) delete req.session.pendingRegistration;
        return res.status(400).json({ message: 'The verification code has expired. Please register again.' });
      }

      if ((pending.attempts || 0) >= 5) {
        pendingRegistrations.delete(email);
        if (req.session) delete req.session.pendingRegistration;
        return res.status(400).json({ message: 'Too many failed attempts. Please register again.' });
      }

      const inputHash = hashEmailVerificationCode(email, token);
      if (inputHash !== pending.tokenHash) {
        pending.attempts = (pending.attempts || 0) + 1;
        return res.status(400).json({ message: 'The verification code is invalid.' });
      }

      // Code is verified! NOW create the account in app_user
      const dbClient = supabaseAdmin || supabase;
      const { data: newUser, error: insertError } = await dbClient.from("app_user").insert({
        username: pending.email,
        password_hash: pending.passwordHash,
        first_name: pending.firstName,
        last_name: pending.lastName,
        full_name: pending.fullName,
        email: pending.email,
        role_id: pending.defaultUserRoleId,
        status: 'pending',
        email_verified_at: new Date().toISOString()
      }).select('user_id').single();

      if (insertError) {
        if (insertError.code === "23505") {
          return res.status(409).json({ message: "This email is already registered." });
        }
        console.error("Account creation insert error:", insertError);
        return res.status(500).json({ message: insertError.message || "Failed to create user record." });
      }

      pendingRegistrations.delete(email);
      if (req.session) delete req.session.pendingRegistration;

      return res.status(200).json({
        message: 'Email verified and account created! Your account is awaiting administrator approval.'
      });
    }

    // Fallback for pre-existing unverified users in database
    if (!supabaseAdmin || !hasOtpHashSecret()) {
      return res.status(400).json({ message: 'No pending registration was found for this email. Please register first.' });
    }

    const { data: appUser, error: appUserError } = await supabaseAdmin
      .from('app_user')
      .select('user_id, is_deleted, status, email_verified_at')
      .eq('email', email)
      .eq('is_deleted', false)
      .maybeSingle();
    if (appUserError) throw appUserError;
    if (!appUser || appUser.is_deleted) {
      return res.status(400).json({ message: 'No active registration was found for this email. Please register first.' });
    }
    if (appUser.email_verified_at) {
      return res.status(200).json({ message: 'Email verified. You can now continue.' });
    }

    const { data: verified, error } = await supabaseAdmin.rpc('verify_email_verification_otp', {
      p_user_id: appUser.user_id,
      p_token_hash: hashEmailVerificationCode(email, token)
    });
    if (error) throw error;
    if (!verified) {
      return res.status(400).json({ message: 'The verification code is invalid or expired.' });
    }

    return res.status(200).json({
      message: String(appUser.status || '').toLowerCase() === 'pending'
        ? 'Email verified. Your account is awaiting administrator approval.'
        : 'Email verified. You can now sign in.'
    });
  } catch (err) {
    console.error('Email verification error:', err);
    return res.status(500).json({ message: 'Could not verify the email address.' });
  }
});

app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    const pending = pendingRegistrations.get(email)
      || (req.session?.pendingRegistration?.email === email ? req.session.pendingRegistration : null);

    if (pending) {
      const code = String(crypto.randomInt(100000, 1000000));
      pending.tokenHash = hashEmailVerificationCode(email, code);
      pending.expiresAt = Date.now() + 10 * 60 * 1000;
      pending.attempts = 0;

      if (hasEmailVerificationConfiguration()) {
        try {
          await sendEmailVerificationCode(email, code);
        } catch (e) {
          console.error('SMTP resend failed:', e.message);
        }
      }

      console.log(`\n======================================================`);
      console.log(`[RESEND VERIFICATION CODE] For: ${email}`);
      console.log(`[RESEND VERIFICATION CODE] Code: ${code}`);
      console.log(`======================================================\n`);

      return res.status(200).json({ message: 'A new verification code has been sent.' });
    }

    if (!hasEmailVerificationConfiguration()) {
      return res.status(200).json({ message: 'If an unverified registration exists for that email, a new code has been sent.' });
    }

    const { data: appUser, error } = await supabaseAdmin
      .from('app_user')
      .select('user_id, status, is_deleted, email_verified_at')
      .eq('email', email)
      .eq('is_deleted', false)
      .maybeSingle();
    if (error) throw error;

    const response = { message: 'If an unverified registration exists for that email, a new code has been sent.' };
    if (!appUser || appUser.is_deleted || String(appUser.status).toLowerCase() !== 'pending' || appUser.email_verified_at) {
      return res.status(200).json(response);
    }

    const sent = await issueAndSendEmailVerificationCode(appUser.user_id, email);
    if (!sent) {
      return res.status(429).json({ message: 'Please wait before requesting another verification code.' });
    }
    return res.status(200).json(response);
  } catch (err) {
    console.error('Resend verification error:', err);
    return res.status(500).json({ message: 'Could not send verification code: ' + (err.message || 'Please check SMTP settings.') });
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
      .select('user_id, username, password_hash, is_blocked, status, email_verified_at')
      .eq('username', email.toLowerCase())
      .eq('is_deleted', false)
      .maybeSingle();

    if (fetchError || !user) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    if (user.is_blocked || user.status === 'rejected') {
      return res.status(403).json({ message: 'This account is blocked. Please contact support.' });
    }

    const isPendingSetup = !user.password_hash || user.password_hash === '!pending-no-password' || !user.password_hash.startsWith('$2b$');
    if (isPendingSetup) {
      return res.status(403).json({
        message: 'This account has no password set. Please contact an administrator.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    if (String(user.status || '').toLowerCase() === 'pending' && !user.email_verified_at) {
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Verify your email address before continuing.'
      });
    }

    if (String(user.status || '').toLowerCase() === 'pending') {
      return res.status(403).json({ message: 'Your account is pending approval. Please wait for an administrator to approve it.' });
    }

    req.session.user = { id: user.user_id, email: user.username };
    return res.status(200).json({ message: 'Login successful!', user: { email: user.username } });
  } catch (err) {
    console.error('Login server error:', err);
    return res.status(500).json({ message: 'Internal server error while logging in.' });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session = null;
  res.clearCookie("hope_session", { path: "/" });
  res.status(200).json({ message: "Logged out successfully." });
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
    req.session = null;
    res.clearCookie("hope_session", { path: '/' });
    return res.status(401).json({ message: "Account is blocked or rejected." });
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

    const { data: rights, error: rightsError } = await supabase
      .from('user_rights')
      .select('module_name, can_create, can_read, can_update, can_delete, granular_permission')
      .eq('user_id', userId);

    if (rightsError) throw rightsError;

    const rightsMap = {};
    (rights || []).forEach(r => {
      const granularPermissions = parseGranularPermissions(r.granular_permission);
      rightsMap[r.module_name] = {
        ...r,
        ...granularPermissions,
        granular_permission: granularPermissions
      };
    });

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

    if (isManagerRole(requesterRole) && !isStaffRole(targetUser?.role?.role_name)) {
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
      .select('status, email_verified_at, role_id, role (role_name)')
      .eq('user_id', id)
      .maybeSingle();

    if (!targetUser) return res.status(404).json({ message: 'User not found.' });
    if (String(targetUser.status || '').toLowerCase() !== 'pending') {
      return res.status(409).json({ message: 'Only pending users can be approved.' });
    }
    if (!targetUser.email_verified_at) {
      return res.status(409).json({ message: 'This user must verify their email before approval.' });
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

    if (isManagerRole(requesterRole) && !isStaffRole(targetUser?.role?.role_name)) {
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
    const { data: rights, error } = await supabase
      .from('user_rights')
      .select('*')
      .eq('user_id', id);

    if (error) throw error;

    const rightsMap = {};
    (rights || []).forEach(r => {
      const granular = parseGranularPermissions(r.granular_permission);

      const modKey = r.module_name;
      rightsMap[modKey] = {
        module_name: modKey,
        enabled: typeof r.enabled === 'boolean' ? r.enabled : Boolean(r.can_read),
        can_create: Boolean(r.can_create),
        can_read: Boolean(r.can_read),
        can_update: Boolean(r.can_update),
        can_delete: Boolean(r.can_delete),
        granular_permission: granular,
        ...granular
      };
    });

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

    const { data: previousRights, error: previousRightsError } = await supabase
      .from('user_rights')
      .select('*')
      .eq('user_id', targetUserId);

    if (previousRightsError) throw previousRightsError;

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

    const { error: upsertError } = await supabase
      .from('user_rights')
      .upsert(upsertPayload, { onConflict: 'user_id, module_name' });

    if (upsertError) throw upsertError;

    const { data: auditEntry, error: auditError } = await supabase
      .from('audit_log')
      .insert({
        table_name: 'user_rights',
        action: 'EDIT',
        record_key: String(targetUserId),
        old_values: { user_id: targetUserId, rights: previousRights || [] },
        new_values: { user_id: targetUserId, rights: updatedRights },
        action_by: String(currentUserId)
      })
      .select('audit_id')
      .single();

    if (auditError) {
      console.error('User rights were updated, but audit logging failed:', auditError);
      return res.status(500).json({
        message: 'User rights were saved, but the audit log could not be recorded. Contact an administrator.'
      });
    }
    if (!auditEntry) {
      console.error('User rights were updated, but the audit insert returned no audit row.');
      return res.status(500).json({
        message: 'User rights were saved, but the audit log did not confirm a recorded row.'
      });
    }

    res.json({ message: 'User rights updated and audit entry recorded.', auditId: auditEntry.audit_id });
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
if (require.main === module) {
  verifyConnection().then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  });
}

module.exports = app;