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

// Serve register.html on root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "register.html"));
});

//Serve login.html on /login
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

//Serve users.html on /users
app.get('/users', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'users.html'));
});

// Serve setPassword.html on /setPassword
app.get("/setPassword", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "setPassword.html"));
});

// Serve forgotPassword.html on /forgotPassword
app.get('/forgotPassword', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'forgotPassword.html'));
});

// Serve resetPassword.html on /resetPassword
app.get('/resetPassword', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'resetPassword.html'));
});

// Serve Reset Password Page
app.post('/api/auth/resetPassword', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      console.log('Reset Password Failed: Missing required fields', { email, hasToken: !!token });
      return res.status(400).json({ message: 'Invalid or missing reset token/email.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    // 1. Fetch user record from Supabase
    const { data: user, error: fetchError } = await supabase
      .from('app_user')
      .select('email, reset_token, reset_token_expires, is_blocked')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (fetchError || !user) {
      console.log('Reset Password Failed: User not found for email:', email);
      return res.status(400).json({ message: 'Invalid or expired password reset link.' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ message: 'This account is blocked.' });
    }

    // 2. Check token match and expiry
    const now = new Date();
    const tokenExpiry = new Date(user.reset_token_expires);

    if (!user.reset_token || user.reset_token !== token) {
      console.log('Reset Password Failed: Token mismatch');
      return res.status(400).json({ message: 'Invalid or expired password reset link.' });
    }

    if (now > tokenExpiry) {
      console.log('Reset Password Failed: Token expired');
      return res.status(400).json({ message: 'Invalid or expired password reset link.' });
    }

    // 3. Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // 4. Update database and clear token fields
    const { error: updateError } = await supabase
      .from('app_user')
      .update({
        password_hash: newPasswordHash,
        reset_token: null,
        reset_token_expires: null
      })
      .eq('email', user.email);

    if (updateError) {
      console.error('Supabase update error during reset:', updateError);
      return res.status(500).json({ message: 'Failed to update password in database.' });
    }

    return res.status(200).json({ message: 'Password reset successful! Redirecting to login...' });

  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Internal server error resetting password.' });
  }
});

// Set Password Endpoint
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

    // 1. Fetch user by username (where emails are stored in app_user)
    const { data: user, error: fetchError } = await supabase
      .from('app_user')
      .select('username, is_blocked')
      .ilike('username', cleanedEmail)
      .maybeSingle();

    if (fetchError || !user) {
      console.error('User search failed:', fetchError || 'No user found');
      return res.status(400).json({ message: `Account for ${cleanedEmail} was not found.` });
    }

    if (user.is_blocked) {
      return res.status(403).json({ message: 'This account is blocked.' });
    }

    // 2. Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // 3. Update password_hash in Supabase
    const { error: updateError } = await supabase
      .from('app_user')
      .update({ password_hash: newPasswordHash })
      .eq('username', user.username);

    if (updateError) {
      console.error('Supabase update failed:', updateError);
      return res.status(500).json({ message: `Database update failed: ${updateError.message}` });
    }

    return res.status(200).json({ message: 'Password updated successfully! Redirecting...' });

  } catch (err) {
    console.error('Set password endpoint error:', err);
    return res.status(500).json({ message: 'Internal server error while setting password.' });
  }
});

