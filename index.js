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
  cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Unauthorized access." });
  }
  next();
}

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

function isStaffRole(roleName, roleId) {
  if(roleId && (Number(roleId) === 6 || Number(roleId) === 14)) {
    return true;
  }

  if(!roleName) return false;
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

  return {
    superadminRoleId: superadmin ? String(superadmin.role_id) : null,
    adminRoleId: adminRole ? String(adminRole.role_id) : null,
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
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "register.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get('/users', (req, res) => res.sendFile(path.join(__dirname, 'public', 'users.html')));
app.get("/setPassword", (req, res) => res.sendFile(path.join(__dirname, "public", "setPassword.html")));
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
    return res.status(500).json({ message: 'Internal server error resetting password.' });
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

    const { error } = await supabase.from("app_user").insert({
      username: email,
      password_hash: "!pending-no-password",
      first_name: firstName,
      last_name: lastName,
      email: email,
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

    const isPendingSetup = !user.password_hash ||
      user.password_hash === '!pending-no-password' ||
      !user.password_hash.startsWith('$2b$');

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
    .select('user_id, username, email, first_name, last_name, status, is_blocked')
    .eq('user_id', req.session.user.id)
    .maybeSingle();

  if (error || !user || user.is_blocked || user.status === 'rejected') {
    req.session.destroy(() => {
      res.clearCookie("connect.sid", { path: '/' });
      return res.status(401).json({ message: "Account is blocked or rejected." });
    });
    return;
  }
  return res.json({ user: req.session.user });
});

// Roles Endpoint for Frontend Select Options
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

// 1. Get All Users (Sends capability flags based on requester role)
app.get('/api/admin/users', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user?.id;
    if (!currentUserId) return res.status(401).json({ message: 'Unauthorized session.' });

    // 1. Fetch system roles
    const { data: roles } = await supabase.from('role').select('role_id, role_name');
    const superadminRoleIdSet = new Set(
      (roles || []).filter(r => isSuperadminRole(r.role_name)).map(r => String(r.role_id))
    );

    // 2. Fetch logged-in requester role
    const { data: currentUser } = await supabase
      .from('app_user')
      .select('user_id, role_id, role(role_name)')
      .eq('user_id', currentUserId)
      .maybeSingle();

    const currentRoleName = currentUser?.role?.role_name;
    const isCurrentSuperadmin = Boolean(
      isSuperadminRole(currentRoleName) ||
      (currentUser?.role_id && superadminRoleIdSet.has(String(currentUser.role_id)))
    );
    const isCurrentManager = isManagerRole(currentRoleName);

    // 3. Fetch all active app_users
    const { data: users, error: fetchErr } = await supabase
      .from('app_user')
      .select('user_id, username, email, first_name, last_name, status, is_blocked, password_hash, is_deleted, role_id, role(role_name)')
      .order('user_id', { ascending: true });

    if (fetchErr) throw fetchErr;

    // 4. Filter and assign precise RBAC flags
    const formattedUsers = (users || [])
      .filter(u => u.is_deleted !== true)
      .filter(u => {
        const targetRoleName = u.role?.role_name;
        const targetIsSuperadmin = Boolean(
          isSuperadminRole(targetRoleName) ||
          (u.role_id && superadminRoleIdSet.has(String(u.role_id)))
        );

        // Hide Superadmin rows from non-Superadmins
        if (!isCurrentSuperadmin && targetIsSuperadmin) return false;
        return true;
      })
      .map(u => {
        const targetRoleName = u.role?.role_name;
        const targetIsStaffOrUser = isStaffRole(targetRoleName, u.role_id);
        const userStatus = (u.status || '').toLowerCase();
        const isBlocked = u.is_blocked === true || userStatus === 'rejected' || userStatus === 'blocked';
        const isSelf = String(u.user_id) === String(currentUserId);

        // Capability Matrix:
        // - Superadmin: full control (except editing/deleting self)
        // - Manager: can edit/block Staff accounts only (no delete, no role changes)
        // - Staff: view-only (no edit, block, delete, or role changes)
        const canManage = isCurrentSuperadmin || (isCurrentManager && targetIsStaffOrUser);

        return {
          id: u.user_id,
          email: u.email || u.username,
          firstName: u.first_name || '',
          lastName: u.last_name || '',
          roleId: u.role_id,
          roleName: targetRoleName || 'Staff',
          status: isBlocked ? 'rejected' : (u.status || 'active'),
          isBlocked: isBlocked,
          isPendingSetup: u.status === 'pending' || u.password_hash === '!pending-no-password',
          isSelf: isSelf,
          // Explicit UI Action Flags
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

    // default role will be User
    const DEFAULT_USER_ROLE_ID = 14;

    const { data: newUser, error: insertError } = await supabase
      .from('app_user')
      .insert([{
        username: cleanedEmail,
        email: cleanedEmail,
        password_hash: '!pending-no-password',
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role_id: DEFAULT_USER_ROLE_ID,
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

// 3. Edit User Details (Guarded for Manager on Staff only)
app.put('/api/admin/users/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.session.user?.id;
    const { email, firstName, lastName } = req.body;

    const { data: requester } = await supabase
      .from('app_user')
      .select('role(role_name)')
      .eq('user_id', currentUserId)
      .maybeSingle();

    const requesterRole = requester?.role?.role_name;

    // Reject Staff
    if (isStaffRole(requesterRole)) {
      return res.status(403).json({ message: 'Action denied: Staff members cannot edit accounts.' });
    }

    // Check target role for Managers
    const { data: targetUser } = await supabase
      .from('app_user')
      .select('role(role_name)')
      .eq('user_id', id)
      .maybeSingle();

    if (isManagerRole(requesterRole) && !isStaffRole(targetUser?.role?.role_name)) {
      return res.status(403).json({ message: 'Action denied: Managers can only edit Staff accounts.' });
    }

    const cleanedEmail = email.trim().toLowerCase();
    const { error: updateError } = await supabase
      .from('app_user')
      .update({ username: cleanedEmail, email: cleanedEmail, first_name: firstName.trim(), last_name: lastName.trim() })
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
      .select('role(role_name)')
      .eq('user_id', currentUserId)
      .maybeSingle();

    const requesterRole = requester?.role?.role_name;
    if (isStaffRole(requesterRole)) {
      return res.status(403).json({ message: 'Action denied: Staff members cannot approve users.' });
    }

    const { data: targetUser } = await supabase
      .from('app_user')
      .select('status, role(role_name)')
      .eq('user_id', id)
      .maybeSingle();

    if (!targetUser) return res.status(404).json({ message: 'User not found.' });

    if (isManagerRole(requesterRole) && !isStaffRole(targetUser?.role?.role_name)) {
      return res.status(403).json({ message: 'Action denied: Managers can only approve Staff accounts.' });
    }

    const { error: updateError } = await supabase
      .from('app_user')
      .update({ status: 'active' })
      .eq('user_id', id);

    if (updateError) throw updateError;
    res.json({ message: 'User account has been approved and activated.' });
  } catch (err) {
    console.error('Approve user error:', err);
    res.status(500).json({ message: err.message || 'Failed to approve user.' });
  }
});

// 5. Update User Role (ONLY Superadmin allowed)
app.patch('/api/admin/users/:id/role', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user?.id;
    const { data: requester } = await supabase
      .from('app_user')
      .select('role(role_name)')
      .eq('user_id', currentUserId)
      .maybeSingle();

    // Reject anyone who is not a Superadmin
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

// 6. Block / Unblock User (Guarded for Manager on Staff only)
app.patch('/api/admin/users/:id/block', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;
    const currentUserId = req.session.user?.id;

    const { data: requester } = await supabase
      .from('app_user')
      .select('role(role_name)')
      .eq('user_id', currentUserId)
      .maybeSingle();

    const requesterRole = requester?.role?.role_name;

    // Reject Staff
    if (isStaffRole(requesterRole)) {
      return res.status(403).json({ message: 'Action denied: Staff members cannot block accounts.' });
    }

    const { data: targetUser } = await supabase
      .from('app_user')
      .select('user_id, role_id, role(role_name)')
      .eq('user_id', id)
      .maybeSingle();

    if (!targetUser) return res.status(404).json({ message: 'User not found.' });

    // Restrict Managers to Staff targets
    if (isManagerRole(requesterRole) && !isStaffRole(targetUser?.role?.role_name)) {
      return res.status(403).json({ message: 'Action denied: Managers can only block Staff accounts.' });
    }

    // Last Superadmin Safeguard
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

// 7. Soft-Delete User (ONLY Superadmin allowed)
app.delete('/api/admin/users/:id', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session.user?.id;
    const { data: requester } = await supabase
      .from('app_user')
      .select('role(role_name)')
      .eq('user_id', currentUserId)
      .maybeSingle();

    // Reject anyone who is not a Superadmin
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