"""Modelo de Publicación."""

from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class EstadoPublicacion(str, enum.Enum):
    """Estados posibles de una publicación."""
    PENDIENTE_ANALISIS = "PENDIENTE_ANALISIS"
    APROBADO = "APROBADO"
    PENDIENTE_REVISION = "PENDIENTE_REVISION"
    RECHAZADO = "RECHAZADO"


class Publicacion(Base):
    """Tabla de publicaciones en hilos."""
    
    __tablename__ = "publicacion"
    
    id = Column(Integer, primary_key=True, index=True)
    hilo_id = Column(Integer, ForeignKey("hilo.id"), nullable=False)
    autor_id = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    contenido = Column(Text, nullable=False)
    estado = Column(Enum(EstadoPublicacion), default=EstadoPublicacion.PENDIENTE_ANALISIS)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relaciones
    hilo = relationship("Hilo", back_populates="publicaciones")
    autor = relationship("Usuario", foreign_keys=[autor_id], back_populates="publicaciones_autor")
    evaluacion_toxicidad = relationship("EvaluacionToxicidad", uselist=False, back_populates="publicacion")
    caso_moderacion = relationship("CasoModeracion", uselist=False, back_populates="publicacion")
    notificaciones = relationship("Notificacion", back_populates="publicacion")
