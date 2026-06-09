import os
import litellm
import json
from pydantic import BaseModel
import base64

# Configure litellm to use environment variables for keys if not set
litellm.drop_params = True

class LLMClient:
    def __init__(self):
        self.primary_model = os.getenv("PRIMARY_VISION_API", "gpt-5.5-2026-04-23")
        self.critique_model = os.getenv("CRITIQUE_VISION_API", "gpt-5.4-mini-2026-03-17")
        self.fallback_model = os.getenv("FALLBACK_VISION_API", "gpt-5.4-nano-2026-03-17")
        
    def _encode_image(self, image_bytes: bytes) -> str:
        return base64.b64encode(image_bytes).decode('utf-8')

    def call_vision(self, prompt: str, image_bytes: bytes, response_format: BaseModel = None, role: str = "primary"):
        """
        Call a vision model with fallback support.
        """
        b64_image = self._encode_image(image_bytes)
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{b64_image}"
                        }
                    }
                ]
            }
        ]
        
        target_model = self.primary_model
        if role == "critique":
            target_model = self.critique_model
        elif role == "fallback":
            target_model = self.fallback_model
            
        return self._execute_call(messages, target_model, response_format)

    def call_text(self, prompt: str, response_format: BaseModel = None, role: str = "primary"):
        """
        Call a text model with fallback support.
        """
        messages = [{"role": "user", "content": prompt}]
        
        target_model = self.primary_model
        if role == "critique":
            target_model = self.critique_model
        elif role == "fallback":
            target_model = self.fallback_model
            
        return self._execute_call(messages, target_model, response_format)

    def _execute_call(self, messages: list, target_model: str, response_format: BaseModel = None) -> dict:
        kwargs = {
            "model": target_model,
            "messages": messages,
        }
        if "5.5" not in target_model:
            kwargs["temperature"] = 0.2
        
        if response_format:
            # If the model natively supports structured outputs (e.g. OpenAI GPT-4o)
            # litellm translates this automatically
            kwargs["response_format"] = response_format

        try:
            response = litellm.completion(**kwargs)
            content = response.choices[0].message.content
            
            # If litellm didn't parse the JSON natively, try to parse it
            if isinstance(content, str):
                try:
                    # Strip markdown blocks if present
                    if content.startswith("```json"):
                        content = content.split("```json")[1].split("```")[0].strip()
                    elif content.startswith("```"):
                        content = content.split("```")[1].split("```")[0].strip()
                        
                    return json.loads(content)
                except json.JSONDecodeError:
                    # Fallback to returning raw string inside a dict if parsing fails
                    return {"raw_output": content}
            
            return content
            
        except Exception as e:
            print(f"[LLMClient] Call to {target_model} failed: {e}. Attempting fallback...")
            # Fallback to ultra-fast router (Groq)
            if target_model != self.fallback_model:
                kwargs["model"] = self.fallback_model
                
                # Groq might not support strict structured outputs natively yet in the same way,
                # so we might need to rely on prompt engineering if we were doing this raw,
                # but litellm handles graceful degradation.
                try:
                    fallback_response = litellm.completion(**kwargs)
                    content = fallback_response.choices[0].message.content
                    try:
                        if content.startswith("```json"):
                            content = content.split("```json")[1].split("```")[0].strip()
                        return json.loads(content)
                    except:
                        return {"raw_output": content}
                except Exception as fallback_e:
                    print(f"[LLMClient] Fallback also failed: {fallback_e}")
                    raise
            else:
                raise
