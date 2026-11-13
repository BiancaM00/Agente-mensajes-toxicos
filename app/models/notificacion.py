"""Modelo de Notificación."""

from sqlalchemy import Column, Integer, Text, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class TipoNotificacion(str, enum.Enum):
    """Tipos de notificaciones."""
    COMENTARIO_MARCADO = "COMENTARIO_MARCADO"
    REVISION_PENDIENTE = "REVISION_PENDIENTE"
    CASO_RESUELTO = "CASO_RESUELTO"


class Notificacion(Base):
    """Tabla de notificaciones del sistema."""
    
    __tablename__ = "notificacion"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    tipo = Column(Enum(TipoNotificacion), nullable=False)
    mensaje = Column(Text, nullable=False)
    leido = Column(Boolean, default=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    publicacion_id = Column(Integer, ForeignKey("publicacion.id"), nullable=True)
    
    # Relaciones
    usuario = relationship("Usuario", back_populates="notificaciones")
    publicacion = relationship("Publicacion", back_populates="notificaciones")
