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

// Serve Set Password Page
app.get("/setPassword", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "setPassword.html"));
});

// Serve Forgot Password Page
app.get("/forgotPassword", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "forgotPassword.html"));
});

// Serve Reset Password Page
app.get("/resetPassword", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "resetPassword.html"));
});

// Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // 1. Fetch user from Supabase
    const { data: user, error } = await supabase
      .from('app_user')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // 2. Check if user is blocked
    if (user.is_blocked) {
      return res.status(403).json({ message: 'This account is blocked.' });
    }

    // 3. FIRST-TIME LOGIN CHECK (Must run BEFORE bcrypt.compare)
    if (user.password_hash === '!pending-no-password') {
      return res.status(200).json({ 
        code: 'REQUIRE_SET_PASSWORD', 
        email: user.email,
        message: 'First time login. Please set your password.' 
      });
    }

    // 4. Verify password for returning users
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // 5. Establish session
    req.session.user = { id: user.id, email: user.email };
    return res.status(200).json({ message: 'Login successful!' });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// Set Password Endpoint
app.post('/api/auth/set-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    // 1. Hash the new password with bcrypt (10 rounds)
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // 2. Update password_hash in Supabase
    const { data: user, error: updateError } = await supabase
      .from('app_user')
      .update({ password_hash: newPasswordHash })
      .eq('email', email.toLowerCase())
      .select('email')
      .single();

    if (updateError || !user) {
      console.error('Supabase set-password error:', updateError);
      return res.status(400).json({ message: 'Failed to update user password. User may not exist.' });
    }

    return res.status(200).json({ message: 'Password set successfully! You can now log in.' });
  } catch (err) {
    console.error('Set-password server error:', err);
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
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    // 1. Check if user exists
    const { data: user, error: fetchError } = await supabase
      .from('app_user')
      .select('email, is_blocked')
      .eq('email', email.toLowerCase())
      .single();

    // Generic response prevents account enumeration attacks
    const genericSuccess = {
      message: 'If an account exists with that email, a password reset link has been sent.'
    };

    if (fetchError || !user) {
      return res.status(200).json(genericSuccess);
    }

    if (user.is_blocked) {
      return res.status(403).json({ message: 'This account is blocked. Please contact support.' });
    }

    // 2. Generate secure 32-byte token and expiration (1 hour from now)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000).toISOString(); // +1 Hour

    // 3. Save token and expiration to Supabase
    const { error: updateError } = await supabase
      .from('app_user')
      .update({
        reset_token: resetToken,
        reset_token_expires: resetExpires
      })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    // 4. Console log reset link (Dev mode substitute for email service)
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
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

// ==========================================
// 3. SERVER INITIALIZATION
// ==========================================

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