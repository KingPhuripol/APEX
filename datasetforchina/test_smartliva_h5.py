import os
import csv
import numpy as np
import argparse

try:
    import tensorflow as tf
    from tensorflow.keras.preprocessing.image import load_img, img_to_array
except ImportError:
    print("TensorFlow is not installed. Please install it using 'pip install tensorflow'.")
    exit(1)

DEFAULT_IMAGE_SIZE = (224, 224)

def load_ground_truth(csv_path, target_task="Liver Fibrosis"):
    data = {}
    classes = set()
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("Task") == target_task:
                filename = row.get("Filename")
                gt = row.get("GroundTruth_Label")
                if filename and gt:
                    data[filename] = gt
                    classes.add(gt)
    return data, sorted(list(classes))

def preprocess_image(image_path, target_size):
    img = load_img(image_path, target_size=target_size)
    img_array = img_to_array(img)
    img_array = (img_array / 127.5) - 1.0 
    return np.expand_dims(img_array, axis=0)

def main():
    parser = argparse.ArgumentParser(description="Evaluate Smartliva .h5 Model")
    parser.add_argument("--model", type=str, default="../APEX Clinical AI Platform/ml_models_backup/smartliva/Liver Fibrosis CNN Model.h5")
    parser.add_argument("--img_dir", type=str, default="smartliva_test_images")
    parser.add_argument("--csv_path", type=str, default="test_ground_truth.csv")
    args = parser.parse_args()

    print(f"Loading model from {args.model}...")
    try:
        model = tf.keras.models.load_model(args.model, compile=False)
    except Exception as e:
        print(f"Failed to load model: {e}")
        return

    gt_data, class_names = load_ground_truth(args.csv_path)
    if not gt_data:
        print("No ground truth data found.")
        return
    
    print(f"Found {len(class_names)} unique classes for Liver Fibrosis: {class_names}")
    
    input_shape = model.input_shape
    if input_shape and len(input_shape) >= 3:
        target_size = (input_shape[1], input_shape[2])
    else:
        target_size = DEFAULT_IMAGE_SIZE
        
    print(f"Using input size: {target_size}")
    
    correct = 0
    total = 0
    
    for filename, true_label in gt_data.items():
        img_path = os.path.join(args.img_dir, filename)
        if not os.path.exists(img_path):
            continue
            
        try:
            img_tensor = preprocess_image(img_path, target_size)
            preds = model.predict(img_tensor, verbose=0)
            
            pred_idx = np.argmax(preds[0])
            if pred_idx < len(class_names):
                pred_label = class_names[pred_idx]
            else:
                pred_label = f"Unknown_Class_{pred_idx}"
            
            confidence = preds[0][pred_idx]
            
            if pred_label == true_label:
                correct += 1
            total += 1
            
            print(f"{filename}: True={true_label}, Pred={pred_label} ({confidence:.2f})")
        except Exception as e:
            print(f"Error processing {filename}: {e}")

    if total > 0:
        accuracy = (correct / total) * 100
        print(f"\n--- Results ---")
        print(f"Total Evaluated: {total}")
        print(f"Correct: {correct}")
        print(f"Accuracy: {accuracy:.2f}%")
    else:
        print("No images were evaluated.")

if __name__ == "__main__":
    main()
