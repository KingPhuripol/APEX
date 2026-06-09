"""
AI model clients — single Groq client using OpenAI-compatible API.
All agents import from here, never instantiate clients themselves.
"""
import os
from autogen_ext.models.openai import OpenAIChatCompletionClient
from .config import GROQ_PRIMARY, GROQ_VISION

_GROQ_BASE_URL = "https://api.groq.com/openai/v1"

_MODEL_INFO = {
    GROQ_PRIMARY: {
        "vision": False,
        "function_calling": True,
        "json_output": True,
        "family": "llama",
        "structured_output": True,
    },
    GROQ_VISION: {
        "vision": True,
        "function_calling": True,
        "json_output": True,
        "family": "llama",
        "structured_output": True,
    },
    # fast fallback
    "llama-3.1-8b-instant": {
        "vision": False,
        "function_calling": True,
        "json_output": True,
        "family": "llama",
        "structured_output": True,
    },
}


def groq_client(model: str = GROQ_PRIMARY) -> OpenAIChatCompletionClient:
    info = _MODEL_INFO.get(model, _MODEL_INFO[GROQ_PRIMARY])
    return OpenAIChatCompletionClient(
        model=model,
        api_key=os.environ["GROQ_API_KEY"],
        base_url=_GROQ_BASE_URL,
        model_info=info,
    )