// Registration Endpoint
app.post("/api/auth/register", async (req, res) => {
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

  if (email.length > 50) {
    return res.status(400).json({ message: "Email must be 50 characters or fewer." });
  }

  if (fullName.length > 100) {
    return res.status(400).json({ message: "Name is too long." });
  }

  const { error } = await supabase.from("app_user").insert({
    username: email,
    password_hash: "!pending-no-password",
    first_name: firstName,
    last_name: lastName,
    email: email,
  });

  if (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "This email is already registered." });
    }
    console.error("Supabase insert error:", error);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }

  res.status(201).json({ message: "Registration received. Your account is pending approval." });
});

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
// Forgot Password Endpoint
app.post('/api/auth/forgotPassword', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    // 1. Fetch user by email
    const { data: user, error: fetchError } = await supabase
      .from('app_user')
      .select('email, is_blocked')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    const genericSuccess = {
      message: 'If an account exists with that email, a password reset link has been sent.'
    };

    if (fetchError || !user) {
      return res.status(200).json(genericSuccess);
    }

    if (user.is_blocked) {
      return res.status(403).json({ message: 'This account is blocked. Please contact support.' });
    }

    // 2. Generate reset token (1 hour expiry)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000).toISOString();

    // 3. Save token in Supabase
    const { error: updateError } = await supabase
      .from('app_user')
      .update({
        reset_token: resetToken,
        reset_token_expires: resetExpires
      })
      .eq('email', user.email);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return res.status(500).json({ message: 'Failed to generate reset link. Database error.' });
    }

    // 4. Print link to terminal
    const resetLink = `http://localhost:3000/resetPassword?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
    console.log('\n----------------------------------------');
    console.log(`PASSWORD RESET LINK FOR ${user.email}:`);
    console.log(resetLink);
    console.log('----------------------------------------\n');

    return res.status(200).json(genericSuccess);

  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Internal server error processing request.' });
  }
});

//Reset Password Endpoint
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: 'Email, token, and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    // 1. Query user record
    const { data: user, error: fetchError } = await supabase
      .from('app_user')
      .select('id, reset_token, reset_token_expires, is_blocked')
      .eq('email', email.toLowerCase())
      .single();

    if (fetchError || !user) {
      return res.status(400).json({ message: 'Invalid or expired password reset link.' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ message: 'This account is blocked.' });
    }

    // 2. Validate token match and expiration
    const now = new Date();
    const tokenExpiry = new Date(user.reset_token_expires);

    if (!user.reset_token || user.reset_token !== token || now > tokenExpiry) {
      return res.status(400).json({ message: 'Invalid or expired password reset link.' });
    }

    // 3. Hash new password with bcrypt (10 rounds)
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // 4. Update password and clear reset token fields
    const { error: updateError } = await supabase
      .from('app_user')
      .update({
        password_hash: newPasswordHash,
        reset_token: null,
        reset_token_expires: null
      })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({ message: 'Password reset successful! You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Internal server error resetting password.' });
  }
});

//Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // 1. Fetch user by username (where emails are stored in app_user)
    const { data: user, error: fetchError } = await supabase
      .from('app_user')
      .select('username, password_hash, is_blocked')
      .eq('username', email.toLowerCase())
      .maybeSingle();

    if (fetchError) {
      console.error('Supabase login fetch error:', fetchError);
      return res.status(500).json({ message: 'Database error while logging in.' });
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    // Account rejected check (if you have a status column for blocked users)
    if (user.status === 'rejected') {
      return res.status(403).json({ message: 'This account is blocked. Please contact support.' });
    }

    // 2. Account blocked check
    if (user.is_blocked) {
      return res.status(403).json({ message: 'This account is blocked. Please contact support.' });
    }

    // 3. First-time password setup check (handles null, empty, or !pending-no-password)
    const isPendingSetup = 
      !user.password_hash || 
      user.password_hash === '!pending-no-password' || 
      !user.password_hash.startsWith('$2b$');

    if (isPendingSetup) {
      return res.status(400).json({ 
        message: 'Password setup required. Please set your password first.',
        requireSetPassword: true 
      });
    }

    // 4. Verify password hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    // 5. Store session user
    if (req.session) {
      req.session.user = { email: user.username };
    }

    return res.status(200).json({ 
      message: 'Login successful!',
      user: { email: user.username }
    });

  } catch (err) {
    console.error('Login server error:', err);
    return res.status(500).json({ message: 'Internal server error while logging in.' });
  }
});

//User Management Endpoint
app.get('/api/admin/users', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('app_user')
      .select('user_id, username, email, first_name, last_name, status, password_hash, is_deleted')
      .or('is_deleted.is.null,is_deleted.eq.false');
      
    if (error) throw error;

    const formattedUsers = (users || []).map(u => ({
      id: u.user_id,
      email: u.email || u.username,
      firstName: u.first_name || '',
      lastName: u.last_name || '',
      status: u.status,
      isBlocked: u.status === 'rejected',
      isPendingSetup: u.status === 'pending' || u.password_hash === '!pending-no-password'
    }));

    res.json(formattedUsers);
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ message: `Database error: ${err.message}` });
  }
});

// 2. ADD NEW USER
app.post('/api/admin/users', async (req, res) => {
  try {
    const { email, firstName, lastName } = req.body;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ message: 'First name, last name, and email are required.' });
    }

    const cleanedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('app_user')
      .select('username')
      .or(`email.eq.${cleanedEmail},username.eq.${cleanedEmail}`)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    // Insert user following strict DBA-03 NOT NULL constraints
    const { data: newUser, error: insertError } = await supabase
      .from('app_user')
      .insert([{
        username: cleanedEmail,
        email: cleanedEmail,
        password_hash: '!pending-no-password',
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        status: 'pending'
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    res.status(201).json({ 
      message: 'User created successfully!',
      user: newUser 
    });

  } catch (err) {
    console.error('Add user error:', err);
    res.status(500).json({ message: err.message || 'Failed to add user.' });
  }
});

// 3. EDIT USER DETAILS
app.put('/api/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName } = req.body;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const cleanedEmail = email.trim().toLowerCase();

    const { error: updateError } = await supabase
      .from('app_user')
      .update({
        username: cleanedEmail,
        email: cleanedEmail,
        first_name: firstName.trim(),
        last_name: lastName.trim()
      })
      .eq('user_id', id);

    if (updateError) throw updateError;

    res.json({ message: 'User updated successfully.' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ message: err.message || 'Failed to update user.' });
  }
});

// 4. BLOCK / UNBLOCK USER TOGGLE (Status: active <-> rejected)
app.patch('/api/admin/users/:id/block', async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    const newStatus = isBlocked ? 'rejected' : 'active';

    const { error: updateError } = await supabase
      .from('app_user')
      .update({ status: newStatus })
      .eq('user_id', id);

    if (updateError) throw updateError;

    res.json({ 
      message: `User status changed to ${newStatus}.` 
    });
  } catch (err) {
    console.error('Toggle block error:', err);
    res.status(500).json({ message: err.message || 'Failed to update user block status.' });
  }
});

// 3. EDIT USER DETAILS
app.put('/api/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName } = req.body;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const cleanedEmail = email.trim().toLowerCase();

    const { error: updateError } = await supabase
      .from('app_user')
      .update({
        username: cleanedEmail,
        email: cleanedEmail,
        first_name: firstName.trim(),
        last_name: lastName.trim()
      })
      .eq('user_id', id);

    if (updateError) throw updateError;

    res.json({ message: 'User updated successfully.' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ message: err.message || 'Failed to update user.' });
  }
});

// 4. BLOCK / UNBLOCK USER TOGGLE (Maps to status column)
app.patch('/api/admin/users/:id/block', async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    const newStatus = isBlocked ? 'rejected' : 'active';

    const { error: updateError } = await supabase
      .from('app_user')
      .update({ status: newStatus })
      .eq('user_id', id);

    if (updateError) throw updateError;

    res.json({ 
      message: `User status updated to ${newStatus}.` 
    });
  } catch (err) {
    console.error('Toggle block error:', err);
    res.status(500).json({ message: err.message || 'Failed to update user block status.' });
  }
});

// Logout Endpoint
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Could not log out." });
    }
    res.clearCookie("connect.sid");
    res.status(200).json({ message: "Logged out successfully." });
  });
});

// Session Verification Endpoint
app.get("/api/auth/me", (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  res.json({ user: req.session.user });
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