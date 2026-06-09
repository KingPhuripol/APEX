"""
PICHA — prepare_data.py

Prepares training data for EfficientNet-B4 (13-class tissue classifier).

Datasets:
  1. GastricCancer-HMU-GC-30K  — 8 tissue classes, 224×224 PNG, 31,096 images
  2. Chaoyang-Colon-4class      — 4 colon grades,  512×512 JPG,  4,021 images

Sample size method:
  Buderer NM. (1996). "Statistical methodology: Incorporating the prevalence
  of disease into the sample size calculation for sensitivity and specificity."
  Academic Emergency Medicine, 3(9), 895–900.
  [as described in Sample Size Calculation Guide Part 4, AJEM 2019;3(3):e33]

  Formula:
    TP+FN  = Z² × Sens(1−Sens) / W²
    TN+FP  = Z² × Spec(1−Spec) / W²
    N_sens = (TP+FN) / P
    N_spec = (TN+FP) / (1−P)
    N_min  = N_sens + N_spec

  Parameters: Z=1.96 (95% CI), W=0.10 (±10% margin), Sens=Spec=0.90

Split: stratified 70 / 15 / 15  (train / val / test)
Output: symlinks in data/train|val|test/<class>/
        CSVs in ml-service/training/data/labels.csv, train.csv, val.csv, test.csv

Usage:
  cd NEWPICHA-Production/ml-service
  python -m training.prepare_data
"""

import csv
import math
import os
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT       = Path(__file__).resolve().parents[3]
DATA_ROOT  = ROOT / "data"
TRAIN_DIR  = DATA_ROOT / "train"
VAL_DIR    = DATA_ROOT / "val"
TEST_DIR   = DATA_ROOT / "test"
CSV_DIR    = Path(__file__).parent / "data"

# ── Label maps ─────────────────────────────────────────────────────────────────
# GastricCancer-HMU-GC-30K folder → TISSUE_CLASS (matches inference_api.py)
GASTRIC_MAP: dict[str, str] = {
    "ADI":  "adipose",
    "DEB":  "debris",
    "LYM":  "lymphocytes",
    "MUC":  "mucus",
    "MUS":  "smooth_muscle",
    "NOR":  "normal_colon",
    "STR":  "stroma",
    "TUM":  "colorectal_cancer",
}

# Chaoyang-Colon-4class folder → TISSUE_CLASS
# label-0 = Normal colon mucosa
# label-1 = Serrated polyp  (morphological variant of normal → normal_colon_v2)
# label-2 = Adenocarcinoma  (malignant   → colorectal_cancer)
# label-3 = Adenoma          (pre-cancer, stroma-rich → stroma as closest proxy)
CHAOYANG_MAP: dict[str, str] = {
    "label-0": "normal_colon",
    "label-1": "normal_colon_v2",
    "label-2": "colorectal_cancer",
    "label-3": "stroma",
}

# ── Buderer (1996) minimum test-set size ───────────────────────────────────────
def buderer_min_test(
    sensitivity: float = 0.90,
    specificity: float = 0.90,
    prevalence: float = 0.125,
    z: float = 1.96,
    w: float = 0.10,
) -> dict:
    """
    Reference: Buderer 1996; AJEM 2019 Sample Size Guide Part 4.
    Returns minimum total samples required for the test set.
    """
    tp_fn = z**2 * sensitivity * (1 - sensitivity) / w**2
    tn_fp = z**2 * specificity * (1 - specificity) / w**2
    n_sens = math.ceil(tp_fn / prevalence)
    n_spec = math.ceil(tn_fp / (1 - prevalence))
    return {
        "tp_fn": round(tp_fn, 2),
        "tn_fp": round(tn_fp, 2),
        "n_sensitivity": n_sens,
        "n_specificity": n_spec,
        "n_min_total":   n_sens + n_spec,
    }


# ── Dataset collectors ─────────────────────────────────────────────────────────
def collect_gastric(base: Path) -> list[dict]:
    img_root = base / "raw" / "GastricCancer-HMU-GC-30K" / "HMU-GC-HE-30K" / "all_image"
    rows = []
    for folder, label in GASTRIC_MAP.items():
        for p in sorted((img_root / folder).glob("*")):
            if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".tif", ".tiff"}:
                rows.append({"path": str(p), "label": label, "source": "gastric"})
    return rows


