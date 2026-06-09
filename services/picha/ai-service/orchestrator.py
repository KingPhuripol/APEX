"""
PICHA Pathology Orchestrator — Sequential Direct Agent Calls
Delegates to 7 specialist agents in sequence, handles QC gate.

Hybrid ML pipeline:
  - ml_prescreen() is called ONCE here before agents are instantiated.
  - ml_context is injected into SlideQCAgent + GradingAgent system messages.
  - If ml-service is down → graceful fallback, agents run without ML prior.
"""
import os
import re
import ast
import json
from dataclasses import dataclass, field
from typing import AsyncGenerator

from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.messages import TextMessage
from autogen_core import CancellationToken

from agents import create_all_agents
from models import groq_client, AGENT_MODELS
from models.config import ML_CONFIDENCE_THRESHOLD
from services import ml_prescreen, build_ml_context


def _strip_markdown(text: str) -> str:
    """Remove common LLM markdown artifacts from plain-text fields."""
    # Remove **bold** and __bold__
    text = re.sub(r'\*{1,3}([^*]+?)\*{1,3}', r'\1', text)
    text = re.sub(r'_{1,2}([^_]+?)_{1,2}', r'\1', text)
    # Remove ### headings
    text = re.sub(r'^#{1,6}\s*', '', text, flags=re.MULTILINE)
    # Remove backtick inline code
    text = re.sub(r'`([^`]+)`', r'\1', text)
    # Remove leading bullet chars (* - •) from line starts
    text = re.sub(r'^\s*[\*\-•]\s+', '', text, flags=re.MULTILINE)
    # Collapse multiple blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def _clean_agent_json(raw: str) -> str:
    """Parse JSON/Python dict from agent output, strip markdown, return clean JSON string.
    Handles: valid JSON, Python-style dicts (single quotes), multiple dicts concatenated.
    """
    def _try_parse(text: str) -> dict | None:
        text = text.strip()
        try:
            obj = json.loads(text)
            if isinstance(obj, dict):
                return obj
        except (json.JSONDecodeError, ValueError):
            pass
        try:
            obj = ast.literal_eval(text)
            if isinstance(obj, dict):
                return obj
        except Exception:
            pass
        return None

    def _clean_obj(obj: dict) -> dict:
        out = {}
        for k, v in obj.items():
            if isinstance(v, str):
                out[k] = _strip_markdown(v)
            elif isinstance(v, list):
                out[k] = [_strip_markdown(x) if isinstance(x, str) else x for x in v]
            elif isinstance(v, dict):
                out[k] = _clean_obj(v)
            else:
                out[k] = v
        return out

    # 1. Try from first { to last } as a single object
    start = raw.find('{')
    if start < 0:
        return _strip_markdown(raw)
    end = raw.rfind('}') + 1
    if end > start:
        obj = _try_parse(raw[start:end])
        if obj is not None:
            return json.dumps(_clean_obj(obj))

    # 2. Extract and merge all top-level {…} blocks (multiple dicts from one agent)
    merged: dict = {}
    pos = start
    while pos < len(raw):
        idx = raw.find('{', pos)
        if idx < 0:
            break
        depth = 0
        end_idx = -1
        for i in range(idx, len(raw)):
            if raw[i] == '{':
                depth += 1
            elif raw[i] == '}':
                depth -= 1
                if depth == 0:
                    end_idx = i
                    break
        if end_idx < 0:
            break
        obj = _try_parse(raw[idx:end_idx + 1])
        if obj is not None:
            merged.update(_clean_obj(obj))
        pos = end_idx + 1

    if merged:
        return json.dumps(merged)

    return _strip_markdown(raw)


@dataclass
class AnalysisRequest:
    slide_description: str
    specimen_type: str = "Bile duct biopsy"
    clinical_context: str = ""
    slide_id: str = ""
    patient_id: str = ""
    patient_region: str = "Southeast Asia"
    image_base64: str = ""


@dataclass
class AnalysisProgress:
    agent_name: str
    step_type: str   # "thinking" | "tool_call" | "tool_result" | "conclusion" | "ml_prescreen"
    message: str
    is_final: bool = False
    metadata: dict = field(default_factory=dict)


