const supabase = require("./src/config/supabaseClient");

async function verifyConnection() {
  // Replace "test" with any real table name in your database
  const { error } = await supabase.from("test").select("*").limit(1);

  // PGRST205 = API reached, but that table doesn't exist (still proves the connection works)
  if (!error || error.code === "PGRST205") {
    console.log("Supabase connection OK");
  } else {
    console.error("Connection failed:", error.message);
    process.exit(1);
  }
}

verifyConnection();