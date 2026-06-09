#!/usr/bin/env python3
"""
SmartLiva — Conformal Prediction Calibration Script
=====================================================
Run this script ONCE after training ConvNeXt to calibrate the conformal
prediction engine on a held-out validation set.

This is the critical step that gives SmartLiva its **statistical guarantee**:
  P(true_label ∈ prediction_set) ≥ 95%

Usage
-----
Basic (use default val set from data/prepared/):
    python conformal_calibrate.py

Custom val directory:
    python conformal_calibrate.py --val-dir /path/to/val --alpha 0.05

With RAPS algorithm (produces smaller prediction sets):
    python conformal_calibrate.py --algorithm raps --raps-lambda 0.01

Also calibrates temperature scaling for each task head.

Output
------
Saves to: backend/models/production_v1/
  conformal_bundle.json   — conformal calibration (qhat, algorithm, coverage)
  calibration.json        — temperature scaling (T_fib, T_les, T_par)

After running this script, the HybridAnalyzer will automatically:
  • Use guaranteed prediction sets instead of raw confidence thresholds
  • Only escalate to GPT-4o when the set size > 1 (truly ambiguous cases)
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

import numpy as np

# ---------------------------------------------------------------------------
# Path setup
# ---------------------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

from app.local_model import (
    ConvNeXtProduction,
    FIBROSIS_CLASSES,
    LESION_CLASSES,
    PARASITE_CLASSES,
    _DEFAULT_MODEL_PATH,
)
from app.conformal_engine import (
    ConformalEngine,
    MultiTaskConformalBundle,
)
from app.image_preprocessor import preprocess_ultrasound

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("conformal_calibrate")

# ---------------------------------------------------------------------------
# Default paths (matching data/prepared/ structure)
# ---------------------------------------------------------------------------
PROJECT_ROOT = BACKEND_DIR.parent
DEFAULT_VAL_DIRS = {
    "fibrosis": PROJECT_ROOT / "data/prepared",
    "lesion":   PROJECT_ROOT / "data/prepared/lesion/val",
    "parasite": PROJECT_ROOT / "data/prepared/parasite/val",
}
OUTPUT_DIR = BACKEND_DIR / "models/production_v1"


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_val_images(val_root: Path, class_names: list[str]) -> tuple[list, list[int]]:
    """
    Load validation images from a directory structure:
      val_root/
        ClassName1/
          img1.jpg
          img2.jpg
        ClassName2/
          ...

    Returns (pil_images, labels).
    """
    from PIL import Image

    images, labels = [], []
    for cls_idx, cls_name in enumerate(class_names):
        cls_dir = val_root / cls_name
        if not cls_dir.exists():
            logger.warning("Class directory not found: %s — skipping", cls_dir)
            continue
        img_files = sorted([
            f for f in cls_dir.iterdir()
            if f.suffix.lower() in (".jpg", ".jpeg", ".png", ".bmp")
        ])
        logger.info("  %s: %d images", cls_name, len(img_files))
        for img_path in img_files:
            try:
                img = Image.open(img_path).convert("RGB")
                images.append(img)
                labels.append(cls_idx)
            except Exception as exc:
                logger.warning("  Could not load %s: %s", img_path.name, exc)

    logger.info("Total: %d images, %d classes", len(images), len(class_names))
    return images, labels


def load_fibrosis_val_from_csv(
    csv_path: Path,
    images_dir: Path,
    class_names: list[str],
) -> tuple[list, list[int]]:
    """
    Load fibrosis validation images from merged CSV format
    (data/merged/val.csv + data/merged/images/).

    CSV must have columns: image_name, fibrosis_class, has_labels
    Returns (pil_images, labels).
    """
    import csv as _csv
    from PIL import Image

    if not csv_path.exists():
        return [], []

    images, labels, missing = [], [], 0
    with open(csv_path) as f:
        rows = list(_csv.DictReader(f))

    for r in rows:
        if r.get("has_labels", "True") != "True":
            continue
        img_path = images_dir / r["image_name"]
        if not img_path.exists():
            missing += 1
            continue
        try:
            img = Image.open(img_path).convert("RGB")
            images.append(img)
            labels.append(int(r["fibrosis_class"]))
        except Exception as exc:
            logger.warning("  Could not load %s: %s", img_path.name, exc)

    if missing:
        logger.warning("  %d/%d images missing from disk", missing, len(rows))
    logger.info(
        "  CSV fibrosis val: %d images loaded, classes=%s",
        len(images), {c: labels.count(i) for i, c in enumerate(class_names)},
    )
    return images, labels


# ---------------------------------------------------------------------------
# Run inference on val set
# ---------------------------------------------------------------------------

def collect_val_probs(
    model:       ConvNeXtProduction,
    images:      list,
    labels:      list[int],
    task:        str,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Run model on all val images and collect calibrated probabilities.

    Returns (probs_array, labels_array).
    """
    all_probs, all_labels = [], []

    for i, (img, lbl) in enumerate(zip(images, labels)):
        if i % 50 == 0:
            logger.info("  Inference: %d/%d", i, len(images))
        try:
            proc = preprocess_ultrasound(img)
            result = model.predict(proc)
            if task == "fibrosis":
                probs = result["class_probs"]
            elif task == "lesion":
                probs = result["lesion_probs"]
            elif task == "parasite":
                probs = result["parasite_probs"]
            else:
                raise ValueError(f"Unknown task: {task}")
            all_probs.append(probs)
            all_labels.append(lbl)
        except Exception as exc:
            logger.warning("  Skipping sample %d: %s", i, exc)

    return np.array(all_probs, dtype=np.float64), np.array(all_labels, dtype=np.int64)


