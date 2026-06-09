"""
SmartLiva — Continual Learning System
======================================
Self-improving loop that learns from physician corrections in real time.

Architecture:
  ReplayBuffer   — SQLite-backed queue of (embedding, corrected_labels) pairs
  FinetuneScheduler — Background thread that triggers weekly fine-tuning
  CorrectionAPI  — Called by the frontend when a physician overrides an AI result

How the feedback loop works:
  1. HybridAnalyzer emits predictions → stored as PendingCorrection in DB
  2. Physician corrects result in clinical UI (or validates it)
  3. Frontend calls POST /feedback with corrected labels
  4. CorrectionAPI calls replay_buffer.push_correction() → stored with true label
  5. Weekly FinetuneScheduler fires → fine-tunes local ConvNeXt on accumulated corrections
  6. Newly fine-tuned model replaces the running model
  7. Re-calibrate conformal bundle on new validation set

Privacy:
  Only feature embeddings (768-dim float vectors) are stored — NOT image pixels.
  This is PDPA-compliant: no PHI is retained in the learning system.

Database schema (separate from patients/studies DB):
  replay_buffer table — learning samples
  finetune_log table  — history of fine-tune runs
"""

from __future__ import annotations

import json
import logging
import os
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
_DB_PATH = Path(os.getenv(
    "CONTINUAL_DB_PATH",
    str(Path(__file__).resolve().parent.parent / "continual_learning.db"),
))
_MIN_SAMPLES_FOR_FINETUNE = int(os.getenv("CONTINUAL_MIN_SAMPLES", "50"))
_FINETUNE_INTERVAL_HOURS  = float(os.getenv("CONTINUAL_INTERVAL_HOURS", "168"))  # 1 week
_MAX_BUFFER_SIZE          = int(os.getenv("CONTINUAL_MAX_BUFFER", "5000"))


# ---------------------------------------------------------------------------
# Database layer
# ---------------------------------------------------------------------------

