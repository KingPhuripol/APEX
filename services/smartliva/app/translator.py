"""
AI-powered Translation Service for SmartLiva Clinical AI System
Supports Thai-English translation using OpenAI API
"""

import os
import json
from typing import Dict, List, Optional
from openai import OpenAI
from googletrans import Translator
import logging

logger = logging.getLogger(__name__)

class SmartLivaTranslator:
    def __init__(self):
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.google_translator = Translator()
        self.supported_languages = ["th", "en"]
        
        # Medical terminology mapping for accuracy
        self.medical_terms = {
            "en": {
                "fibrosis": "fibrosis",
                "cirrhosis": "cirrhosis", 
                "hepatocellular carcinoma": "hepatocellular carcinoma",
                "liver stiffness": "liver stiffness",
                "ultrasound": "ultrasound",
                "elastography": "elastography",
                "kPa": "kPa"
            },
            "th": {
                "fibrosis": "เส้นใยแข็งตับ",
                "cirrhosis": "ตับแข็ง",
                "hepatocellular carcinoma": "มะเร็งเซลล์ตับ", 
                "liver stiffness": "ความแข็งของตับ",
                "ultrasound": "อัลตราซาวด์",
                "elastography": "อีลาสโตกราฟี",
                "kPa": "กิโลปาสกาล"
            }
        }
    
    async def translate_medical_text(self, text: str, target_language: str, context: str = "medical") -> str:
        """
        Translate medical text with high accuracy using OpenAI
        """
        try:
            system_prompt = self._get_medical_system_prompt(target_language, context)
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Translate this medical text: {text}"}
                ],
                temperature=0.1,
                max_tokens=1000
            )
            
            translated_text = response.choices[0].message.content.strip()
            translated_text = self._apply_medical_terminology(translated_text, target_language)
            
            return translated_text
            
        except Exception as e:
            logger.error(f"OpenAI translation failed: {e}")
            # Fallback to Google Translate
            try:
                result = self.google_translator.translate(text, dest=target_language)
                return self._apply_medical_terminology(result.text, target_language)
            except Exception as fallback_error:
                logger.error(f"Fallback translation failed: {fallback_error}")
                return text  # Return original text if all translations fail
    
    def _get_medical_system_prompt(self, target_language: str, context: str) -> str:
        """Generate system prompt for medical translation"""
        
        if target_language == "th":
            return f"""
            You are a professional medical translator specializing in hepatology and radiology.
            Translate the following medical text to Thai with these requirements:
            
            1. Use accurate medical terminology in Thai
            2. Maintain clinical precision and clarity
            3. Use formal medical language appropriate for healthcare professionals
            4. Context: {context}
            5. Preserve all medical values, measurements, and technical terms accuracy
            
            Medical Translation Guidelines:
            - Fibrosis = เส้นใยแข็งตับ
            - Cirrhosis = ตับแข็ง  
            - Hepatocellular carcinoma = มะเร็งเซลล์ตับ
            - Liver stiffness = ความแข็งของตับ
            - Ultrasound = อัลตราซาวด์
            - Elastography = อีลาสโตกราฟี
            
            Provide only the translated text without explanations.
            """
        else:
            return f"""
            You are a professional medical translator specializing in hepatology and radiology.
            Translate the following medical text to English with these requirements:
            
            1. Use accurate medical terminology in English
            2. Maintain clinical precision and clarity  
            3. Use formal medical language appropriate for healthcare professionals
            4. Context: {context}
            5. Preserve all medical values, measurements, and technical terms accuracy
            
            Provide only the translated text without explanations.
            """
    
    def _apply_medical_terminology(self, text: str, target_language: str) -> str:
        """Apply consistent medical terminology mapping"""
        
        # Medical terminology dictionary
        medical_terms = {
            "th": {
                "ultrasound": "คลื่นเสียงความถี่สูง",
                "elastography": "อีลาสโตกราฟี",
                "stiffness": "ความแข็ง",
                "lesion": "รอยโรค",
                "malignancy": "ความเป็นมะเร็ง",
                "benign": "ไม่เป็นมะเร็ง",
                "patient": "ผู้ป่วย",
                "diagnosis": "การวินิจฉัย",
                "treatment": "การรักษา",
                "clinical": "ทางคลินิก",
                "medical history": "ประวัติการรักษา",
                "symptoms": "อาการ",
                "examination": "การตรวจ",
                "report": "รายงาน",
                "analysis": "การวิเคราะห์"
            },
            "en": {
                "ไฟโบรซิส": "fibrosis",
                "ตับแข็ง": "cirrhosis", 
                "มะเร็งตับ": "hepatocellular carcinoma",
                "คลื่นเสียงความถี่สูง": "ultrasound",
                "อีลาสโตกราฟี": "elastography",
                "ความแข็ง": "stiffness",
                "รอยโรค": "lesion",
                "ความเป็นมะเร็ง": "malignancy",
                "ไม่เป็นมะเร็ง": "benign",
                "ผู้ป่วย": "patient",
                "การวินิจฉัย": "diagnosis",
                "การรักษา": "treatment",
                "ทางคลินิก": "clinical",
                "ประวัติการรักษา": "medical history",
                "อาการ": "symptoms",
                "การตรวจ": "examination",
                "รายงาน": "report",
                "การวิเคราะห์": "analysis"
            }
        }
        
        if target_language in medical_terms:
            terms = medical_terms[target_language]
            for en_term, target_term in terms.items():
                text = text.replace(en_term, target_term)
                text = text.replace(en_term.title(), target_term)
                text = text.replace(en_term.upper(), target_term)
        
        return text

    async def translate_text(self, text: str, target_language: str, source_language: str = "auto") -> str:
        """
        Translate text using OpenAI API with medical context
        """
        try:
            if target_language not in self.supported_languages:
                raise ValueError(f"Unsupported target language: {target_language}")
            
            # Use medical terminology first
            translated_text = self._apply_medical_terms(text, target_language)
            if translated_text != text:
                return translated_text
            
            # Use OpenAI for complex medical translations
            prompt = self._create_medical_translation_prompt(text, target_language, source_language)
            
            response = await self.openai_client.chat.completions.acreate(
                model="gpt-4",
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a medical translator specializing in Thai-English medical terminology. Provide accurate, professional medical translations."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=1000
            )
            
            translated = response.choices[0].message.content.strip()
            return translated
            
        except Exception as e:
            logger.error(f"OpenAI translation error: {e}")
            # Fallback to Google Translate
            return self._google_translate_fallback(text, target_language)

    def _create_medical_translation_prompt(self, text: str, target_lang: str, source_lang: str) -> str:
        """Create a specialized prompt for medical translation"""
        lang_names = {"th": "Thai", "en": "English"}
        target_name = lang_names.get(target_lang, target_lang)
        source_name = lang_names.get(source_lang, "the source language")
        
        return f"""
        Translate the following medical text from {source_name} to {target_name}. 
        Maintain medical accuracy and professional terminology.
        
        Text to translate: "{text}"
        
        Requirements:
        - Use proper medical terminology
        - Maintain professional tone
        - Preserve meaning exactly
        - Return only the translation, no explanations
        """

    def _apply_medical_terms(self, text: str, target_language: str) -> str:
        """Apply medical terminology dictionary"""
        if target_language not in self.medical_terms:
            return text
            
        terms_dict = self.medical_terms[target_language]
        translated_text = text
        
        for original, translation in terms_dict.items():
            translated_text = translated_text.replace(original, translation)
            
        return translated_text

    def _google_translate_fallback(self, text: str, target_language: str) -> str:
        """Fallback to Google Translate"""
        try:
            result = self.google_translator.translate(text, dest=target_language)
            return result.text
        except Exception as e:
            logger.error(f"Google Translate fallback error: {e}")
            return text

    async def translate_interface(self, interface_data: Dict, target_language: str) -> Dict:
        """
        Translate entire interface data structure
        """
        translated_data = {}
        
        for key, value in interface_data.items():
            if isinstance(value, str):
                translated_data[key] = await self.translate_text(value, target_language)
            elif isinstance(value, dict):
                translated_data[key] = await self.translate_interface(value, target_language)
            elif isinstance(value, list):
                translated_data[key] = []
                for item in value:
                    if isinstance(item, str):
                        translated_data[key].append(await self.translate_text(item, target_language))
                    elif isinstance(item, dict):
                        translated_data[key].append(await self.translate_interface(item, target_language))
                    else:
                        translated_data[key].append(item)
            else:
                translated_data[key] = value
                
        return translated_data

    def get_language_options(self) -> List[Dict]:
        """Get available language options"""
        return [
            {"code": "th", "name": "ไทย", "flag": "🇹🇭"},
            {"code": "en", "name": "English", "flag": "🇺🇸"}
        ]

# Global translator instance
translator = SmartLivaTranslator()