# ---------------------------------------------------------------------------
# Temperature calibration (find optimal T via NLL minimisation)
# ---------------------------------------------------------------------------

def calibrate_temperature(
    logits: np.ndarray,   # (N, C) raw logits
    labels: np.ndarray,   # (N,) integer labels
    n_steps: int = 100,
) -> float:
    """
    Find the optimal temperature T that minimises NLL on the validation set.
    Uses simple grid search over [0.1, 5.0].
    """
    best_T   = 1.0
    best_nll = float("inf")

    for T in np.linspace(0.1, 5.0, n_steps):
        scaled = logits / T
        # log-softmax for numerical stability
        max_s   = scaled.max(axis=1, keepdims=True)
        log_sum = np.log(np.exp(scaled - max_s).sum(axis=1, keepdims=True)) + max_s
        log_probs = scaled - log_sum
        nll = -log_probs[np.arange(len(labels)), labels].mean()
        if nll < best_nll:
            best_nll = nll
            best_T   = T

    return float(best_T)


def collect_val_logits(
    model:   ConvNeXtProduction,
    images:  list,
    labels:  list[int],
    task:    str,
) -> tuple[np.ndarray, np.ndarray]:
    """Collect raw logits (not calibrated probs) for temperature calibration."""
    all_logits, all_labels = [], []
    for i, (img, lbl) in enumerate(zip(images, labels)):
        try:
            proc   = preprocess_ultrasound(img)
            result = model.predict(proc)
            if task == "fibrosis":
                logits = result["fibrosis_logits"]
            elif task == "lesion":
                logits = result["lesion_logits"]
            elif task == "parasite":
                logits = result["parasite_logits"]
            else:
                raise ValueError(f"Unknown task: {task}")
            all_logits.append(logits)
            all_labels.append(lbl)
        except Exception as exc:
            logger.warning("  Logit collection skipped sample %d: %s", i, exc)

    return np.array(all_logits, dtype=np.float64), np.array(all_labels, dtype=np.int64)


# ---------------------------------------------------------------------------
# Main calibration pipeline
# ---------------------------------------------------------------------------

