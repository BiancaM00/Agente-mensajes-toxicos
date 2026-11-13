"""Modelo de seguimiento de advertencias tóxicas por usuario y curso."""

from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class SeguimientoToxicidad(Base):
    """Tabla para contar advertencias consecutivas por curso."""

    __tablename__ = "seguimiento_toxicidad"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    curso_id = Column(Integer, ForeignKey("curso.id"), nullable=False)
    advertencias_consecutivas = Column(Integer, nullable=False, default=0)
    actualizado_en = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("usuario_id", "curso_id", name="uq_seguimiento_toxicidad_usuario_curso"),
    )

    usuario = relationship("Usuario")
    curso = relationship("Curso")