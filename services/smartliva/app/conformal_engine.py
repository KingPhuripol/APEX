"""
SmartLiva — Conformal Prediction Engine
========================================
Provides **statistically guaranteed** prediction sets for multi-class classification.

Theory
------
Classical neural network softmax probabilities are NOT calibrated — a model
saying "87% confident" does not mean it's correct 87% of the time.

Conformal Prediction (Venn–Abers / RAPS) provides a different guarantee:

    P(true_label ∈ prediction_set) ≥ 1 - α

where α is a user-specified error rate (default: 0.05 → 95% coverage).

This guarantee is:
  • Distribution-free  (no assumptions about the data distribution)
  • Finite-sample valid (holds for any N, not just asymptotically)
  • Marginal           (holds on average over the calibration + test data)

Algorithms implemented
----------------------
LAC  (Least Ambiguous Classifier)
  — Uses 1 - p̂(y) as nonconformity score
  — Simplest and well-calibrated for balanced classes
  — Reference: Sadinle et al. 2019

RAPS (Regularized Adaptive Prediction Sets)
  — Penalises large prediction sets via rank-based regularisation
  — Produces smaller, more informative sets especially for top-1 cases
  — Reference: Angelopoulos et al. 2021 (NeurIPS)

Usage
-----
    engine = ConformalEngine.from_logits(val_logits, val_labels, alpha=0.05)
    # or load from disk:
    engine = ConformalEngine.load("models/production_v1/conformal.json")

    decision = engine.predict(softmax_probs)
    # → ConformalDecision(prediction_set=["F1","F2"], confident=False, ...)

    # When confident=True → set size == 1, safe to return immediately
    # When confident=False → escalate to GPT-4o for disambiguation
"""

from __future__ import annotations

import json
import logging
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Default coverage level (95%)
# ---------------------------------------------------------------------------
DEFAULT_ALPHA = 0.05


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class ConformalDecision:
    """
    Result of conformal prediction for a single sample.

    Attributes
    ----------
    prediction_set   : list of label names inside the guaranteed set
    set_indices      : list of integer indices (for further processing)
    confident        : True if |prediction_set| == 1 (no escalation needed)
    coverage_target  : 1 - alpha (e.g. 0.95)
    qhat             : calibrated quantile threshold used
    top1_label       : highest-probability label
    top1_prob        : its calibrated probability
    set_size         : len(prediction_set)
    ambiguity_info   : human-readable string for GPT-4o context injection
    """
    prediction_set:  List[str]
    set_indices:     List[int]
    confident:       bool
    coverage_target: float
    qhat:            float
    top1_label:      str
    top1_prob:       float
    set_size:        int
    ambiguity_info:  str = ""


@dataclass
class CalibrationData:
    """Serialisable calibration state."""
    algorithm:    str
    alpha:        float
    qhat:         float      # calibrated threshold
    n_calibration: int       # number of calibration samples used
    class_names:  List[str]
    # RAPS-specific
    raps_lambda:  float = 1.0
    raps_k_reg:   int   = 1
    # Stats
    empirical_coverage: float = 0.0
    mean_set_size:      float = 0.0


# ---------------------------------------------------------------------------
# Core Conformal Engine
# ---------------------------------------------------------------------------

