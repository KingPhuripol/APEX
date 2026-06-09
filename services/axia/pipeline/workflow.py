import json
from .schemas import QualityGateResult, Stage2Findings, Stage3Critique, Stage4Formatter, PipelineResult
from llm.client import LLMClient
from utils.ocr_helper import extract_text_from_image

client = LLMClient()

def run_quality_gate(image_bytes: bytes) -> QualityGateResult:
    prompt = (
        "<ROLE> You are a strict Medical Imaging Quality Control (QC) Agent. </ROLE>\n"
        "<TASK> Inspect the provided image to determine if it is a clinically valid and readable medical image (e.g., Ultrasound, CT slice, or Dermatological photo). </TASK>\n"
        "<RULES>\n"
        "1. If the image is completely black, corrupted, heavily blurred, or uninterpretable, reject it.\n"
        "2. If the image is clearly not a medical scan (e.g., a photo of a cat, a landscape, or a random object), reject it immediately.\n"
        "3. If accepted, set 'passed' to true and leave 'reject_reason' empty.\n"
        "4. If rejected, set 'passed' to false and concisely state the reason in 'reject_reason' (e.g., 'Non-medical image detected').\n"
        "</RULES>"
    )
    # Using Groq (fallback role) for ultra-fast validation
    res = client.call_vision(prompt, image_bytes, response_format=QualityGateResult, role="fallback")
    
    # If the response parsed correctly into a dict
    if isinstance(res, dict) and "passed" in res:
        return QualityGateResult(**res)
    else:
        # Failsafe
        return QualityGateResult(passed=True, reject_reason="")

