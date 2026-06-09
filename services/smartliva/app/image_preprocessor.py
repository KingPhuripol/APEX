"""
SmartLiva — Image Preprocessor
================================
Stage 0 of the Hybrid Cascade pipeline.

Applies clinically-motivated preprocessing to liver ultrasound images
before feeding them to the local ConvNeXt model.

Operations (in order):
  1. Colour → Greyscale / RGB normalisation
  2. CLAHE (Contrast Limited Adaptive Histogram Equalisation)
     — enhances parenchymal texture and bile duct visibility
     — critical for F0/F1 boundary and OV detection accuracy
  3. Ultrasound bounding-box crop
     — heuristic crop removes scan annotations, scale bars, machine overlays
     — reduces non-tissue pixels that confuse the classifier
  4. Resize to target size for model input

All operations are OpenCV-based with PIL fallback for environments
where cv2 is not installed.
"""

from __future__ import annotations

import logging
from typing import Tuple

import numpy as np
from PIL import Image, ImageFilter, ImageOps

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# CLAHE parameters (tuned for 300–800 px ultrasound images)
# ---------------------------------------------------------------------------
_CLAHE_CLIP_LIMIT    = 2.0
_CLAHE_TILE_GRID     = (8, 8)

# Crop margins: fraction of image to strip from each side to remove overlays
_CROP_TOP    = 0.08   # strip machine header (probe info, date)
_CROP_BOTTOM = 0.04   # strip footer
_CROP_LEFT   = 0.04
_CROP_RIGHT  = 0.04

# Saturation threshold for ultrasound pre-filter (keep in sync with main.py)
_MAX_MEAN_SATURATION = 55.0


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def _try_import_cv2():
    try:
        import cv2
        return cv2
    except ImportError:
        return None


def _pil_to_uint8_gray(image: Image.Image) -> np.ndarray:
    gray = image.convert("L")
    return np.array(gray, dtype=np.uint8)


def _uint8_gray_to_pil_rgb(arr: np.ndarray) -> Image.Image:
    from PIL import Image as _Image
    return _Image.fromarray(arr, mode="L").convert("RGB")


# ---------------------------------------------------------------------------
# CLAHE enhancement
# ---------------------------------------------------------------------------

def apply_clahe(image: Image.Image) -> Image.Image:
    """
    Apply CLAHE to enhance local tissue contrast in the ultrasound image.

    Tries OpenCV first for speed; falls back to a PIL-based approximation
    using local histogram equalisation.
    """
    cv2 = _try_import_cv2()

    if cv2 is not None:
        gray = _pil_to_uint8_gray(image)
        clahe = cv2.createCLAHE(
            clipLimit=_CLAHE_CLIP_LIMIT,
            tileGridSize=_CLAHE_TILE_GRID,
        )
        enhanced = clahe.apply(gray)
        # Convert back to RGB (the model expects 3-channel input)
        enhanced_rgb = cv2.cvtColor(enhanced, cv2.COLOR_GRAY2RGB)
        return Image.fromarray(enhanced_rgb)

    else:
        # Pillow fallback: simple local contrast enhancement
        logger.debug("[Preprocessor] cv2 not available — using PIL CLAHE approximation")
        gray = ImageOps.equalize(image.convert("L"))
        return gray.convert("RGB")


# ---------------------------------------------------------------------------
# Annotation crop
# ---------------------------------------------------------------------------

def crop_ultrasound_roi(image: Image.Image) -> Image.Image:
    """
    Heuristic crop to remove machine overlays, scale bars, and text annotations
    that appear on ultrasound frames.

    Uses pixel intensity analysis: the ultrasound sector is the darkest
    major region; pure-white or high-intensity strips are overlay artefacts.
    """
    w, h = image.size

    # First pass: apply fixed margin crop
    left   = int(w * _CROP_LEFT)
    right  = int(w * (1.0 - _CROP_RIGHT))
    top    = int(h * _CROP_TOP)
    bottom = int(h * (1.0 - _CROP_BOTTOM))
    cropped = image.crop((left, top, right, bottom))

    # Second pass: detect and remove bright overlay rows (mean pixel > 240)
    arr  = np.array(cropped.convert("L"), dtype=np.float32)
    rows = arr.mean(axis=1)   # mean brightness per row
    cols = arr.mean(axis=0)   # mean brightness per column

    # Find innermost rows/cols with brightness < 230 as scan content
    threshold = 230.0
    valid_rows = np.where(rows < threshold)[0]
    valid_cols = np.where(cols < threshold)[0]

    if len(valid_rows) > 0 and len(valid_cols) > 0:
        r_top, r_bot = int(valid_rows[0]),  int(valid_rows[-1])
        c_lft, c_rgt = int(valid_cols[0]), int(valid_cols[-1])
        # Only crop if the resulting size is reasonable (>50% of original)
        new_h = r_bot - r_top
        new_w = c_rgt - c_lft
        if new_h > 0.5 * cropped.height and new_w > 0.5 * cropped.width:
            cropped = cropped.crop((c_lft, r_top, c_rgt, r_bot))
        else:
            logger.debug("[Preprocessor] Brightness crop too aggressive — keeping margin-only crop")

    return cropped


# ---------------------------------------------------------------------------
# Composite preprocessing pipeline
# ---------------------------------------------------------------------------

def preprocess_ultrasound(
    image: Image.Image,
    apply_clahe_flag: bool  = True,
    apply_crop_flag:  bool  = True,
    target_size: Tuple[int, int] = (224, 224),
) -> Image.Image:
    """
    Full preprocessing pipeline for a liver ultrasound image.

    Steps:
      1. Ensure RGB
      2. Heuristic annotation crop (optional)
      3. CLAHE enhancement (optional)
      4. Resize to target_size

    Returns a PIL Image ready for model inference.
    """
    if image.mode != "RGB":
        image = image.convert("RGB")

    if apply_crop_flag:
        image = crop_ultrasound_roi(image)

    if apply_clahe_flag:
        image = apply_clahe(image)
    else:
        # Still convert to ensure consistent RGB output
        image = image.convert("RGB")

    # Final resize — use LANCZOS for quality
    image = image.resize(target_size, Image.LANCZOS)

    return image


# ---------------------------------------------------------------------------
# Pre-filter: quick colour-saturation check to reject non-US images
# ---------------------------------------------------------------------------

def is_likely_ultrasound(image: Image.Image) -> bool:
    """
    Fast pre-filter: rejects obviously non-medical images by checking
    mean colour saturation.  Ultrasound images are near-greyscale (low S).

    Threshold: mean HSV saturation ≤ 55 (out of 255)

    Note: The Vision LLM performs the definitive check for edge cases.
    """
    try:
        hsv_arr = np.array(image.convert("HSV"))
        mean_sat = float(hsv_arr[:, :, 1].mean())
        return mean_sat <= _MAX_MEAN_SATURATION
    except Exception:
        return True   # pass through on error


def get_image_stats(image: Image.Image) -> dict:
    """Return diagnostic statistics for an ultrasound image — useful for logging."""
    try:
        arr      = np.array(image.convert("L"), dtype=np.float32)
        hsv_arr  = np.array(image.convert("HSV"), dtype=np.float32)
        return {
            "width":        image.width,
            "height":       image.height,
            "mean_gray":    float(arr.mean()),
            "std_gray":     float(arr.std()),
            "min_gray":     float(arr.min()),
            "max_gray":     float(arr.max()),
            "mean_saturation": float(hsv_arr[:, :, 1].mean()),
        }
    except Exception as exc:
        return {"error": str(exc)}
