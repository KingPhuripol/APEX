import os
import time
import json
import requests
from dotenv import load_dotenv

load_dotenv()

primary_api = os.getenv("PRIMARY_VISION_API")
critique_api = os.getenv("CRITIQUE_VISION_API")
fallback_api = os.getenv("FALLBACK_VISION_API")

# API Keys
openai_key = os.getenv("OPENAI_API_KEY")
groq_key = os.getenv("GROQ_API_KEY")
typhoon_key = os.getenv("TYPHOON_API_KEY")
typhoon_base = os.getenv("LITELLM_CUSTOM_API_BASE", "https://api.opentyphoon.ai/v1")

print("=== Starting API Connection Tests (Pure Requests) ===\n")

def test_chat_api(name, url, api_key, model):
    print(f"Testing {name} ({model})...")
    if not api_key:
        print(f"❌ Failed: No API key found for {name}\n")
        return
        
    # Strip 'openai/' prefix if it exists (added for litellm compatibility)
    if model and model.startswith("openai/"):
        model = model.replace("openai/", "")
    elif model and model.startswith("groq/"):
        model = model.replace("groq/", "")
        
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": model,
        "messages": [{"role": "user", "content": "Say 'hello'"}]
    }
    
    start = time.time()
    try:
        response = requests.post(url, headers=headers, json=data, timeout=10)
        if response.status_code == 200:
            res_json = response.json()
            reply = res_json['choices'][0]['message']['content'].strip()
            print(f"✅ Success! Response: '{reply}' (Took {time.time()-start:.2f}s)\n")
        else:
            print(f"❌ Failed: HTTP {response.status_code} - {response.text}\n")
    except Exception as e:
        print(f"❌ Failed: {e}\n")

# Test 1: OpenAI
test_chat_api("Primary API (OpenAI)", "https://api.openai.com/v1/chat/completions", openai_key, primary_api)

# Test 2: Groq
test_chat_api("Fallback API (Groq)", "https://api.groq.com/openai/v1/chat/completions", groq_key, fallback_api)

# Test 3: Typhoon
test_chat_api("Critique API (Typhoon)", f"{typhoon_base}/chat/completions", typhoon_key, critique_api)

# Test 4: OCR Helper (Typhoon OCR)
print("Testing Typhoon OCR Utility...")
try:
    from utils.ocr_helper import extract_text_from_image
    
    # Create a small blank dummy image manually without PIL to avoid dependency issues
    img_path = "dummy_test.jpg"
    with open(img_path, "wb") as f:
        # Minimal valid JPEG file signature
        f.write(b'\xff\xd8\xff\xe0\x00\x10\x4a\x46\x49\x46\x00\x01\x01\x01\x00\x48\x00\x48\x00\x00\xff\xdb\x00\x43\x00\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x14\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xc4\x00\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xda\x00\x08\x01\x01\x00\x00\x3f\x00\x7f\xff\xd9')
    
    start = time.time()
    ocr_res = extract_text_from_image(img_path, api_key=typhoon_key)
    
    # It might return empty text for a blank image, which is fine
    if ocr_res is not None:
        print(f"✅ Success! OCR responded successfully. (Took {time.time()-start:.2f}s)\n")
    else:
        print(f"❌ Failed to extract text.\n")
    
    if os.path.exists(img_path):
        os.remove(img_path)
except Exception as e:
    print(f"❌ Failed: {e}\n")

print("=== Tests Completed ===")
