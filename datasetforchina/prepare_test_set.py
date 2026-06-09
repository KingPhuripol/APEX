import os
import cv2
import csv
import random

base_dir = "/Users/king_phuripol/AI-Engineer/01_Projects/ML-DeepLearning/China/smartliva-data"
out_dir = "/Users/king_phuripol/AI-Engineer/01_Projects/ML-DeepLearning/China/datasetforchina/test_images"
os.makedirs(out_dir, exist_ok=True)

csv_path = "/Users/king_phuripol/AI-Engineer/01_Projects/ML-DeepLearning/China/datasetforchina/test_ground_truth.csv"

def preprocess_and_save(img_path, save_name):
    img = cv2.imread(img_path)
    if img is None: return False
    h, w = img.shape[:2]
    # Crop 15% from borders to remove ultrasound artifacts/text
    x1, y1 = int(w*0.15), int(h*0.15)
    x2, y2 = int(w*0.85), int(h*0.85)
    cropped = img[y1:y2, x1:x2]
    # Resize to standard model input dimension, e.g., 256x256
    resized = cv2.resize(cropped, (256, 256))
    cv2.imwrite(os.path.join(out_dir, save_name), resized)
    return True

results = []
random.seed(42) # For reproducibility

# 1. Process Dataset-1 (Fibrosis F0-F4)
d1_classes = ['F0', 'F1', 'F2', 'F3', 'F4']
for cls in d1_classes:
    folder = os.path.join(base_dir, "Dataset-1", cls)
    if os.path.exists(folder):
        images = [f for f in os.listdir(folder) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        sampled = random.sample(images, min(5, len(images)))
        for i, img_name in enumerate(sampled):
            save_name = f"fibrosis_test_{cls}_{i+1}.jpg"
            if preprocess_and_save(os.path.join(folder, img_name), save_name):
                results.append([save_name, "Liver Fibrosis", cls])

# 2. Process Dataset-2 (Fatty Liver Class_0, Class_1)
d2_classes = ['Class_0', 'Class_1']
d2_labels = {'Class_0': 'Normal', 'Class_1': 'Fatty Liver'}
for cls in d2_classes:
    folder = os.path.join(base_dir, "Dataset-2", "PNG_Images", cls)
    if os.path.exists(folder):
        images = [f for f in os.listdir(folder) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        sampled = random.sample(images, min(5, len(images)))
        for i, img_name in enumerate(sampled):
            save_name = f"fattyliver_test_{cls}_{i+1}.jpg"
            if preprocess_and_save(os.path.join(folder, img_name), save_name):
                results.append([save_name, "Fatty Liver", d2_labels[cls]])

with open(csv_path, mode='w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(["Filename", "Task", "GroundTruth_Label"])
    writer.writerows(results)

print(f"Preprocessed {len(results)} testing images and saved ground truth to CSV.")
