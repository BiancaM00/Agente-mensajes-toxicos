"""Router de autenticación."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import (
    LoginRequest, 
    LoginResponse, 
    RefreshTokenRequest, 
    UsuarioCreate,
    RegistroEstudianteRequest,
    RegistroDocenteRequest,
    RegistroResponse,
)
from app.services import AuthService

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Login - Obtener JWT",
    description="Autentica un usuario con email y contraseña, retorna access y refresh tokens."
)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Login con email y contraseña.
    
    - **email**: Email del usuario registrado
    - **password**: Contraseña del usuario
    
    Retorna JWT tokens para usar en endpoints protegidos.
    """
    return AuthService.login(db, login_data)


@router.post(
    "/refresh",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Renovar Token",
    description="Genera un nuevo access token usando un refresh token válido."
)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """
    Renueva el access token usando un refresh token.
    
    - **refresh_token**: Refresh token obtenido en login (válido por 7 días)
    
    Retorna un nuevo access token con validez de 24 horas.
    """
    return AuthService.refresh_access_token(db, refresh_data.refresh_token)


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Logout",
    description="Revoca el refresh token del usuario (cierra sesión)."
)
async def logout(
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """
    Realiza logout revocando el refresh token.
    
    - **refresh_token**: Token a revocar
    """
    AuthService.logout(db, refresh_data.refresh_token)
    return {
        "success": True,
        "message": "Sesión cerrada correctamente"
    }


@router.post(
    "/registro/estudiante",
    response_model=RegistroResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registro de Estudiante",
    description="Permite que un estudiante se registre en el sistema."
)
async def registro_estudiante(
    estudiante_data: RegistroEstudianteRequest,
    db: Session = Depends(get_db)
):
    """
    Registra un nuevo estudiante en el sistema.
    
    - **nombre**: Nombre completo del estudiante
    - **email**: Email universitario
    - **password**: Contraseña (mínimo 8 caracteres)
    - **institucion_id**: ID de la institución
    """
    usuario = AuthService.registrar_estudiante(db, estudiante_data)
    return {
        "success": True,
        "message": "Estudiante registrado correctamente",
        "usuario_id": usuario.id,
        "rol": "ESTUDIANTE"
    }


@router.post(
    "/registro/docente",
    response_model=RegistroResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registro de Docente",
    description="Permite que un docente se registre en el sistema."
)
async def registro_docente(
    docente_data: RegistroDocenteRequest,
    db: Session = Depends(get_db)
):
    """
    Registra un nuevo docente en el sistema.
    
    - **nombre**: Nombre completo del docente
    - **email**: Email institucional
    - **password**: Contraseña (mínimo 8 caracteres)
    - **institucion_id**: ID de la institución
    - **codigo_docente**: Código único del docente
    """
    usuario = AuthService.registrar_docente(db, docente_data)
    return {
        "success": True,
        "message": "Docente registrado correctamente",
        "usuario_id": usuario.id,
        "rol": "DOCENTE"
    }


@router.post(
    "/registro",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Registro de Usuario (Admin)",
    description="Crea un nuevo usuario en el sistema (solo ADMIN)."
)
async def registro(
    usuario_data: UsuarioCreate,
    db: Session = Depends(get_db)
):
    """
    Registra un nuevo usuario (solo ADMIN_INSTITUCIONAL).
    
    - **nombre**: Nombre completo del usuario
    - **email**: Email único del usuario
    - **password**: Contraseña (mínimo 8 caracteres)
    - **rol**: ESTUDIANTE, DOCENTE, ADMIN_INSTITUCIONAL
    - **institucion_id**: ID de la institución
    """
    usuario = AuthService.registrar_usuario(db, usuario_data)
    return {
        "success": True,
        "message": "Usuario registrado correctamente",
        "usuario_id": usuario.id
    }
