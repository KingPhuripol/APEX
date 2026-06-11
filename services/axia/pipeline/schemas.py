from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict

class QualityGateResult(BaseModel):
    model_config = ConfigDict(extra='forbid')
    passed: bool = Field(description="True if the image is valid and readable, False if it is corrupted, unreadable, or not a medical image.")
    reject_reason: str = Field(description="Reason for rejection if passed is False. Use empty string if passed is True.")

class Stage2Findings(BaseModel):
    model_config = ConfigDict(extra='forbid')
    confidence: float = Field(description="Confidence score between 0.0 and 1.0", ge=0.0, le=1.0)
    primary_finding: str = Field(description="Summary of the main clinical finding.")
    visual_insights: List[str] = Field(description="Specific visual features observed in the image.")
    type: str = Field(description="Pathology type classification (e.g. hemorrhage, ischemic, normal). Use empty string if not applicable.")
    volume: float = Field(description="Volume estimation in mL if applicable, use 0.0 if not applicable.")

class Stage3Critique(BaseModel):
    model_config = ConfigDict(extra='forbid')
    agrees_with_stage2: bool = Field(description="True if the critique agent agrees with the analyst agent's findings.")
    critique_notes: str = Field(description="Detailed critique, pointing out potential hallucinations, missed artifacts, or confirming the findings.")
    adjusted_risk_level: str = Field(description="The risk level (e.g., Low, Medium, High, Critical) adjusted after critique. Follows safety-first principles.")

class Stage4Formatter(BaseModel):
    model_config = ConfigDict(extra='forbid')
    primary_finding: str = Field(description="Final synthesized primary finding in professional medical language.")
    explainable_insights: List[str] = Field(description="Key insights explaining the reasoning, including CAP synoptic data for pathology.")
    actionable_recommendations: str = Field(description="Actionable next steps or recommendations for the physician.")

class PipelineResult(BaseModel):
    stage1_quality_gate: QualityGateResult
    stage2_analysis: Optional[dict] = None
    stage3_critique: Optional[dict] = None
    stage4_formatter: Optional[dict] = None
