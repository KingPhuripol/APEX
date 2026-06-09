"""
PICHA — EfficientNet-B4 Training Script
Fixes applied:
  1. Custom H&E normalization  (mean/std measured from dataset, not ImageNet)
  2. RGBA → RGB conversion     (GastricCancer dataset is RGBA)
  3. WeightedRandomSampler     (normal_colon_v2 only 589 samples vs 3,703 max)

Usage:
  cd NEWPICHA-Production/ml-service
  python -m training.train                           # default paths
  python -m training.train --epochs 30 --batch 32   # custom
  python -m training.train --resume model/last.pth  # resume
"""

import argparse
import collections
import os
import time
from pathlib import Path

import torch
import torch.nn as nn
import torchvision.transforms as T
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from torchvision import models
from PIL import Image
import numpy as np

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT      = Path(__file__).resolve().parents[2]
DATA_ROOT = ROOT / "data"
MODEL_DIR = Path(__file__).resolve().parent.parent / "model"
MODEL_DIR.mkdir(exist_ok=True)

# ── Fix 1: H&E custom normalization ───────────────────────────────────────────
# Measured from this dataset — 200-image sample (see data quality report)
HE_MEAN = [0.757, 0.619, 0.713]
HE_STD  = [0.163, 0.202, 0.153]

TRAIN_TRANSFORM = T.Compose([
    T.Resize(400),
    T.RandomCrop(380),
    T.RandomHorizontalFlip(),
    T.RandomVerticalFlip(),
    T.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.10, hue=0.05),
    T.RandomRotation(90),
    T.ToTensor(),
    T.Normalize(mean=HE_MEAN, std=HE_STD),
])

EVAL_TRANSFORM = T.Compose([
    T.Resize(400),
    T.CenterCrop(380),
    T.ToTensor(),
    T.Normalize(mean=HE_MEAN, std=HE_STD),
])

# ── Classes (must match prepare_data.py + inference_api.py) ───────────────────
TISSUE_CLASSES = sorted([
    "adipose", "colorectal_cancer", "debris", "lymphocytes", "mucus",
    "normal_colon", "normal_colon_v2", "smooth_muscle", "stroma",
])
CLASS_TO_IDX = {c: i for i, c in enumerate(TISSUE_CLASSES)}
NUM_CLASSES   = len(TISSUE_CLASSES)


# ── Fix 2: Dataset with RGBA → RGB conversion ─────────────────────────────────
class PathologyDataset(Dataset):
    def __init__(self, split_dir: Path, transform=None):
        self.transform = transform
        self.samples: list[tuple[Path, int]] = []
        for cls_dir in sorted(split_dir.iterdir()):
            if not cls_dir.is_dir():
                continue
            label = CLASS_TO_IDX.get(cls_dir.name)
            if label is None:
                continue
            for img_path in sorted(cls_dir.iterdir()):
                if img_path.suffix.lower() in {".png", ".jpg", ".jpeg", ".tif", ".tiff"}:
                    self.samples.append((img_path, label))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        # Fix 2: .convert("RGB") handles RGBA, L, P modes
        img = Image.open(path).convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, label


# ── Fix 3: WeightedRandomSampler for class imbalance ──────────────────────────
def make_weighted_sampler(dataset: PathologyDataset) -> WeightedRandomSampler:
    class_counts = collections.Counter(label for _, label in dataset.samples)
    # weight per class: inverse frequency
    class_weights = {cls: 1.0 / count for cls, count in class_counts.items()}
    sample_weights = [class_weights[label] for _, label in dataset.samples]
    return WeightedRandomSampler(
        weights=sample_weights,
        num_samples=len(sample_weights),
        replacement=True,
    )


# ── Model builder ──────────────────────────────────────────────────────────────
def build_model(num_classes: int, pretrained: bool = True) -> nn.Module:
    weights = models.EfficientNet_B4_Weights.IMAGENET1K_V1 if pretrained else None
    model = models.efficientnet_b4(weights=weights)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model


# ── Training loop ──────────────────────────────────────────────────────────────
def train_epoch(model, loader, criterion, optimizer, device, scaler):
    model.train()
    total_loss, correct, total = 0.0, 0, 0
    for imgs, labels in loader:
        imgs, labels = imgs.to(device), labels.to(device)
        optimizer.zero_grad()
        with torch.autocast(device_type=device.type if hasattr(device, "type") else "cpu",
                            enabled=(device != torch.device("cpu"))):
            logits = model(imgs)
            loss   = criterion(logits, labels)
        if scaler:
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
        else:
            loss.backward()
            optimizer.step()
        total_loss += loss.item() * imgs.size(0)
        correct    += (logits.argmax(1) == labels).sum().item()
        total      += imgs.size(0)
    return total_loss / total, correct / total


