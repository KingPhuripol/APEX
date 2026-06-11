"""
PICHA AI Service — FastAPI server (Port 8200)
Endpoints:
  POST /analyze        — Full 7-agent analysis (SSE streaming)
  POST /analyze/sync   — Synchronous (wait for full report)
  GET  /health
"""
import os
import json
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

DEMO_MODE = os.environ.get("DEMO_MODE", "false").lower() == "true"
_orchestrator = None

# ── Demo mock events ────────────────────────────────────────────────────────

DEMO_EVENTS = [
    # ── System initialization ──────────────────────────────────────────────────
    (
        "System", "thinking",
        "Initializing PICHA MARS v3.0 — Explainable AI (XAI) Mode active.\n"
        "Every inference step will expose: feature attributions, confidence calibration, "
        "uncertainty bounds, and counterfactual sensitivities.\n"
        "All 7 specialist agents operate as interpretable reasoning chains — not black boxes.\n"
        "XAI stack: Grad-CAM++ (visual attention) · SHAP (feature importance) · "
        "Monte-Carlo Dropout (uncertainty) · LIME (local explanations) · CF-Δ (counterfactual analysis)\n"
        "Patient region: Northeast Thailand — OV-endemic zone context injected into all agents.",
        False,
    ),

    # ── MLPrescreen ────────────────────────────────────────────────────────────
    (
        "MLPrescreen", "ml_prescreen",
        "[XAI] Grad-CAM++ attention map generated on ConvNeXt-Base (colorectal tissue pre-screen, CRC-NCT-HE-555K).\n"
        "Model focuses on 3 discriminative regions:\n"
        "  ① Angulated glandular structures, back-to-back arrangement  (attention score 0.91)\n"
        "  ② Dense desmoplastic stroma surrounding tumour nests         (attention score 0.83)\n"
        "  ③ Enlarged nuclei with open vesicular chromatin              (attention score 0.76)\n"
        "Non-discriminative (low attention): blood vessel lumina, hepatocyte islands, necrotic debris.\n"
        "→ Why the model looks here: these three morphological zones show the strongest correlation "
        "with CCA in the 18,400-tile training set (AUC 0.96 on CCA-Bench).",
        False,
    ),
    (
        "MLPrescreen", "ml_prescreen",
        "[XAI] SHAP class-level feature attribution — top 8 visual features driving iCCA prediction:\n"
        "  +0.31  Irregular glandular architecture (back-to-back, cribriform)\n"
        "  +0.26  Desmoplastic stroma density > 50%\n"
        "  +0.19  Nuclear pleomorphism grade ≥ 2\n"
        "  +0.14  Peribiliary gland involvement\n"
        "  +0.09  Intraluminal mucin (PAS+)\n"
        "  −0.07  Absence of bile duct hepatocyte trabeculae  (rules out HCC)\n"
        "  −0.05  Absence of signet-ring cells               (rules out gastric metastasis)\n"
        "  −0.04  Clear cell pattern absent                  (rules out RCC metastasis)\n\n"
        "[XAI] Counterfactual sensitivity (CF-Δ): If the desmoplastic stroma density were < 20%, "
        "iCCA confidence would drop from 0.87 → 0.51 (threshold: 0.50). "
        "Stroma density is a critical tipping-point feature for this prediction.",
        False,
    ),
    (
        "MLPrescreen", "ml_prescreen",
        "[XAI] Ensemble uncertainty quantification (Monte-Carlo Dropout, T=50 forward passes):\n"
        "  Mean prediction: iCCA 0.87\n"
        "  Epistemic uncertainty:  σ = 0.031  (model knowledge uncertainty — LOW → well-trained on this morphology)\n"
        "  Aleatoric uncertainty:  σ = 0.044  (data / image noise — LOW → high-quality slide)\n"
        "  95% confidence interval: [0.80 – 0.94]\n\n"
        "[XAI] Calibration check (ECE = 0.03): model is well-calibrated at this confidence level — "
        "87% predicted confidence historically corresponds to ~85% true positive rate on held-out CCA set.\n\n"
        "Decision: PASS threshold (> 0.5). Routing to full 7-agent MARS pipeline.",
        False,
    ),

    # ── SlideQCAgent ───────────────────────────────────────────────────────────
    (
        "SlideQCAgent", "thinking",
        "[XAI] Slide QC uses a ResNet-18 artefact detector trained on 45,000 annotated H&E tiles "
        "(CAP-standardised labels: focus, staining, tissue, artifacts).\n"
        "Explanation method: Integrated Gradients on artefact probability map.\n"
        "The model flags specific tile coordinates — not just a global score — so the pathologist can "
        "see WHICH regions caused any quality concern.",
        False,
    ),
    (
        "SlideQCAgent", "tool_call",
        "[XAI] Per-dimension quality attribution (Integrated Gradients scores):\n\n"
        "  Dimension          Score   Weight  Contribution  Status\n"
        "  ─────────────────────────────────────────────────────────\n"
        "  Tissue coverage    0.76    0.25    +0.190        ✓ PASS\n"
        "  H/E staining OD    0.91    0.25    +0.228        ✓ PASS\n"
        "  Focus sharpness    0.88    0.20    +0.176        ✓ PASS\n"
        "  Section thickness  0.94    0.15    +0.141        ✓ PASS\n"
        "  Artefact absence   0.97    0.15    +0.146        ✓ PASS\n"
        "  ─────────────────────────────────────────────────────────\n"
        "  Composite QC score: 0.881  (threshold ≥ 0.65)\n\n"
        "[XAI] Why each weight? Coverage and staining have highest weights because prior ablation studies "
        "showed they contribute 73% of downstream grading error when degraded.",
        False,
    ),
    (
        "SlideQCAgent", "conclusion",
        "[XAI] Slide QC Decision: ADEQUATE (score 0.881 > threshold 0.65).\n\n"
        "Reasoning trace:\n"
        "  1. Focus score (0.88) was the highest-risk dimension — Grad-CAM shows the model briefly "
        "attended to 2 slightly blurry tile edges (tile_row=3,col=7 and tile_row=5,col=2). "
        "Both below 5% of slide area and non-tumour; excluded from analysis.\n"
        "  2. Staining OD ratio = 0.91 (optimal range 0.85–0.95) — no destaining or overstaining artefact.\n"
        "  3. Final confidence that QC pass is correct: 94% (MC-Dropout, T=30).\n\n"
        "If QC score were 0.62 (< threshold), pipeline would halt and prompt for re-staining. "
        "This transparency ensures no low-quality slide silently degrades downstream grading accuracy.",
        False,
    ),

    # ── ParasitologistAgent ────────────────────────────────────────────────────
    (
        "ParasitologistAgent", "thinking",
        "[XAI] OV-association detection uses a multi-label classifier (Vision Transformer, ViT-B/16) "
        "trained on 3,200 CCA biopsies from Khon Kaen University with expert OV-annotation.\n"
        "Explainability: attention rollout maps show which tissue features the transformer attends to "
        "for each OV-marker label independently.\n"
        "This prevents the agent from conflating OV features with generic inflammation — "
        "each marker has its own dedicated attention head.",
        False,
    ),
    (
        "ParasitologistAgent", "tool_call",
        "[XAI] OV-marker attribution scores (attention rollout per label):\n\n"
        "  OV Marker                          Detected   Attention  Confidence\n"
        "  ─────────────────────────────────────────────────────────────────────\n"
        "  Periductal fibrosis (concentric)   YES        0.89       94%\n"
        "  Goblet cell metaplasia             YES        0.81       88%\n"
        "  Adenomatous epithelial hyperplasia YES        0.76       82%\n"
        "  Periductal gland proliferation     YES        0.72       79%\n"
        "  Eosinophilic infiltration          MILD       0.41       61%  (non-specific)\n"
        "  Fluke egg remnants                 NO         0.08       12%\n"
        "  Granulomatous reaction             NO         0.04        7%\n\n"
        "[XAI] Why confident despite no eggs? The model was explicitly trained to recognise "
        "OV-associated changes WITHOUT egg presence — eggs are absent in >70% of OV-CCA cases "
        "due to prior treatment or late-stage disease. The 4 positive tissue markers are sufficient.",
        False,
    ),
    (
        "ParasitologistAgent", "tool_call",
        "[XAI] LIME local explanation — what changes would flip the OV-association label 'YES' → 'NO':\n"
        "  Requires ALL of the following to be absent:\n"
        "  • Periductal fibrosis must reduce from F3 → F0/F1   (most influential, LIME weight 0.44)\n"
        "  • Goblet cell metaplasia must become absent          (LIME weight 0.29)\n"
        "  • Adenomatous hyperplasia must become absent         (LIME weight 0.18)\n\n"
        "Current evidence for OV-association meets 4 of 4 primary criteria.\n"
        "Bayesian posterior: P(OV-CCA | these features, NE Thailand) = 0.91\n"
        "Base rate in this region: P(OV-CCA) = 0.58 (Thai national registry 2024)",
        False,
    ),
    (
        "ParasitologistAgent", "conclusion",
        "[XAI] Parasitological Assessment: OV-association CONFIRMED.\n\n"
        "Explainability summary:\n"
        "  • 4/4 primary OV markers present (periductal fibrosis F3, goblet metaplasia, "
        "hyperplasia, gland proliferation)\n"
        "  • ViT attention rollout shows model correctly focuses on periductal fibrosis "
        "as the dominant feature — not nonspecific inflammation\n"
        "  • Bayesian posterior P(OV-CCA) = 0.91, up from 0.58 base rate\n"
        "  • Counterfactually: removing periductal fibrosis alone drops posterior to 0.47 — "
        "it is the single most predictive OV feature\n\n"
        "Clinical implication: OV-associated CCA → IDH1/2 mutation probability ↑, "
        "FGFR2 fusion probability ↓ (molecular panel should prioritise accordingly).",
        False,
    ),

    # ── GradingAgent ──────────────────────────────────────────────────────────
    (
        "GradingAgent", "thinking",
        "[XAI] Histological grading uses an interpretable feature-based neural network (XGBoost + "
        "CNN feature extractor) trained on 8,400 WHO-graded CCA cases from 5 academic centres.\n"
        "Explainability: the model outputs a SHAP waterfall chart for each grade decision, "
        "showing how each morphological feature pushes the prediction toward G1, G2, or G3.\n"
        "The pathologist can see — and override — any feature the model weighted differently.",
        False,
    ),
    (
        "GradingAgent", "tool_call",
        "[XAI] SHAP waterfall chart — Grade G2 decision (baseline: E[f(x)] = G1):\n\n"
        "  Feature                         SHAP value  Direction\n"
        "  ───────────────────────────────────────────────────────\n"
        "  Gland formation 50–75%          −1.21       ← pushes toward G2 (not G3)\n"
        "  Moderate nuclear pleomorphism   +0.84       → pushes toward G2 (not G1)\n"
        "  Mitoses 4/10 HPF                +0.61       → pushes toward G2\n"
        "  Focal cribriform pattern        +0.43       → pushes toward G2\n"
        "  Solid areas < 10%               −0.89       ← suppresses G3\n"
        "  Intraluminal mucin present      +0.27       → mild G2 support\n"
        "  Necrosis < 10%                  −0.38       ← mild G3 suppression\n"
        "  ───────────────────────────────────────────────────────\n"
        "  Final model output: G2 with 83% confidence (G1: 11%, G3: 6%)",
        False,
    ),
    (
        "GradingAgent", "tool_call",
        "[XAI] Calibration + counterfactual analysis:\n\n"
        "Calibration: ECE = 0.04 on 1,200-slide validation set. At 83% model confidence, "
        "true G2 rate in held-out data = 81% → well-calibrated.\n\n"
        "CF-Δ — what would change the grade to G3?\n"
        "  Requires ANY ONE of:\n"
        "  • Solid/undifferentiated areas ≥ 50% of cross-section  (currently < 10%)\n"
        "  • Mitoses > 10/10 HPF                                   (currently 4/10 HPF)\n"
        "  • Complete loss of gland formation                      (currently 50–75%)\n\n"
        "CF-Δ — what would change the grade to G1?\n"
        "  Requires: gland formation > 95%, nuclear pleomorphism grade 1, mitoses ≤ 1/10 HPF\n"
        "  → All three conditions are far from current measurements.\n\n"
        "Conclusion: G2 assignment is robust to measurement noise across all three criteria.",
        False,
    ),
    (
        "GradingAgent", "conclusion",
        "[XAI] Grading Decision: WHO G2 — Moderately differentiated (confidence 83%).\n\n"
        "Why G2 and not G1 or G3:\n"
        "  → SHAP dominant driver: gland formation at 50–75% — this is the single most important "
        "criterion separating G1 (>95%) from G2 (50–95%) from G3 (<50%)\n"
        "  → Nuclear pleomorphism (moderate, grade 2) adds +0.84 SHAP — strongly supports G2\n"
        "  → Solid areas < 10%: the strongest G3-suppression feature (−0.89 SHAP) — "
        "the model explicitly learned that 'no solid growth = not G3', not just 'there are glands = G2'\n\n"
        "Clinical significance of explainability: The feature breakdown can be surfaced to the "
        "reporting pathologist as an audit trail, satisfying CAP requirements for reproducible grading.",
        False,
    ),

    # ── SpatialAgent ──────────────────────────────────────────────────────────
    (
        "SpatialAgent", "thinking",
        "[XAI] Spatial analysis uses a multi-task instance segmentation model (Mask-RCNN backbone + "
        "WSI-level graph neural network) to simultaneously map: tumour cells, stroma, immune infiltrate, "
        "vessels, nerves, and necrosis.\n"
        "Explainability: the GNN provides node-level attribution — each cell cluster's contribution "
        "to the final spatial scores is traceable. No single global 'stroma score' is reported "
        "without identifying WHERE in the slide it was measured.",
        False,
    ),
    (
        "SpatialAgent", "tool_call",
        "[XAI] WSI spatial segmentation — cell-type quantification with confidence per class:\n\n"
        "  Compartment              Area%   Cell count   Model confidence\n"
        "  ───────────────────────────────────────────────────────────────\n"
        "  Tumour cells             32%     ~18,400      0.91\n"
        "  Desmoplastic stroma      61%     —            0.88\n"
        "  Intratumoural TILs       12%     ~2,200       0.84  (low—immune-excluded)\n"
        "  Stromal TILs             24%     ~4,400       0.86\n"
        "  Tumour necrosis           3%     —            0.90\n"
        "  Residual normal tissue    4%     —            0.82\n\n"
        "[XAI] GNN node attribution: the 61% desmoplastic stroma score is primarily driven by "
        "6 large stromal patches in the central tumour core (tiles: R4C3, R4C5, R5C2, R5C4, R6C3, R6C6). "
        "This localisation allows spatial QC — the pathologist can verify these exact tiles.",
        False,
    ),
    (
        "SpatialAgent", "tool_call",
        "[XAI] LVI / PNI detection — explainability breakdown:\n\n"
        "LVI detection model (ResNet-50, AUC 0.94 on TCGA-CHOL):\n"
        "  → Prediction: NOT IDENTIFIED (probability 0.08 < threshold 0.50)\n"
        "  → Grad-CAM: no attention peaks at endothelial-lined spaces\n"
        "  → CF-Δ: LVI would be flagged if endothelial marker signal appeared in ≥ 2 tile regions\n\n"
        "PNI detection model (ViT-S, AUC 0.91):\n"
        "  → Prediction: PRESENT (probability 0.89 > threshold 0.50)\n"
        "  → Grad-CAM confirms: 2 foci of perineurial sheath infiltration found at:\n"
        "       Focus 1 — tile R7C4: probability 0.93, feature: tumour cells wrapping nerve sheath\n"
        "       Focus 2 — tile R9C2: probability 0.85, feature: single-cell endoneurial infiltration\n"
        "  → CF-Δ: if both foci were < 10 cells, PNI probability would drop to 0.38 (below threshold)\n\n"
        "Tumour budding ITBP scorer: Bd1 (3.2 buds/HPF mean; SD ± 0.6 across 5 HPFs sampled)",
        False,
    ),
    (
        "SpatialAgent", "conclusion",
        "[XAI] Spatial Analysis — Explainability Summary:\n\n"
        "Key findings and why the model is confident:\n"
        "  PNI+ (0.89 probability): 2 tile-level Grad-CAM activations independently confirm "
        "nerve sheath involvement — this is NOT a global impression but a localised, verifiable finding.\n\n"
        "Immune microenvironment interpretation:\n"
        "  Intratumoural TIL 12% vs Stromal TIL 24% → 2:1 stromal:intratumoural ratio indicates "
        "immune-excluded phenotype. GNN attribution shows stroma is an active physical barrier: "
        "TIL clustering abruptly stops at the tumour-stroma boundary (tile-level heatmap available).\n\n"
        "XAI clinical value: PNI foci are reported with tile coordinates, so the pathologist can "
        "open the WSI viewer at the exact location and confirm — or dispute — the AI's finding. "
        "This is not a black-box output; it is an AI-assisted search with verifiable evidence.",
        False,
    ),

    # ── OncologistAgent ───────────────────────────────────────────────────────
    (
        "OncologistAgent", "thinking",
        "[XAI] Staging uses a structured decision tree (InterpreTree) trained on AJCC 8th Ed. criteria "
        "combined with a Bayesian belief network for uncertainty propagation across T, N, M axes.\n"
        "Explainability: every staging output includes the exact rule path followed and the probability "
        "that each node condition is met based on evidence from preceding agents.\n"
        "No staging decision is deterministic without visible evidence — all probabilistic paths are shown.",
        False,
    ),
    (
        "OncologistAgent", "tool_call",
        "[XAI] pT-stage decision tree trace (AJCC 8th Ed. iCCA):\n\n"
        "  Node 1: 'Is the tumour solitary?'\n"
        "    → Evidence: spatial agent found no satellite nodules\n"
        "    → Decision: YES (confidence 0.96)\n\n"
        "  Node 2: 'Is there intrahepatic vascular invasion (hepatic vein / portal branch)?'\n"
        "    → Evidence: LVI probability 0.08 (< 0.50); no hepatic vein involvement in H&E sections\n"
        "    → Decision: NO vascular invasion (confidence 0.91)\n\n"
        "  Node 3: 'Tumour size > 5 cm?'\n"
        "    → Evidence: biopsy — exact size unmeasurable; clinical radiology required\n"
        "    → Decision: UNCERTAIN (confidence 0.55 for > 5 cm based on morphological extent)\n\n"
        "  → pT result: T1b–T2 (most probable T2 if radiological confirmation of vascular involvement)\n"
        "  [XAI] The tree path is fully transparent — the uncertainty in T-stage is caused by "
        "a SINGLE node (size measurement), not model opaqueness.",
        False,
    ),
    (
        "OncologistAgent", "tool_call",
        "[XAI] Bayesian staging uncertainty propagation:\n\n"
        "  pT2N0M0 Stage II:  P = 0.67\n"
        "  pT1bN0M0 Stage IB: P = 0.24\n"
        "  pT3N0M0 Stage III: P = 0.07  (would require peritoneal perforation — not seen)\n"
        "  pT4 or N1/M1:      P = 0.02  (all criteria unmet)\n\n"
        "[XAI] Sensitivity analysis: if PNI were absent (CF-Δ), Stage II probability remains 0.65 — "
        "PNI does not change the AJCC T-category but is an independent prognostic factor.\n"
        "If LVI were PRESENT, Stage would upgrade to pT2 with higher certainty but not change "
        "Stage grouping (still Stage II on AJCC 8th Ed.).\n\n"
        "XAI design principle: staging uncertainty is REPORTED, not hidden — "
        "the clinician sees P = 0.67 for Stage II, not a falsely certain 'Stage II' label.",
        False,
    ),
    (
        "OncologistAgent", "conclusion",
        "[XAI] Oncological Staging: pT2 N0 M0 — Stage II (P = 0.67, AJCC 8th Ed.).\n\n"
        "Explainability chain:\n"
        "  Solitary tumour (0.96 confidence) + no LVI (0.91 confidence) + probable > 5 cm → pT2\n"
        "  No nodal involvement assumed (clinical) → N0\n"
        "  No distant metastasis → M0\n"
        "  → Stage II with honest uncertainty: 33% residual probability that final staging differs "
        "after resection specimen (size or vascular status confirmed)\n\n"
        "Treatment decision logic (interpretable):\n"
        "  IF Stage I–II AND node-negative AND no prior systemic therapy → R0 resection curative intent\n"
        "  IF R0 resection completed → adjuvant capecitabine (BILCAP; Level 1A evidence)\n"
        "  IF Stage III–IV OR unresectable → systemic first-line (GemCis or TOPAZ-1 durvalumab+GemCis)\n"
        "  IF IDH1/2 mutated → ivosidenib 2nd line; FGFR2 fused → pemigatinib; MSI-H → pembrolizumab",
        False,
    ),

    # ── TimeMachineAgent ──────────────────────────────────────────────────────
    (
        "TimeMachineAgent", "thinking",
        "[XAI] Prognostic modelling uses a Cox Proportional Hazards model (CPH) + "
        "DeepSurv neural network ensemble, validated on:\n"
        "  • SEER 18 registry (US, n = 4,821 iCCA, 2000–2019)\n"
        "  • Khon Kaen OV-CCA cohort (Thailand, n = 1,247, 2005–2022)\n"
        "  • MSK iCCA nomogram (post-resection, external validation C-index 0.71)\n"
        "Explainability: Cox model provides interpretable hazard ratios; DeepSurv provides SHAP-on-Survival "
        "showing which patient features contribute most to SHORTER or LONGER survival.",
        False,
    ),
    (
        "TimeMachineAgent", "tool_call",
        "[XAI] SHAP-on-Survival — individual feature contribution to this patient's prognosis "
        "(negative SHAP = longer survival, positive SHAP = shorter survival):\n\n"
        "  Feature                    SHAP on hazard   Direction\n"
        "  ──────────────────────────────────────────────────────\n"
        "  N0 nodal status            −0.71            ↓  ← STRONGEST protective factor\n"
        "  WHO Grade G2               −0.42            ↓  better vs G3 (HR 0.62)\n"
        "  LVI absent                 −0.29            ↓  protective (HR 0.71)\n"
        "  Tumour budding Bd1         −0.24            ↓  protective\n"
        "  Solitary tumour            −0.19            ↓  protective\n"
        "  PNI present                +0.48            ↑  ← STRONGEST adverse factor in this case\n"
        "  Periductal-infiltrating    +0.31            ↑  worse than mass-forming type (HR 1.31)\n"
        "  Desmoplastic stroma > 60%  +0.22            ↑  immune-excluded → worse DFS\n"
        "  OV-associated background   −0.08            ↓  marginal benefit in Thai cohort",
        False,
    ),
    (
        "TimeMachineAgent", "tool_call",
        "[XAI] Model-predicted survival curves (DeepSurv ensemble, 95% CI from bootstrap n=500):\n\n"
        "  OS post R0 resection:\n"
        "    30-day:   96%   [93 – 98%]\n"
        "    90-day:   91%   [87 – 94%]\n"
        "    180-day:  82%   [77 – 87%]\n"
        "    1-year:   65%   [58 – 72%]\n"
        "    3-year:   38%   [30 – 46%]\n"
        "    5-year:   28%   [21 – 36%]\n"
        "    Median OS: ~26 months\n\n"
        "[XAI] What-if intervention analysis (modifiable factors):\n"
        "  If adjuvant capecitabine given: Median OS improves ~28 months (+2 months; BILCAP NNT=10)\n"
        "  If IDH1 mutation confirmed + ivosidenib 2nd line: 1-year PFS +2.7 months (ClarIDHy)\n"
        "  If FGFR2 fusion + futibatinib 2nd line: ORR ~35%, DCR 83%\n"
        "  If MSI-H + pembrolizumab: durable CR possible (KEYNOTE-158)\n\n"
        "XAI value: survival estimates are NOT point estimates — confidence intervals are always shown, "
        "and each modifiable factor's impact is quantified so the MDT can weigh interventions.",
        False,
    ),
    (
        "TimeMachineAgent", "conclusion",
        "[XAI] Prognostic Summary (with explainability):\n\n"
        "  Median OS: ~26 months  |  5-year OS: ~28%  (post R0, Stage II iCCA, this risk profile)\n"
        "  95% CI for 5-year OS: [21 – 36%]\n\n"
        "Most impactful XAI finding:\n"
        "  PNI+ is the single largest modifiable adverse factor (SHAP +0.48 on hazard). "
        "Currently not modifiable post-diagnosis, but it justifies intensifying adjuvant therapy "
        "and shortening surveillance intervals (every 3 months vs standard 6 months).\n\n"
        "N0 status is the largest protective factor (SHAP −0.71). "
        "Confirmatory lymphadenectomy (≥ 6 nodes) is therefore the most important surgical quality measure.\n\n"
        "Transparent caveat: DeepSurv C-index on Thai OV-CCA validation set = 0.68 "
        "(moderate discrimination) — survival estimates carry real uncertainty and should be "
        "communicated as ranges, not point values, when counselling patients.",
        False,
    ),

    # ── ReportAgent ───────────────────────────────────────────────────────────
    (
        "ReportAgent", "thinking",
        "[XAI] Compiling CAP Protocol #4203 synoptic report with full Explainable AI audit trail.\n"
        "Each reported data element is tagged with: source agent, model confidence, XAI method used, "
        "and tile-level evidence reference. This means the pathologist can click any reported finding "
        "and trace it back to the exact attention map or SHAP score that generated it.\n"
        "CAP CAP #4203 + RCPA minimum dataset completeness check running…",
        False,
    ),
    (
        "ReportAgent", "tool_call",
        "[XAI] CAP #4203 data elements — completeness + confidence audit:\n\n"
        "  Data element                  Value              Confidence  XAI Source\n"
        "  ────────────────────────────────────────────────────────────────────────\n"
        "  Histological type             iCCA adenocarcinoma  0.87     EfficientNet SHAP\n"
        "  WHO grade                     G2                   0.83     XGBoost SHAP waterfall\n"
        "  Growth pattern                Periductal-          0.88     Spatial GNN attribution\n"
        "                                infiltrating\n"
        "  LVI                           Not identified       0.91     Grad-CAM tile-level\n"
        "  PNI                           Present (2 foci)     0.89     ViT attention rollout\n"
        "  Tumour budding                Bd1                  0.87     ITBP instance segmentation\n"
        "  OV-association                Confirmed            0.91     ViT attention rollout\n"
        "  Periductal fibrosis           F3 (OV-type)         0.94     IntGrad per marker\n"
        "  pTNM staging                  pT2N0M0 Stage II     0.67     InterpreTree Bayesian\n"
        "  Survival (median OS)          ~26 months           CI±4mo  DeepSurv SHAP-on-Survival\n"
        "  Molecular panel needed        IDH1/2, FGFR2,       N/A     OV-context rule-based\n"
        "                                MSI, KRAS, HER2\n"
        "  All 12/12 CAP elements complete ✓",
        False,
    ),
    (
        "ReportAgent", "conclusion",
        '{"diagnosis":"Moderately differentiated intrahepatic cholangiocarcinoma (iCCA), periductal-infiltrating type",'
        '"who_grade":"G2",'
        '"overall_confidence":0.87,'
        '"ov_associated":true,'
        '"staging":{'
        '"T":"pT2","N":"N0","M":"M0",'
        '"overall_stage":"Stage II",'
        '"resectability":"Resectable (curative intent)",'
        '"treatment_recommendation":"R0 hepatectomy + regional lymphadenectomy (≥6 nodes); adjuvant capecitabine (BILCAP); mandatory molecular profiling (IDH1/2, FGFR2, MSI, KRAS, HER2); MDT review."'
        '},'
        '"survival":{"30d":0.96,"90d":0.91,"180d":0.82,"365d":0.65},'
        '"slide_qc":{"overall_quality":"ADEQUATE","proceed":true,"issues":[]},'
        '"spatial":{'
        '"til_density":"Stromal 24% / Intratumoural 12%",'
        '"lymphovascular_invasion":"Not identified",'
        '"perineural_invasion":"Present",'
        '"growth_pattern":"Periductal-infiltrating"'
        '},'
        '"xai_summary":"All findings fully attributed via SHAP, Grad-CAM++, attention rollout, and LIME. '
        'PNI+ confirmed at tile coordinates R7C4 and R9C2. '
        'Stage II probability P=0.67 (Bayesian — honest uncertainty preserved). '
        'Survival CI 5yr OS [21–36%]. '
        'Full XAI audit trail available in agent reasoning trace."}',
        True,
    ),
]

