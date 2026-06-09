"""
Translation API endpoints for SmartLiva Clinical AI System
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Optional
from .translator import translator
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/translation", tags=["Translation"])

class TranslationRequest(BaseModel):
    text: str
    target_language: str
    source_language: Optional[str] = "auto"

class InterfaceTranslationRequest(BaseModel):
    interface_data: Dict
    target_language: str

class TranslationResponse(BaseModel):
    original_text: str
    translated_text: str
    source_language: str
    target_language: str

@router.post("/translate", response_model=TranslationResponse)
async def translate_text(request: TranslationRequest):
    """
    Translate text with medical context
    """
    try:
        translated = await translator.translate_text(
            text=request.text,
            target_language=request.target_language,
            source_language=request.source_language
        )
        
        return TranslationResponse(
            original_text=request.text,
            translated_text=translated,
            source_language=request.source_language,
            target_language=request.target_language
        )
    except Exception as e:
        logger.error(f"Translation error: {e}")
        raise HTTPException(status_code=500, detail="Translation failed")

@router.post("/translate-interface")
async def translate_interface(request: InterfaceTranslationRequest):
    """
    Translate entire interface data structure
    """
    try:
        translated_data = await translator.translate_interface(
            interface_data=request.interface_data,
            target_language=request.target_language
        )
        
        return {
            "success": True,
            "translated_data": translated_data,
            "target_language": request.target_language
        }
    except Exception as e:
        logger.error(f"Interface translation error: {e}")
        raise HTTPException(status_code=500, detail="Interface translation failed")

@router.get("/languages")
async def get_supported_languages():
    """
    Get list of supported languages
    """
    return {
        "success": True,
        "languages": translator.get_language_options()
    }

@router.get("/medical-terms/{language}")
async def get_medical_terms(language: str):
    """
    Get medical terminology for specific language
    """
    if language not in translator.medical_terms:
        raise HTTPException(status_code=404, detail="Language not supported")
    
    return {
        "success": True,
        "language": language,
        "medical_terms": translator.medical_terms[language]
    }
