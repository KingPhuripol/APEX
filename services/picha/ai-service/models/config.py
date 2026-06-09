"""
PICHA AI — Single Source of Truth for all AI model identifiers.
Change model versions HERE ONLY. Never hardcode model names elsewhere.
"""

# ── Groq ───────────────────────────────────────────────────────────────────
GROQ_VISION  = "meta-llama/llama-4-scout-17b-16e-instruct"  # Vision: pathology slide analysis (multimodal, 131K ctx, 750 tps)
GROQ_PRIMARY = "llama-3.3-70b-versatile"                    # Text: reasoning, staging, report synthesis
GROQ_FAST    = "llama-3.1-8b-instant"                       # Fast fallback for text-only tasks

# ── Agent → Model assignment ───────────────────────────────────────────────
AGENT_MODELS = {
    # Agent 0 — Slide Quality Control (needs vision to read the actual slide image)
    "slide_qc":        {"primary": GROQ_VISION,   "fallback": GROQ_PRIMARY},

    # Agent 1 — Parasitologist (fine morphology: OV eggs 26-30μm, needs vision)
    "parasitologist":  {"primary": GROQ_VISION,   "cross_val": GROQ_VISION},

    # Agent 2 — Grading (WHO BilIN + ML pre-screen, needs vision for tissue features)
    "grading":         {"primary": GROQ_VISION,   "cross_val": GROQ_VISION},

    # Agent 3 — Spatial (tumor microenvironment, spatial features from image)
    "spatial":         {"primary": GROQ_VISION,   "fallback": GROQ_PRIMARY},

    # Agent 4 — Oncologist (AJCC staging — text reasoning only, no image needed)
    "oncologist":      {"primary": GROQ_PRIMARY},

    # Agent 5 — Time Machine (survival statistics — quantitative text reasoning)
    "time_machine":    {"primary": GROQ_PRIMARY,  "fallback": GROQ_FAST},

    # Agent 6 — Report (CAP/WHO report synthesis — text only)
    "report":          {"primary": GROQ_PRIMARY},

    # Orchestrator — meta-reasoning + agent routing (text only)
    "orchestrator":    {"primary": GROQ_PRIMARY},
}

CROSS_VALIDATION_THRESHOLD = 0.80   # >= 80% agreement → use higher confidence
MIN_QC_QUALITY = "Adequate"         # slide quality gate threshold

# ── Hybrid ML + API thresholds ─────────────────────────────────────────────
# GradingAgent: ML confidence >= this → inject as strong prior into LLM prompt
ML_CONFIDENCE_THRESHOLD = 0.70

# SlideQCAgent: if ML says is_cancer with high conf → skip QC agent, proceed directly
ML_CANCER_FAST_TRACK = 0.85

# Cost optimization: agents that ALWAYS run ML pre-screen first
ML_PRESCREEN_AGENTS = {"slide_qc", "grading"}
