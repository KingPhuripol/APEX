#!/usr/bin/env python3
"""Test Lesion image predictions"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from PIL import Image
from app.local_model import ConvNeXtProduction

# Use relative path from project root
PROJECT_ROOT = Path(__file__).parent.parent.parent
DATA_PATH = PROJECT_ROOT / "data/nrct/activity_samples/set1"

model = ConvNeXtProduction(device='cpu')

print("=" * 70)
print("🧪 Testing Lesion Images")
print("=" * 70)

for img_num in ['01', '02', '03']:
    img_path = DATA_PATH / f'Lesion_{img_num}.jpg'
    filename = f'Lesion_{img_num}.jpg'
    
    try:
        image = Image.open(img_path)
        result = model.predict(image, filename=filename)
        
        print(f'\n📸 {filename}:')
        print(f'   Fibrosis Stage: F{result["class_id"]} (Confidence: {result["class_prob"]:.0%})')
        print(f'   Liver Stiffness: {result["regression_value"]:.1f} kPa')
        
        if result.get('pathology_id') is not None:
            pathology_names = {
                0: 'Fatty Liver (FFC)',
                2: 'HCC (Liver Cancer)',
                3: 'Cyst',
                6: 'CCA (Bile Duct Cancer)'
            }
            pathology = pathology_names.get(result['pathology_id'], f"Unknown ID-{result['pathology_id']}")
            print(f'   🔴 Pathology Detected: {pathology}')
            print(f'   🔴 Pathology Confidence: {result["pathology_prob"]:.0%}')
        else:
            print(f'   ✅ No significant pathology detected')
            
    except Exception as e:
        print(f'\n❌ Error with {filename}: {e}')
        import traceback
        traceback.print_exc()

print(f'\n{"=" * 70}')
print("✅ Test complete!")
print("=" * 70)
