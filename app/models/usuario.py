"""Modelo de Usuario."""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class RolUsuario(str, enum.Enum):
    """Roles disponibles en el sistema."""
    ESTUDIANTE = "ESTUDIANTE"
    DOCENTE = "DOCENTE"
    ADMIN_INSTITUCIONAL = "ADMIN_INSTITUCIONAL"


class Usuario(Base):
    """Tabla de usuarios del sistema."""
    
    __tablename__ = "usuario"
    
    id = Column(Integer, primary_key=True, index=True)
    institucion_id = Column(Integer, ForeignKey("institucion.id"), nullable=False)
    nombre = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    rol = Column(Enum(RolUsuario), nullable=False)
    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    institucion = relationship("Institucion", back_populates="usuarios")
    matriculas = relationship("Matricula", back_populates="usuario")
    refresh_tokens = relationship("RefreshToken", back_populates="usuario")
    notificaciones = relationship("Notificacion", back_populates="usuario")
    publicaciones_autor = relationship("Publicacion", foreign_keys="Publicacion.autor_id", back_populates="autor")
    hilos_creados = relationship("Hilo", back_populates="creador")
    casos_moderados = relationship("CasoModeracion", back_populates="moderador")
