
"""Modelo para registrar las decisiones del agente."""

from sqlalchemy import (
    Column,
    Integer,
    Float,
    String,
    Text,
    DateTime,
    ForeignKey,
    JSON,
)
from sqlalchemy.sql import func

from app.database import Base


class DecisionAgente(Base):
    """Historial de decisiones tomadas por el agente."""

    __tablename__ = "decision_agente"

    id = Column(Integer, primary_key=True, index=True)

    publicacion_id = Column(
        Integer,
        ForeignKey("publicacion.id"),
        nullable=False,
    )

    accion = Column(String(40), nullable=False)
    score = Column(Float, nullable=False)
    probabilidades = Column(JSON, nullable=False)
    costo_esperado = Column(JSON, nullable=False)
    reincidencia = Column(Float, nullable=False)
    explicacion = Column(Text, nullable=False)
    modelo = Column(String(100), nullable=False)

    creado_en = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
