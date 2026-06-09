"""
PICHA ML Service — FastAPI inference server for ConvNeXt-Base (Port 8100)
Endpoint: POST /predict — classify tissue type from H&E pathology image

⚠️  IMPORTANT — Model scope:
    This model was trained on the CRC-NCT-HE-555K colorectal tissue dataset
    (9 tissue classes: adipose, colorectal_cancer, debris, lymphocytes, mucus,
    normal_colon, normal_colon_v2, smooth_muscle, stroma).

    It is used in the PICHA pipeline as a TISSUE COMPOSITION PRE-SCREENER only —
    NOT as a cholangiocarcinoma (CCA) classifier.

    The 'colorectal_cancer' class flags malignant colorectal morphology.
    On CCA slides this class is typically absent; the AI agents (MARS pipeline)
    perform the actual CCA diagnosis using LLM-based reasoning.

    Validation accuracy: 76.33% (test set), 77.51% (best val) — colorectal domain only.
"""
import os
import base64
import time
import io
import logging
from contextlib import asynccontextmanager
from typing import Optional
import requests

import torch
import torchvision.transforms as T
from torchvision import models
from PIL import Image
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# ── Model setup ────────────────────────────────────────────────────────────────
MODEL_PATH = os.environ.get("MODEL_PATH", "model/convnext_base_best.pth")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
CONFIDENCE_THRESHOLD = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.85"))

# 9 classes matching training data — sorted alphabetically (must match training order)
TISSUE_CLASSES = [
    "adipose", "colorectal_cancer", "debris", "lymphocytes", "mucus",
    "normal_colon", "normal_colon_v2", "smooth_muscle", "stroma",
]

# Model domain metadata — NOT a CCA classifier
MODEL_DOMAIN      = "colorectal_tissue_typing"
MODEL_DATASET     = "CRC-NCT-HE-555K"
MODEL_TEST_ACC    = 0.7633
MODEL_BEST_VAL_ACC = 0.7751

_model: Optional[torch.nn.Module] = None

# H&E pathology normalization — measured from this dataset (not ImageNet)
HE_MEAN = [0.757, 0.619, 0.713]
HE_STD  = [0.163, 0.202, 0.153]

TRANSFORM = T.Compose([
    T.Resize(400),
    T.CenterCrop(380),
    T.ToTensor(),
    T.Normalize(mean=HE_MEAN, std=HE_STD),
])


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _model
    if os.path.exists(MODEL_PATH):
        _model = models.convnext_base(weights=None)
        _model.classifier[2] = torch.nn.Linear(_model.classifier[2].in_features, len(TISSUE_CLASSES))
        ckpt = torch.load(MODEL_PATH, map_location=DEVICE)
        state = ckpt["model"] if isinstance(ckpt, dict) and "model" in ckpt else ckpt
        _model.load_state_dict(state)
        _model.eval()
        _model.to(DEVICE)
        logger.info(f"ConvNeXt-Base loaded from {MODEL_PATH} on {DEVICE}")
    else:
        logger.warning(f"Model weights not found at {MODEL_PATH} — running in mock mode")
    yield


app = FastAPI(title="PICHA ML Service", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3005", os.environ.get("BACKEND_URL", "")],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class PredictRequest(BaseModel):
    image_base64: str  # base64 encoded image (with or without data URL prefix)


class PredictResponse(BaseModel):
    # Tissue composition result
    tissue_class: str          # dominant tissue class detected
    confidence: float          # confidence for dominant class (0–1)
    all_probs: dict            # probability for each of the 9 tissue classes
    # Model metadata — always included so callers understand scope
    model_domain: str          # "colorectal_tissue_typing" — NOT a CCA classifier
    model_dataset: str         # training dataset name
    model_test_acc: float      # test accuracy on colorectal domain
    processing_time_ms: float
    model_path: str
    device: str
    source: str = "local_ml"   # "local_ml" or "cloud_api"

def call_vision_api_fallback(image_b64: str, classes: list) -> dict:
    """
    Fallback to a Vision API (e.g. Gemini, OpenAI) if local ML confidence is too low.
    You need to implement the actual API call here using your preferred provider.
    """
    logger.info("Confidence below threshold. Calling Cloud Vision API Fallback...")
    # Mocking API call latency
    time.sleep(1.0)
    
    # Placeholder: Replace with actual Gemini/OpenAI API Call
    # Example:
    # headers = {"Authorization": f"Bearer {os.environ.get('VISION_API_KEY')}"}
    # payload = {"image": image_b64, "prompt": f"Classify this tissue into one of: {classes}"}
    # response = requests.post("https://api.provider.com/v1/vision", json=payload, headers=headers)
    
    # Mocking a highly confident API response for demonstration
    return {
        "tissue_class": "colorectal_cancer", # Simulated LLM answer
        "confidence": 0.95,
        "source": "cloud_api"
    }


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    start = time.time()

    # Decode image
    b64 = req.image_base64
    if b64.startswith("data:image"):
        b64 = b64.split(",", 1)[1]
    image_bytes = base64.b64decode(b64)
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    if _model is None:
        # Mock response when weights not loaded
        return PredictResponse(
            tissue_class="stroma",
            confidence=0.42,
            all_probs={c: 0.0 for c in TISSUE_CLASSES},
            model_domain=MODEL_DOMAIN,
            model_dataset=MODEL_DATASET,
            model_test_acc=MODEL_TEST_ACC,
            processing_time_ms=round((time.time() - start) * 1000, 1),
            model_path=MODEL_PATH,
            device="mock",
            source="mock_ml"
        )

    tensor = TRANSFORM(image).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        logits = _model(tensor)
        probs = torch.softmax(logits, dim=1)[0].cpu().tolist()

    all_probs = {cls: round(p, 4) for cls, p in zip(TISSUE_CLASSES, probs)}
    top_idx = int(torch.argmax(torch.tensor(probs)))
    top_class = TISSUE_CLASSES[top_idx]
    confidence = probs[top_idx]

    source = "local_ml"
    
    # Fallback Logic
    if confidence < CONFIDENCE_THRESHOLD:
        api_result = call_vision_api_fallback(req.image_base64, TISSUE_CLASSES)
        top_class = api_result.get("tissue_class", top_class)
        confidence = api_result.get("confidence", confidence)
        source = api_result.get("source", "cloud_api")

    return PredictResponse(
        tissue_class=top_class,
        confidence=round(confidence, 4),
        all_probs=all_probs,
        model_domain=MODEL_DOMAIN,
        model_dataset=MODEL_DATASET,
        model_test_acc=MODEL_TEST_ACC,
        processing_time_ms=round((time.time() - start) * 1000, 1),
        model_path=MODEL_PATH,
        device=DEVICE,
        source=source
    )


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": _model is not None,
        "device": DEVICE,
        "model_path": MODEL_PATH,
        "model_domain": MODEL_DOMAIN,
        "model_dataset": MODEL_DATASET,
        "model_test_acc": MODEL_TEST_ACC,
        "model_best_val_acc": MODEL_BEST_VAL_ACC,
        "tissue_classes": TISSUE_CLASSES,
        "warning": "This model classifies colorectal tissue types only. CCA diagnosis is performed by MARS AI agents.",
    }
