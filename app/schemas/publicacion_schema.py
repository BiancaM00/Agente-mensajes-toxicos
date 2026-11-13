"""Schemas de publicación."""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class PublicacionCreate(BaseModel):
    """Schema para crear publicación."""
    contenido: str = Field(..., min_length=5, max_length=5000, description="Contenido de la publicación")


class EvaluacionToxicidadResponse(BaseModel):
    """Schema para respuesta de evaluación de toxicidad."""
    id: int
    score: float = Field(..., ge=0.0, le=1.0, description="Score de toxicidad (0.0-1.0)")
    riesgo: str = Field(..., description="BAJO, MEDIO, ALTO")
    modelo: str = Field(..., description="Modelo IA usado")
    evaluado_en: datetime
    
    class Config:
        from_attributes = True


class PublicacionResponse(BaseModel):
    """Schema para respuesta de publicación."""
    id: int
    hilo_id: int
    autor_id: int
    contenido: str
    estado: str
    creado_en: datetime
    actualizado_en: datetime
    evaluacion_toxicidad: Optional[EvaluacionToxicidadResponse] = None
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "hilo_id": 1,
                "autor_id": 5,
                "contenido": "Excelente explicación en la clase de hoy",
                "estado": "APROBADO",
                "creado_en": "2026-04-12T10:00:00Z",
                "actualizado_en": "2026-04-12T10:00:00Z",
                "evaluacion_toxicidad": {
                    "id": 1,
                    "score": 0.15,
                    "riesgo": "BAJO",
                    "modelo": "perspective",
                    "evaluado_en": "2026-04-12T10:00:01Z"
                }
            }
        }


class PublicacionUpdate(BaseModel):
    """Schema para actualizar publicación (solo autor, si no está moderada)."""
    contenido: str = Field(..., min_length=5, max_length=5000)


class PublicacionListResponse(BaseModel):
    """Schema para listar publicaciones."""
    id: int
    autor_id: int
    contenido: str
    estado: str
    creado_en: datetime
    
    class Config:
        from_attributes = True


class PublicacionDeleteResponse(BaseModel):
    """Schema para respuesta de eliminación."""
    success: bool
    message: str
