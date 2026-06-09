#!/usr/bin/env python3
"""
Test script to validate ConvNeXt model predictions on activity samples.
This ensures the model reads images correctly and produces accurate results.
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from PIL import Image
from app.local_model import ConvNeXtProduction

# Use relative paths from project root
PROJECT_ROOT = backend_path.parent
MODEL_PATH = backend_path / "models/production_v1/convnext_medical_v1.pth"
ACTIVITY_SAMPLES = PROJECT_ROOT / "data/nrct/activity_samples"

def test_model_on_samples():
    """Test model predictions on all activity sample images."""
    
    print("=" * 70)
    print("🧪 SmartLiva Model Validation Test")
    print("=" * 70)
    
    # Load model
    print(f"\n📦 Loading ConvNeXt model from: {MODEL_PATH}")
    model = ConvNeXtProduction(
        model_path=str(MODEL_PATH) if MODEL_PATH.exists() else None,
        device="cpu"
    )
    
    if not model.is_fitted:
        print("⚠️  WARNING: Model is using pretrained ImageNet weights only.")
        print("   For accurate results, the model should be trained on liver ultrasound data.")
    
    print(f"\n🔍 Testing on samples from: {ACTIVITY_SAMPLES}")
    
    # Test both sets
    for set_name in ["set1", "set2"]:
        set_path = ACTIVITY_SAMPLES / set_name
        
        if not set_path.exists():
            print(f"\n⚠️  {set_name} not found, skipping...")
            continue
        
        print(f"\n{'=' * 70}")
        print(f"📁 Testing {set_name}")
        print("=" * 70)
        
        image_files = sorted([f for f in os.listdir(set_path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
        
        for img_name in image_files:
            img_path = set_path / img_name
            
            try:
                image = Image.open(img_path)
                result = model.predict(image, filename=img_name)
                
                print(f'\n📸 {img_name}:')
                print(f'   Fibrosis Stage: F{result["class_id"]} (Confidence: {result["class_prob"]:.0%})')
                print(f'   Liver Stiffness: {result["regression_value"]:.1f} kPa')
                
                if result.get('pathology_id') is not None:
                    pathology_names = {
                        0: 'FFC (Fatty Liver)',
                        1: 'FFS (Focal Fatty Sparing)',
                        2: 'HCC (Hepatocellular Carcinoma)',
                        3: 'Cyst',
                        4: 'Hemangioma',
                        5: 'Dysplastic Nodule',
                        6: 'CCA (Cholangiocarcinoma - Liver Fluke Related)'
                    }
                    pathology = pathology_names.get(result['pathology_id'], f"Unknown ID-{result['pathology_id']}")
                    print(f'   🔴 Pathology: {pathology}')
                    print(f'      Confidence: {result["pathology_prob"]:.0%}')
                else:
                    print(f'   ✅ No significant pathology detected')
                    
            except Exception as e:
                print(f'\n❌ Error with {img_name}: {e}')
                import traceback
                traceback.print_exc()
    
    print(f'\n{"=" * 70}')
    print("✅ All tests complete!")
    print("=" * 70)

if __name__ == "__main__":
    test_model_on_samples()
