import os
import csv
import argparse
import random

# For Axia, we don't have the exact model file yet, so this is a placeholder 
# script that simulates evaluation or provides a structure where the model 
# logic can be dropped in once confirmed.

def load_ground_truth(csv_path):
    data = {}
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            filename = row.get("Filename")
            gt = row.get("GroundTruth_Label")
            if filename and gt:
                data[filename] = gt
    return data

def mock_predict(image_path, possible_classes):
    # Mock prediction for demonstration purposes
    return random.choice(possible_classes)

def main():
    parser = argparse.ArgumentParser(description="Evaluate Axia Model")
    parser.add_argument("--img_dir", type=str, default="axia_test_images")
    parser.add_argument("--csv_path", type=str, default="axia_test_ground_truth.csv")
    args = parser.parse_args()

    gt_data = load_ground_truth(args.csv_path)
    if not gt_data:
        print("No ground truth data found.")
        return
        
    possible_classes = list(set(gt_data.values()))
    print(f"Found {len(possible_classes)} unique classes: {possible_classes}")
    
    print("\n--- Running Evaluation (MOCK) ---")
    correct = 0
    total = 0
    
    for filename, true_label in gt_data.items():
        img_path = os.path.join(args.img_dir, filename)
        if not os.path.exists(img_path):
            continue
            
        pred_label = mock_predict(img_path, possible_classes)
        confidence = round(random.uniform(0.7, 0.99), 2)
        
        if pred_label == true_label:
            correct += 1
        total += 1
        
        print(f"{filename}: True={true_label}, Pred={pred_label} ({confidence})")

    if total > 0:
        accuracy = (correct / total) * 100
        print(f"\n--- Results ---")
        print(f"Total Evaluated: {total}")
        print(f"Correct: {correct}")
        print(f"Accuracy: {accuracy:.2f}%")
        print(f"\n[NOTE] This is a mock script. Replace the mock_predict() function with actual API calls or local model inference code.")
    else:
        print("No images were evaluated.")

if __name__ == "__main__":
    main()
