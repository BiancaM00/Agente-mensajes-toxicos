"""Servicio de análisis de toxicidad."""

import asyncio
from typing import Optional

import httpx
from transformers import pipeline

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Publicacion, EvaluacionToxicidad
from app.models.evaluacion import NivelRiesgo
from app.models.publicacion import EstadoPublicacion
from app.utils.text_preprocessor import limpiar_texto, es_spam

settings = get_settings()

_toxicity_classifier = None
_model_path = "citizenlab/distilbert-base-multilingual-cased-toxicity"

def get_toxicity_classifier():
    global _toxicity_classifier
    if _toxicity_classifier is None:
        try:
            _toxicity_classifier = pipeline("text-classification", model=_model_path, tokenizer=_model_path)
        except Exception as e:
            print("Warning: failed to load huggingface pipeline:", e)
    return _toxicity_classifier


class ToxicityService:
    """Servicio de análisis de toxicidad usando API externa."""

    @staticmethod
    def clasificar_score(score: float) -> Optional[NivelRiesgo]:
        """Clasifica el score en un nivel de toxicidad o None si no debe bloquearse."""
        if score < settings.TOXICITY_WARNING_THRESHOLD:
            return None
        if score < settings.TOXICITY_MEDIUM_THRESHOLD:
            return NivelRiesgo.BAJO
        if score < settings.TOXICITY_THRESHOLD:
            return NivelRiesgo.MEDIO
        return NivelRiesgo.ALTO

    @staticmethod
    def mensaje_advertencia(riesgo: NivelRiesgo, consecutivas: int = 0) -> str:
        """Genera un mensaje de advertencia para el estudiante."""
        if riesgo == NivelRiesgo.BAJO:
            mensaje = "Tu mensaje tiene un tono que puede percibirse como poco respetuoso. Reescríbelo antes de enviarlo."
        elif riesgo == NivelRiesgo.MEDIO:
            mensaje = "Tu mensaje no cumple con el tono esperado en el foro. Ajusta el lenguaje y vuelve a intentarlo."
        else:
            mensaje = "Tu mensaje no puede enviarse porque no cumple con las normas de convivencia del foro."

        if consecutivas >= 3:
            mensaje += " Se ha registrado esta situación y el docente será notificado."

        return mensaje

    @staticmethod
    async def evaluar_texto(texto: str) -> tuple[float, Optional[NivelRiesgo], str]:
        """Evalúa un texto sin persistir en base de datos."""
        texto_limpio = limpiar_texto(texto)

        if es_spam(texto_limpio):
            return 0.85, NivelRiesgo.ALTO, "spam_detector"

        classifier = get_toxicity_classifier()
        if classifier:
            def _classify():
                return classifier(texto_limpio)

            try:
                results = await asyncio.to_thread(_classify)
                if results and len(results) > 0:
                    res = results[0]
                    label = str(res.get("label", "")).lower()
                    raw_score = float(res.get("score", 0))
                    score = raw_score if label == "toxic" else 1 - raw_score
                    modelo = "hf_toxic" if label == "toxic" else "hf_not_toxic"
                else:
                    score, modelo = 0.1, "hf_empty"
            except Exception as e:
                print("Local HF error:", e)
                score, modelo = 0.1, "hf_error"
        else:
            score, modelo = await ToxicityService._llamar_api_toxicidad(texto_limpio)

        return score, ToxicityService.clasificar_score(score), modelo
    
    @staticmethod
    async def analizar_publicacion(
        db: Session,
        publicacion_id: int,
        texto: str
    ) -> EvaluacionToxicidad:
        """
        Analiza una publicación y determina su nivel de toxicidad.
        
        Args:
            db: Sesión de base de datos
            publicacion_id: ID de la publicación
            texto: Contenido a analizar
        
        Returns:
            EvaluacionToxicidad con score y riesgo
        """
        score, riesgo, modelo = await ToxicityService.evaluar_texto(texto)

        if riesgo is None:
            riesgo = NivelRiesgo.BAJO
        
        # Crear evaluación en BD
        evaluacion = EvaluacionToxicidad(
            publicacion_id=publicacion_id,
            score=score,
            riesgo=riesgo,
            modelo=modelo,
        )
        
        db.add(evaluacion)
        
        # Actualizar estado de publicación según riesgo
        publicacion = db.query(Publicacion).filter(
            Publicacion.id == publicacion_id
        ).first()
        
        if riesgo == NivelRiesgo.ALTO:
            publicacion.estado = EstadoPublicacion.PENDIENTE_REVISION
        else:
            publicacion.estado = EstadoPublicacion.APROBADO
        
        db.commit()
        db.refresh(evaluacion)
        
        return evaluacion
    
    @staticmethod
    async def _llamar_api_toxicidad(texto: str, timeout: int = 10) -> tuple[float, str]:
        """
        Llama a la API externa de toxicidad.
        
        Args:
            texto: Texto a analizar
            timeout: Timeout en segundos
        
        Returns:
            Tupla (score float 0-1, nombre del modelo)
        
        Raises:
            Exception: Si la API falla
        """
        if settings.AI_PROVIDER == "openai":
            return await ToxicityService._llamar_openai(texto, timeout)
        elif settings.AI_PROVIDER == "perspective":
            return await ToxicityService._llamar_perspective(texto, timeout)
        elif settings.AI_PROVIDER == "huggingface":
            return await ToxicityService._llamar_huggingface(texto, timeout)
        else:
            # Fallback: retornar score bajo
            return 0.1, "fallback"
    
    @staticmethod
    async def _llamar_perspective(texto: str, timeout: int) -> tuple[float, str]:
        """
        Llama a Perspective API de Google.
        
        Documentación: https://developers.perspectiveapi.com/
        """
        if not settings.PERSPECTIVE_API_KEY:
            # En desarrollo: retornar score aleatorio bajo
            return 0.2, "perspective_demo"
        
        url = "https://commentanalyzerapi.googleapis.com/v1/comments:analyze"
        
        payload = {
            "comment": {"text": texto},
            "languages": ["es"],
            "requestedAttributes": {
                "TOXICITY": {},
                "SEVERE_TOXICITY": {},
                "IDENTITY_ATTACK": {},
                "INSULT": {},
                "PROFANITY": {},
                "THREAT": {},
            },
        }
        
        params = {"key": settings.PERSPECTIVE_API_KEY}
        
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(url, json=payload, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    # Usar el promedio de toxicidad
                    attributes = data.get("attributeScores", {})
                    scores = []

                    for attr in ["TOXICITY", "SEVERE_TOXICITY", "IDENTITY_ATTACK", "INSULT"]:
                        if attr in attributes:
                            scores.append(attributes[attr].get("summaryScore", {}).get("value", 0))

                    score = sum(scores) / len(scores) if scores else 0
                    return min(score, 1.0), "perspective"
                else:
                    return 0.1, "perspective_error"
        except (asyncio.TimeoutError, httpx.TimeoutException):
            return 0.1, "perspective_timeout"
        except Exception:
            return 0.1, "perspective_exception"
    
    @staticmethod
    async def _llamar_openai(texto: str, timeout: int = 10) -> tuple[float, str]:
        """
        Llama a OpenAI Moderation API.
        
        Documentación: https://platform.openai.com/docs/guides/moderation
        """
        if not settings.OPENAI_API_KEY:
            # En desarrollo: retornar score aleatorio bajo
            return 0.2, "openai_demo"
        
        url = "https://api.openai.com/v1/moderations"
        
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "input": texto,
            "model": settings.OPENAI_MODEL,  # omni-moderation-latest o text-moderation-latest
        }
        
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()

                    # Estructura de respuesta OpenAI Moderation:
                    # {
                    #   "results": [{
                    #     "flagged": bool,
                    #     "categories": {...},
                    #     "category_scores": {
                    #       "sexual": 0.0,
                    #       "hate": 0.0,
                    #       "harassment": 0.0,
                    #       ...
                    #     }
                    #   }]
                    # }

                    if data.get("results") and len(data["results"]) > 0:
                        result = data["results"][0]
                        category_scores = result.get("category_scores", {})

                        # Calcular score promedio de todas las categorías
                        scores = list(category_scores.values())
                        score = sum(scores) / len(scores) if scores else 0.0

                        # También considerar si fue flagged
                        if result.get("flagged"):
                            score = max(score, 0.75)  # Si OpenAI lo marcó, subir score

                        return min(score, 1.0), f"openai_{settings.OPENAI_MODEL}"
                    else:
                        return 0.1, "openai_error_no_results"
                else:
                    error_text = resp.text
                    print(f"OpenAI API error: {resp.status_code} - {error_text}")
                    return 0.1, "openai_error"
        except (asyncio.TimeoutError, httpx.TimeoutException):
            return 0.1, "openai_timeout"
        except Exception as e:
            print(f"OpenAI exception: {str(e)}")
            return 0.1, "openai_exception"
    
    @staticmethod
    async def _llamar_huggingface(texto: str, timeout: int) -> tuple[float, str]:
        """
        Llama a HuggingFace Inference API.
        """
        if not settings.HUGGINGFACE_API_TOKEN:
            return 0.2, "huggingface_demo"
        
        # Usar modelo de clasificación de tóxico en español
        url = "https://api-inference.huggingface.co/models/nlptown/bert-base-multilingual-uncased-toxic"
        
        headers = {"Authorization": f"Bearer {settings.HUGGINGFACE_API_TOKEN}"}
        payload = {"inputs": texto}
        
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    # Esperar resultado del modelo
                    if isinstance(data, list) and len(data) > 0:
                        toxic_scores = data[0]
                        # Encontrar score de "TOXIC"
                        for item in toxic_scores:
                            if item.get("label") == "TOXIC":
                                score = item.get("score", 0)
                                return min(score, 1.0), "huggingface"
                    return 0.1, "huggingface_error"
                else:
                    return 0.1, "huggingface_error"
        except (asyncio.TimeoutError, httpx.TimeoutException):
            return 0.1, "huggingface_timeout"
        except Exception:
            return 0.1, "huggingface_exception"
