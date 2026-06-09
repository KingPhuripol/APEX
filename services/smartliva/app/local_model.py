import logging
from PIL import Image

logger = logging.getLogger(__name__)

class LocalModel:
    def __init__(self):
        logger.info("Initializing Mock LocalModel.")
        
    def predict(self, image: Image.Image) -> dict:
        return {
            "fibrosis": {"stage": "F0", "confidence": 0.95},
            "lesion": {"detected": False, "class_name": "None", "confidence": 0.99},
            "parasite": {"detected": False, "class_name": "Normal", "confidence": 0.99},
            "kpa": {"value": 5.0, "confidence": 0.95}
        }

_local_model = LocalModel()

def get_local_model() -> LocalModel:
    return _local_model
