import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { authLimiter } from "../middleware/rateLimiter";
import { signToken, requireAuth } from "../middleware/auth";
import pool from "../db";

const router = Router();

// ── Middleware: Admin only ─────────────────────────────────────────────────────
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if ((req as any).user?.role !== "Admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

// POST /api/auth/login
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const { rows } = await pool.query(
      `SELECT username, password_hash, full_name, role, department
       FROM users WHERE username = $1 AND is_active = true`,
      [username],
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const token = signToken({ username: user.username, role: user.role });

    res.cookie("picha_session", token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000, // 8h
    });

    res.json({
      ok: true,
      user: {
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        department: user.department,
      },
    });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/logout
router.post("/logout", (_, res) => {
  res.clearCookie("picha_session");
  res.json({ ok: true });
});

// GET /api/auth/me — used by frontend layout for auth guard
router.get("/me", requireAuth, async (req, res) => {
  const { username } = (req as any).user as { username: string };
  const { rows } = await pool.query(
    `SELECT username, full_name, role, department
     FROM users WHERE username = $1 AND is_active = true`,
    [username],
  );
  const user = rows[0];
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    user: {
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      department: user.department,
    },
  });
});

// ── Admin: User Management ────────────────────────────────────────────────────

// GET /api/auth/users — list all users
router.get("/users", requireAuth, requireAdmin, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT username, full_name, role, department, is_active, created_at
     FROM users ORDER BY created_at`,
  );
  res.json({
    users: rows.map((u) => ({
      username: u.username,
      fullName: u.full_name,
      role: u.role,
      department: u.department,
      isActive: u.is_active,
      createdAt: u.created_at,
    })),
  });
});

// POST /api/auth/users — create new user
router.post("/users", requireAuth, requireAdmin, async (req, res) => {
  const { username, password, fullName, role, department } = req.body ?? {};
  if (!username || !password || !fullName) {
    res
      .status(400)
      .json({ error: "username, password, and fullName are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    await pool.query(
      `INSERT INTO users (username, password_hash, full_name, role, department)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        username,
        hash,
        fullName,
        role ?? "Pathologist",
        department ?? "Department of Pathology",
      ],
    );
    res.status(201).json({ ok: true, username });
  } catch (e: any) {
    if (e.code === "23505") {
      res.status(409).json({ error: "Username already exists" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/auth/users/:username — deactivate user (soft delete)
router.delete(
  "/users/:username",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { username } = req.params;
    if (username === (req as any).user.username) {
      res.status(400).json({ error: "Cannot deactivate your own account" });
      return;
    }
    await pool.query(
      "UPDATE users SET is_active = false, updated_at = NOW() WHERE username = $1",
      [username],
    );
    res.json({ ok: true });
  },
);

// PUT /api/auth/users/:username/password — change password (admin or self)
router.put("/users/:username/password", requireAuth, async (req, res) => {
  const { username } = req.params;
  const caller = (req as any).user as { username: string; role: string };
  if (caller.username !== username && caller.role !== "Admin") {
    res.status(403).json({ error: "Not authorized" });
    return;
  }
  const { password } = req.body ?? {};
  if (!password || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE username = $2",
    [hash, username],
  );
  res.json({ ok: true });
});

export default router;
