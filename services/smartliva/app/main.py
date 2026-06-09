"""
SmartLiva Backend API
=====================
FastAPI backend for liver ultrasound analysis.

Analysis engine: GPT-4o Vision API
  Step 1 : Ultrasound image validation
  Step 2 : GPT-4o Vision with Chain-of-Thought prompting
  Step 3 : Structured JSON extraction + clinical summary

Model version: SmartLiva-VisionAPI-v3

Required env vars:
  OPENAI_API_KEY          — OpenAI API key
  OPENAI_VISION_MODEL     — Vision model id, default: gpt-4o
  OPENAI_MODEL            — Chat model id, default: gpt-4o-mini
"""

from __future__ import annotations

import io
import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Audit logger — writes who called /predict and when
# ---------------------------------------------------------------------------
audit_logger = logging.getLogger("smartliva.audit")
if not audit_logger.handlers:
    _audit_handler = logging.StreamHandler()
    _audit_handler.setFormatter(
        logging.Formatter("[AUDIT] %(asctime)s %(message)s", datefmt="%Y-%m-%dT%H:%M:%SZ")
    )
    audit_logger.addHandler(_audit_handler)
audit_logger.setLevel(logging.INFO)

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel
from sqlalchemy.orm import Session

try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")
except Exception:
    pass

try:
    from openai import OpenAI
    _openai_available = True
except ImportError:
    _openai_available = False

try:
    from .translation_routes import router as translation_router
    _translation_available = True
except Exception:
    _translation_available = False

try:
    from .database import get_db, init_db, save_study
    from .patient_routes import router as patient_router
    init_db()  # create tables on startup
    _db_available = True
except Exception as _dbe:
    _db_available = False
    logging.getLogger(__name__).warning("[SmartLiva] database init failed: %s", _dbe)

try:
    import pydicom as _pydicom
    _dicom_available = True
except Exception:
    _dicom_available = False

try:
    from .vision_analyzer import get_analyzer
    _vision_available = True
except Exception as _ve:
    _vision_available = False
    logging.getLogger(__name__).warning("[SmartLiva] vision_analyzer import failed: %s", _ve)

try:
    from .hybrid_analyzer import get_hybrid_analyzer, run_inference as _hybrid_run_inference
    _hybrid_available = True
except Exception as _he:
    _hybrid_available = False
    logging.getLogger(__name__).debug("[SmartLiva] hybrid_analyzer not loaded (expected in pure API mode)")

try:
    from .continual_learning import get_replay_buffer, start_finetune_scheduler
    _continual_available = True
