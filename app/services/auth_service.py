"""Servicio de autenticación."""

from datetime import timedelta, datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models import Usuario, RefreshToken
from app.models.usuario import RolUsuario
from app.schemas import (
    LoginRequest, 
    LoginResponse, 
    UsuarioCreate,
    RegistroEstudianteRequest,
    RegistroDocenteRequest,
)
from app.utils.jwt_handler import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.config import get_settings
from fastapi import HTTPException, status
import hashlib

settings = get_settings()


class AuthService:
    """Servicio de autenticación y autorización."""
    
    @staticmethod
    def registrar_usuario(db: Session, usuario_data: UsuarioCreate) -> Usuario:
        """
        Registra un nuevo usuario en el sistema.
        
        Args:
            db: Sesión de base de datos
            usuario_data: Datos del nuevo usuario
        
        Returns:
            Usuario creado
        
        Raises:
            HTTPException: Si el email ya existe
        """
        # Verificar que el email no exista
        usuario_existente = db.query(Usuario).filter(
            Usuario.email == usuario_data.email
        ).first()
        
        if usuario_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está registrado",
            )
        
        # Crear usuario
        usuario = Usuario(
            nombre=usuario_data.nombre,
            email=usuario_data.email,
            password_hash=hash_password(usuario_data.password),
            rol=usuario_data.rol,
            institucion_id=usuario_data.institucion_id,
        )
        
        db.add(usuario)
        
        try:
            db.commit()
            db.refresh(usuario)
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error al registrar el usuario",
            )
        
        return usuario
    
    @staticmethod
    def registrar_estudiante(db: Session, estudiante_data: RegistroEstudianteRequest) -> Usuario:
        """
        Registra un nuevo estudiante en el sistema.
        
        Args:
            db: Sesión de base de datos
            estudiante_data: Datos del estudiante
        
        Returns:
            Usuario creado como ESTUDIANTE
        
        Raises:
            HTTPException: Si el email ya existe
        """
        # Verificar que el email no exista
        usuario_existente = db.query(Usuario).filter(
            Usuario.email == estudiante_data.email
        ).first()
        
        if usuario_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está registrado",
            )
        
        # Crear usuario como ESTUDIANTE
        usuario = Usuario(
            nombre=estudiante_data.nombre,
            email=estudiante_data.email,
            password_hash=hash_password(estudiante_data.password),
            rol=RolUsuario.ESTUDIANTE,
            institucion_id=estudiante_data.institucion_id,
        )
        
        db.add(usuario)
        
        try:
            db.commit()
            db.refresh(usuario)
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error al registrar el estudiante",
            )
        
        return usuario
    
    @staticmethod
    def registrar_docente(db: Session, docente_data: RegistroDocenteRequest) -> Usuario:
        """
        Registra un nuevo docente en el sistema.
        
        Args:
            db: Sesión de base de datos
            docente_data: Datos del docente
        
        Returns:
            Usuario creado como DOCENTE
        
        Raises:
            HTTPException: Si el email ya existe
        """
        # Verificar que el email no exista
        usuario_existente = db.query(Usuario).filter(
            Usuario.email == docente_data.email
        ).first()
        
        if usuario_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está registrado",
            )
        
        # Crear usuario como DOCENTE
        usuario = Usuario(
            nombre=docente_data.nombre,
            email=docente_data.email,
            password_hash=hash_password(docente_data.password),
            rol=RolUsuario.DOCENTE,
            institucion_id=docente_data.institucion_id,
        )
        
        db.add(usuario)
        
        try:
            db.commit()
            db.refresh(usuario)
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error al registrar el docente",
            )
        
        return usuario
    
    @staticmethod
    def login(db: Session, login_data: LoginRequest) -> LoginResponse:
        """
        Autentica un usuario y retorna tokens JWT.
        
        Args:
            db: Sesión de base de datos
            login_data: Email y contraseña
        
        Returns:
            LoginResponse con access_token y refresh_token
        
        Raises:
            HTTPException: Si las credenciales son inválidas
        """
        usuario = db.query(Usuario).filter(
            Usuario.email == login_data.email
        ).first()
        
        if not usuario or not verify_password(login_data.password, usuario.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not usuario.activo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario desactivado",
            )
        
        # Crear tokens
        access_token = create_access_token(
            data={
                "sub": usuario.id,
                "email": usuario.email,
                "rol": usuario.rol,
                "institucion_id": usuario.institucion_id,
            }
        )
        
        refresh_token = create_refresh_token(
            data={
                "sub": usuario.id,
                "email": usuario.email,
            }
        )
        
        # Guardar refresh token hash en BD
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        # Calcular fecha de expiración: ahora + días configurados
        expira_en = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        db_refresh_token = RefreshToken(
            usuario_id=usuario.id,
            token_hash=token_hash,
            expira_en=expira_en,
            revocado=False,
        )
        db.add(db_refresh_token)
        db.commit()
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
        )
    
    @staticmethod
    def refresh_access_token(db: Session, refresh_token: str) -> LoginResponse:
        """
        Renueva el access token usando un refresh token válido.
        
        Args:
            db: Sesión de base de datos
            refresh_token: Refresh token vigente
        
        Returns:
            Nuevo access token
        
        Raises:
            HTTPException: Si el refresh token es inválido
        """
        payload = decode_token(refresh_token)
        
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token inválido o expirado",
            )
        
        usuario_id = payload.get("sub")
        usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
        
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado",
            )
        
        # Verificar que el token no esté revocado
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        db_token = db.query(RefreshToken).filter(
            RefreshToken.token_hash == token_hash
        ).first()
        
        if not db_token or db_token.revocado:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token revocado",
            )
        
        # Crear nuevo access token
        new_access_token = create_access_token(
            data={
                "sub": usuario.id,
                "email": usuario.email,
                "rol": usuario.rol,
                "institucion_id": usuario.institucion_id,
            }
        )
        
        return LoginResponse(
            access_token=new_access_token,
            refresh_token=refresh_token,  # Re-usar el mismo refresh token
            token_type="bearer",
        )
    
    @staticmethod
    def logout(db: Session, refresh_token: str) -> bool:
        """
        Revoca un refresh token (logout).
        
        Args:
            db: Sesión de base de datos
            refresh_token: Token a revocar
        
        Returns:
            True si se revocó correctamente
        """
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        db_token = db.query(RefreshToken).filter(
            RefreshToken.token_hash == token_hash
        ).first()
        
        if db_token:
            db_token.revocado = True
            db.commit()
            return True
        
        return False
