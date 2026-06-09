from pydantic import BaseModel, Field
from typing import List, Optional

class QualityGateResult(BaseModel):
    passed: bool = Field(description="True if the image is valid and readable, False if it is corrupted, unreadable, or not a medical image.")
    reject_reason: Optional[str] = Field(description="Reason for rejection if passed is False. Empty if passed is True.")

class Stage2Findings(BaseModel):
    confidence: float = Field(description="Confidence score between 0.0 and 1.0", ge=0.0, le=1.0)
    primary_finding: str = Field(description="Summary of the main clinical finding.")
    visual_insights: List[str] = Field(description="Specific visual features observed in the image.")
    type: Optional[str] = Field(None, description="Pathology type classification (e.g. hemorrhage, ischemic) if applicable.")
    volume: Optional[float] = Field(None, description="Volume estimation if applicable.")

class Stage3Critique(BaseModel):
    agrees_with_stage2: bool = Field(description="True if the critique agent agrees with the analyst agent's findings.")
    critique_notes: str = Field(description="Detailed critique, pointing out potential hallucinations, missed artifacts, or confirming the findings.")
    adjusted_risk_level: str = Field(description="The risk level (e.g., Low, Medium, High, Critical) adjusted after critique. Follows safety-first principles.")

class Stage4Formatter(BaseModel):
    primary_finding: str = Field(description="Final synthesized primary finding translated into appropriate medical language (Thai).")
    explainable_insights: List[str] = Field(description="Key insights explaining the reasoning.")
    actionable_recommendations: str = Field(description="Actionable next steps or recommendations for the physician.")
    synoptic_report: Optional[dict] = Field(None, description="Detailed CAP-style synoptic report fields (e.g. Histologic Type, Margins, LVI).")

class PipelineResult(BaseModel):
    stage1_quality_gate: QualityGateResult
    stage2_analysis: Optional[dict] = None
    stage3_critique: Optional[dict] = None
    stage4_formatter: Optional[dict] = None
