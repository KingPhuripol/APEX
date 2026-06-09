import os
import requests
import json

def extract_text_from_image(image_path=None, image_bytes=None, api_key=None, model="typhoon-ocr", task_type="default", max_tokens=16384, temperature=0.1, top_p=0.6, repetition_penalty=1.2, pages=None):
    """
    Extracts text from an image using the OpenTyphoon OCR API.
    Can accept either a file path (image_path) or raw bytes (image_bytes).
    """
    url = "https://api.opentyphoon.ai/v1/ocr"
    
    if api_key is None:
        api_key = os.environ.get("TYPHOON_API_KEY")
        if not api_key:
            print("[OCR] Warning: TYPHOON_API_KEY not found. Skipping OCR.")
            return ""

    if image_bytes is not None:
        files = {'file': ('image.jpg', image_bytes, 'image/jpeg')}
    elif image_path is not None:
        files = {'file': open(image_path, 'rb')}
    else:
        raise ValueError("Must provide either image_path or image_bytes")

    try:
        data = {
            'model': model,
            'task_type': task_type,
            'max_tokens': str(max_tokens),
            'temperature': str(temperature),
            'top_p': str(top_p),
            'repetition_penalty': str(repetition_penalty)
        }

        if pages:
            data['pages'] = json.dumps(pages)

        headers = {
            'Authorization': f'Bearer {api_key}'
        }

        response = requests.post(url, files=files, data=data, headers=headers)

        if response.status_code == 200:
            result = response.json()

            extracted_texts = []
            for page_result in result.get('results', []):
                if page_result.get('success') and page_result.get('message'):
                    content = page_result['message']['choices'][0]['message']['content']
                    try:
                        parsed_content = json.loads(content)
                        text = parsed_content.get('natural_text', content)
                    except json.JSONDecodeError:
                        text = content
                    extracted_texts.append(text)
                elif not page_result.get('success'):
                    print(f"Error processing {page_result.get('filename', 'unknown')}: {page_result.get('error', 'Unknown error')}")

            return '\n'.join(extracted_texts)
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
            return None
    finally:
        # If we opened a file from path, we need to close it
        if image_path is not None and hasattr(files['file'], 'close'):
            files['file'].close()