except Exception as _cle:
    _continual_available = False
    logging.getLogger(__name__).debug("[SmartLiva] continual_learning not loaded (expected in pure API mode)")

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Warm up Vision analyzer on startup (replaces deprecated on_event)."""
    import threading
    def _init_bg():
        if _vision_available:
            try:
                ana = get_analyzer()
                logging.getLogger(__name__).info(
                    "[SmartLiva] VisionAnalyzer ready — model=%s detail=%s",
                    ana.model_name, ana._detail,
                )
            except Exception as exc:
                logging.getLogger(__name__).warning(
                    "[SmartLiva] VisionAnalyzer init failed: %s", exc
                )
    threading.Thread(target=_init_bg, daemon=True, name="SmartLiva-Init").start()
    yield  # Application is running
    # Graceful shutdown hooks can go here


# ---------------------------------------------------------------------------
# Rate limiter — in-memory sliding-window (Depends-based, workers=1 safe)
# Protects /predict from spam → prevents OpenAI API cost runaway
# Configure via env: RATE_LIMIT_PREDICT_COUNT (default 10) per 60s per IP
# ---------------------------------------------------------------------------
import time
from collections import defaultdict

_RATE_WINDOW: int = 60  # seconds
_RATE_MAX: int = int(os.getenv("RATE_LIMIT_PREDICT_COUNT", "10"))
_request_log: dict = defaultdict(list)  # { ip: [timestamp, ...] }


async def _predict_rate_limit(request: Request) -> None:
    """FastAPI dependency: raises HTTP 429 when IP exceeds RATE_MAX per window."""
    ip = (request.client.host if request.client else "unknown")
    now = time.time()
    cutoff = now - _RATE_WINDOW
    _request_log[ip] = [t for t in _request_log[ip] if t > cutoff]
    if len(_request_log[ip]) >= _RATE_MAX:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Rate limit exceeded: max {_RATE_MAX} requests per minute. "
                "Please wait and try again."
            ),
        )
    _request_log[ip].append(now)


app = FastAPI(
    title="SmartLiva API",
    version="3.0.0",
    description=(
        "Liver ultrasound analysis — GPT-4o Vision API with Chain-of-Thought prompting."
    ),
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — restrict to known origins in production
# ---------------------------------------------------------------------------
_ALLOWED_ORIGINS: list[str] = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        (
            "http://localhost:3000,http://localhost:3001,"
            "http://127.0.0.1:3000,http://127.0.0.1:3001,"
            "http://localhost:5173,http://127.0.0.1:5173,"
            "http://localhost:8080,http://127.0.0.1:8080"
        ),
    ).split(",")
    if origin.strip()
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
)

# ---------------------------------------------------------------------------
# Analysis Engine — Pure GPT-4o Vision
# ---------------------------------------------------------------------------

_MODEL_VERSION = "SmartLiva-VisionAPI-v3"


# USE_HYBRID=true  → ConvNeXt-primary + GPT-4o fallback (recommended)
# USE_HYBRID=false → GPT-4o Vision only
_USE_HYBRID = os.getenv("USE_HYBRID", "false").lower() in ("1", "true", "yes")


def _analyzer_ready() -> bool:
    if _USE_HYBRID and _hybrid_available:
        return get_hybrid_analyzer().is_ready
    if _vision_available:
        return get_analyzer().is_ready
    return False


def _get_engine_mode() -> str:
    if _USE_HYBRID and _hybrid_available and get_hybrid_analyzer().is_ready:
        return "hybrid"
    if _vision_available and get_analyzer().is_ready:
        return "gpt_vision"
    return "unavailable"


# ---------------------------------------------------------------------------
# Inference helpers
# ---------------------------------------------------------------------------

FIBROSIS_CLASSES = ["F0", "F1", "F2", "F3", "F4"]
LESION_CLASSES   = ["FFC", "FFS", "HCC", "Cyst", "Hemangioma", "Dysplastic", "CCA"]
PARASITE_CLASSES = ["Normal", "Suspicious", "OV_Detected"]


def _read_dicom_as_pil(content: bytes) -> Image.Image:
    """
    Convert a DICOM file (from PACS/ultrasound machine) to a PIL RGB Image.
    Raises ValueError if not a valid DICOM.
    """
    import io as _io
    try:
        import pydicom
        import numpy as np
        ds = pydicom.dcmread(_io.BytesIO(content))
        arr = ds.pixel_array.astype(np.float32)
        # Normalise to 0-255
        if arr.max() > arr.min():
            arr = (arr - arr.min()) / (arr.max() - arr.min()) * 255.0
        arr = arr.astype(np.uint8)
        if arr.ndim == 2:
            img = Image.fromarray(arr, mode="L").convert("RGB")
        elif arr.ndim == 3 and arr.shape[2] == 3:
            img = Image.fromarray(arr, mode="RGB")
        else:
            img = Image.fromarray(arr[:, :, 0], mode="L").convert("RGB")
        return img
    except Exception as exc:
        raise ValueError(f"DICOM conversion failed: {exc}")


def is_likely_ultrasound(image: Image.Image) -> bool:
    """
    Quick lightweight pre-filter: rejects obviously non-medical images
    by checking pixel value range (ultrasounds are near-greyscale/dark).
    The Vision API will perform the definitive check.
    """
    try:
        import numpy as np
        hsv = image.convert("HSV")
        mean_sat = np.array(hsv)[:, :, 1].mean()
        return mean_sat <= 55.0
    except Exception:
        return True  # pass through to Vision API


def run_inference(image: Image.Image, clinical_context: str = "",
                  te_kpa: float | None = None) -> dict:
    """
    Run inference on a liver ultrasound image.

    Engine selection (in priority order):
      1. Hybrid (ConvNeXt-primary + GPT-4o fallback) when USE_HYBRID=true
      2. GPT-4o Vision only when USE_HYBRID=false

    Parameters
    ----------
    te_kpa : FibroScan kPa value (optional). When provided, fibrosis staging
             uses validated kPa thresholds instead of visual assessment,
             achieving >95% accuracy.

    Raises
    ------
    RuntimeError  — no engine available
    ValueError("non-ultrasound") — image is not a liver ultrasound
    """
    if _USE_HYBRID and _hybrid_available:
        return _hybrid_run_inference(image, clinical_context=clinical_context,
                                     te_kpa=te_kpa)
    if _vision_available:
        return get_analyzer().analyze(image, clinical_context=clinical_context,
                                      te_kpa=te_kpa)
    raise RuntimeError(
        "No inference engine available. Set OPENAI_API_KEY or ensure "
        "the local model file exists at models/production_v1/."
    )


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

# Confidence below this threshold triggers "requires physician review"
# 5-class problem: random chance = 20%, so 50% means model is meaningfully confident
_CONFIDENCE_REVIEW_THRESHOLD = 0.50


# ---------------------------------------------------------------------------
# Clinical context (optional but improves AI analysis quality)
# ---------------------------------------------------------------------------
class ClinicalContext(BaseModel):
    bmi:          float | None = None
    alcohol_use:  str   | None = None  # none / occasional / heavy
    ast_ul:       float | None = None
    alt_ul:       float | None = None
    clinical_indication: str | None = None


class PredictionResponse(BaseModel):
    te_kpa:               float
    fibrosis_stage:       str
    fibrosis_confidence:  float
    lesion_label:         str | None = None
    lesion_confidence:    float = 0.0
    parasite_label:       str  = "Normal"
    parasite_confidence:  float = 0.0
    risk_level:           str  = "Unknown"
    recommendation:       str  = "Consult a healthcare provider."
    fibrosis_text:        str  = ""
    stiffness_status:     str  = ""
    steatosis_status:     str  = "Not Detected"
    follow_up:            str  = "12 months"
    fibrosis_probs:       list[float] = []
    lesion_probs:         list[float] = []
    parasite_probs:       list[float] = []
    # Clinical safety fields
    requires_review:       bool  = False
    audit_id:              str   = ""
    analysis_timestamp:    str   = ""
    model_version:         str   = "SmartLiva-VisionAPI-v3"
    disclaimer:            str   = (
        "For clinical decision support only. "
        "Results must be reviewed and confirmed by a licensed physician."
    )
    # Frontend compatibility aliases
    classification_label:       str   = ""
    classification_confidence:  float = 0.0
    parasite_detected:          bool  = False
    parasite_type:              str | None = None
    # AI clinical observation (forwarded from GPT-4o Vision)
    analysis_notes:             str   = ""
    image_quality:              str   = "adequate"


class ChatMessage(BaseModel):
    role:    str
    content: str


class ChatRequest(BaseModel):
    history:        list[ChatMessage]
    max_new_tokens: int   | None = 300
    temperature:    float | None = 0.7
    language:       str   | None = "en"


class ChatResponse(BaseModel):
    reply:        str
    usage_tokens: int | None = None


# ---------------------------------------------------------------------------
# Clinical risk logic
# ---------------------------------------------------------------------------

def _clinical_summary(result: dict, language: str) -> dict:
    fib_stage = result["fibrosis_stage"]
    kpa       = result["te_kpa"]
    par_label = result["parasite_label"]
    les_label = result["lesion_label"]
    th        = (language == "th")

    if fib_stage in ("F3", "F4") or les_label in ("HCC", "CCA") or par_label == "OV_Detected":
        risk = "สูง"     if th else "High"
    elif fib_stage == "F2" or par_label == "Suspicious":
        risk = "ปานกลาง" if th else "Moderate"
    else:
        risk = "ต่ำ"     if th else "Low"

    if risk in ("High", "สูง"):
        rec = "พบแพทย์ทันที" if th else "Urgent medical consultation required."
    elif risk in ("Moderate", "ปานกลาง"):
        rec = "ปรึกษาแพทย์เพื่อติดตามอาการ" if th else "Consult a doctor for monitoring."
    else:
        rec = "รักษาสุขภาพและตรวจติดตามประจำปี" if th else "Annual check-up recommended."

    fib_desc = {
        "F0": "ไม่พบพังผืด ตับปกติ"  if th else "No fibrosis detected. Liver appears healthy.",
        "F1": "พังผืดระยะเริ่มต้น"    if th else "Mild fibrosis (early stage).",
        "F2": "พังผืดปานกลาง"        if th else "Moderate fibrosis.",
        "F3": "พังผืดรุนแรง"         if th else "Severe fibrosis.",
        "F4": "ตับแข็ง (Cirrhosis)"  if th else "Cirrhosis detected.",
    }
    fib_text = fib_desc.get(fib_stage, "")

    if kpa >= 12.5:
        stiff = f"{kpa:.1f} kPa (" + ("สูงมาก" if th else "Very High") + ")"
    elif kpa >= 9.5:
        stiff = f"{kpa:.1f} kPa (" + ("สูง" if th else "High") + ")"
    elif kpa >= 7.5:
        stiff = f"{kpa:.1f} kPa (" + ("สูงกว่าปกติ" if th else "Elevated") + ")"
    else:
        stiff = f"{kpa:.1f} kPa (" + ("ปกติ" if th else "Normal") + ")"

    steat = ("ตรวจพบ" if th else "Detected") if les_label in ("FFC", "FFS")         else ("ตรวจไม่พบ" if th else "Not Detected")

    fu = ("1 เดือน" if th else "1 month") if risk in ("High", "สูง") else          ("3 เดือน" if th else "3 months") if risk in ("Moderate", "ปานกลาง") else          ("12 เดือน" if th else "12 months")

    return {
        "risk_level":       risk,
        "recommendation":   rec,
        "fibrosis_text":    fib_text,
        "stiffness_status": stiff,
        "steatosis_status": steat,
        "follow_up":        fu,
    }


# ---------------------------------------------------------------------------
# Chat helpers
# ---------------------------------------------------------------------------

def _system_prompt(language: str) -> str:
    if language == "auto":
        lang_line = (
            "Detect the language of the user's most recent message. "
            "If the user writes in Thai, respond in Thai using ค่ะ/ครับ. "
            "If the user writes in English, respond in English only. "
            "Always match the user's language exactly — never switch languages."
        )
    elif language == "th":
        lang_line = "ตอบเป็นภาษาไทยเท่านั้น ใช้ ค่ะ/ครับ"
    else:
        lang_line = "Reply in English only."
    return (
        "You are Dr. HepaSage (น้อง Liva), a friendly AI hepatologist assistant.\n"
        f"LANGUAGE: {lang_line}\n"
        "ROLE: Help patients understand their liver health results simply and clearly.\n"
        "FORMAT RULES:\n"
        "- Be concise: keep responses under 200 words unless the user explicitly asks for more detail.\n"
        "- Use short bullet points, bold headers, and simple plain language — avoid long paragraphs.\n"
        "- Never repeat the same information twice.\n"
        "- Use Markdown (bold, bullets, headers) for structure.\n"
        "- Be warm and empathetic but get to the point quickly.\n"
        "- End with ONE short disclaimer line only."
    )


def _openai_chat(history: list, max_tokens: int, temp: float, language: str):
    if not _openai_available:
        return None, 0
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key or "REPLACE" in api_key:
        return None, 0
    model_name = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    messages = [{"role": "system", "content": _system_prompt(language)}]
    messages += [{"role": m.role, "content": m.content} for m in history]
    try:
        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model=model_name, messages=messages,
            max_tokens=max_tokens, temperature=temp,
        )
        usage = resp.usage.total_tokens if resp.usage else 0
        return resp.choices[0].message.content, usage
    except Exception as exc:
        print(f"[OpenAI] {exc}")
        return None, 0


def _groq_chat(history: list, max_tokens: int, temp: float, language: str):
    if not _openai_available:
        return None, 0
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key or "your_api_key" in api_key.lower():
        return None, 0
    model_name = os.getenv("GROQ_CHAT_MODEL", "llama-3.3-70b-versatile")
    messages = [{"role": "system", "content": _system_prompt(language)}]
    messages += [{"role": m.role, "content": m.content} for m in history]
    try:
        client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
        resp = client.chat.completions.create(
            model=model_name, messages=messages,
            max_tokens=max_tokens, temperature=temp,
        )
        usage = resp.usage.total_tokens if resp.usage else 0
        logging.getLogger(__name__).info("[Groq] chat ok — model=%s tokens=%d", model_name, usage)
        return resp.choices[0].message.content, usage
    except Exception as exc:
        logging.getLogger(__name__).warning("[Groq] chat failed: %s", exc)
        return None, 0


def _local_chat(history: list, max_tokens: int, temp: float, language: str):
    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
    except ImportError:
        return None, 0

    candidates = [
        "Qwen/Qwen2.5-0.5B-Instruct",
        "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
    ]
    model, tokenizer = None, None
    for model_id in candidates:
        try:
            tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
            model = AutoModelForCausalLM.from_pretrained(
                model_id, device_map="auto", trust_remote_code=True, torch_dtype="auto",
            )
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token
            model.eval()
            break
        except Exception as exc:
            print(f"[LocalLLM] {model_id}: {exc}")

    if model is None:
        return None, 0

    messages = [{"role": "system", "content": _system_prompt(language)}]
    messages += [{"role": m.role, "content": m.content} for m in history]
    try:
        text   = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer([text], return_tensors="pt").to(model.device)
        with torch.no_grad():
            out_ids = model.generate(
                **inputs, max_new_tokens=max_tokens,
                temperature=temp, do_sample=True, top_p=0.9, repetition_penalty=1.1,
            )
        new_ids = out_ids[0][inputs.input_ids.shape[-1]:]
        return tokenizer.decode(new_ids, skip_special_tokens=True), len(new_ids)
    except Exception as exc:
        print(f"[LocalLLM] generation error: {exc}")
        return None, 0


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

def _engine_label() -> str:
    """Human-readable engine name for health/status endpoints."""
    mode = _get_engine_mode()
    if mode == "hybrid":
        return "Hybrid (ConvNeXt + GPT-4o)"
    if mode == "gpt_vision":
        return "GPT-4o Vision"
    return "Unavailable"


def _vision_model_name() -> str:
    if _vision_available and get_analyzer().is_ready:
        return get_analyzer().model_name
    return "N/A"


@app.get("/")
async def root():
    ready = _analyzer_ready()
    mode  = _get_engine_mode()
    return {
        "name":            "SmartLiva API",
        "version":         "3.0.0",
        "analysis_engine": _engine_label(),
        "model_version":   _MODEL_VERSION,
        "engine_mode":     mode,
        "model_ready":     ready,
        "endpoints":       ["/health", "/predict", "/chat", "/feedback", "/docs"],
    }


@app.get("/health")
async def health():
    ready        = _analyzer_ready()
    mode         = _get_engine_mode()
    vision_model = _vision_model_name()
    return {
        "status":          "ok",
        "model_ready":     ready,
        "analysis_engine": _engine_label(),
        "engine_mode":     mode,
        "vision_model":    vision_model,
        "model_version":   _MODEL_VERSION,
    }


@app.get("/model-status")
async def model_status():
    """Detailed model readiness endpoint — shown in clinical UI banner."""
    ready        = _analyzer_ready()
    mode         = _get_engine_mode()
    vision_model = _vision_model_name()
    label        = _engine_label()
    return {
        "model_ready":          ready,
        "model_version":        _MODEL_VERSION,
        "analysis_engine":      label,
        "engine_mode":          mode,
        "vision_model":         vision_model,
        "confidence_threshold": _CONFIDENCE_REVIEW_THRESHOLD,
        "tasks_supported":      ["fibrosis", "lesion", "parasite"],
        "clinical_validated":   False,
        "for_research_use":     True,
        "status_message": (
            f"{label} ready"
            if ready else
            "Engine not ready. Check OPENAI_API_KEY and local model file."
        ),
    }


# Fallback no-op db dependency when the DB module isn't available
def _noop_db():
    yield None

_get_db_dep = get_db if _db_available else _noop_db


@app.post("/predict", response_model=PredictionResponse)
async def predict(
    request: Request,
    _rl: None = Depends(_predict_rate_limit),   # rate limit: 10 req/min/IP
    file:       UploadFile = File(...),
    language:   str   = Form("en"),
    patient_hn: str   = Form(""),
    patient_name: str = Form(""),
    bmi:        str   = Form(""),
    alcohol_use: str  = Form(""),
    ast_ul:     str   = Form(""),
    alt_ul:     str   = Form(""),
    te_kpa_input: str = Form(""),   # FibroScan kPa — when provided, staging is ~100% accurate
    clinical_indication: str = Form(""),
    db: Session = Depends(_get_db_dep),
):
    content  = await file.read()
    filename = (file.filename or "").lower()

    # Parse optional clinical values
    _bmi     = float(bmi)     if bmi     else None
    _ast_ul  = float(ast_ul)  if ast_ul  else None
    _alt_ul  = float(alt_ul)  if alt_ul  else None
    _te_kpa  = float(te_kpa_input) if te_kpa_input else None

    # --- DICOM support ---
    is_dicom = filename.endswith(".dcm") or filename.endswith(".dicom")
    if is_dicom:
        try:
            image = _read_dicom_as_pil(content)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
    else:
        try:
            image = Image.open(io.BytesIO(content)).convert("RGB")
        except Exception:
            raise HTTPException(status_code=400, detail="Cannot read image file.")

    if not is_likely_ultrasound(image):
        msg = (
            "ไม่พบภาพอัลตราซาวด์ กรุณาอัปโหลดภาพอัลตราซาวด์ที่ถูกต้อง"
            if language == "th" else
            "Invalid image. Please upload a valid liver ultrasound image."
        )
        raise HTTPException(status_code=400, detail=msg)

    # Attach clinical context for GPT-4o Vision
    context_parts = []
    if _bmi:          context_parts.append(f"BMI: {_bmi:.1f}")
    if alcohol_use:   context_parts.append(f"Alcohol use: {alcohol_use}")
    if _ast_ul:       context_parts.append(f"AST: {_ast_ul:.0f} U/L")
    if _alt_ul:       context_parts.append(f"ALT: {_alt_ul:.0f} U/L")
    if clinical_indication: context_parts.append(f"Clinical indication: {clinical_indication}")
    clinical_context_str = "; ".join(context_parts) if context_parts else ""

    try:
        result = run_inference(image, clinical_context=clinical_context_str,
                               te_kpa=_te_kpa)
    except ValueError as exc:
        # Vision API confirmed the image is not a liver ultrasound
        if "non-ultrasound" in str(exc):
            msg = (
                "ไม่พบภาพอัลตราซาวด์ตับ กรุณาอัปโหลดภาพอัลตราซาวด์ตับที่ถูกต้อง"
                if language == "th" else
                "Invalid image. Please upload a valid liver ultrasound image."
            )
            raise HTTPException(status_code=400, detail=msg)
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "บริการวิเคราะห์ไม่พร้อมใช้งาน กรุณาตรวจสอบการตั้งค่า OPENAI_API_KEY"
                if language == "th" else str(exc)
            ),
        )

    summary = _clinical_summary(result, language)

    # Clinical safety: flag for physician review when confidence is low
    max_conf = max(
        result["fibrosis_conf"],
        result["lesion_conf"] if result.get("lesion_conf") else 0.0,
    )
    requires_review = max_conf < _CONFIDENCE_REVIEW_THRESHOLD

    # Audit trail
    audit_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()
    audit_logger.info(
        "predict | audit_id=%s | fibrosis_stage=%s | fibrosis_conf=%.3f "
        "| lesion=%s | parasite=%s | requires_review=%s | lang=%s | hn=%s",
        audit_id,
        result["fibrosis_stage"],
        result["fibrosis_conf"],
        result["lesion_label"],
        result["parasite_label"],
        requires_review,
        language,
        patient_hn or "anon",
    )

    # Persist to database
    if _db_available and db is not None:
        try:
            full_result = {
                **result,
                **summary,
                "requires_review": requires_review,
                "model_version": _MODEL_VERSION,
                "audit_id": audit_id,
                "analysis_timestamp": timestamp,
            }
            save_study(
                db,
                result=full_result,
                audit_id=audit_id,
                patient_hn=patient_hn,
                patient_name=patient_name,
                bmi=_bmi,
                alcohol_use=alcohol_use or None,
                ast_ul=_ast_ul,
                alt_ul=_alt_ul,
                clinical_notes=clinical_indication,
            )
        except Exception as _dbe:
            logging.getLogger(__name__).warning("[SmartLiva] DB save failed: %s", _dbe)

    # Frontend compatibility aliases
    les_label = result["lesion_label"]
    par_label = result["parasite_label"]
    disclaimer_text = (
        "ผลนี้เป็นเพียงเครื่องมือช่วยตัดสินใจทางคลินิก ต้องได้รับการยืนยันจากแพทย์ผู้มีใบอนุญาตเท่านั้น"
        if language == "th"
        else "For clinical decision support only. Results must be reviewed and confirmed by a licensed physician."
    )

    return PredictionResponse(
        te_kpa=result["te_kpa"],
        fibrosis_stage=result["fibrosis_stage"],
        fibrosis_confidence=result["fibrosis_conf"],
        lesion_label=les_label,
        lesion_confidence=result["lesion_conf"],
        parasite_label=par_label,
        parasite_confidence=result["parasite_conf"],
        fibrosis_probs=result["fibrosis_probs"],
        lesion_probs=result["lesion_probs"],
        parasite_probs=result["parasite_probs"],
        requires_review=requires_review,
        audit_id=audit_id,
        analysis_timestamp=timestamp,
        disclaimer=disclaimer_text,
        # Frontend compat aliases
        classification_label=les_label or result["fibrosis_stage"],
        classification_confidence=round(result["fibrosis_conf"] * 100, 1),
        parasite_detected=par_label in ("Suspicious", "OV_Detected"),
        parasite_type=par_label if par_label != "Normal" else None,
        # AI clinical notes from Vision API
        analysis_notes=result.get("analysis_notes", ""),
        image_quality=result.get("image_quality", "adequate"),
        **summary,
    )


# ---------------------------------------------------------------------------
# Physician Feedback — Continual Learning input
# ---------------------------------------------------------------------------

class FeedbackRequest(BaseModel):
    audit_id:           str
    corrected_fibrosis: str   | None = None   # "F0"–"F4"
    corrected_lesion:   str   | None = None   # LESION_CLASSES label or None
    corrected_parasite: str   | None = None   # "Normal"|"Suspicious"|"OV_Detected"
    validated:          bool          = False  # True = AI result was correct
    physician_note:     str   | None = None


class FeedbackResponse(BaseModel):
    status:    str
    row_id:    int | None = None
    message:   str | None = None

class VideoAnalyzeResponse(BaseModel):
    status: str
    filename: str
    results: list[dict]

try:
    from .video_processor import process_video_async
except ImportError:
    process_video_async = None


@app.post("/analyze-video", response_model=VideoAnalyzeResponse)
async def analyze_video(
    request: Request,
    file: UploadFile = File(...),
):
    """
    Hackathon Demo Endpoint: Process an Ultrasound Video.
    Extracts frames at 1 FPS and runs SmartLiva hybrid inference on each.
    """
    if not process_video_async:
        raise HTTPException(status_code=501, detail="Video processing not available (missing cv2 or video_processor.py).")
        
    try:
        content = await file.read()
        filename = (file.filename or "").lower()
        
        frames_results = await process_video_async(
            video_bytes=content,
            run_inference_fn=lambda img: run_inference(image=img, clinical_context="", te_kpa=None),
            sample_rate_fps=2.0  # Extract 2 frames per second for a smooth timeline demo
        )
        
        return VideoAnalyzeResponse(
            status="success",
            filename=filename,
            results=frames_results
        )
    except Exception as e:
        logging.getLogger(__name__).error(f"Video analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(req: FeedbackRequest):
    """
    Submit physician feedback / correction on an AI prediction.

    Called from the clinical UI when a physician:
      • Overrides the AI result (corrected_* fields set)
      • Validates the AI result (validated=True)

    Corrections are stored in the replay buffer for weekly fine-tuning.
    Only feature embeddings are stored — no image pixels (PDPA-compliant).
    """
    if not _continual_available:
        return FeedbackResponse(
            status  = "skipped",
            message = "Continual learning not available (install PyTorch)",
        )

    try:
        buf = get_replay_buffer()
        row_id = buf.push_correction(
            audit_id           = req.audit_id,
            corrected_fib      = req.corrected_fibrosis or "F0",
            corrected_lesion   = req.corrected_lesion,
            corrected_parasite = req.corrected_parasite or "Normal",
        )
        audit_logger.info(
            "feedback | audit_id=%s | fib=%s | les=%s | par=%s | validated=%s",
            req.audit_id,
            req.corrected_fibrosis,
            req.corrected_lesion,
            req.corrected_parasite,
            req.validated,
        )
        return FeedbackResponse(
            status  = "accepted",
            row_id  = row_id,
            message = "Correction stored. Model will be updated in the next scheduled fine-tuning run.",
        )
    except Exception as exc:
        logging.getLogger(__name__).error("[Feedback] Failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Feedback submission failed: {exc}")


@app.get("/continual-stats")
async def continual_stats():
    """Replay buffer statistics and fine-tuning readiness."""
    if not _continual_available:
        return {"available": False, "message": "Continual learning not available"}
    try:
        stats = get_replay_buffer().stats()
        return {"available": True, **stats}
    except Exception as exc:
        return {"available": False, "error": str(exc)}


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    language = req.language or "en"

    if not req.history:
        greeting = (
            "สวัสดีค่ะ ฉันคือ Dr. HepaSage ผู้เชี่ยวชาญด้านตับ มีอะไรให้ช่วยไหมคะ?"
            if language == "th" else
            "Hello! I am Dr. HepaSage, your AI hepatologist. How can I help you today?"
        )
        return ChatResponse(reply=greeting)

    max_tokens = req.max_new_tokens or 300
    temp       = req.temperature or 0.7

    reply, usage = _openai_chat(req.history, max_tokens, temp, language)
    if not reply:
        reply, usage = _groq_chat(req.history, max_tokens, temp, language)
    if not reply:
        reply, usage = _local_chat(req.history, max_tokens, temp, language)
    if not reply:
        reply = (
            "ขออภัยค่ะ เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง"
            if language == "th" else
            "The chat service is temporarily unavailable. Please try again."
        )

    return ChatResponse(reply=reply, usage_tokens=usage)


if _translation_available:
    app.include_router(translation_router)

if _db_available:
    app.include_router(patient_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