class PICHAOrchestrator:
    def __init__(self) -> None:
        pass  # no shared client; each agent has its own

    async def _init_agents(self, image_base64: str) -> tuple[dict, str]:
        """
        Call ml-service once, build ml_context, return (agents_dict, ml_context).
        Falls back gracefully if ml-service is unavailable.
        """
        ml_context = ""
        if image_base64:
            ml_result = await ml_prescreen(image_base64)
            if ml_result:
                ml_context = build_ml_context(ml_result, ML_CONFIDENCE_THRESHOLD)
        return create_all_agents(ml_context), ml_context

    async def _call_agent(self, agent: AssistantAgent, task: str) -> str:
        """Call a single agent with a task string, return its text response."""
        response = await agent.on_messages(
            [TextMessage(content=task, source="user")],
            cancellation_token=CancellationToken(),
        )
        content = response.chat_message.content if response.chat_message else ""
        return str(content)

    async def analyze(self, request: AnalysisRequest) -> AsyncGenerator[AnalysisProgress, None]:
        # ── Step 0: ML pre-screen (once, before all agents) ──────────────────
        agents, ml_context = await self._init_agents(request.image_base64)
        if ml_context:
            yield AnalysisProgress(
                agent_name="MLPrescreen",
                step_type="ml_prescreen",
                message="ConvNeXt pre-screen complete. Context injected into SlideQC + Grading agents.",
                metadata={"ml_context_length": len(ml_context)},
            )

        case_context = (
            f"Specimen: {request.specimen_type}\n"
            f"Patient region: {request.patient_region}\n"
            f"Clinical context: {request.clinical_context or 'Not provided'}\n"
            f"Slide description: {request.slide_description}"
        )

        # ── Step 1: Slide QC ──────────────────────────────────────────────────
        qc_task = f"Evaluate slide quality for CCA analysis.\n{case_context}"
        yield AnalysisProgress(agent_name="SlideQCAgent", step_type="thinking",
                               message="Evaluating slide quality…")
        try:
            qc_result = _clean_agent_json(await self._call_agent(agents["slide_qc"], qc_task))
        except Exception as exc:
            qc_result = f"QC check skipped: {exc}"
        yield AnalysisProgress(agent_name="SlideQCAgent", step_type="conclusion",
                               message=qc_result)

        # ── Step 2: Parasitologist ────────────────────────────────────────────
        para_task = (
            f"Detect OV parasite eggs and biliary changes in bile duct biopsy "
            f"from Southeast Asia.\n{case_context}\nQC result: {qc_result[:300]}"
        )
        yield AnalysisProgress(agent_name="ParasitologistAgent", step_type="thinking",
                               message="Analyzing for parasitic changes…")
        try:
            para_result = _clean_agent_json(await self._call_agent(agents["parasitologist"], para_task))
        except Exception as exc:
            para_result = f"Parasitology analysis skipped: {exc}"
        yield AnalysisProgress(agent_name="ParasitologistAgent", step_type="conclusion",
                               message=para_result)

        # ── Step 3: Grading ───────────────────────────────────────────────────
        grade_task = (
            f"Grade biliary dysplasia using WHO BilIN classification.\n{case_context}\n"
            f"Parasitologist findings: {para_result[:300]}"
        )
        yield AnalysisProgress(agent_name="GradingAgent", step_type="thinking",
                               message="Grading biliary dysplasia…")
        try:
            grade_result = _clean_agent_json(await self._call_agent(agents["grading"], grade_task))
        except Exception as exc:
            grade_result = f"Grading skipped: {exc}"
        yield AnalysisProgress(agent_name="GradingAgent", step_type="conclusion",
                               message=grade_result)

        # ── Step 4: Spatial ───────────────────────────────────────────────────
        spatial_task = (
            f"Analyze tumor microenvironment and spatial features.\n{case_context}\n"
            f"Grade: {grade_result[:300]}"
        )
        yield AnalysisProgress(agent_name="SpatialAgent", step_type="thinking",
                               message="Analyzing spatial features…")
        try:
            spatial_result = _clean_agent_json(await self._call_agent(agents["spatial"], spatial_task))
        except Exception as exc:
            spatial_result = f"Spatial analysis skipped: {exc}"
        yield AnalysisProgress(agent_name="SpatialAgent", step_type="conclusion",
                               message=spatial_result)

        # ── Step 5: Oncologist ────────────────────────────────────────────────
        onco_task = (
            f"Provide AJCC staging and treatment recommendations.\n{case_context}\n"
            f"Grade: {grade_result[:300]}\nSpatial: {spatial_result[:300]}"
        )
        yield AnalysisProgress(agent_name="OncologistAgent", step_type="thinking",
                               message="Staging and treatment planning…")
        try:
            onco_result = _clean_agent_json(await self._call_agent(agents["oncologist"], onco_task))
        except Exception as exc:
            onco_result = f"Oncology assessment skipped: {exc}"
        yield AnalysisProgress(agent_name="OncologistAgent", step_type="conclusion",
                               message=onco_result)

        # ── Step 6: Time Machine ──────────────────────────────────────────────
        tm_task = (
            f"Provide survival statistics and prognostic data.\n{case_context}\n"
            f"Stage: {onco_result[:300]}"
        )
        yield AnalysisProgress(agent_name="TimeMachineAgent", step_type="thinking",
                               message="Retrieving survival statistics…")
        try:
            tm_result = _clean_agent_json(await self._call_agent(agents["time_machine"], tm_task))
        except Exception as exc:
            tm_result = f"Prognosis data skipped: {exc}"
        yield AnalysisProgress(agent_name="TimeMachineAgent", step_type="conclusion",
                               message=tm_result)

        # ── Step 7: Report ────────────────────────────────────────────────────
        report_task = (
            f"Compile a structured CAP/WHO pathology report as JSON.\n"
            f"{case_context}\n\n"
            f"QC: {qc_result[:200]}\n"
            f"Parasitology: {para_result[:200]}\n"
            f"Grading: {grade_result[:200]}\n"
            f"Spatial: {spatial_result[:200]}\n"
            f"Oncology: {onco_result[:200]}\n"
            f"Prognosis: {tm_result[:200]}\n\n"
            f"Output as valid JSON with keys: diagnosis, grade, stage, ov_infection, "
            f"recommendations, overall_confidence (0-1 float), summary."
        )
        yield AnalysisProgress(agent_name="ReportAgent", step_type="thinking",
                               message="Compiling final pathology report…")
        try:
            report_raw = await self._call_agent(agents["report"], report_task)
        except Exception as exc:
            report_raw = json.dumps({"error": str(exc)})

        # Extract JSON from report
        try:
            start = report_raw.find("{")
            end = report_raw.rfind("}") + 1
            if start >= 0 and end > start:
                report_json = json.loads(report_raw[start:end])
                final_msg = "FINAL_REPORT: " + json.dumps(report_json)
            else:
                final_msg = "FINAL_REPORT: " + json.dumps({"report_text": report_raw})
        except json.JSONDecodeError:
            final_msg = "FINAL_REPORT: " + json.dumps({"report_text": report_raw})

        yield AnalysisProgress(
            agent_name="ReportAgent",
            step_type="conclusion",
            message=final_msg,
            is_final=True,
        )