class ConformalEngine:
    """
    Conformal prediction engine for SmartLiva multi-task classification.

    One engine instance per classification task
    (fibrosis, lesion, parasite — each calibrated separately).
    """

    def __init__(
        self,
        calibration: CalibrationData,
    ):
        self._cal   = calibration
        self._alpha = calibration.alpha

    # ------------------------------------------------------------------
    # Factory methods
    # ------------------------------------------------------------------

    @classmethod
    def calibrate_lac(
        cls,
        val_probs:   np.ndarray,   # (N, C) calibrated softmax probabilities
        val_labels:  np.ndarray,   # (N,) integer ground-truth labels
        class_names: List[str],
        alpha: float = DEFAULT_ALPHA,
    ) -> "ConformalEngine":
        """
        Calibrate using LAC nonconformity score = 1 - p̂(y_true).

        q̂ = (N+1)/N · (1-α) quantile of {s_1, …, s_N}
        where s_i = 1 - p̂_i(y_i)

        Fast, simple, works well for balanced tasks.
        """
        N = len(val_labels)
        if N < 50:
            logger.warning(
                "[Conformal-LAC] Only %d calibration samples — "
                "recommend ≥ 200 for reliable coverage", N
            )

        # Nonconformity scores
        scores = 1.0 - val_probs[np.arange(N), val_labels]  # (N,)

        # Adjusted quantile — Venn-Abers correction
        level = math.ceil((N + 1) * (1.0 - alpha)) / N
        level = min(level, 1.0)
        qhat  = float(np.quantile(scores, level))

        # Evaluate coverage on calibration set
        included    = (1.0 - val_probs) <= qhat
        set_sizes   = included.sum(axis=1)
        coverage    = float(included[np.arange(N), val_labels].mean())
        mean_size   = float(set_sizes.mean())

        logger.info(
            "[Conformal-LAC] Calibrated: q̂=%.4f | empirical_coverage=%.3f "
            "(target=%.3f) | mean_set_size=%.2f | N=%d",
            qhat, coverage, 1 - alpha, mean_size, N,
        )

        cal = CalibrationData(
            algorithm          = "LAC",
            alpha              = alpha,
            qhat               = qhat,
            n_calibration      = N,
            class_names        = list(class_names),
            empirical_coverage = coverage,
            mean_set_size      = mean_size,
        )
        return cls(cal)

    @classmethod
    def calibrate_raps(
        cls,
        val_probs:   np.ndarray,
        val_labels:  np.ndarray,
        class_names: List[str],
        alpha:    float = DEFAULT_ALPHA,
        lam:      float = 0.01,    # regularisation weight
        k_reg:    int   = 1,       # classes before regularisation kicks in
    ) -> "ConformalEngine":
        """
        Calibrate using RAPS (Regularized Adaptive Prediction Sets).

        Nonconformity score:
          s_i = Σ p̂_{(j)} + λ·max(0, o(y_i) - k_reg)
          where p̂_{(j)} are sorted descending, o(y_i) is rank of true class.

        Produces smaller, more informative sets than LAC.
        """
        N, C = val_probs.shape
        if N < 50:
            logger.warning("[Conformal-RAPS] Only %d calibration samples", N)

        # Sort classes by descending probability for each sample
        sorted_idx  = np.argsort(-val_probs, axis=1)             # (N, C)
        sorted_prob = np.take_along_axis(val_probs, sorted_idx, axis=1)  # (N, C)

        # Cumulative sums
        cum_prob = np.cumsum(sorted_prob, axis=1)  # (N, C)

        # Rank of the true label (0-indexed)
        ranks = np.array([
            int(np.where(sorted_idx[i] == val_labels[i])[0][0])
            for i in range(N)
        ])

        # Regularised nonconformity score
        # Cumulative prob up to and including true class
        true_cum = cum_prob[np.arange(N), ranks]
        penalty  = lam * np.maximum(0, ranks - k_reg + 1).astype(float)
        scores   = true_cum + penalty

        # Adjusted quantile
        level = math.ceil((N + 1) * (1.0 - alpha)) / N
        level = min(level, 1.0)
        qhat  = float(np.quantile(scores, level))

        # Evaluate
        # Build prediction sets: include classes until cum + penalty ≤ qhat
        coverage_count, total_size = 0, 0
        for i in range(N):
            s_idx   = sorted_idx[i]
            c_cum   = cum_prob[i]
            in_set  = []
            for rank_j in range(C):
                pen_j = lam * max(0, rank_j - k_reg + 1)
                if c_cum[rank_j] - sorted_prob[i, rank_j] + pen_j <= qhat:
                    in_set.append(int(s_idx[rank_j]))
                else:
                    in_set.append(int(s_idx[rank_j]))   # always include this one
                    break
            if val_labels[i] in in_set:
                coverage_count += 1
            total_size += len(in_set)

        coverage  = coverage_count / N
        mean_size = total_size / N

        logger.info(
            "[Conformal-RAPS] Calibrated: q̂=%.4f | empirical_coverage=%.3f "
            "(target=%.3f) | mean_set_size=%.2f | λ=%.3f k_reg=%d | N=%d",
            qhat, coverage, 1 - alpha, mean_size, lam, k_reg, N,
        )

        cal = CalibrationData(
            algorithm          = "RAPS",
            alpha              = alpha,
            qhat               = qhat,
            n_calibration      = N,
            class_names        = list(class_names),
            raps_lambda        = lam,
            raps_k_reg         = k_reg,
            empirical_coverage = coverage,
            mean_set_size      = mean_size,
        )
        return cls(cal)

    # ------------------------------------------------------------------
    # Prediction
    # ------------------------------------------------------------------

    def predict(self, probs: np.ndarray) -> ConformalDecision:
        """
        Produce a conformal prediction set for a single sample.

        Parameters
        ----------
        probs : np.ndarray of shape (C,) — calibrated softmax probabilities

        Returns
        -------
        ConformalDecision with statistical coverage guarantee
        """
        C           = len(probs)
        class_names = self._cal.class_names
        qhat        = self._cal.qhat

        if self._cal.algorithm == "RAPS":
            set_indices = self._raps_predict_set(probs, qhat)
        else:
            # LAC: include all classes where 1-p ≤ qhat
            set_indices = [j for j in range(C) if (1.0 - probs[j]) <= qhat]
            if not set_indices:
                # Guarantee: always include at least the top-1 class
                set_indices = [int(np.argmax(probs))]

        top1_idx    = int(np.argmax(probs))
        top1_label  = class_names[top1_idx] if top1_idx < len(class_names) else str(top1_idx)
        top1_prob   = float(probs[top1_idx])

        pred_labels = [
            class_names[j] if j < len(class_names) else str(j)
            for j in set_indices
        ]
        confident   = len(set_indices) == 1
        set_size    = len(set_indices)

        # Build context string for GPT-4o injection
        if confident:
            ambiguity_info = (
                f"Local model is confident: {top1_label} "
                f"(p={top1_prob:.2f}, set={pred_labels})"
            )
        else:
            ambiguity_info = (
                f"Local model is AMBIGUOUS — conformal set: {pred_labels} "
                f"(coverage target={1-self._alpha:.0%}, top-1={top1_label} p={top1_prob:.2f}). "
                f"Please resolve ambiguity using visual features."
            )

        return ConformalDecision(
            prediction_set  = pred_labels,
            set_indices     = set_indices,
            confident       = confident,
            coverage_target = 1.0 - self._alpha,
            qhat            = qhat,
            top1_label      = top1_label,
            top1_prob       = top1_prob,
            set_size        = set_size,
            ambiguity_info  = ambiguity_info,
        )

    def _raps_predict_set(self, probs: np.ndarray, qhat: float) -> List[int]:
        """Build prediction set using RAPS threshold."""
        lam   = self._cal.raps_lambda
        k_reg = self._cal.raps_k_reg

        sorted_idx  = np.argsort(-probs)
        sorted_prob = probs[sorted_idx]
        cum_prob    = np.cumsum(sorted_prob)

        in_set = []
        for rank_j, idx in enumerate(sorted_idx):
            penalty = lam * max(0, rank_j - k_reg + 1)
            in_set.append(int(idx))
            threshold_score = cum_prob[rank_j] + penalty
            if threshold_score > qhat:
                break

        return in_set if in_set else [int(sorted_idx[0])]

    # ------------------------------------------------------------------
    # Serialisation
    # ------------------------------------------------------------------

    def save(self, path: str | Path) -> None:
        """Persist calibration data to JSON."""
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            json.dump(self._cal.__dict__, f, indent=2)
        logger.info("[ConformalEngine] Saved calibration → %s", path)

    @classmethod
    def load(cls, path: str | Path) -> "ConformalEngine":
        """Load calibration from JSON file."""
        with open(path) as f:
            data = json.load(f)
        cal = CalibrationData(**data)
        logger.info(
            "[ConformalEngine] Loaded — algorithm=%s q̂=%.4f coverage=%.3f",
            cal.algorithm, cal.qhat, cal.empirical_coverage,
        )
        return cls(cal)

    @property
    def calibration(self) -> CalibrationData:
        return self._cal

    @property
    def is_calibrated(self) -> bool:
        return self._cal.n_calibration > 0

    def summary(self) -> str:
        c = self._cal
        return (
            f"ConformalEngine(algorithm={c.algorithm}, "
            f"α={c.alpha}, q̂={c.qhat:.4f}, "
            f"N_cal={c.n_calibration}, "
            f"coverage={c.empirical_coverage:.3f}, "
            f"mean_set={c.mean_set_size:.2f})"
        )


