import os
import csv
import shutil
import random
import torch
import torchvision.transforms as T
from torchvision import models
from PIL import Image

source_dir = "/Users/king_phuripol/AI-Engineer/01_Projects/ML-DeepLearning/China/Archive (1)/HMU-GC-HE-30K/all_image"
clinical_csv = "/Users/king_phuripol/AI-Engineer/01_Projects/ML-DeepLearning/China/Archive (1)/HMU-GC-Clinical.csv"
out_dir = "/Users/king_phuripol/AI-Engineer/01_Projects/ML-DeepLearning/China/datasetforchina/picha_test_images"
csv_path = "/Users/king_phuripol/AI-Engineer/01_Projects/ML-DeepLearning/China/datasetforchina/picha_test_ground_truth.csv"
model_path = "/Users/king_phuripol/AI-Engineer/01_Projects/ML-DeepLearning/China/APEX Clinical AI Platform/services/picha/ml-service/model/convnext_base_best.pth"

# Map source classes to model class names (to correctly log ground truth)
class_map = {
    "ADI": "adipose",
    "DEB": "debris",
    "LYM": "lymphocytes",
    "MUC": "mucus",
    "MUS": "smooth_muscle",
    "NOR": "normal_colon",
    "STR": "stroma",
    "TUM": "colorectal_cancer"
}

# 9 classes matching training data
TISSUE_CLASSES = [
    "adipose", "colorectal_cancer", "debris", "lymphocytes", "mucus",
    "normal_colon", "normal_colon_v2", "smooth_muscle", "stroma"
]

HE_MEAN = [0.757, 0.619, 0.713]
HE_STD  = [0.163, 0.202, 0.153]

TRANSFORM = T.Compose([
    T.Resize(400),
    T.CenterCrop(380),
    T.ToTensor(),
    T.Normalize(mean=HE_MEAN, std=HE_STD),
])

def load_clinical_data(filepath):
    data = []
    with open(filepath, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append(row)
    return data

def main():
    os.makedirs(out_dir, exist_ok=True)
    
    # Load Model
    print("Loading model...")
    device = "cpu"
    model = models.convnext_base(weights=None)
    model.classifier[2] = torch.nn.Linear(model.classifier[2].in_features, len(TISSUE_CLASSES))
    
    try:
        ckpt = torch.load(model_path, map_location=device)
        state = ckpt["model"] if isinstance(ckpt, dict) and "model" in ckpt else ckpt
        model.load_state_dict(state)
        model.eval()
        print("Model loaded successfully.")
    except Exception as e:
        print(f"Failed to load model: {e}")
        return

    # Load Clinical Data
    print("Loading clinical data...")
    clinical_data = load_clinical_data(clinical_csv)
    
    results = []
    classes = sorted([d for d in os.listdir(source_dir) if os.path.isdir(os.path.join(source_dir, d))])
    random.seed(42)
    
    print("Selecting images and running inference...")
    for cls in classes:
        if cls not in class_map:
            continue
            
        gt_label = class_map[cls]
        class_dir = os.path.join(source_dir, cls)
        images = [f for f in os.listdir(class_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        
        # 3 images per class for demo
        sampled = random.sample(images, min(3, len(images)))
        
        for img_name in sampled:
            src_path = os.path.join(class_dir, img_name)
            new_name = f"{cls}_{img_name}"
            dst_path = os.path.join(out_dir, new_name)
            
            # Predict
            img = Image.open(src_path).convert("RGB")
            tensor = TRANSFORM(img).unsqueeze(0).to(device)
            with torch.no_grad():
                logits = model(tensor)
                probs = torch.softmax(logits, dim=1)[0].cpu().tolist()
                
            top_idx = int(torch.argmax(torch.tensor(probs)))
            pred_label = TISSUE_CLASSES[top_idx]
            confidence = round(probs[top_idx], 4)
            
            # Select random clinical record
            patient = random.choice(clinical_data)
            
            # Save Image
            shutil.copy2(src_path, dst_path)
            
            results.append({
                "Filename": new_name,
                "GroundTruth": gt_label,
                "Predicted": pred_label,
                "Confidence": confidence,
                "Patient_ID": patient.get("Patient", ""),
                "Age": patient.get("Age", ""),
                "Sex": patient.get("Sex", ""),
                "T_Staging": patient.get("T staging", ""),
                "N_Staging": patient.get("N staging", ""),
                "M_Staging": patient.get("M staging", ""),
                "Histological_Type": patient.get("Histological Type", "")
            })
            
            print(f"Processed {new_name} -> Pred: {pred_label} ({confidence})")

    # Write CSV
    with open(csv_path, mode='w', newline='', encoding='utf-8') as f:
        fieldnames = ["Filename", "GroundTruth", "Predicted", "Confidence", "Patient_ID", "Age", "Sex", "T_Staging", "N_Staging", "M_Staging", "Histological_Type"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)
        
    print(f"\nSuccessfully prepared {len(results)} images in {out_dir}")
    print(f"Results saved to {csv_path}")

if __name__ == "__main__":
    main()
