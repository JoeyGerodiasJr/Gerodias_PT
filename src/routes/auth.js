const express = require("express");
const supabase = require("../config/supabaseClient");

const router = express.Router();

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
    // role_id, is_blocked, is_deleted and stamp are left to their defaults
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

module.exports = router;