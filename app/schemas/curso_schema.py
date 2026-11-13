"""Schemas para Curso y Matrícula."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class CursoCreate(BaseModel):
    institucion_id: int = Field(..., description="ID de la institución")
    codigo: str = Field(..., max_length=20)
    nombre: str = Field(..., max_length=200)
    periodo: str = Field(..., max_length=20)


class CursoResponse(BaseModel):
    id: int
    institucion_id: int
    codigo: str
    nombre: str
    periodo: str
    activo: bool

    class Config:
        orm_mode = True


class MatriculaUpsertRequest(BaseModel):
    usuario_email: Optional[EmailStr] = None
    usuario_id: Optional[int] = Field(None, ge=1)
    rol_en_curso: str = Field(default="ESTUDIANTE")
    crear_si_no_existe: bool = False
    nombre: Optional[str] = Field(None, max_length=150)


class MatriculaResponse(BaseModel):
    id: int
    curso_id: int
    curso_nombre: str
    usuario_id: int
    usuario_nombre: str
    usuario_email: str
    rol_en_curso: str
    activo: bool
    creado_en: datetime

    class Config:
        orm_mode = True
