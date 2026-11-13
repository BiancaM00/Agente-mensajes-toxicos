"""Modelo de Institución."""

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Institucion(Base):
    """Tabla de instituciones educativas."""
    
    __tablename__ = "institucion"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    dominio = Column(String(100), unique=True, nullable=False)
    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    usuarios = relationship("Usuario", back_populates="institucion")
    cursos = relationship("Curso", back_populates="institucion")