DEMO_FINAL_REPORT = {
    "diagnosis": "Moderately differentiated intrahepatic cholangiocarcinoma (iCCA), periductal-infiltrating type",
    "who_grade": "G2",
    "overall_confidence": 0.87,
    "ov_associated": True,
    "staging": {
        "T": "pT2",
        "N": "N0",
        "M": "M0",
        "overall_stage": "Stage II",
        "resectability": "Resectable (curative intent)",
        "treatment_recommendation": (
            "R0 hepatectomy + regional lymphadenectomy (≥6 nodes); "
            "adjuvant capecitabine (BILCAP); "
            "mandatory molecular profiling (IDH1/2, FGFR2, MSI, KRAS, HER2); MDT review."
        ),
    },
    "survival": {
        "30d": 0.96,
        "90d": 0.91,
        "180d": 0.82,
        "365d": 0.65,
    },
    "slide_qc": {
        "overall_quality": "ADEQUATE",
        "proceed": True,
        "issues": [],
    },
    "spatial": {
        "til_density": "Stromal 24% / Intratumoural 12%",
        "lymphovascular_invasion": "Not identified",
        "perineural_invasion": "Present",
        "growth_pattern": "Periductal-infiltrating",
    },
    "xai_summary": (
        "All findings fully attributed via SHAP, Grad-CAM++, attention rollout, and LIME. "
        "PNI+ confirmed at tile coordinates R7C4 and R9C2. "
        "Stage II probability P=0.67 (Bayesian — honest uncertainty preserved). "
        "5-year OS [21–36%] CI. Full XAI audit trail available in agent reasoning trace."
    ),
}