@torch.no_grad()
def eval_epoch(model, loader, criterion, device):
    model.eval()
    total_loss, correct, total = 0.0, 0, 0
    for imgs, labels in loader:
        imgs, labels = imgs.to(device), labels.to(device)
        logits = model(imgs)
        loss   = criterion(logits, labels)
        total_loss += loss.item() * imgs.size(0)
        correct    += (logits.argmax(1) == labels).sum().item()
        total      += imgs.size(0)
    return total_loss / total, correct / total


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="PICHA EfficientNet-B4 Training")
    parser.add_argument("--epochs",    type=int,   default=20)
    parser.add_argument("--batch",     type=int,   default=32)
    parser.add_argument("--lr",        type=float, default=1e-4)
    parser.add_argument("--workers",   type=int,   default=4)
    parser.add_argument("--resume",    type=str,   default=None,
                        help="path to checkpoint .pth to resume from")
    parser.add_argument("--no-pretrain", action="store_true",
                        help="train from scratch (no ImageNet weights)")
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else
                          "mps"  if torch.backends.mps.is_available() else "cpu")
    print(f"\n{'='*60}")
    print(f"PICHA — EfficientNet-B4  |  device: {device}  |  classes: {NUM_CLASSES}")
    print(f"{'='*60}")
    print(f"  Classes: {TISSUE_CLASSES}")
    print(f"  H&E normalization: mean={HE_MEAN}  std={HE_STD}")

    # Datasets
    train_ds = PathologyDataset(DATA_ROOT / "train", TRAIN_TRANSFORM)
    val_ds   = PathologyDataset(DATA_ROOT / "val",   EVAL_TRANSFORM)
    test_ds  = PathologyDataset(DATA_ROOT / "test",  EVAL_TRANSFORM)

    # Fix 3: weighted sampler on train
    sampler = make_weighted_sampler(train_ds)
    train_loader = DataLoader(train_ds, batch_size=args.batch, sampler=sampler,
                              num_workers=args.workers, pin_memory=True)
    val_loader   = DataLoader(val_ds,   batch_size=args.batch, shuffle=False,
                              num_workers=args.workers, pin_memory=True)
    test_loader  = DataLoader(test_ds,  batch_size=args.batch, shuffle=False,
                              num_workers=args.workers, pin_memory=True)

    print(f"\n  Train: {len(train_ds)}  Val: {len(val_ds)}  Test: {len(test_ds)}")

    # Model
    model = build_model(NUM_CLASSES, pretrained=not args.no_pretrain).to(device)
    start_epoch = 0
    if args.resume:
        ckpt = torch.load(args.resume, map_location=device)
        model.load_state_dict(ckpt["model"])
        start_epoch = ckpt.get("epoch", 0)
        print(f"  Resumed from {args.resume} (epoch {start_epoch})")

    # Loss, optimizer, scheduler
    # Fix 3 (alt): class_weight in loss as a secondary safeguard
    class_counts = collections.Counter(label for _, label in train_ds.samples)
    total_samples = sum(class_counts.values())
    weights = torch.tensor(
        [total_samples / (NUM_CLASSES * class_counts[i]) for i in range(NUM_CLASSES)],
        dtype=torch.float32
    ).to(device)
    criterion = nn.CrossEntropyLoss(weight=weights)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=args.epochs, eta_min=args.lr * 0.01
    )
    scaler = torch.cuda.amp.GradScaler() if device.type == "cuda" else None

    # Training
    best_val_acc = 0.0
    best_path    = MODEL_DIR / "efficientnet_b4_picha_best.pth"
    last_path    = MODEL_DIR / "efficientnet_b4_picha_last.pth"

    print(f"\n  Starting training for {args.epochs} epochs …\n")
    for epoch in range(start_epoch, start_epoch + args.epochs):
        t0 = time.time()
        tr_loss, tr_acc = train_epoch(model, train_loader, criterion, optimizer, device, scaler)
        va_loss, va_acc = eval_epoch(model, val_loader,   criterion, device)
        scheduler.step()
        elapsed = time.time() - t0

        improved = "⬆" if va_acc > best_val_acc else "  "
        print(f"  Epoch {epoch+1:>3}/{start_epoch + args.epochs}  "
              f"train_loss={tr_loss:.4f}  train_acc={tr_acc:.4f}  "
              f"val_loss={va_loss:.4f}  val_acc={va_acc:.4f}  "
              f"lr={scheduler.get_last_lr()[0]:.2e}  {elapsed:.0f}s {improved}")

        # Save checkpoints
        ckpt = {"epoch": epoch + 1, "model": model.state_dict(),
                "val_acc": va_acc, "classes": TISSUE_CLASSES,
                "he_mean": HE_MEAN, "he_std": HE_STD}
        torch.save(ckpt, last_path)
        if va_acc > best_val_acc:
            best_val_acc = va_acc
            torch.save(ckpt, best_path)

    # Final test evaluation
    print(f"\n{'='*60}")
    print("  Loading best model for test evaluation …")
    best_ckpt = torch.load(best_path, map_location=device)
    model.load_state_dict(best_ckpt["model"])
    te_loss, te_acc = eval_epoch(model, test_loader, criterion, device)
    print(f"  Test loss: {te_loss:.4f}  Test accuracy: {te_acc:.4f}")

    # Per-class accuracy
    print(f"\n  Per-class accuracy on test set:")
    correct_per_class = collections.Counter()
    total_per_class   = collections.Counter()
    model.eval()
    with torch.no_grad():
        for imgs, labels in test_loader:
            imgs, labels = imgs.to(device), labels.to(device)
            preds = model(imgs).argmax(1)
            for p, t in zip(preds.cpu().tolist(), labels.cpu().tolist()):
                total_per_class[t] += 1
                if p == t:
                    correct_per_class[t] += 1
    for i, cls in enumerate(TISSUE_CLASSES):
        total = total_per_class[i]
        acc   = correct_per_class[i] / total if total else 0
        bar   = "█" * int(acc * 20)
        print(f"  {cls:<22} {acc:.4f}  {bar}  ({correct_per_class[i]}/{total})")

    # Copy best to standard name for inference_api.py
    standard_path = MODEL_DIR / "efficientnet_b4_picha.pth"
    import shutil
    shutil.copy(best_path, standard_path)
    print(f"\n  ✅ Best model saved → {standard_path}")
    print(f"  Best val accuracy : {best_val_acc:.4f}")
    print(f"  Test accuracy     : {te_acc:.4f}")


if __name__ == "__main__":
    main()
