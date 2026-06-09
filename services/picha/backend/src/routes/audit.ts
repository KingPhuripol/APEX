import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import pool from "../db";

const router = Router();

// GET /api/audit?limit=50&page=1
router.get("/", requireAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const offset = (page - 1) * limit;

  const { rows } = await pool.query(
    "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    [limit, offset],
  );
  res.json({ logs: rows, page, limit });
});

// POST /api/audit — write an audit entry
router.post("/", requireAuth, async (req, res) => {
  const { action, patientHn, result, confidence, status } = req.body ?? {};
  const user = (req as any).user;
  const id = `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  await pool.query(
    `INSERT INTO audit_logs (id, user_name, action, patient_hn, result, confidence, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      user.username,
      action,
      patientHn ?? null,
      result ?? null,
      confidence ?? 0,
      status ?? "ok",
    ],
  );

  res.status(201).json({ id });
});

export default router;
