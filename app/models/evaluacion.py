"""Modelo de Evaluación de Toxicidad."""

from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, Enum, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class NivelRiesgo(str, enum.Enum):
    """Niveles de riesgo de toxicidad."""
    BAJO = "BAJO"
    MEDIO = "MEDIO"
    ALTO = "ALTO"


class EvaluacionToxicidad(Base):
    """Tabla de evaluaciones de toxicidad."""
    
    __tablename__ = "evaluacion_toxicidad"
    
    id = Column(Integer, primary_key=True, index=True)
    publicacion_id = Column(Integer, ForeignKey("publicacion.id"), unique=True, nullable=False)
    score = Column(Float, nullable=False)
    riesgo = Column(Enum(NivelRiesgo), nullable=False)
    modelo = Column(String(100), nullable=False)
    evaluado_en = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    publicacion = relationship("Publicacion", back_populates="evaluacion_toxicidad")
