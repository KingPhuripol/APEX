"""
Build label CSV from raw slide directory.
Usage: python -m training.build_labels --slides_dir /data/slides --out training/data/labels.csv
"""
import argparse
import csv
import os
from pathlib import Path

TISSUE_CLASS_MAP = {
    "adi": "adipose", "back": "background", "deb": "debris",
    "lym": "lymphocytes", "muc": "mucus", "mus": "smooth_muscle",
    "norm": "normal_colon", "str": "stroma", "tum": "colorectal_cancer",
}


def build_labels(slides_dir: str, out_path: str) -> None:
    rows = []
    for path in sorted(Path(slides_dir).rglob("*.jpg")):
        label_key = path.parent.name[:3].lower()
        label = TISSUE_CLASS_MAP.get(label_key, "unknown")
        rows.append({"path": str(path), "label": label})

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["path", "label"])
        writer.writeheader()
        writer.writerows(rows)
    print(f"✅ Wrote {len(rows)} labels → {out_path}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--slides_dir", required=True)
    ap.add_argument("--out", default="training/data/labels.csv")
    args = ap.parse_args()
    build_labels(args.slides_dir, args.out)
