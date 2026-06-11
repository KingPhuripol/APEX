import os
import sys
from pathlib import Path

# Override to use global .env before loading anything
from dotenv import load_dotenv
global_env = Path(__file__).parent.parent.parent / '.env'
load_dotenv(global_env)

# Ensure OPENAI_API_KEY is loaded
if not os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY") == "your_openai_api_key_here":
    print("❌ OPENAI_API_KEY is missing or invalid.")
    sys.exit(1)

# Import axia pipeline
sys.path.insert(0, str(Path(__file__).parent))
from pipeline.workflow import run_pipeline

tests = [
    {
        "module": "axia",
        "name": "Brain CT (Hemorrhage EDH)",
        "path": Path(__file__).parent.parent.parent / "datasetforchina" / "axia_test_images" / "sample01.png"
    },
    {
        "module": "picha",
        "name": "Pathology Slide (Tumor)",
        "path": Path(__file__).parent.parent.parent / "datasetforchina" / "picha_test_images" / "sample01.png"
    },
    {
        "module": "smartliva",
        "name": "Liver Ultrasound (Fibrosis F3)",
        "path": Path(__file__).parent.parent.parent / "datasetforchina" / "smartliva_test_images" / "sample01.jpg"
    }
]

for test in tests:
    print("\n" + "="*60)
    print(f"🧪 TESTING MODULE: {test['module'].upper()} - {test['name']}")
    print("="*60)
    
    if not test['path'].exists():
        print(f"❌ Test image not found at {test['path']}")
        continue

    print(f"✅ Found test image: {test['path'].name}")
    print("🚀 Sending to APEX Pipeline (via OpenAI)... Please wait...")

    with open(test['path'], "rb") as f:
        img_bytes = f.read()

    try:
        res = run_pipeline(img_bytes, test['module'])
        
        # Check if dict (dumped from run_pipeline or direct)
        if hasattr(res, 'stage1_quality_gate'):
            qg = res.stage1_quality_gate
            formatter = res.stage4_formatter
        else:
            qg = res.get('stage1_quality_gate', {})
            formatter = res.get('stage4_formatter', {})

        is_passed = getattr(qg, 'passed', qg.get('passed', False)) if hasattr(qg, 'get') else qg.passed

        if not is_passed:
            reject_reason = getattr(qg, 'reject_reason', qg.get('reject_reason')) if hasattr(qg, 'get') else qg.reject_reason
            print(f"❌ Quality Gate Failed: {reject_reason}")
        else:
            primary_finding = getattr(formatter, 'primary_finding', formatter.get('primary_finding', 'N/A')) if hasattr(formatter, 'get') else formatter.primary_finding
            print(f"\n🩺 Primary Finding:\n  {primary_finding}")
            
            insights = getattr(formatter, 'explainable_insights', formatter.get('explainable_insights', [])) if hasattr(formatter, 'get') else formatter.explainable_insights
            print(f"\n💡 Explainable Insights:")
            for insight in insights:
                print(f"  - {insight}")
                
            rec = getattr(formatter, 'actionable_recommendations', formatter.get('actionable_recommendations', 'N/A')) if hasattr(formatter, 'get') else formatter.actionable_recommendations
            print(f"\n🚨 Actionable Recommendations:\n  {rec}")

    except Exception as e:
        import traceback
        print("\n❌ PIPELINE ERROR ❌")
        traceback.print_exc()

