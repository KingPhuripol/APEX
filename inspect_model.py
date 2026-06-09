import sys
import json
try:
    import tensorflow as tf
except ImportError:
    print(json.dumps({"error": "TensorFlow not installed."}))
    sys.exit(1)

model_path = "/Users/king_phuripol/AI-Engineer/01_Projects/ML-DeepLearning/China/APEX Clinical AI Platform/ml_models_backup/picha/Model Weights.h5"

try:
    model = tf.keras.models.load_model(model_path, compile=False)
    input_shape = model.input_shape
    output_shape = model.output_shape
    
    # Try to extract class names if available, often stored in metadata or output layer
    num_classes = output_shape[-1] if output_shape else None
    
    info = {
        "input_shape": input_shape,
        "output_shape": output_shape,
        "num_classes": num_classes,
        "model_name": model.name
    }
    print(json.dumps(info))
except Exception as e:
    print(json.dumps({"error": str(e)}))
