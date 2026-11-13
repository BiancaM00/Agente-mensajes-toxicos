"""Modelos de Curso y Matrícula."""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class RolEnCurso(str, enum.Enum):
    """Roles dentro de un curso."""
    ESTUDIANTE = "ESTUDIANTE"
    DOCENTE = "DOCENTE"


class Curso(Base):
    """Tabla de cursos académicos."""
    
    __tablename__ = "curso"
    
    id = Column(Integer, primary_key=True, index=True)
    institucion_id = Column(Integer, ForeignKey("institucion.id"), nullable=False)
    codigo = Column(String(20), nullable=False)
    nombre = Column(String(200), nullable=False)
    periodo = Column(String(20), nullable=False)
    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('institucion_id', 'codigo', 'periodo', name='uq_curso'),
    )
    
    # Relaciones
    institucion = relationship("Institucion", back_populates="cursos")
    matriculas = relationship("Matricula", back_populates="curso")
    foros = relationship("Foro", back_populates="curso")


class Matricula(Base):
    """Tabla de matrículas (relación usuario-curso)."""
    
    __tablename__ = "matricula"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    curso_id = Column(Integer, ForeignKey("curso.id"), nullable=False)
    rol_en_curso = Column(Enum(RolEnCurso), nullable=False)
    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('usuario_id', 'curso_id', name='uq_matricula'),
    )
    
    # Relaciones
    usuario = relationship("Usuario", back_populates="matriculas")
    curso = relationship("Curso", back_populates="matriculas")