def collect_chaoyang(base: Path) -> list[dict]:
    img_root = base / "raw" / "Chaoyang-Colon-4class" / "archive" / "chaoyang"
    rows = []
    for split in ("train", "valid"):
        for folder, label in CHAOYANG_MAP.items():
            folder_path = img_root / split / folder
            if not folder_path.exists():
                continue
            for p in sorted(folder_path.glob("*")):
                if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".tif", ".tiff"}:
                    rows.append({"path": str(p), "label": label, "source": "chaoyang"})
    return rows


# ── Symlink helper ─────────────────────────────────────────────────────────────
def make_symlinks(df: pd.DataFrame, target_dir: Path) -> None:
    for _, row in df.iterrows():
        src  = Path(row["path"])
        dest = target_dir / row["label"] / src.name
        dest.parent.mkdir(parents=True, exist_ok=True)
        if dest.exists() or dest.is_symlink():
            dest.unlink()
        os.symlink(src, dest)


# ── Main ───────────────────────────────────────────────────────────────────────
def main() -> None:
    print("=" * 60)
    print("PICHA — Data Preparation (Buderer 70/15/15 stratified split)")
    print("=" * 60)

    # 1. Collect all images
    rows  = collect_gastric(DATA_ROOT)
    rows += collect_chaoyang(DATA_ROOT)
    df = pd.DataFrame(rows)
    print(f"\n[1] Total images collected: {len(df)}")
    print(df["label"].value_counts().to_string())

    # 2. Buderer minimum test-set calculation
    print("\n[2] Buderer (1996) minimum test-set sizes")
    print(f"    Z=1.96, W=0.10, Sens=Spec=0.90")
    cancer_labels = {"colorectal_cancer"}
    p_cancer = (df["label"].isin(cancer_labels)).mean()
    result = buderer_min_test(prevalence=p_cancer)
    print(f"    Cancer prevalence P = {p_cancer:.3f}")
    print(f"    TP+FN              = {result['tp_fn']}")
    print(f"    TN+FP              = {result['tn_fp']}")
    print(f"    N_min (sensitivity)= {result['n_sensitivity']}")
    print(f"    N_min (specificity)= {result['n_specificity']}")
    print(f"    N_min TOTAL test   = {result['n_min_total']}")

    # 3. Stratified 70/15/15 split
    train_df, temp_df = train_test_split(
        df, test_size=0.30, stratify=df["label"], random_state=42
    )
    val_df, test_df = train_test_split(
        temp_df, test_size=0.50, stratify=temp_df["label"], random_state=42
    )

    actual_test = len(test_df)
    print(f"\n[3] Stratified 70/15/15 split")
    print(f"    Train : {len(train_df):>6} images")
    print(f"    Val   : {len(val_df):>6} images")
    print(f"    Test  : {actual_test:>6} images  (min required: {result['n_min_total']})")
    assert actual_test >= result["n_min_total"], (
        f"Test set ({actual_test}) is below Buderer minimum ({result['n_min_total']}). "
        "Add more data."
    )
    print(f"    ✅ Test set exceeds Buderer minimum ({actual_test} >= {result['n_min_total']})")

    # 4. Save CSVs
    CSV_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(CSV_DIR / "labels.csv", index=False)
    train_df.to_csv(CSV_DIR / "train.csv", index=False)
    val_df.to_csv(CSV_DIR / "val.csv",   index=False)
    test_df.to_csv(CSV_DIR / "test.csv",  index=False)
    print(f"\n[4] CSVs saved → {CSV_DIR}/")

    # 5. Build class breakdowns per split
    print("\n[5] Per-class distribution")
    print(f"{'Class':<22} {'Train':>7} {'Val':>7} {'Test':>7} {'Total':>7}")
    print("-" * 50)
    for cls in sorted(df["label"].unique()):
        tr = (train_df["label"] == cls).sum()
        va = (val_df["label"]   == cls).sum()
        te = (test_df["label"]  == cls).sum()
        tot = tr + va + te
        print(f"  {cls:<20} {tr:>7} {va:>7} {te:>7} {tot:>7}")

    # 6. Create symlinks
    print("\n[6] Creating symlinks in data/train | val | test …")
    make_symlinks(train_df, TRAIN_DIR)
    make_symlinks(val_df,   VAL_DIR)
    make_symlinks(test_df,  TEST_DIR)

    # 7. Verify
    for split, d in [("train", TRAIN_DIR), ("val", VAL_DIR), ("test", TEST_DIR)]:
        total = sum(1 for p in d.rglob("*") if p.is_symlink())
        print(f"    {split:5s}: {total} symlinks")

    print("\n✅ Done — data/train | val | test ready for EfficientNet-B4 training.")


if __name__ == "__main__":
    main()
