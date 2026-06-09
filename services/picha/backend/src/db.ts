import { Pool } from "pg";
import logger from "./logger";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  logger.error("PostgreSQL pool error", { message: err.message });
});

export async function initDB(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        username      VARCHAR(100)  PRIMARY KEY,
        password_hash VARCHAR(200)  NOT NULL,
        full_name     VARCHAR(200)  NOT NULL,
        role          VARCHAR(50)   NOT NULL DEFAULT 'Pathologist',
        department    VARCHAR(200)  NOT NULL DEFAULT 'Department of Pathology',
        is_active     BOOLEAN       NOT NULL DEFAULT true,
        created_at    TIMESTAMPTZ   DEFAULT NOW(),
        updated_at    TIMESTAMPTZ   DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS patients (
        patient_hn    VARCHAR(50)  PRIMARY KEY,
        name          VARCHAR(200) NOT NULL,
        age           INTEGER,
        sex           VARCHAR(10),
        region        VARCHAR(200),
        allergies     TEXT[]       DEFAULT '{}',
        medications   TEXT[]       DEFAULT '{}',
        history       TEXT,
        lab_values    JSONB        DEFAULT '{}',
        created_at    TIMESTAMPTZ  DEFAULT NOW(),
        updated_at    TIMESTAMPTZ  DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_patients_name ON patients USING gin(to_tsvector('simple', name));

      CREATE TABLE IF NOT EXISTS audit_logs (
        id           VARCHAR(50)  PRIMARY KEY,
        created_at   TIMESTAMPTZ  DEFAULT NOW(),
        user_name    VARCHAR(100) NOT NULL,
        action       VARCHAR(200) NOT NULL,
        patient_hn   VARCHAR(50),
        result       TEXT,
        confidence   NUMERIC(5,2),
        status       VARCHAR(20)  NOT NULL
      );

      CREATE TABLE IF NOT EXISTS analysis_results (
        analysis_id  VARCHAR(50)  PRIMARY KEY,
        patient_id   VARCHAR(50),
        status       VARCHAR(20)  NOT NULL DEFAULT 'pending',
        image_url    TEXT,
        result       JSONB,
        error        TEXT,
        retry_count  INTEGER      DEFAULT 0,
        created_at   TIMESTAMPTZ  DEFAULT NOW(),
        updated_at   TIMESTAMPTZ  DEFAULT NOW()
      );
    `);
    logger.info("Database schema ready");

    // Seed default users if table is empty
    const { rows: uc } = await client.query("SELECT COUNT(*) FROM users");
    if (Number(uc[0].count) === 0) {
      await client.query(
        `INSERT INTO users (username, password_hash, full_name, role, department) VALUES
         ($1, $2, 'Dr. Nano Srisuk',   'Pathologist', 'Department of Pathology'),
         ($3, $4, 'PICHA System Admin', 'Admin',       'SmartLab IT Operations')
         ON CONFLICT DO NOTHING`,
        [
          "Nano",
          "$2b$10$UyYdIq8iooh38uG5phj/metiAg.KP3p.h1YxnnYcFeJzPcufSi62W", // Nano2527
          "admin",
          "$2b$10$4ASY/3WK/t3h0CRGO5yhD.K7CjQn33Gn9NcCBT65NvihPxiCExHs6", // Admin@PICHA
        ],
      );
      logger.info("Default users seeded");
    }

    if (process.env.DEMO_MODE === "true") {
      await seedDemoData(client);
    }
  } finally {
    client.release();
  }
}

async function seedDemoData(client: any): Promise<void> {
  // Only seed if tables are empty
  const { rows: countRows } = await client.query(
    "SELECT COUNT(*) FROM analysis_results",
  );
  if (Number(countRows[0].count) > 0) return;

  logger.info("Seeding demo data…");

  const MOCK_RESULT = {
    overall_confidence: 0.87,
    who_grade: "G2",
    tnm_stage: "pT2N0M0",
    til_density: "Moderate (18%)",
    lvi_detected: false,
    pni_detected: true,
    diagnosis: "Moderately differentiated cholangiocarcinoma (intrahepatic)",
    recommendation:
      "Recommend adjuvant gemcitabine-based chemotherapy. Surgical resection margin review advised.",
    summary:
      "H&E section shows moderately differentiated glandular structures with desmoplastic stroma. Perineural invasion identified. Tumour-infiltrating lymphocytes moderate. No lymphovascular invasion.",
  };

  const analyses = [
    {
      id: "ANA-DEMO-001",
      patient: "HN-2026-DEMO01",
      daysAgo: 0,
      confidence: 0.87,
      status: "completed",
    },
    {
      id: "ANA-DEMO-002",
      patient: "HN-2026-DEMO02",
      daysAgo: 1,
      confidence: 0.91,
      status: "completed",
    },
    {
      id: "ANA-DEMO-003",
      patient: "HN-2026-DEMO03",
      daysAgo: 2,
      confidence: 0.79,
      status: "completed",
    },
    {
      id: "ANA-DEMO-004",
      patient: "HN-2026-DEMO04",
      daysAgo: 3,
      confidence: 0.83,
      status: "completed",
    },
    {
      id: "ANA-DEMO-005",
      patient: "HN-2026-DEMO05",
      daysAgo: 5,
      confidence: 0.95,
      status: "completed",
    },
    {
      id: "ANA-DEMO-006",
      patient: "HN-2026-DEMO06",
      daysAgo: 7,
      confidence: 0.72,
      status: "completed",
    },
  ];

  for (const a of analyses) {
    const ts = new Date();
    ts.setDate(ts.getDate() - a.daysAgo);
    ts.setHours(9 + Math.floor(Math.random() * 8));
    const result = { ...MOCK_RESULT, overall_confidence: a.confidence };
    await client.query(
      `INSERT INTO analysis_results
         (analysis_id, patient_id, status, result, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $5)
       ON CONFLICT DO NOTHING`,
      [a.id, a.patient, a.status, JSON.stringify(result), ts.toISOString()],
    );
  }

  const auditEntries = [
    {
      id: "AUD-DEMO-001",
      action: "CCA Analysis Completed — WHO G2, pT2N0M0",
      patient: "HN-2026-DEMO01",
      confidence: 87,
      daysAgo: 0,
    },
    {
      id: "AUD-DEMO-002",
      action: "CCA Analysis Completed — WHO G1, pT1N0M0",
      patient: "HN-2026-DEMO02",
      confidence: 91,
      daysAgo: 1,
    },
    {
      id: "AUD-DEMO-003",
      action: "CCA Analysis Completed — WHO G3, pT3N1M0",
      patient: "HN-2026-DEMO03",
      confidence: 79,
      daysAgo: 2,
    },
    {
      id: "AUD-DEMO-004",
      action: "CCA Analysis Completed — WHO G2, pT2N0M0",
      patient: "HN-2026-DEMO04",
      confidence: 83,
      daysAgo: 3,
    },
    {
      id: "AUD-DEMO-005",
      action: "CCA Analysis Completed — WHO G1, pT1N0M0",
      patient: "HN-2026-DEMO05",
      confidence: 95,
      daysAgo: 5,
    },
    {
      id: "AUD-DEMO-006",
      action: "CCA Analysis Completed — WHO G2, pT2N1M0",
      patient: "HN-2026-DEMO06",
      confidence: 72,
      daysAgo: 7,
    },
  ];

  for (const a of auditEntries) {
    const ts = new Date();
    ts.setDate(ts.getDate() - a.daysAgo);
    ts.setHours(9 + Math.floor(Math.random() * 8));
    await client.query(
      `INSERT INTO audit_logs
         (id, created_at, user_name, action, patient_hn, result, confidence, status)
       VALUES ($1, $2, 'Nano', $3, $4, 'Cholangiocarcinoma', $5, 'ok')
       ON CONFLICT DO NOTHING`,
      [a.id, ts.toISOString(), a.action, a.patient, a.confidence],
    );
  }

  logger.info("Demo data seeded successfully");
}

export default pool;
