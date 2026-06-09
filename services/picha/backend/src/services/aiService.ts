/**
 * AI Service proxy — the ONLY place in the backend that talks to ai-service.
 * The backend NEVER calls OpenAI/Anthropic/Gemini directly.
 */
import axios from "axios";
import logger from "../logger";

const AI_BASE = process.env.AI_SERVICE_URL ?? "http://localhost:8200";
const AI_KEY = process.env.AI_SERVICE_KEY ?? "";

const client = axios.create({
  baseURL: AI_BASE,
  timeout: 300_000, // 5 min — agents can be slow
  headers: AI_KEY ? { "X-API-Key": AI_KEY } : {},
});

export interface AnalyzeInput {
  analysisId: string;
  imageBase64?: string;
  imageUrl?: string;
  patientId?: string;
  clinicalHistory?: string;
}

export const aiService = {
  async analyze(input: AnalyzeInput): Promise<Record<string, unknown>> {
    logger.info(
      `[aiService] Forwarding analysis ${input.analysisId} to ai-service`,
    );
    const { data } = await client.post("/analyze/sync", {
      slide_description:
        input.clinicalHistory ?? "Pathology slide for CCA analysis",
      clinical_context: input.clinicalHistory,
      image_base64: input.imageBase64,
      image_url: input.imageUrl,
      slide_id: input.analysisId,
      patient_id: input.patientId,
    });
    return data;
  },

  async health(): Promise<boolean> {
    try {
      await client.get("/health", { timeout: 3_000 });
      return true;
    } catch {
      return false;
    }
  },
};
