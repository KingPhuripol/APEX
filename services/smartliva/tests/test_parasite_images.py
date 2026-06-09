#!/usr/bin/env python3
"""Test Parasite image predictions"""

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
print("🧪 Testing Parasite Images")
print("=" * 70)

pathology_names = {
    0: 'FFC (Fatty Liver)',
    1: 'FFS (Focal Fatty Sparing)',
    2: 'HCC (Hepatocellular Carcinoma / มะเร็งตับ)',
    3: 'Cyst (Liver Cyst / ถุงน้ำในตับ)',
    4: 'Hemangioma (เนื้องอกหลอดเลือด)',
    5: 'Dysplastic Nodule (ก้อนเนื้อตับ)',
    6: 'CCA (Cholangiocarcinoma / มะเร็งท่อน้ำดี) - Liver Fluke Related'
}

for img_name in ['Parasite_Benign_01.jpg', 'Parasite_Malignant_01.jpg', 'Parasite_Normal_01.jpg']:
    img_path = DATA_PATH / img_name
    
    try:
        image = Image.open(img_path)
        result = model.predict(image, filename=img_name)
        
        print(f'\n📸 {img_name}:')
        print(f'   Fibrosis Stage: F{result["class_id"]} (Confidence: {result["class_prob"]:.0%})')
        print(f'   Liver Stiffness: {result["regression_value"]:.1f} kPa')
        
        if result.get('pathology_id') is not None:
            pathology = pathology_names.get(result['pathology_id'], f"Unknown ID-{result['pathology_id']}")
            print(f'   🔴 Pathology: {pathology}')
            print(f'      Confidence: {result["pathology_prob"]:.0%}')
            
            # Special note for CCA
            if result['pathology_id'] == 6:
                print(f'      ⚠️  CCA is associated with Liver Fluke (พยาธิใบไม้ตับ)')
        else:
            print(f'   ✅ No significant pathology detected')
            
    except Exception as e:
        print(f'\n❌ Error with {img_name}: {e}')
        import traceback
        traceback.print_exc()

print(f'\n{"=" * 70}')
print("✅ Test complete!")
print("=" * 70)
