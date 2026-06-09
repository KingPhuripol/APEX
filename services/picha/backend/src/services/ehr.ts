/**
 * EHR Service — Electronic Health Record integration.
 * Lookup order:
 *   1. FHIR R4 endpoint (if FHIR_BASE_URL is set)
 *   2. Local `patients` table in PostgreSQL
 * Returns null if the patient is not found anywhere.
 */
import axios from "axios";
import logger from "../logger";
import pool from "../db";

export interface PatientRecord {
  hn: string;
  name: string;
  age: number | null;
  sex: "Male" | "Female" | null;
  region: string | null;
  allergies: string[];
  medications: string[];
  history: string | null;
  labValues: Record<string, string>;
  source: "fhir" | "local";
}

export const ehrService = {
  async getPatient(hn: string): Promise<PatientRecord | null> {
    // 1. FHIR (if configured)
    const fhirUrl = process.env.FHIR_BASE_URL;
    if (fhirUrl) {
      try {
        const { data } = await axios.get(
          `${fhirUrl}/Patient?identifier=${hn}`,
          { timeout: 10_000 },
        );
        logger.info(`[ehrService] FHIR lookup for ${hn}`);
        return data; // TODO: map FHIR Bundle → PatientRecord
      } catch (err: any) {
        logger.warn(
          `[ehrService] FHIR failed, trying local DB: ${err.message}`,
        );
      }
    }

    // 2. Local DB
    try {
      const { rows } = await pool.query(
        "SELECT * FROM patients WHERE patient_hn = $1",
        [hn],
      );
      if (rows.length > 0) {
        const r = rows[0];
        return {
          hn: r.patient_hn,
          name: r.name,
          age: r.age ?? null,
          sex: (r.sex as "Male" | "Female") ?? null,
          region: r.region ?? null,
          allergies: r.allergies ?? [],
          medications: r.medications ?? [],
          history: r.history ?? null,
          labValues: r.lab_values ?? {},
          source: "local",
        };
      }
    } catch (err: any) {
      logger.warn(`[ehrService] DB lookup failed: ${err.message}`);
    }

    return null;
  },
};
