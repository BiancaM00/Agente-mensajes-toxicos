"""Manejo de JWT."""

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from app.config import get_settings

settings = get_settings()

# Hasher de contraseñas con Argon2
ph = PasswordHasher()


def hash_password(password: str) -> str:
    """
    Hashea una contraseña usando Argon2.
    Argon2 es más seguro y moderno que bcrypt.
    
    Args:
        password: Contraseña en texto plano
    
    Returns:
        Hash de la contraseña
    """
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica una contraseña contra su hash Argon2.
    
    Args:
        plain_password: Contraseña en texto plano
        hashed_password: Hash almacenado en BD
    
    Returns:
        True si coincide, False en caso contrario
    """
    try:
        ph.verify(hashed_password, plain_password)
        return True
    except VerifyMismatchError:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crea un JWT access token.
    
    Args:
        data: Datos a incluir en el token
        expires_delta: Duración del token (default: 24h)
    
    Returns:
        Token JWT firmado
    """
    to_encode = data.copy()
    # Asegurar que 'sub' sea una cadena (python-jose requiere string)
    if 'sub' in to_encode and not isinstance(to_encode['sub'], str):
        to_encode['sub'] = str(to_encode['sub'])
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return encoded_jwt


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crea un JWT refresh token.
    
    Args:
        data: Datos a incluir en el token
        expires_delta: Duración del token (default: 7d)
    
    Returns:
        Token JWT firmado
    """
    to_encode = data.copy()
    # Asegurar que 'sub' sea una cadena
    if 'sub' in to_encode and not isinstance(to_encode['sub'], str):
        to_encode['sub'] = str(to_encode['sub'])
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
        )
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """
    Decodifica y valida un JWT.
    
    Args:
        token: Token JWT a validar
    
    Returns:
        Payload del token si es válido, None si es inválido o está expirado
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None