async def demo_event_stream():
    # Vary delays: short for thinking, longer for tool_call/conclusion (simulates real reasoning)
    delays = {
        "thinking": 0.6,
        "ml_prescreen": 1.0,
        "tool_call": 1.4,
        "conclusion": 1.2,
    }
    for agent, step_type, message, is_final in DEMO_EVENTS:
        data = json.dumps({"agent": agent, "type": step_type, "message": message, "is_final": is_final})
        yield f"data: {data}\n\n"
        await asyncio.sleep(delays.get(step_type, 0.8))
    yield "data: [DONE]\n\n"


# ── App lifespan ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _orchestrator
    if DEMO_MODE:
        logger.info("PICHA AI Service running in DEMO MODE — mock responses enabled")
    else:
        if not os.environ.get("GROQ_API_KEY"):
            raise RuntimeError("Missing required env var: GROQ_API_KEY")
        from orchestrator import PICHAOrchestrator
        _orchestrator = PICHAOrchestrator()
        logger.info("PICHAOrchestrator ready on port 8200")
    yield


app = FastAPI(
    title="PICHA AI Service",
    description="7-agent AutoGen pathology orchestration for CCA",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3003",
        "http://localhost:3005",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        os.environ.get("FRONTEND_URL", ""),
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    slide_description: str = Field(..., min_length=1)
    specimen_type: str = "Bile duct biopsy"
    clinical_context: str = ""
    slide_id: str = ""
    patient_id: str = ""
    patient_region: str = "Southeast Asia"
    image_base64: str = ""


# POST /analyze — SSE streaming
@app.post("/analyze")
async def analyze_stream(req: AnalyzeRequest):
    if DEMO_MODE:
        return StreamingResponse(demo_event_stream(), media_type="text/event-stream")

    if not _orchestrator:
        from fastapi import HTTPException
        raise HTTPException(503, "Orchestrator not initialized")

    from orchestrator import AnalysisRequest as OrchestratorRequest

    request = OrchestratorRequest(**req.model_dump())

    async def event_stream():
        try:
            async for progress in _orchestrator.analyze(request):
                data = json.dumps({
                    "agent": progress.agent_name,
                    "type": progress.step_type,
                    "message": progress.message,
                    "is_final": progress.is_final,
                })
                yield f"data: {data}\n\n"
        except Exception as exc:
            import logging
            logging.getLogger(__name__).error(f"[analyze_stream] error: {exc}")
            err = json.dumps({
                "agent": "System",
                "type": "error",
                "message": f"Analysis failed: {exc}",
                "is_final": True,
            })
            yield f"data: {err}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# POST /analyze/sync — wait for full report
@app.post("/analyze/sync")
async def analyze_sync(req: AnalyzeRequest):
    if DEMO_MODE:
        return DEMO_FINAL_REPORT

    if not _orchestrator:
        from fastapi import HTTPException
        raise HTTPException(503, "Orchestrator not initialized")

    from orchestrator import AnalysisRequest as OrchestratorRequest

    request = OrchestratorRequest(**req.model_dump())
    final_report = None

    async for progress in _orchestrator.analyze(request):
        if progress.is_final:
            raw = progress.message
            if "FINAL_REPORT:" in raw:
                raw = raw.split("FINAL_REPORT:", 1)[1].strip()
            try:
                final_report = json.loads(raw)
            except json.JSONDecodeError:
                final_report = {"report_text": raw}
            break

    return final_report or {"error": "No final report generated"}


@app.get("/health")
def health():
    return {"status": "ok", "demo_mode": DEMO_MODE, "orchestrator_ready": _orchestrator is not None or DEMO_MODE}

