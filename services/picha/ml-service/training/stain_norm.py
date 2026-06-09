"""
CORIN — Macenko Stain Normalization
====================================
Normalizes H&E-stained pathology images to a canonical stain appearance.
This reduces scanner/lab variation and is expected to give +3–5% accuracy
when added to the CORIN training pipeline.

Usage as transform:
    from training.stain_norm import MacenkoTransform
    normalizer = MacenkoTransform(target_path="path/to/reference.png")
    # drop-in replacement for T.ToTensor() step

References:
    Macenko, M. et al. (2009). A method for normalizing histology slides
    for quantitative analysis. ISBI 2009.
    Vahadane, A. et al. (2016). Structure-Preserving Color Normalization.
    IEEE TMI.
"""

from __future__ import annotations

import numpy as np
from PIL import Image

# ── Try torchstain (preferred — pure PyTorch, pip installable) ─────────────────
try:
    import torchstain
    import torch
    import torchvision.transforms as _T

    class MacenkoTransform:
        """
        Macenko stain normalization using torchstain.
        Accepts PIL Image, returns PIL Image (drop-in for T.compose pipelines).

        Args:
            target_path: path to a representative H&E reference image.
                         If None, uses built-in Macenko default vectors.
            luminosity_threshold: OD threshold for background removal.
        """

        def __init__(self, target_path: str | None = None,
                     luminosity_threshold: float = 0.8):
            self._normalizer = torchstain.normalizers.MacenkoNormalizer(
                backend="torch"
            )
            self._to_tensor = _T.ToTensor()
            self._to_pil    = _T.ToPILImage()

            if target_path is not None:
                ref_img    = Image.open(target_path).convert("RGB")
                ref_tensor = self._to_tensor(ref_img) * 255.0
                self._normalizer.fit(ref_tensor)

        def __call__(self, img: Image.Image) -> Image.Image:
            try:
                tensor = self._to_tensor(img) * 255.0          # [3,H,W] uint8 range
                normalized, _, _ = self._normalizer.normalize(
                    tensor, stains=False
                )
                return self._to_pil((normalized / 255.0).clamp(0.0, 1.0))
            except Exception:
                # Graceful fallback: pure-background or near-white tiles can fail
                return img

    BACKEND = "torchstain"

except ImportError:
    # ── Pure NumPy Macenko fallback ─────────────────────────────────────────────
    # Reference implementation following Macenko 2009 algorithm.

    _MACENKO_HE_REF = np.array([[0.5626, 0.2159],
                                 [0.7201, 0.8012],
                                 [0.4062, 0.5581]], dtype=np.float64)
    _MACENKO_MAX_C_REF = np.array([1.9705, 1.0308], dtype=np.float64)

    def _macenko_normalize_numpy(
        img_rgb: np.ndarray,
        he_ref: np.ndarray = _MACENKO_HE_REF,
        max_c_ref: np.ndarray = _MACENKO_MAX_C_REF,
        io: int = 240,
        alpha: float = 1.0,
        beta: float = 0.15,
    ) -> np.ndarray:
        """Normalize a single HxWx3 uint8 numpy image using Macenko's method."""
        img = img_rgb.reshape(-1, 3).astype(np.float64)
        img = np.clip(img, 1, io)

        # Optical density
        od = -np.log(img / io)

        # Remove background (OD < beta in any channel)
        mask = (od >= beta).any(axis=1)
        od_hat = od[mask]

        if od_hat.shape[0] < 10:
            # Almost fully background — return as-is
            return img_rgb

        # SVD
        _, _, V = np.linalg.svd(od_hat, full_matrices=False)
        V = V[:2].T  # top-2 right singular vectors

        # Angular analysis: project onto plane spanned by V
        that = od_hat @ V
        phi  = np.arctan2(that[:, 1], that[:, 0])

        min_phi = np.percentile(phi, alpha)
        max_phi = np.percentile(phi, 100 - alpha)

        v1 = V @ np.array([np.cos(min_phi), np.sin(min_phi)])
        v2 = V @ np.array([np.cos(max_phi), np.sin(max_phi)])

        # Assign H / E by convention: H has higher red OD contribution
        if v1[0] > v2[0]:
            he = np.stack([v1, v2], axis=1)
        else:
            he = np.stack([v2, v1], axis=1)

        # Concentrations via least squares
        c  = np.linalg.lstsq(he, od.T, rcond=None)[0]

        # Normalize concentrations
        max_c = np.percentile(c, 99, axis=1)
        max_c = np.maximum(max_c, 1e-6)
        c     = c * (max_c_ref / max_c)[:, None]

        # Reconstruct
        od_norm = he_ref @ c
        img_norm = io * np.exp(-od_norm.T)
        img_norm = np.clip(img_norm, 0, 255).astype(np.uint8)
        return img_norm.reshape(img_rgb.shape)

    class MacenkoTransform:
        """
        Macenko stain normalization — pure NumPy fallback.
        torchstain not installed; install with: pip install torchstain
        """

        def __init__(self, target_path: str | None = None, **kwargs):
            # target_path is ignored in this fallback (uses fixed Macenko refs)
            pass

        def __call__(self, img: Image.Image) -> Image.Image:
            arr = np.array(img.convert("RGB"))
            try:
                arr_norm = _macenko_normalize_numpy(arr)
                return Image.fromarray(arr_norm)
            except Exception:
                return img

    BACKEND = "numpy_fallback"


def get_stain_transform(target_path: str | None = None) -> MacenkoTransform:
    """
    Factory — returns a MacenkoTransform ready to use in a torchvision pipeline.

    Example:
        import torchvision.transforms as T
        from training.stain_norm import get_stain_transform

        transform = T.Compose([
            get_stain_transform(),          # stain normalize first
            T.Resize(400),
            T.CenterCrop(380),
            T.ToTensor(),
            T.Normalize(mean=HE_MEAN, std=HE_STD),
        ])
    """
    t = MacenkoTransform(target_path=target_path)
    return t


if __name__ == "__main__":
    import sys
    print(f"Stain normalization backend: {BACKEND}")

    if len(sys.argv) == 3:
        src, dst = sys.argv[1], sys.argv[2]
        img = Image.open(src).convert("RGB")
        norm = MacenkoTransform()
        out  = norm(img)
        out.save(dst)
        print(f"Saved normalized image → {dst}")
    else:
        print("Usage: python -m training.stain_norm <input.png> <output.png>")
