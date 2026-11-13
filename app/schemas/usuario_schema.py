"""Schemas de usuario."""

from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional


class UsuarioCreate(BaseModel):
    """Schema para crear usuario (solo ADMIN)."""
    nombre: str = Field(..., min_length=3, max_length=150, description="Nombre del usuario")
    email: EmailStr = Field(..., description="Email único del usuario")
    password: str = Field(..., min_length=8, description="Contraseña (mínimo 8 caracteres)")
    rol: str = Field(..., description="Rol: ESTUDIANTE, DOCENTE, ADMIN_INSTITUCIONAL")
    institucion_id: int = Field(..., ge=1, description="ID de la institución")


class UsuarioResponse(BaseModel):
    """Schema para respuesta de usuario."""
    id: int
    nombre: str
    email: str
    rol: str
    activo: bool
    creado_en: datetime
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "nombre": "Sofia Mejia",
                "email": "sofia@universidad.edu",
                "rol": "ESTUDIANTE",
                "activo": True,
                "creado_en": "2026-04-12T10:00:00Z"
            }
        }


class UsuarioUpdate(BaseModel):
    """Schema para actualizar usuario."""
    nombre: Optional[str] = Field(None, min_length=3, max_length=150)
    email: Optional[EmailStr] = None


class UsuarioListResponse(BaseModel):
    """Schema para listar usuarios."""
    id: int
    nombre: str
    email: str
    rol: str
    creado_en: datetime
    
    class Config:
        from_attributes = True