def run_analysis(image_bytes: bytes, target_module: str) -> Stage2Findings:
    module_prompts = {
        "smartliva": (
            "<ROLE> You are a Master Hepatologist and the Head of Hepato-Pancreato-Biliary (HPB) Imaging. </ROLE>\n"
            "<TASK> Execute a definitive sonographic/radiological evaluation of the hepatic system shown in the scan. </TASK>\n"
            "<COGNITIVE_WORKFLOW>\n"
            "1. PARENCHYMAL DISEASE: Evaluate echogenicity against the renal cortex. Look for posterior acoustic attenuation (steatosis) or coarse, nodular echotexture (cirrhosis).\n"
            "2. VASCULATURE & BILIARY: Inspect the portal vein diameter (portal hypertension?) and intra/extra-hepatic bile ducts (dilatation?).\n"
            "3. FOCAL LESION CHARACTERIZATION (If present):\n"
            "   - Echogenicity: Anechoic, hypoechoic, isoechoic, or hyperechoic.\n"
            "   - Margins: Well-defined, ill-defined, or irregular.\n"
            "   - Posterior acoustics: Enhancement (cyst) vs. shadowing (calcification).\n"
            "4. CLINICAL CORRELATION: Correlate your visual findings with potential clinical states (e.g., 'The coarse echotexture is highly suspicious for chronic liver disease/cirrhosis').\n"
            "</COGNITIVE_WORKFLOW>\n"
            "<CLINICAL_CONSTRAINTS>\n"
            "- Never guess the exact Fibrosis Stage (F0-F4) without elastography (kPa) values. Focus entirely on morphological evidence.\n"
            "- State explicitly if the scan window is limited (e.g., bowel gas obscuration, rib shadowing).\n"
            "- Detail your rigorous logic path in 'visual_insights'.\n"
            "</CLINICAL_CONSTRAINTS>"
        ),
        "picha": (
            "<ROLE> You are a World-Class Gastrointestinal Pathologist specializing in Hepato-Pancreato-Biliary (HPB) pathology. </ROLE>\n"
            "<TASK> Conduct a deep histopathological analysis of the provided Whole-Slide Image (WSI) patch (H&E stain). </TASK>\n"
            "<COGNITIVE_WORKFLOW>\n"
            "1. TISSUE CLASSIFICATION: Identify the dominant tissue patterns (e.g., Cancer, Dysplasia, Inflammation, Stroma, Normal, Nerve, Vessel, Bile Duct, Artifact).\n"
            "2. CELLULAR ATYPIA & GRADING: Assess nuclear pleomorphism, mitotic activity, and structural abnormalities indicative of Cholangiocarcinoma or BilIN (Biliary Intraepithelial Neoplasia).\n"
            "3. MICROENVIRONMENT: Evaluate the tumor microenvironment (TME), desmoplastic stroma, and immune cell infiltration.\n"
            "4. INFECTION & COMORBIDITIES: Look for signs of chronic opisthorchiasis (liver fluke infection) or severe fibrosis.\n"
            "</COGNITIVE_WORKFLOW>\n"
            "<CLINICAL_CONSTRAINTS>\n"
            "- You are analyzing cellular morphology and histopathology, NOT radiology or dermatology.\n"
            "- Correlate morphological findings with prognostic staging parameters (e.g., perineural invasion, margin status) if visible.\n"
            "- Base your diagnostic reasoning strongly on standard WHO guidelines for tumors of the digestive system.\n"
            "</CLINICAL_CONSTRAINTS>"
        ),
        "axia": (
            "<ROLE> You are a World-Class Senior Neuroradiologist and Professor of Neuroradiology. </ROLE>\n"
            "<TASK> Perform an exhaustive, structured radiological reading of this Non-Contrast CT (NCCT) brain slice. </TASK>\n"
            "<COGNITIVE_WORKFLOW>\n"
            "1. IMAGE QUALITY: Assess for motion artifacts, beam-hardening, or low signal-to-noise ratio before concluding.\n"
            "2. SYSTEMATIC SEARCH (Inside-Out approach):\n"
            "   - Ventricles & Cisterns: Check for intraventricular hemorrhage, hydrocephalus, or basal cistern effacement.\n"
            "   - Deep Grey Matter: Inspect the thalamus, basal ganglia, and lentiform nucleus for early ischemic hypodensity.\n"
            "   - White & Grey Matter: Look for loss of differentiation (insular ribbon sign, cortical swelling).\n"
            "   - Extra-axial Spaces: Check for Subdural (SDH) or Epidural (EDH) hematomas.\n"
            "   - Calvarium & Scalp: Inspect for skull fractures or subgaleal hematoma.\n"
            "3. PERTINENT NEGATIVES: You MUST explicitly state absence of critical findings (e.g., 'No midline shift', 'No dense MCA sign').\n"
            "</COGNITIVE_WORKFLOW>\n"
            "<CLINICAL_CONSTRAINTS>\n"
            "- If hemorrhage is found, classify the compartment (epidural, subdural, subarachnoid, intraparenchymal, intraventricular).\n"
            "- Grade the severity of mass effect (none, mild, moderate, severe) and midline shift in mm (if determinable).\n"
            "- Use exact neuroanatomical lexicon. Never use layman terms.\n"
            "</CLINICAL_CONSTRAINTS>"
        )
    }
    
    base_prompt = module_prompts.get(target_module, "Analyze the following medical image objectively.")
    
    res = client.call_vision(base_prompt, image_bytes, response_format=Stage2Findings, role="primary")
    if isinstance(res, dict):
        return Stage2Findings(**res)
    else:
        return Stage2Findings(confidence=0.5, primary_finding="Unable to parse findings.", visual_insights=[])

