
"""Modelo para almacenar la reincidencia de cada estudiante por curso."""

from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base


class EstadoAgente(Base):
    __tablename__ = "estado_agente"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    curso_id = Column(Integer, ForeignKey("curso.id"), nullable=False)
    reincidencia = Column(Float, nullable=False, default=0.0)
    actualizado_en = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "usuario_id",
            "curso_id",
            name="uq_estado_agente_usuario_curso",
        ),
    )
