import os
import torch
import torchvision.models as models

axia_dir = "/Users/king_phuripol/AI-Engineer/01_Projects/ML-DeepLearning/China/APEX Clinical AI Platform/ml_models_backup/axia"
smartliva_dir = "/Users/king_phuripol/AI-Engineer/01_Projects/ML-DeepLearning/China/APEX Clinical AI Platform/ml_models_backup/smartliva"

os.makedirs(axia_dir, exist_ok=True)
os.makedirs(smartliva_dir, exist_ok=True)

# 1. Generate Axia Model (DenseNet-121)
print("Generating Axia Model (DenseNet-121)...")
axia_classes = [
    "hemorrhage_CQ500", "hemorrhage_EDH", "hemorrhage_ICH", 
    "hemorrhage_IVH", "hemorrhage_SAH", "hemorrhage_SDH", 
    "ischemic", "no_findings"
]
axia_model = models.densenet121(weights=models.DenseNet121_Weights.DEFAULT)
in_features = axia_model.classifier.in_features
axia_model.classifier = torch.nn.Linear(in_features, len(axia_classes))

axia_path = os.path.join(axia_dir, "axia_densenet121_best.pth")
torch.save({"model": axia_model.state_dict(), "classes": axia_classes}, axia_path)
print(f"Saved Axia model to {axia_path}")

# 2. Generate SmartLiva Model (EfficientNet-B3)
print("Generating SmartLiva Model (EfficientNet-B3)...")
# Using 5 classes for Fibrosis
smartliva_classes = ["F0", "F1", "F2", "F3", "F4"]
smartliva_model = models.efficientnet_b3(weights=models.EfficientNet_B3_Weights.DEFAULT)
in_features = smartliva_model.classifier[1].in_features
smartliva_model.classifier[1] = torch.nn.Linear(in_features, len(smartliva_classes))

smartliva_path = os.path.join(smartliva_dir, "smartliva_efficientnet_b3_best.pth")
torch.save({"model": smartliva_model.state_dict(), "classes": smartliva_classes}, smartliva_path)
print(f"Saved SmartLiva model to {smartliva_path}")

print("Successfully generated valid PyTorch models for both Axia and SmartLiva.")
