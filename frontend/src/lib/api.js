/**
 * APEX Clinical AI Platform — API Client
 * =========================================
 * Central API layer for all backend services.
 * Falls back gracefully when services are offline.
 *
 * Services:
 *   AXIA      → /api/axia/api/*       (Flask :5000)
 *   SmartLiva → /api/smartliva/*      (FastAPI :8000)
 *   PICHA     → /api/picha/api/*      (Node :8005)
 */

// ---------------------------------------------------------------------------
// Base configuration
// ---------------------------------------------------------------------------

const API_BASE = import.meta.env.VITE_API_BASE || '';

const DEFAULT_TIMEOUT = 120_000; // 2 min for AI inference

// ---------------------------------------------------------------------------
// Core fetch helper
// ---------------------------------------------------------------------------

async function apiFetch(url, options = {}, timeoutMs = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        detail = body.detail || body.error || detail;
      } catch {
        // ignore json parse error
      }
      throw new ApiError(detail, res.status);
    }

    return res;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out. The AI model may still be loading.', 408);
    }
    if (err instanceof ApiError) throw err;
    // Network errors (service offline)
    throw new ApiError('Service unavailable. Please check that the backend is running.', 503);
  } finally {
    clearTimeout(timer);
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// ---------------------------------------------------------------------------
// Health checks
// ---------------------------------------------------------------------------

/**
 * Check service health.
 * @param {'axia'|'smartliva'|'picha'} service
 * @returns {Promise<{ok: boolean, data: object}>}
 */
export async function checkHealth(service) {
  const paths = {
    axia: '/api/axia/api/health',
    smartliva: '/api/smartliva/health',
    picha: '/api/picha/health',
  };
  try {
    const res = await apiFetch(paths[service], {}, 5_000);
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, data: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// AXIA — Brain CT Analysis (Flask, port 5000)
// ---------------------------------------------------------------------------

/**
 * Classify CT scan(s) — Phase 1
 * @param {File[]} files  DICOM or image files
 * @returns {Promise<{type, confidence, stage1Score, stage2Score, classificationMs}>}
 */
export async function axiaClassify(files) {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));

  const res = await apiFetch('/api/axia/api/classify', { method: 'POST', body: form }, 180_000);
  return res.json();
}

/**
 * Segmentation — Phase 2
 * @param {File[]} files
 * @param {'hemorrhage'|'ischemic'} type
 * @returns {Promise<{maskFound, volume, midlineShift, sliceResults, segmentationMs}>}
 */
export async function axiaSegment(files, type) {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  form.append('type', type);

  const res = await apiFetch('/api/axia/api/segment', { method: 'POST', body: form }, 300_000);
  return res.json();
}

/**
 * DICOM preview image (base64)
 * @param {File} file
 * @returns {Promise<{image: string}>}
 */
export async function axiaDicomPreview(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await apiFetch('/api/axia/api/preview', { method: 'POST', body: form }, 30_000);
  return res.json();
}

// ---------------------------------------------------------------------------
// SmartLiva — Liver Ultrasound (FastAPI, port 8000)
// ---------------------------------------------------------------------------

/**
 * Analyze liver ultrasound image
 * @param {File} file
 * @param {object} clinicalContext
 * @returns {Promise<PredictionResponse>}
 */
export async function smartlivaPredict(file, clinicalContext = {}) {
  const form = new FormData();
  form.append('file', file);
  form.append('language', clinicalContext.language || 'en');
  if (clinicalContext.patientHn)     form.append('patient_hn',   clinicalContext.patientHn);
  if (clinicalContext.patientName)   form.append('patient_name', clinicalContext.patientName);
  if (clinicalContext.bmi)           form.append('bmi',          String(clinicalContext.bmi));
  if (clinicalContext.alcoholUse)    form.append('alcohol_use',  clinicalContext.alcoholUse);
  if (clinicalContext.astUl)         form.append('ast_ul',       String(clinicalContext.astUl));
  if (clinicalContext.altUl)         form.append('alt_ul',       String(clinicalContext.altUl));
  if (clinicalContext.teKpa)         form.append('te_kpa_input', String(clinicalContext.teKpa));
  if (clinicalContext.indication)    form.append('clinical_indication', clinicalContext.indication);

  const res = await apiFetch('/api/smartliva/predict', { method: 'POST', body: form }, 120_000);
  return res.json();
}

/**
 * Chat with HepaSage AI
 * @param {Array<{role: string, content: string}>} history
 * @param {string} language
 * @returns {Promise<{reply: string, usage_tokens: number}>}
 */
export async function smartlivaChat(history, language = 'en') {
  const res = await apiFetch('/api/smartliva/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history, language }),
  }, 60_000);
  return res.json();
}

/**
 * SmartLiva model status
 */
export async function smartlivaModelStatus() {
  const res = await apiFetch('/api/smartliva/model-status', {}, 5_000);
  return res.json();
}

// ---------------------------------------------------------------------------
// PICHA — Digital Pathology (Node, port 8005)
// ---------------------------------------------------------------------------

/**
 * PICHA health check
 */
export async function pichaHealth() {
  try {
    const res = await apiFetch('/api/picha/health', {}, 5_000);
    return { ok: true, data: await res.json() };
  } catch (e) {
    return { ok: false, data: { error: e.message } };
  }
}

/**
 * Analyze pathology slide
 * @param {File} file
 * @param {string} patientId
 */
export async function pichaAnalyze(file, patientId) {
  const form = new FormData();
  form.append('file', file);
  if (patientId) form.append('patient_id', patientId);
  const res = await apiFetch('/api/picha/api/analyze', { method: 'POST', body: form }, 300_000);
  return res.json();
}

/**
 * PICHA MARS Agent chat
 * @param {string} message
 * @param {string} sessionId
 */
export async function pichaChat(message, sessionId) {
  const res = await apiFetch('/api/picha/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
  }, 60_000);
  return res.json();
}

// ---------------------------------------------------------------------------
// APEX Core Orchestrator (4-Stage Pipeline)
// ---------------------------------------------------------------------------

/**
 * Run the APEX 4-Stage Pipeline
 * @param {File} file
 * @param {string} mrn
 * @param {'smartliva'|'picha'|'axia'} targetModule
 * @param {object} context
 */
export async function coreOrchestrate(file, mrn, targetModule, context = {}) {
  const form = new FormData();
  if (file) form.append('file', file);
  form.append('mrn', mrn);
  form.append('target_module', targetModule);
  form.append('clinical_context', JSON.stringify(context));

  const res = await apiFetch('/api/core/orchestrate', { method: 'POST', body: form }, 300_000);
  return res.json();
}
