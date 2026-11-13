"""Módulo de schemas Pydantic."""

from app.schemas.auth_schema import (
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    TokenData,
    RegistroEstudianteRequest,
    RegistroDocenteRequest,
    RegistroResponse,
)

from app.schemas.usuario_schema import (
    UsuarioCreate,
    UsuarioResponse,
    UsuarioUpdate,
)

from app.schemas.publicacion_schema import (
    PublicacionCreate,
    PublicacionResponse,
    PublicacionUpdate,
    PublicacionListResponse,
)

from app.schemas.notificacion_schema import (
    NotificacionResponse,
    NotificacionUpdate,
)

from app.schemas.curso_schema import (
    CursoCreate,
    CursoResponse,
    MatriculaResponse,
    MatriculaUpsertRequest,
)

__all__ = [
    "LoginRequest",
    "LoginResponse",
    "RefreshTokenRequest",
    "TokenData",
    "RegistroEstudianteRequest",
    "RegistroDocenteRequest",
    "RegistroResponse",
    "UsuarioCreate",
    "UsuarioResponse",
    "UsuarioUpdate",
    "CursoCreate",
    "CursoResponse",
    "PublicacionCreate",
    "PublicacionResponse",
    "PublicacionUpdate",
    "PublicacionListResponse",
    "NotificacionResponse",
    "NotificacionUpdate",
    "MatriculaResponse",
    "MatriculaUpsertRequest",
]
