"""Modelos de Foro e Hilo."""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Foro(Base):
    """Tabla de foros por curso."""
    
    __tablename__ = "foro"
    
    id = Column(Integer, primary_key=True, index=True)
    curso_id = Column(Integer, ForeignKey("curso.id"), nullable=False)
    titulo = Column(String(200), nullable=False)
    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    curso = relationship("Curso", back_populates="foros")
    hilos = relationship("Hilo", back_populates="foro")


class Hilo(Base):
    """Tabla de hilos de discusión."""
    
    __tablename__ = "hilo"
    
    id = Column(Integer, primary_key=True, index=True)
    foro_id = Column(Integer, ForeignKey("foro.id"), nullable=False)
    titulo = Column(String(300), nullable=False)
    creado_por = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    foro = relationship("Foro", back_populates="hilos")
    creador = relationship("Usuario", back_populates="hilos_creados")
    publicaciones = relationship("Publicacion", back_populates="hilo")
