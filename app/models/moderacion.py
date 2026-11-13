"""Modelo de Caso de Moderación."""

from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class EstadoModeracion(str, enum.Enum):
    """Estados de un caso de moderación."""
    ABIERTO = "ABIERTO"
    APROBADO = "APROBADO"
    RECHAZADO = "RECHAZADO"


class CasoModeracion(Base):
    """Tabla de casos de moderación."""
    
    __tablename__ = "caso_moderacion"
    
    id = Column(Integer, primary_key=True, index=True)
    publicacion_id = Column(Integer, ForeignKey("publicacion.id"), unique=True, nullable=False)
    moderador_id = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    estado = Column(Enum(EstadoModeracion), default=EstadoModeracion.ABIERTO)
    observacion = Column(Text, nullable=True)
    abierto_en = Column(DateTime(timezone=True), server_default=func.now())
    resuelto_en = Column(DateTime(timezone=True), nullable=True)
    
    # Relaciones
    publicacion = relationship("Publicacion", back_populates="caso_moderacion")
    moderador = relationship("Usuario", back_populates="casos_moderados")
