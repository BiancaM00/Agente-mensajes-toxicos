"""Schemas de notificación."""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class NotificacionResponse(BaseModel):
    """Schema para respuesta de notificación."""
    id: int
    usuario_id: int
    tipo: str = Field(..., description="COMENTARIO_MARCADO, REVISION_PENDIENTE, CASO_RESUELTO")
    mensaje: str
    leido: bool
    creado_en: datetime
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "usuario_id": 5,
                "tipo": "COMENTARIO_MARCADO",
                "mensaje": "Tu comentario está siendo revisado por el docente.",
                "leido": False,
                "creado_en": "2026-04-12T10:00:00Z"
            }
        }


class NotificacionUpdate(BaseModel):
    """Schema para actualizar notificación (marcar como leída)."""
    leido: bool = Field(..., description="True para marcar como leída")


class NotificacionListResponse(BaseModel):
    """Schema para listar notificaciones."""
    id: int
    tipo: str
    mensaje: str
    leido: bool
    creado_en: datetime
    
    class Config:
        from_attributes = True
