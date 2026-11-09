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
  Customer: ['Customer', 'Customer Management'],
  Product: ['Product', 'Product Management']
};

function parseGranularPermissions(value) {
  const permissions = typeof value === 'string' ? JSON.parse(value) : value;
  if (permissions == null) return {};
  if (typeof permissions !== 'object' || Array.isArray(permissions)) {
    throw new Error('Invalid granular permissions data.');
  }
  return permissions;
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

      // 2. Query target user's rights for this specific module
      const moduleNames = PERMISSION_MODULE_ALIASES[moduleName] || [moduleName];
      const { data: rightsRows, error: rightsError } = await supabase
        .from('user_rights')
        .select('module_name, can_read, granular_permission')
        .eq('user_id', userId)
        .in('module_name', moduleNames);

      if (rightsError) throw rightsError;

      const rights = (rightsRows || []).find(row => row.module_name === moduleName)
        || (rightsRows || []).find(row => moduleNames.includes(row.module_name));
      const granularPermissions = parseGranularPermissions(rights?.granular_permission);

      if (rights?.can_read === true && granularPermissions[permissionKey] === true) {
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

    const { data: user, error: fetchError } = await supabase
      .from('app_user')
      .select('user_id, reset_token, reset_token_expires, is_blocked')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (fetchError || !user) {
      return res.status(400).json({ message: 'Invalid or expired password reset link.' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ message: 'This account is blocked.' });
    }

    const now = new Date();
    const tokenExpiry = new Date(user.reset_token_expires);
    if (!user.reset_token || user.reset_token !== token || now > tokenExpiry) {
      return res.status(400).json({ message: 'Invalid or expired password reset link.' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await supabase
      .from('app_user')
      .update({
        password_hash: newPasswordHash,
        reset_token: null,
        reset_token_expires: null
      })
      .eq('user_id', user.user_id);

    if (updateError) throw updateError;

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

    const { data: user, error: fetchError } = await supabase
      .from('app_user')
      .select('email, is_blocked')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    const genericSuccess = { message: 'If an account exists with that email, a password reset link has been sent.' };
    if (fetchError || !user) return res.status(200).json(genericSuccess);

    if (user.is_blocked) return res.status(403).json({ message: 'This account is blocked. Please contact support.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000).toISOString();

    const { error: updateError } = await supabase
      .from('app_user')
      .update({ reset_token: resetToken, reset_token_expires: resetExpires })
      .eq('email', user.email);

    if (updateError) throw updateError;

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

    const isPendingSetup = !user.password_hash || user.password_hash === '!pending-no-password' || !user.password_hash.startsWith('$2b$');
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
verifyConnection().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});