"""Schemas de autenticación."""

from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional


class LoginRequest(BaseModel):
    """Schema para solicitud de login."""
    email: EmailStr = Field(..., description="Email del usuario")
    password: str = Field(..., min_length=6, description="Contraseña del usuario")


class TokenData(BaseModel):
    """Schema con información del JWT."""
    sub: int  # usuario_id
    email: str
    rol: str
    institucion_id: int
    exp: int
    iat: int


class LoginResponse(BaseModel):
    """Schema para respuesta de login."""
    access_token: str = Field(..., description="JWT access token (24h)")
    refresh_token: str = Field(..., description="JWT refresh token (7d)")
    token_type: str = "bearer"
    
    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer"
            }
        }


class RefreshTokenRequest(BaseModel):
    """Schema para solicitud de renovación de token."""
    refresh_token: str = Field(..., description="Refresh token vigente")


class ChangePasswordRequest(BaseModel):
    """Schema para cambio de contraseña."""
    current_password: str = Field(..., min_length=6, description="Contraseña actual")
    new_password: str = Field(..., min_length=6, description="Nueva contraseña")


class RegistroEstudianteRequest(BaseModel):
    """Schema para registro de estudiante."""
    nombre: str = Field(..., min_length=3, max_length=150, description="Nombre completo del estudiante")
    email: str = Field(..., description="Email universitario del estudiante")
    password: str = Field(..., min_length=8, description="Contraseña (mínimo 8 caracteres)")
    institucion_id: int = Field(..., ge=1, description="ID de la institución")
    
    class Config:
        json_schema_extra = {
            "example": {
                "nombre": "Juan Pérez García",
                "email": "juan.perez@universidad.edu",
                "password": "MiPassword123",
                "institucion_id": 1
            }
        }


class RegistroDocenteRequest(BaseModel):
    """Schema para registro de docente."""
    nombre: str = Field(..., min_length=3, max_length=150, description="Nombre completo del docente")
    email: str = Field(..., description="Email institucional del docente")
    password: str = Field(..., min_length=8, description="Contraseña (mínimo 8 caracteres)")
    institucion_id: int = Field(..., ge=1, description="ID de la institución")
    codigo_docente: str = Field(..., min_length=3, max_length=50, description="Código único del docente")
    
    class Config:
        json_schema_extra = {
            "example": {
                "nombre": "María López González",
                "email": "maria.lopez@universidad.edu",
                "password": "MiPassword456",
                "institucion_id": 1,
                "codigo_docente": "DOC001"
            }
        }


class RegistroResponse(BaseModel):
    """Schema para respuesta de registro exitoso."""
    success: bool
    message: str
    usuario_id: int
    rol: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Usuario registrado correctamente como ESTUDIANTE",
                "usuario_id": 5,
                "rol": "ESTUDIANTE"
            }
        }


class LogoutRequest(BaseModel):
    """Schema para logout."""
    refresh_token: str = Field(..., description="Refresh token a revocar")
