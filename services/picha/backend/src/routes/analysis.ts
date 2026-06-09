import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { analysisLimiter } from "../middleware/rateLimiter";
import pool from "../db";

const router = Router();

// POST /api/analysis — start a full MARS analysis
// Proxies request to ai-service, stores job ID in DB
router.post("/", requireAuth, analysisLimiter, async (req, res) => {
  const { imageBase64, imageUrl, patientId, clinicalHistory } = req.body ?? {};

  if (!imageBase64 && !imageUrl) {
    res
      .status(400)
      .json({ error: "Either imageBase64 or imageUrl is required" });
    return;
  }

  const analysisId = `ANA-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Persist as pending immediately — frontend runs SSE for live display then PUTs the result
  await pool
    .query(
      `INSERT INTO analysis_results (analysis_id, patient_id, status, image_url)
     VALUES ($1, $2, 'pending', $3)`,
      [analysisId, patientId ?? null, imageUrl ?? null],
    )
    .catch(() => {}); // non-fatal if DB down

  res.status(202).json({ analysisId, status: "pending" });
});

// GET /api/analysis — list all analyses (most recent first)
// Optional ?patient_hn=HN to filter by patient
router.get("/", requireAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  // Accept both ?offset=N (frontend) and ?page=N (legacy)
  const offset =
    req.query.offset !== undefined
      ? Number(req.query.offset)
      : (Math.max(Number(req.query.page ?? 1), 1) - 1) * limit;

  const patientHn = req.query.patient_hn as string | undefined;

  if (patientHn) {
    const { rows } = await pool.query(
      `SELECT
         analysis_id                                           AS id,
         patient_id                                            AS patient_hn,
         status,
         image_url,
         error,
         (result->>'overall_confidence')::numeric              AS confidence,
         created_at,
         updated_at
       FROM analysis_results
       WHERE patient_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [patientHn, limit, offset],
    );
    const { rows: countRows } = await pool.query(
      "SELECT COUNT(*) FROM analysis_results WHERE patient_id = $1",
      [patientHn],
    );
    res.json({
      analyses: rows,
      total: Number(countRows[0].count),
      limit,
      offset,
    });
    return;
  }

  const { rows } = await pool.query(
    `SELECT
       analysis_id                                           AS id,
       patient_id                                            AS patient_hn,
       status,
       image_url,
       error,
       (result->>'overall_confidence')::numeric              AS confidence,
       created_at,
       updated_at
     FROM analysis_results
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  const { rows: countRows } = await pool.query(
    "SELECT COUNT(*) FROM analysis_results",
  );
  res.json({
    analyses: rows,
    total: Number(countRows[0].count),
    limit,
    offset,
  });
});

// GET /api/analysis/:id — get result by id
router.get("/:id", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM analysis_results WHERE analysis_id = $1",
    [req.params.id],
  );
  if (!rows.length) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }
  const row = rows[0];
  // Normalize column names for frontend consistency
  res.json({
    analysis: {
      id: row.analysis_id,
      patient_hn: row.patient_id,
      status: row.status,
      image_url: row.image_url,
      result: row.result,
      error: row.error,
      confidence: row.result?.overall_confidence ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
  });
});

// PUT /api/analysis/:id/result — called by frontend after SSE analysis completes
// Saves the final structured report to the DB
router.put("/:id/result", requireAuth, async (req, res) => {
  const { result, status } = req.body ?? {};
  if (!result) {
    res.status(400).json({ error: "result is required" });
    return;
  }
  await pool
    .query(
      `UPDATE analysis_results
       SET status = $1, result = $2, updated_at = NOW()
       WHERE analysis_id = $3`,
      [status ?? "completed", JSON.stringify(result), req.params.id],
    )
    .catch(() => {}); // non-fatal
  res.json({ ok: true });
});

export default router;
