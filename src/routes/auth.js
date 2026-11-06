const express = require("express");
const bcrypt = require("bcrypt");
const supabase = require("../config/supabaseClient");

const router = express.Router();

//User Register
router.post("/register", async (req, res) => {
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

  // Column limits from the migration: username varchar(50), email varchar(100), full_name varchar(100)
  if (email.length > 50) {
    return res.status(400).json({ message: "Email must be 50 characters or fewer." });
  }
  if (fullName.length > 100) {
    return res.status(400).json({ message: "Name is too long." });
  }
  
  const { error } = await supabase.from("app_user").insert({
    username: email,                        // NOT NULL; unique among active users
    password_hash: "!pending-no-password",  // NOT NULL; not a valid hash, so it can never log in
    full_name: fullName,
    email: email,
  });

  if (error) {
    // 23505 = unique violation (idx_app_user_username_active)
    if (error.code === "23505") {
      return res.status(409).json({ message: "This email is already registered." });
    }
    console.error(error);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }

  res.status(201).json({ message: "Registration received. Your account is pending approval." });
});

//User Set Password (For new users)
router.post("/set-password", async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters long." });
  }

  const { data: user, error } = await supabase
    .from("app_user")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .single();

  if (error || !user) {
    return res.status(404).json({ message: "User not found." });
  }

  if (user.is_blocked) {
    return res.status(403).json({ message: "Blocked users cannot set passwords." });
  }

  // Verify account is still in pending state
  if (user.password_hash !== "!pending-no-password") {
    return res.status(400).json({ message: "Password has already been set. Please log in directly." });
  }

  // Hash the new password (10 salt rounds)
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password in database
  const { error: updateError } = await supabase
    .from("app_user")
    .update({ password_hash: hashedPassword })
    .eq("email", user.email);

  if (updateError) {
    console.error(updateError);
    return res.status(500).json({ message: "Failed to update password." });
  }

  res.status(200).json({ message: "Password set successfully. You can now log in." });
});

// User login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  // Fetch user from database
  const { data: user, error } = await supabase
    .from("app_user")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .single();

  if (error || !user) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  // Check 1: Is the user blocked?
  if (user.is_blocked) {
    return res.status(403).json({ message: "Your account has been blocked. Please contact an admin." });
  }

  // Check 2: Is this a first-time login (pending account)?
  if (user.password_hash === "!pending-no-password") {
    return res.status(403).json({ 
      code: "REQUIRE_SET_PASSWORD",
      message: "First time logging in? You must set your password first." 
    });
  }

  // Check 3: Verify hashed password
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  // Create session
  req.session.user = {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    roleId: user.role_id
  };

  res.status(200).json({ message: "Login successful", user: req.session.user });
});

//Checking if user is logged in
router.get("/me", (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  res.json({ user: req.session.user });
});

//User logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Could not log out." });
    }
    res.clearCookie("connect.sid"); // Clear session cookie
    res.status(200).json({ message: "Logged out successfully." });
  });
});

module.exports = router;