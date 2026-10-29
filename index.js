const express = require("express");
const supabase = require("./src/config/supabaseClient");

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use("/api/auth", require("./src/routes/auth"));

async function verifyConnection() {
  const { error } = await supabase.from("test").select("*").limit(1);

  // PGRST205 = API reached, but that table doesn't exist (still proves the connection works)
  if (!error || error.code === "PGRST205") {
    console.log("Supabase connection OK");
  } else {
    console.error("Connection failed:", error.message);
    process.exit(1);
  }
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;

verifyConnection().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});