# ---------------------------------------------------------------------------
# Multi-task conformal bundle
# ---------------------------------------------------------------------------

class MultiTaskConformalBundle:
    """
    Manages three separate ConformalEngine instances (one per task).

    Loaded from / saved to a single JSON file with nested structure.
    """

    def __init__(
        self,
        fibrosis:  Optional[ConformalEngine] = None,
        lesion:    Optional[ConformalEngine] = None,
        parasite:  Optional[ConformalEngine] = None,
    ):
        self.fibrosis  = fibrosis
        self.lesion    = lesion
        self.parasite  = parasite

    def predict_all(
        self,
        fib_probs: np.ndarray,
        les_probs: np.ndarray,
        par_probs: np.ndarray,
    ) -> dict:
        """
        Run conformal prediction for all three tasks.
        Returns dict with keys: fibrosis, lesion, parasite.
        """
        return {
            "fibrosis": self.fibrosis.predict(fib_probs)  if self.fibrosis  else None,
            "lesion":   self.lesion.predict(les_probs)    if self.lesion    else None,
            "parasite": self.parasite.predict(par_probs)  if self.parasite  else None,
        }

    def all_confident(self, decisions: dict) -> bool:
        """
        Returns True only if ALL task decisions are single-class (confident).
        A None decision (uncalibrated task) is treated as confident
        to avoid blocking on unimportant tasks.
        """
        for key in ("fibrosis", "lesion", "parasite"):
            d = decisions.get(key)
            if d is not None and not d.confident:
                return False
        return True

    def save(self, path: str | Path) -> None:
        """Save all three engines to a single JSON file."""
        bundle = {}
        for name, engine in [
            ("fibrosis",  self.fibrosis),
            ("lesion",    self.lesion),
            ("parasite",  self.parasite),
        ]:
            if engine is not None:
                bundle[name] = engine.calibration.__dict__

        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            json.dump(bundle, f, indent=2)
        logger.info("[MultiTaskConformal] Saved bundle → %s", path)

    @classmethod
    def load(cls, path: str | Path) -> "MultiTaskConformalBundle":
        """Load conformal bundle from JSON file.

        Handles two formats:
          1. Standard format  — keys match CalibrationData fields directly.
          2. SA-CRC format    — produced by c3net_colab.ipynb (C³Net training).
             Key differences: n_cal / classes / emp_coverage / avg_set_size /
             epsilon instead of n_calibration / class_names / empirical_coverage /
             mean_set_size / alpha.  Prediction rule is identical to LAC so
             we remap and use algorithm="LAC".
        """
        try:
            with open(path) as f:
                data = json.load(f)

            engines = {}
            for name in ("fibrosis", "lesion", "parasite"):
                if name in data:
                    task_data = data[name]
                    # Detect SA-CRC bundle format by presence of 'n_cal'
                    if "n_cal" in task_data:
                        cal_kwargs: dict = {
                            "algorithm":          "LAC",
                            "alpha":              task_data.get("epsilon", 0.05),
                            "qhat":               task_data["qhat"],
                            "n_calibration":      task_data["n_cal"],
                            "class_names":        task_data["classes"],
                            "empirical_coverage": task_data.get("emp_coverage", 0.0),
                            "mean_set_size":      task_data.get("avg_set_size",  0.0),
                        }
                    else:
                        cal_kwargs = task_data
                    cal = CalibrationData(**cal_kwargs)
                    engines[name] = ConformalEngine(cal)
                    logger.info(
                        "[MultiTaskConformal] Loaded %s engine — q̂=%.4f coverage=%.3f",
                        name, cal.qhat, cal.empirical_coverage,
                    )
                else:
                    engines[name] = None

            return cls(**engines)
        except Exception as exc:
            logger.warning("[MultiTaskConformal] Could not load bundle: %s — running uncalibrated", exc)
            return cls()

    @property
    def is_ready(self) -> bool:
        """True if at least the fibrosis engine is calibrated."""
        return self.fibrosis is not None and self.fibrosis.is_calibrated


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

_DEFAULT_BUNDLE_PATH = (
    Path(__file__).resolve().parent.parent / "models/c3net_v1/conformal_bundle.json"
)

_conformal_bundle: Optional[MultiTaskConformalBundle] = None


def get_conformal_bundle(path: Optional[str] = None) -> MultiTaskConformalBundle:
    """Lazily load and return the module-level conformal bundle singleton."""
    global _conformal_bundle
    if _conformal_bundle is None:
        load_path = Path(path) if path else _DEFAULT_BUNDLE_PATH
        _conformal_bundle = MultiTaskConformalBundle.load(load_path)
    return _conformal_bundle


def reset_conformal_bundle() -> None:
    """Force reload of the conformal bundle on next access (after re-calibration)."""
    global _conformal_bundle
    _conformal_bundle = None
    logger.info("[ConformalEngine] Bundle reset — will reload on next access")