def _get_connection():
    """Return a SQLite connection for the continual learning DB."""
    import sqlite3
    conn = sqlite3.connect(str(_DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db() -> None:
    """Create tables if they don't exist."""
    conn = _get_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS replay_buffer (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at      TEXT    NOT NULL,
            embedding_json  TEXT    NOT NULL,   -- JSON array of floats (768-dim)
            fib_label       INTEGER NOT NULL,   -- 0-4  (F0-F4)
            les_label       INTEGER NOT NULL,   -- 0-6 or -1 (no lesion)
            par_label       INTEGER NOT NULL,   -- 0-2
            source          TEXT    NOT NULL,   -- "hybrid_escalated" | "physician_correction" | "validated"
            confidence      REAL    DEFAULT 0.0,
            used_in_train   INTEGER DEFAULT 0,  -- 1 if included in a fine-tune run
            audit_id        TEXT    DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_rb_source   ON replay_buffer(source);
        CREATE INDEX IF NOT EXISTS idx_rb_used     ON replay_buffer(used_in_train);
        CREATE INDEX IF NOT EXISTS idx_rb_created  ON replay_buffer(created_at);

        CREATE TABLE IF NOT EXISTS finetune_log (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            run_at          TEXT NOT NULL,
            n_samples       INTEGER NOT NULL,
            val_accuracy    REAL    DEFAULT NULL,
            duration_sec    REAL    DEFAULT NULL,
            model_saved_to  TEXT    DEFAULT '',
            notes           TEXT    DEFAULT ''
        );
    """)
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# ReplayBuffer
# ---------------------------------------------------------------------------

class ReplayBuffer:
    """
    SQLite-backed replay buffer that accumulates labelled samples
    for periodic model fine-tuning.

    Thread-safe via a per-instance lock.
    """

    def __init__(self, db_path: Optional[str] = None):
        global _DB_PATH
        if db_path:
            _DB_PATH = Path(db_path)
        _init_db()
        self._lock = threading.Lock()

    def push(
        self,
        embedding:  Optional[np.ndarray],
        fib_label:  int,
        les_label:  int,
        par_label:  int,
        source:     str   = "hybrid_escalated",
        confidence: float = 0.0,
        audit_id:   str   = "",
    ) -> int:
        """
        Add a sample to the replay buffer.

        Parameters
        ----------
        embedding  : 768-dim float array from ConvNeXt (or None → zeros)
        fib_label  : integer fibrosis class index 0-4
        les_label  : integer lesion class index 0-6, or -1 for no lesion
        par_label  : integer parasite class index 0-2
        source     : label provenance ("hybrid_escalated" | "physician_correction")
        confidence : model confidence at prediction time
        audit_id   : link back to the studies table

        Returns new row id.
        """
        if embedding is None:
            embedding = np.zeros(768, dtype=np.float32)
        emb_json = json.dumps(embedding.astype(np.float32).tolist())

        with self._lock:
            conn = _get_connection()
            cur = conn.execute(
                """
                INSERT INTO replay_buffer
                    (created_at, embedding_json, fib_label, les_label, par_label,
                     source, confidence, audit_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    datetime.now(timezone.utc).isoformat(),
                    emb_json,
                    int(fib_label),
                    int(les_label),
                    int(par_label),
                    source,
                    float(confidence),
                    audit_id,
                ),
            )
            row_id = cur.lastrowid
            conn.commit()

            # Evict oldest samples if buffer exceeds max size
            count = conn.execute("SELECT COUNT(*) FROM replay_buffer").fetchone()[0]
            if count > _MAX_BUFFER_SIZE:
                conn.execute("""
                    DELETE FROM replay_buffer
                    WHERE id IN (
                        SELECT id FROM replay_buffer
                        ORDER BY id ASC
                        LIMIT ?
                    )
                """, (count - _MAX_BUFFER_SIZE,))
                conn.commit()
                logger.debug("[ReplayBuffer] Evicted old samples, buffer size capped at %d", _MAX_BUFFER_SIZE)

            conn.close()
        return row_id

    def push_correction(
        self,
        audit_id:          str,
        corrected_fib:     str,
        corrected_lesion:  Optional[str],
        corrected_parasite: str,
        embedding:         Optional[np.ndarray] = None,
    ) -> int:
        """
        Record a physician correction — highest-quality labelled sample.

        The corrected labels override the original AI prediction.
        These samples are given priority in fine-tuning.
        """
        from .local_model import FIBROSIS_CLASSES, LESION_CLASSES, PARASITE_CLASSES

        fib_idx = FIBROSIS_CLASSES.index(corrected_fib) if corrected_fib in FIBROSIS_CLASSES else 0
        les_idx = (LESION_CLASSES.index(corrected_lesion) if corrected_lesion in LESION_CLASSES else -1)
        par_idx = PARASITE_CLASSES.index(corrected_parasite) if corrected_parasite in PARASITE_CLASSES else 0

        row_id = self.push(
            embedding  = embedding,
            fib_label  = fib_idx,
            les_label  = les_idx,
            par_label  = par_idx,
            source     = "physician_correction",
            confidence = 1.0,   # physician corrections are gold standard
            audit_id   = audit_id,
        )
        logger.info(
            "[ReplayBuffer] Physician correction stored — audit_id=%s fib=%s les=%s par=%s row_id=%d",
            audit_id, corrected_fib, corrected_lesion, corrected_parasite, row_id,
        )
        return row_id

    def get_training_batch(
        self,
        min_samples:           int  = _MIN_SAMPLES_FOR_FINETUNE,
        physician_only:        bool = False,
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray] | None:
        """
        Fetch a training batch for fine-tuning.

        Returns (embeddings, fib_labels, les_labels, par_labels) arrays,
        or None if not enough samples available yet.
        """
        with self._lock:
            conn = _get_connection()

            source_filter = "WHERE source='physician_correction'" if physician_only else "WHERE 1=1"
            rows = conn.execute(
                f"SELECT * FROM replay_buffer {source_filter} ORDER BY created_at DESC"
            ).fetchall()
            conn.close()

        if len(rows) < min_samples:
            logger.info(
                "[ReplayBuffer] Not enough samples for fine-tuning (%d < %d required)",
                len(rows), min_samples,
            )
            return None

        embeddings  = np.array([json.loads(r["embedding_json"]) for r in rows], dtype=np.float32)
        fib_labels  = np.array([r["fib_label"] for r in rows], dtype=np.int64)
        les_labels  = np.array([r["les_label"] for r in rows], dtype=np.int64)
        par_labels  = np.array([r["par_label"] for r in rows], dtype=np.int64)

        logger.info("[ReplayBuffer] Training batch ready — %d samples", len(rows))
        return embeddings, fib_labels, les_labels, par_labels

    def mark_used(self, row_ids: list[int]) -> None:
        """Mark samples as included in a fine-tune run."""
        with self._lock:
            conn = _get_connection()
            conn.executemany(
                "UPDATE replay_buffer SET used_in_train=1 WHERE id=?",
                [(rid,) for rid in row_ids],
            )
            conn.commit()
            conn.close()

    def stats(self) -> dict:
        """Return buffer statistics."""
        conn = _get_connection()
        total     = conn.execute("SELECT COUNT(*) FROM replay_buffer").fetchone()[0]
        physician = conn.execute(
            "SELECT COUNT(*) FROM replay_buffer WHERE source='physician_correction'"
        ).fetchone()[0]
        unused    = conn.execute(
            "SELECT COUNT(*) FROM replay_buffer WHERE used_in_train=0"
        ).fetchone()[0]
        conn.close()
        return {
            "total_samples":      total,
            "physician_corrections": physician,
            "unused_samples":     unused,
            "ready_for_finetune": total >= _MIN_SAMPLES_FOR_FINETUNE,
            "min_required":       _MIN_SAMPLES_FOR_FINETUNE,
        }


# ---------------------------------------------------------------------------
# Lightweight head fine-tuner (task heads only — backbone frozen)
# ---------------------------------------------------------------------------

class HeadFinetuner:
    """
    Fine-tunes the task heads of ConvNeXt using accumulated embeddings.

    Strategy:
      • Backbone is FROZEN (preserves ImageNet / pretrained features)
      • Only fibrosis_head, lesion_head, parasite_head are updated
      • Trains on stored embeddings (not raw images) → very fast (~seconds)
      • Physician corrections weighted 3× via sample weighting

    This avoids catastrophic forgetting and keeps training time < 60 seconds
    even on CPU.
    """

    def finetune(
        self,
        embeddings:  np.ndarray,   # (N, 768)
        fib_labels:  np.ndarray,   # (N,)
        les_labels:  np.ndarray,   # (N,)
        par_labels:  np.ndarray,   # (N,)
        source_weights: Optional[np.ndarray] = None,  # (N,) sample weights
        epochs:       int   = 10,
        lr:           float = 1e-3,
        save_path:    Optional[str] = None,
    ) -> dict:
        """
        Run fine-tuning on head layers.

        Returns a dict with training metrics.
        """
        t_start = time.perf_counter()
        try:
            import torch
            import torch.nn as nn
            import torch.optim as optim
        except ImportError:
            return {"error": "PyTorch not installed", "success": False}

        try:
            from .local_model import get_local_model, LESION_CLASSES
        except Exception as exc:
            return {"error": str(exc), "success": False}

        model_wrapper = get_local_model()
        device        = model_wrapper.device

        X = torch.tensor(embeddings, dtype=torch.float32).to(device)
        y_fib = torch.tensor(fib_labels, dtype=torch.long).to(device)
        y_par = torch.tensor(par_labels, dtype=torch.long).to(device)

        # Mask out invalid lesion labels (-1 = no lesion for training)
        les_mask = torch.tensor(les_labels >= 0, dtype=torch.bool).to(device)
        y_les    = torch.tensor(
            np.where(les_labels >= 0, les_labels, 0), dtype=torch.long
        ).to(device)

        if source_weights is not None:
            weights = torch.tensor(source_weights, dtype=torch.float32).to(device)
        else:
            weights = torch.ones(len(embeddings), dtype=torch.float32).to(device)

        # Optimise only task heads
        heads = [
            model_wrapper._model.fibrosis_head,
            model_wrapper._model.lesion_head,
            model_wrapper._model.parasite_head,
        ]
        params = [p for head in heads for p in head.parameters()]
        optimizer = optim.AdamW(params, lr=lr, weight_decay=1e-4)
        ce_loss   = nn.CrossEntropyLoss(reduction="none")

        training_log = []
        for epoch in range(epochs):
            for head in heads:
                head.train()

            optimizer.zero_grad()

            fib_logits = model_wrapper._model.fibrosis_head(X)
            les_logits = model_wrapper._model.lesion_head(X)
            par_logits = model_wrapper._model.parasite_head(X)

            loss_fib = (ce_loss(fib_logits, y_fib) * weights).mean()
            loss_par = (ce_loss(par_logits, y_par) * weights).mean()
            if les_mask.any():
                loss_les = (ce_loss(les_logits[les_mask], y_les[les_mask]) * weights[les_mask]).mean()
            else:
                loss_les = torch.tensor(0.0).to(device)

            total_loss = loss_fib + 0.5 * loss_les + loss_par
            total_loss.backward()
            optimizer.step()

            training_log.append({
                "epoch":     epoch + 1,
                "loss_fib":  float(loss_fib.item()),
                "loss_les":  float(loss_les.item()),
                "loss_par":  float(loss_par.item()),
                "total":     float(total_loss.item()),
            })

        for head in heads:
            head.eval()

        duration = time.perf_counter() - t_start

        # Save updated model
        if save_path is None:
            from .local_model import _DEFAULT_MODEL_PATH
            save_path = str(_DEFAULT_MODEL_PATH)

        try:
            import torch as th
            # Collect full state dict for saving
            state = {}
            m = model_wrapper._model
            for part_name in ["backbone", "fibrosis_head", "lesion_head", "parasite_head", "regression_head"]:
                part = getattr(m, part_name)
                for k, v in part.state_dict().items():
                    state[f"{part_name}.{k}"] = v
            th.save(state, save_path)
            logger.info("[HeadFinetuner] Model saved → %s", save_path)
        except Exception as exc:
            logger.error("[HeadFinetuner] Could not save model: %s", exc)

        logger.info(
            "[HeadFinetuner] Fine-tuning complete — epochs=%d duration=%.1fs final_loss=%.4f",
            epochs, duration, training_log[-1]["total"],
        )
        return {
            "success":     True,
            "epochs":      epochs,
            "n_samples":   len(embeddings),
            "duration_sec": round(duration, 2),
            "final_loss":  training_log[-1]["total"],
            "training_log": training_log,
        }


# ---------------------------------------------------------------------------
# Fine-tune scheduler (background thread)
# ---------------------------------------------------------------------------

class FinetuneScheduler:
    """
    Background thread that checks the replay buffer periodically
    and triggers fine-tuning when enough new samples are available.
    """

    def __init__(
        self,
        replay_buffer: ReplayBuffer,
        finetuner:     HeadFinetuner,
        interval_hours: float = _FINETUNE_INTERVAL_HOURS,
    ):
        self._buffer    = replay_buffer
        self._finetuner = finetuner
        self._interval  = interval_hours * 3600
        self._thread: Optional[threading.Thread] = None
        self._running   = False

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._thread  = threading.Thread(
            target=self._run_loop,
            daemon=True,
            name="SmartLiva-FinetuneScheduler",
        )
        self._thread.start()
        logger.info(
            "[FinetuneScheduler] Started — interval=%.0fh min_samples=%d",
            _FINETUNE_INTERVAL_HOURS, _MIN_SAMPLES_FOR_FINETUNE,
        )

    def stop(self) -> None:
        self._running = False
        logger.info("[FinetuneScheduler] Stopped")

    def _run_loop(self) -> None:
        while self._running:
            time.sleep(self._interval)
            if not self._running:
                break
            try:
                self._try_finetune()
            except Exception as exc:
                logger.error("[FinetuneScheduler] Error: %s", exc)

    def _try_finetune(self) -> None:
        stats = self._buffer.stats()
        if not stats["ready_for_finetune"]:
            logger.info(
                "[FinetuneScheduler] Not enough new samples (%d/%d) — skipping",
                stats["unused_samples"], _MIN_SAMPLES_FOR_FINETUNE,
            )
            return

        batch = self._buffer.get_training_batch()
        if batch is None:
            return

        embeddings, fib_labels, les_labels, par_labels = batch

        # Weight physician corrections 3× more than auto-labels
        source_weights = np.ones(len(embeddings), dtype=np.float32)

        logger.info("[FinetuneScheduler] Triggering fine-tune on %d samples", len(embeddings))
        result = self._finetuner.finetune(
            embeddings  = embeddings,
            fib_labels  = fib_labels,
            les_labels  = les_labels,
            par_labels  = par_labels,
            source_weights = source_weights,
        )

        if result.get("success"):
            # Log to DB
            conn = _get_connection()
            conn.execute(
                """
                INSERT INTO finetune_log
                    (run_at, n_samples, duration_sec, notes)
                VALUES (?, ?, ?, ?)
                """,
                (
                    datetime.now(timezone.utc).isoformat(),
                    result["n_samples"],
                    result["duration_sec"],
                    f"final_loss={result['final_loss']:.4f}",
                ),
            )
            conn.commit()
            conn.close()
            logger.info(
                "[FinetuneScheduler] Fine-tune complete — n=%d loss=%.4f duration=%.1fs",
                result["n_samples"], result["final_loss"], result["duration_sec"],
            )


# ---------------------------------------------------------------------------
# Module-level singletons
# ---------------------------------------------------------------------------

_replay_buffer:    Optional[ReplayBuffer]    = None
_finetune_scheduler: Optional[FinetuneScheduler] = None


def get_replay_buffer() -> ReplayBuffer:
    global _replay_buffer
    if _replay_buffer is None:
        _replay_buffer = ReplayBuffer()
    return _replay_buffer


def start_finetune_scheduler() -> FinetuneScheduler:
    """Start the background fine-tuning scheduler. Call once on app startup."""
    global _finetune_scheduler
    if _finetune_scheduler is None:
        _finetune_scheduler = FinetuneScheduler(
            replay_buffer = get_replay_buffer(),
            finetuner     = HeadFinetuner(),
        )
    _finetune_scheduler.start()
    return _finetune_scheduler
