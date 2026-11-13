"""Middleware de autenticación y autorización."""

from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Usuario
from app.utils.jwt_handler import decode_token
from app.config import get_settings
from typing import Optional

settings = get_settings()


async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Usuario:
    """
    Obtiene el usuario actual del JWT token.
    
    Args:
        authorization: Header de autorización Bearer
        db: Sesión de base de datos
    
    Returns:
        Objeto Usuario si el token es válido
    
    Raises:
        HTTPException: Si el token no es válido o el usuario no existe
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError("Invalid scheme")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    usuario_id: int = payload.get("sub")
    if usuario_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido (sub missing)",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    
    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado",
        )
    
    return usuario


def require_roles(allowed_roles: list[str]):
    """
    Decorador para requerir roles específicos.
    
    Args:
        allowed_roles: Lista de roles permitidos
    
    Returns:
        Función decoradora
    """
    async def role_checker(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        if current_user.rol not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permisos insuficientes. Roles requeridos: {', '.join(allowed_roles)}",
            )
        return current_user
    
    return role_checker


def require_admin(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    """Require ADMIN_INSTITUCIONAL role."""
    if current_user.rol != "ADMIN_INSTITUCIONAL":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol ADMIN_INSTITUCIONAL",
        )
    return current_user


def require_docente(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    """Require DOCENTE role."""
    if current_user.rol != "DOCENTE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol DOCENTE",
        )
    return current_user
