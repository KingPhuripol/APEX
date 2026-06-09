import os
import csv
import shutil
import random

source_dir = "/Users/king_phuripol/AI-Engineer/01_Projects/ML-DeepLearning/China/axia_demo/demo_image_PNG"
out_dir = "/Users/king_phuripol/AI-Engineer/01_Projects/ML-DeepLearning/China/datasetforchina/axia_test_images"
csv_path = "/Users/king_phuripol/AI-Engineer/01_Projects/ML-DeepLearning/China/datasetforchina/axia_test_ground_truth.csv"

os.makedirs(out_dir, exist_ok=True)

results = []
classes = sorted([d for d in os.listdir(source_dir) if os.path.isdir(os.path.join(source_dir, d))])
random.seed(42)

for cls in classes:
    class_dir = os.path.join(source_dir, cls)
    images = [f for f in os.listdir(class_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
    # ดึงมาไม่เกิน 5 รูปต่อคลาสเพื่อเป็นชุด Test สั้นๆ
    sampled = random.sample(images, min(5, len(images)))
    
    for i, img_name in enumerate(sampled):
        src_path = os.path.join(class_dir, img_name)
        # เติมชื่อคลาสนำหน้าเพื่อป้องกันชื่อไฟล์ซ้ำ
        new_name = f"{cls}_{img_name}"
        dst_path = os.path.join(out_dir, new_name)
        
        shutil.copy2(src_path, dst_path)
        results.append([new_name, cls])

with open(csv_path, mode='w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(["Filename", "GroundTruth_Label"])
    writer.writerows(results)

print(f"Successfully prepared {len(results)} images across {len(classes)} classes.")
