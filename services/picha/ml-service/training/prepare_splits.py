"""
Split labels.csv into train/val/test sets (70/15/15 stratified).
Usage: python -m training.prepare_splits
"""
import pandas as pd
from sklearn.model_selection import train_test_split
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"


def prepare_splits(labels_csv: str = str(DATA_DIR / "labels.csv")) -> None:
    df = pd.read_csv(labels_csv)
    train, temp = train_test_split(df, test_size=0.30, stratify=df["label"], random_state=42)
    val, test = train_test_split(temp, test_size=0.50, stratify=temp["label"], random_state=42)

    train.to_csv(DATA_DIR / "train.csv", index=False)
    val.to_csv(DATA_DIR / "val.csv", index=False)
    test.to_csv(DATA_DIR / "test.csv", index=False)

    print(f"✅ Train: {len(train)} | Val: {len(val)} | Test: {len(test)}")


if __name__ == "__main__":
    prepare_splits()
