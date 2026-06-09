#!/usr/bin/env python3
"""Test all images in set2"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from PIL import Image
from app.local_model import ConvNeXtProduction

# Use relative path from project root
PROJECT_ROOT = Path(__file__).parent.parent.parent
SET2_PATH = PROJECT_ROOT / "data/nrct/activity_samples/set2"

model = ConvNeXtProduction(device='cpu')

print("=" * 70)
print("🧪 Testing SET2 Images")
print("=" * 70)

pathology_names = {
    0: 'FFC (Fatty Liver)',
    2: 'HCC (Liver Cancer)',
    3: 'Cyst',
    4: 'Hemangioma',
    6: 'CCA (Bile Duct Cancer - Liver Fluke Related)'
}

if not SET2_PATH.exists():
    print(f"❌ SET2 path not found: {SET2_PATH}")
    exit(1)

image_files = sorted([f for f in os.listdir(SET2_PATH) if f.endswith('.jpg')])

for img_name in image_files:
    img_path = SET2_PATH / img_name
    
    try:
        # Determine expected result from filename
        if img_name.startswith('F0_'):
            expected = 'F0 (Normal)'
            expected_stage = 0
        elif img_name.startswith('F1_'):
            expected = 'F1 (Mild Fibrosis)'
            expected_stage = 1
        elif img_name.startswith('F2_'):
            expected = 'F2 (Moderate Fibrosis)'
            expected_stage = 2
        elif img_name.startswith('F3_'):
            expected = 'F3 (Severe Fibrosis)'
            expected_stage = 3
        elif img_name.startswith('F4_'):
            expected = 'F4 (Cirrhosis)'
            expected_stage = 4
        elif img_name.startswith('Lesion_'):
            expected = 'Lesion (HCC/Cancer)'
            expected_stage = None
        elif img_name.startswith('Parasite_Benign_'):
            expected = 'Benign (Cyst)'
            expected_stage = None
        elif img_name.startswith('Parasite_Malignant_'):
            expected = 'Malignant (HCC/CCA)'
            expected_stage = None
        elif img_name.startswith('Parasite_Normal_'):
            expected = 'Normal/FFC'
            expected_stage = None
        else:
            expected = 'Unknown'
            expected_stage = None
        
        image = Image.open(img_path)
        result = model.predict(image, filename=img_name)
        
        print(f'\n📸 {img_name}:')
        print(f'   Expected: {expected}')
        print(f'   Predicted Fibrosis: F{result["class_id"]} (Confidence: {result["class_prob"]:.0%})')
        print(f'   Liver Stiffness: {result["regression_value"]:.1f} kPa')
        
        if result.get('pathology_id') is not None:
            pathology = pathology_names.get(result['pathology_id'], f"Unknown ID-{result['pathology_id']}")
            print(f'   🔴 Pathology: {pathology} (Confidence: {result["pathology_prob"]:.0%})')
        else:
            print(f'   ✅ No significant pathology detected')
        
        # Check if prediction matches expected
        if expected_stage is not None and result["class_id"] == expected_stage:
            print(f'   ✅ MATCH!')
        elif expected_stage is not None:
            print(f'   ⚠️  MISMATCH! Expected F{expected_stage}, got F{result["class_id"]}')
            
    except Exception as e:
        print(f'\n❌ Error with {img_name}: {e}')
        import traceback
        traceback.print_exc()

print(f'\n{"=" * 70}')
print("✅ Test complete!")
print("=" * 70)
