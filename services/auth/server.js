const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3001;
const JWT_SECRET =
  process.env.JWT_SECRET || "apex-clinical-super-secret-key-2026"; // Use JWT_SECRET env variable in production

app.use(cors());
app.use(express.json());

// Initialize SQLite DB
const db = new sqlite3.Database("./apex_auth.db", (err) => {
  if (err) {
    console.error("Error connecting to database:", err);
  } else {
    console.log("Connected to SQLite database.");

    // Create users table and seed default admin
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL,
          department TEXT NOT NULL
        )
      `);

      // Seed default account
      db.get(`SELECT id FROM users WHERE id = ?`, ["smartlab"], (err, row) => {
        if (!row) {
          const salt = bcrypt.genSaltSync(10);
          const hash = bcrypt.hashSync("smartlab888", salt);

          const stmt = db.prepare(
            "INSERT INTO users (id, password_hash, name, role, department) VALUES (?, ?, ?, ?, ?)",
          );
          stmt.run(
            "smartlab",
            hash,
            "Dr. Sarah Chen",
            "Chief Medical Officer",
            "Clinical Pathology",
          );
          stmt.finalize();
          console.log("Seeded default user (ID: smartlab, Pass: smartlab888)");
        }
      });
    });
  }
});

// Login API Endpoint
app.post("/api/login", (req, res) => {
  const { doctorId, password } = req.body;

  if (!doctorId || !password) {
    return res
      .status(400)
      .json({
        success: false,
        error: "Please provide both Hospital ID and Passcode.",
      });
  }

  db.get("SELECT * FROM users WHERE id = ?", [doctorId], (err, user) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ success: false, error: "Database error occurred." });
    }

    if (!user) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid Hospital ID or Passcode." });
    }

    // Verify password
    const isValid = bcrypt.compareSync(password, user.password_hash);

    if (isValid) {
      // Generate JWT
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: "12h",
      });

      return res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          department: user.department,
          token: token,
        },
      });
    } else {
      return res
        .status(401)
        .json({ success: false, error: "Invalid Hospital ID or Passcode." });
    }
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "APEX Auth Provider" });
});

app.listen(PORT, () => {
  console.log(`Auth Service running on http://localhost:${PORT}`);
});
