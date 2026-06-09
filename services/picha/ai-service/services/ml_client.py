"""
PICHA — ML Service Client
ai-service ใช้ไฟล์นี้เรียก ml-service (ConvNeXt-Base) ก่อนส่ง API เสมอ

⚠️  Model scope:
    The ML model is a COLORECTAL TISSUE TYPER (9-class: adipose, colorectal_cancer,
    debris, lymphocytes, mucus, normal_colon, normal_colon_v2, smooth_muscle, stroma).
    It is trained on CRC-NCT-HE-555K and used as a TISSUE COMPOSITION PRE-SCREENER
    to give MARS agents spatial/cellular context — NOT as a CCA classifier.

    Accuracy: 76.33% test (colorectal domain). CCA diagnosis is the agents' responsibility.

Logic:
  - confidence >= ML_CONFIDENCE_THRESHOLD → use as tissue context prior for agents
  - confidence <  ML_CONFIDENCE_THRESHOLD → flag as low-confidence hint only
  - ml-service unavailable → fallback to LLM-only automatically
"""
import os
import logging
from dataclasses import dataclass, field
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

ML_BASE = os.environ.get("ML_API_URL", "http://localhost:8100")
ML_KEY  = os.environ.get("ML_API_KEY", "")
ML_TIMEOUT = float(os.environ.get("ML_TIMEOUT_MS", "15000")) / 1000


@dataclass
class MLResult:
    tissue_class: str
    confidence: float
    all_probs: dict = field(default_factory=dict)
    model_domain: str = "colorectal_tissue_typing"
    model_test_acc: float = 0.7633
    processing_time_ms: float = 0.0
    source: str = "ml-service"


async def ml_prescreen(image_base64: str) -> Optional[MLResult]:
    """
    Call ml-service /predict endpoint.
    Returns None if ml-service unavailable (caller falls back to LLM-only).
    """
    if not image_base64:
        return None

    headers = {"Content-Type": "application/json"}
    if ML_KEY:
        headers["X-API-Key"] = ML_KEY

    try:
        async with httpx.AsyncClient(timeout=ML_TIMEOUT) as client:
            resp = await client.post(
                f"{ML_BASE}/predict",
                json={"image_base64": image_base64},
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()

        return MLResult(
            tissue_class=data["tissue_class"],
            confidence=data["confidence"],
            all_probs=data.get("all_probs", {}),
            model_domain=data.get("model_domain", "colorectal_tissue_typing"),
            model_test_acc=data.get("model_test_acc", 0.7633),
            processing_time_ms=data.get("processing_time_ms", 0),
        )

    except Exception as exc:
        logger.warning(f"[ml_prescreen] ml-service unavailable: {exc} — continuing LLM-only")
        return None


def build_ml_context(ml: Optional[MLResult], threshold: float) -> str:
    """
    แปลง MLResult เป็น text ที่ inject เข้า prompt ของ LLM
    ถ้า confidence ต่ำกว่า threshold → ระบุให้ LLM รู้ว่า ML ไม่มั่นใจ
    """
    if ml is None:
        return "\n[Tissue Pre-screen: unavailable — proceeding LLM-only]\n"

    status = "HIGH CONFIDENCE" if ml.confidence >= threshold else "LOW CONFIDENCE — treat as hint only"

    # Top 3 tissue classes by probability
    top3 = sorted(ml.all_probs.items(), key=lambda x: x[1], reverse=True)[:3]
    top3_str = ", ".join(f"{cls}:{prob:.1%}" for cls, prob in top3)

    return f"""
[Tissue Composition Pre-screen — ConvNeXt-Base ({status})]
  SCOPE              : Colorectal tissue typing (NOT a CCA classifier)
  Dominant tissue    : {ml.tissue_class}
  Confidence         : {ml.confidence:.1%}
  Top tissue classes : {top3_str}
  Model accuracy     : {ml.model_test_acc:.1%} (colorectal test set — not CCA-validated)
  Processing time    : {ml.processing_time_ms:.0f}ms

⚠️  This output describes colorectal tissue morphology detected in the slide.
    Use for tissue context only (e.g. presence of stroma, lymphocytes, adipose).
    The 'colorectal_cancer' class indicates colorectal malignant morphology and
    is NOT indicative of CCA. You are responsible for CCA diagnosis.
{"→ Tissue context reliable. Use as supporting context for slide QC and microenvironment assessment." if ml.confidence >= threshold else "→ ML confidence low. Do not rely on tissue class — perform independent morphological reasoning."}
"""
