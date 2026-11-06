const express = require("express");
const path = require("path");
const supabase = require("./src/config/supabaseClient");

const app = express();

app.use(express.json());

// Log incoming requests to terminal for debugging
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

// Serve static frontend files from 'public'
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html on root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
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

const PORT = process.env.PORT || 3000;

verifyConnection().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});