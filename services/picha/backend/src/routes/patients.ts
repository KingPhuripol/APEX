import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { ehrService } from "../services/ehr";
import pool from "../db";

const router = Router();

// GET /api/patients?hn=HN-XXXX
// Returns patient demographics + clinical history (FHIR → local DB → null)
router.get("/", requireAuth, async (req, res) => {
  const hn = String(req.query.hn ?? "").trim();
  if (!hn) {
    res.status(400).json({ error: "Query param 'hn' is required" });
    return;
  }

  try {
    const patient = await ehrService.getPatient(hn);
    if (!patient) {
      res.json({ patients: [], total: 0 });
      return;
    }
    // Normalise to snake_case for frontend consistency
    res.json({
      patients: [
        {
          patient_hn: patient.hn,
          patient_name: patient.name,
          age: patient.age,
          sex: patient.sex,
          region: patient.region,
          history: patient.history,
          allergies: patient.allergies,
          medications: patient.medications,
          lab_results: patient.labValues,
          source: patient.source,
        },
      ],
      total: 1,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch patient" });
  }
});

// POST /api/patients — register or update a patient record
router.post("/", requireAuth, async (req, res) => {
  const {
    patient_hn,
    name,
    age,
    sex,
    region,
    allergies,
    medications,
    history,
    labValues,
  } = req.body ?? {};

  if (!patient_hn || !name) {
    res.status(400).json({ error: "patient_hn and name are required" });
    return;
  }

  try {
    await pool.query(
      `INSERT INTO patients
         (patient_hn, name, age, sex, region, allergies, medications, history, lab_values)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (patient_hn) DO UPDATE
         SET name        = EXCLUDED.name,
             age         = EXCLUDED.age,
             sex         = EXCLUDED.sex,
             region      = EXCLUDED.region,
             allergies   = EXCLUDED.allergies,
             medications = EXCLUDED.medications,
             history     = EXCLUDED.history,
             lab_values  = EXCLUDED.lab_values,
             updated_at  = NOW()`,
      [
        patient_hn,
        name,
        age ?? null,
        sex ?? null,
        region ?? null,
        allergies ?? [],
        medications ?? [],
        history ?? null,
        JSON.stringify(labValues ?? {}),
      ],
    );
    res.status(201).json({ ok: true, patient_hn });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to register patient" });
  }
});

export default router;