def run_critique(ocr_text: str, stage2_findings: Stage2Findings, target_module: str) -> Stage3Critique:
    prompt = (
        "<ROLE> You are a Chief Medical Auditor and a highly skeptical AI safety layer. </ROLE>\n"
        "<TASK> You are auditing the findings of a Junior AI Agent. You must review the text extracted from the medical image (OCR) alongside the Junior Agent's report below: </TASK>\n\n"
        f"--- IMAGE OCR TEXT ---\n{ocr_text or 'No text found in image.'}\n----------------------\n\n"
        f"--- JUNIOR AGENT REPORT ---\n{json.dumps(stage2_findings.model_dump(), indent=2)}\n---------------------------\n\n"
        "<INSTRUCTIONS>\n"
        "1. Actively look for 'Hallucinations' (features the Junior claimed exist but are absent in the OCR text or report).\n"
        "2. Check for 'Missed Pathologies' (critical findings the Junior failed to notice).\n"
        "3. Apply 'Safety-First / Defensive Medicine' principles: If the data is ambiguous, lean towards the more conservative/cautious risk assessment.\n"
        "4. Determine 'agrees_with_stage2'. If you strongly disagree with the primary finding, set this to false and explain why in 'critique_notes'.\n"
        "5. Output 'adjusted_risk_level' (e.g., 'Normal', 'Low', 'Moderate', 'High', 'Critical').\n"
        "</INSTRUCTIONS>"
    )
    
    # Using Typhoon (critique role) - MUST CALL TEXT, NOT VISION
    res = client.call_text(prompt, response_format=Stage3Critique, role="critique")
    if isinstance(res, dict):
        return Stage3Critique(**res)
    else:
        return Stage3Critique(agrees_with_stage2=True, critique_notes="No critique available.", adjusted_risk_level="Unknown")

def run_formatter(stage2_findings: Stage2Findings, stage3_critique: Stage3Critique, target_module: str) -> Stage4Formatter:
    picha_instruction = ""
    if target_module == "picha":
        picha_instruction = (
            "5. Since this is a digital pathology analysis, you MUST provide a detailed CAP Synoptic Report. "
            "Output this as key-value pairs in the 'synoptic_report' field (e.g., 'Histologic Type': 'Cholangiocarcinoma', 'Histologic Grade': 'G3', 'Margins': 'R0', 'LVI': 'Present', 'pTNM Stage': 'pT3 N1').\n"
        )
        
    prompt = (
        "<ROLE> You are a World-Class Medical Communicator and Chief Diagnostician at a leading global medical center. </ROLE>\n"
        "<TASK> Synthesize the Initial Findings and Senior Critique below into a structured, professional Medical Report (in English) ready for clinical use. </TASK>\n\n"
        f"--- INITIAL FINDINGS ---\n{json.dumps(stage2_findings.model_dump(), indent=2)}\n\n"
        f"--- SENIOR CRITIQUE ---\n{json.dumps(stage3_critique.model_dump(), indent=2)}\n\n"
        "<INSTRUCTIONS>\n"
        "1. 'primary_finding': A clear, concise, and definitive diagnostic statement (in English).\n"
        "2. 'explainable_insights': Key imaging/pathological evidence supporting the diagnosis (bullet points in English). For pathology, this should be the 'Microscopic Description'.\n"
        "3. 'actionable_recommendations': Clear, actionable clinical next steps (e.g., 'Recommend MRI for further evaluation', 'Surgical consultation advised', 'Routine follow-up in 6 months').\n"
        "4. Use strictly professional medical terminology (US/International standard) and do NOT fabricate information not present in the inputs.\n"
        f"{picha_instruction}"
        "</INSTRUCTIONS>"
    )
    
    # Text-only call for formatting, using Typhoon
    res = client.call_text(prompt, response_format=Stage4Formatter, role="critique")
    if isinstance(res, dict):
        return Stage4Formatter(**res)
    else:
        return Stage4Formatter(primary_finding="Failed to generate report", explainable_insights=[], actionable_recommendations="Please review manually.")

def run_pipeline(image_bytes: bytes, target_module: str) -> PipelineResult:
    # Stage 1: Quality Gate
    q_gate = run_quality_gate(image_bytes)
    if not q_gate.passed:
        return PipelineResult(stage1_quality_gate=q_gate)
        
    # Extract OCR Text
    ocr_text = extract_text_from_image(image_bytes=image_bytes)
    
    # Stage 2: Analyst
    analysis = run_analysis(image_bytes, target_module)
    
    # Stage 3: Critique
    critique = run_critique(ocr_text, analysis, target_module)
    
    # Stage 4: Formatter
    formatter = run_formatter(analysis, critique, target_module)
    
    return PipelineResult(
        stage1_quality_gate=q_gate,
        stage2_analysis=analysis.model_dump(),
        stage3_critique=critique.model_dump(),
        stage4_formatter=formatter.model_dump()
    )