def run_calibration(
    val_root:   Path,
    algorithm:  str   = "raps",
    alpha:      float = 0.05,
    raps_lambda: float = 0.01,
    raps_k_reg: int   = 1,
    model_path: str   = None,
    output_dir: Path  = OUTPUT_DIR,
) -> None:

    output_dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Load model
    # ------------------------------------------------------------------
    logger.info("=" * 60)
    logger.info("Loading ConvNeXt model...")
    model = ConvNeXtProduction(model_path=model_path)
    logger.info(
        "Model loaded — arch=%s fitted=%s device=%s",
        getattr(model, "_arch_type", "unknown"), model.is_fitted, model.device,
    )

    # For smart_model_v1 only fibrosis + kPa were trained.
    # Skip conformal calibration for lesion/parasite — those always route to GPT-4o.
    arch = getattr(model, "_arch_type", "legacy")
    trained_tasks: set[str] = (
        {"fibrosis"} if arch == "smart_model_v1"
        else {"fibrosis", "lesion", "parasite"}
    )
    if arch == "smart_model_v1":
        logger.info(
            "smart_model_v1 detected — calibrating fibrosis only "
            "(lesion/parasite not trained, always routes to GPT-4o)"
        )

    # ------------------------------------------------------------------
    # Calibrate per-task
    # ------------------------------------------------------------------
    conformal_engines = {}

    # Seed temp_calibration from the model's embedded temperature so skipped
    # tasks still end up with a sensible value in calibration.json.
    _embedded_temp = getattr(model, "_scaler_fib", None)
    temp_calibration: dict = {
        "fibrosis_temperature": _embedded_temp.temperature if _embedded_temp else 1.0,
        "lesion_temperature":   1.0,
        "parasite_temperature": 1.0,
    }

    _csv_path   = PROJECT_ROOT / "data" / "merged" / "val.csv"
    _images_dir = PROJECT_ROOT / "data" / "merged" / "images"

    task_configs = [
        {
            "name":        "fibrosis",
            "class_names": FIBROSIS_CLASSES,
            # Prefer data/merged/val.csv when available (636 labeled images).
            # Fall back to directory layout: fibrosis/val/{F0..F4}/
            "val_dir":     (
                val_root / "fibrosis" / "val"
                if (val_root / "fibrosis" / "val").exists()
                else val_root
            ),
            "csv_path":   _csv_path,
            "images_dir": _images_dir,
        },
        {
            "name":        "lesion",
            "class_names": LESION_CLASSES,
            "val_dir":     val_root / "lesion" / "val",
        },
        {
            "name":        "parasite",
            "class_names": PARASITE_CLASSES,
            "val_dir":     val_root / "parasite" / "val",
        },
    ]

    for cfg in task_configs:
        task_name   = cfg["name"]
        class_names = cfg["class_names"]
        val_dir     = cfg["val_dir"]
        csv_path    = cfg.get("csv_path")
        images_dir  = cfg.get("images_dir")

        logger.info("")
        logger.info("=" * 60)
        logger.info("Task: %s  |  val_dir: %s", task_name, val_dir)

        if task_name not in trained_tasks:
            logger.info("  Skipping %s — not trained in this checkpoint (uses GPT-4o)", task_name)
            continue

        # --- Load validation images (CSV path takes priority for fibrosis) ---
        images, labels = None, None
        if csv_path is not None and csv_path.exists() and images_dir is not None and images_dir.exists():
            logger.info("  Loading validation data from CSV: %s", csv_path)
            try:
                images, labels = load_fibrosis_val_from_csv(csv_path, images_dir, class_names)
                logger.info("  Loaded %d samples from CSV", len(images))
            except Exception as exc:
                logger.warning("  CSV load failed (%s) — falling back to val_dir", exc)
                images, labels = None, None

        if images is None:
            if not val_dir.exists():
                logger.warning("  Val directory not found: %s — skipping task", val_dir)
                continue
            images, labels = load_val_images(val_dir, class_names)
        if len(images) < 20:
            logger.warning("  Too few validation samples (%d) — skipping task", len(images))
            continue

        # --- Temperature calibration ---
        logger.info("  Collecting logits for temperature calibration...")
        logits, lbl_arr = collect_val_logits(model, images, labels, task_name)
        if len(logits) >= 20:
            T_opt = calibrate_temperature(logits, lbl_arr)
            logger.info("  Optimal temperature T=%.4f", T_opt)
            temp_calibration[f"{task_name}_temperature"] = T_opt
        else:
            logger.warning("  Not enough logits for temperature calibration")

        # --- Conformal calibration ---
        logger.info("  Collecting calibrated probabilities for conformal calibration...")
        probs, lbl_arr2 = collect_val_probs(model, images, labels, task_name)

        if algorithm == "raps":
            engine = ConformalEngine.calibrate_raps(
                val_probs   = probs,
                val_labels  = lbl_arr2,
                class_names = class_names,
                alpha       = alpha,
                lam         = raps_lambda,
                k_reg       = raps_k_reg,
            )
        else:
            engine = ConformalEngine.calibrate_lac(
                val_probs   = probs,
                val_labels  = lbl_arr2,
                class_names = class_names,
                alpha       = alpha,
            )

        logger.info("  %s", engine.summary())
        conformal_engines[task_name] = engine

    # ------------------------------------------------------------------
    # Save conformal bundle
    # ------------------------------------------------------------------
    bundle = MultiTaskConformalBundle(**conformal_engines)
    bundle_path = output_dir / "conformal_bundle.json"
    bundle.save(bundle_path)
    logger.info("")
    logger.info("Conformal bundle saved → %s", bundle_path)

    # ------------------------------------------------------------------
    # Save temperature calibration
    # ------------------------------------------------------------------
    cal_path = output_dir / "calibration.json"
    # Preserve architecture metadata already in file (if any), then update temps
    existing_cal = {}
    if cal_path.exists():
        try:
            with open(cal_path) as _f:
                existing_cal = json.load(_f)
        except Exception:
            pass
    # Merge: calibrated temps override existing; keep arch metadata
    merged_cal = {**existing_cal, **temp_calibration}
    merged_cal["architecture"] = arch
    with open(cal_path, "w") as f:
        json.dump(merged_cal, f, indent=2)
    logger.info("Temperature calibration saved → %s", cal_path)

    # ------------------------------------------------------------------
    # Print summary
    # ------------------------------------------------------------------
    logger.info("")
    logger.info("=" * 60)
    logger.info("CALIBRATION COMPLETE")
    logger.info("=" * 60)
    for task_name, engine in conformal_engines.items():
        c = engine.calibration
        logger.info(
            "  %-10s  algorithm=%-4s  q̂=%.4f  coverage=%.3f (target=%.3f)  mean_set=%.2f",
            task_name, c.algorithm, c.qhat,
            c.empirical_coverage, 1 - c.alpha,
            c.mean_set_size,
        )
    logger.info("")
    logger.info("Next steps:")
    logger.info("  1. Restart the SmartLiva backend — hybrid engine will load the new calibration")
    logger.info("  2. Monitor escalation rates in /health endpoint")
    logger.info("  3. Run weekly after accumulating ≥50 physician corrections (auto via scheduler)")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Calibrate SmartLiva Conformal Prediction Engine on validation data"
    )
    parser.add_argument(
        "--val-dir",
        type=Path,
        default=PROJECT_ROOT / "data/prepared",
        help="Root of val set directory (expects lesion/val/ and parasite/val/ subdirs)",
    )
    parser.add_argument(
        "--algorithm",
        choices=["lac", "raps"],
        default="raps",
        help="Conformal algorithm: lac (simple) or raps (adaptive, recommended)",
    )
    parser.add_argument(
        "--alpha",
        type=float,
        default=0.05,
        help="Error rate α (default: 0.05 → 95%% coverage guarantee)",
    )
    parser.add_argument(
        "--raps-lambda",
        type=float,
        default=0.01,
        help="RAPS regularisation weight λ",
    )
    parser.add_argument(
        "--raps-k-reg",
        type=int,
        default=1,
        help="RAPS: classes before regularisation kicks in",
    )
    parser.add_argument(
        "--model-path",
        type=str,
        default=None,
        help="Path to ConvNeXt .pth file (default: auto-detect)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=OUTPUT_DIR,
        help="Where to save conformal_bundle.json and calibration.json",
    )

    args = parser.parse_args()

    logger.info("SmartLiva Conformal Calibration")
    logger.info("Algorithm   : %s", args.algorithm.upper())
    logger.info("Error rate α: %.3f (%.0f%% coverage)", args.alpha, (1 - args.alpha) * 100)
    logger.info("Val dir     : %s", args.val_dir)
    logger.info("Output dir  : %s", args.output_dir)

    run_calibration(
        val_root    = args.val_dir,
        algorithm   = args.algorithm,
        alpha       = args.alpha,
        raps_lambda = args.raps_lambda,
        raps_k_reg  = args.raps_k_reg,
        model_path  = args.model_path,
        output_dir  = args.output_dir,
    )


if __name__ == "__main__":
    main()
