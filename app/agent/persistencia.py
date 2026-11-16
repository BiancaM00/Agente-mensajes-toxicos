"""Persistencia de estados y decisiones del agente moderador."""

from typing import Optional

from sqlalchemy.orm import Session

from app.models import EstadoAgente, DecisionAgente
from app.agent.tipos import Percepcion, Decision


def obtener_estado_reincidencia(
    db: Session,
    usuario_id: int,
    curso_id: int,
) -> tuple[float, Optional[object]]:
    """Consulta la reincidencia almacenada para un estudiante y un curso."""

    estado = db.query(EstadoAgente).filter(
        EstadoAgente.usuario_id == usuario_id,
        EstadoAgente.curso_id == curso_id,
    ).first()

    if estado is None:
        return 0.0, None

    return estado.reincidencia, estado.actualizado_en


def guardar_decision_y_estado(
    db: Session,
    publicacion_id: int,
    percepcion: Percepcion,
    decision: Decision,
) -> DecisionAgente:
    """Guarda la decisión del agente y actualiza la reincidencia."""

    try:
        estado = db.query(EstadoAgente).filter(
            EstadoAgente.usuario_id == percepcion.autor_id,
            EstadoAgente.curso_id == percepcion.curso_id,
        ).first()

        if estado is None:
            estado = EstadoAgente(
                usuario_id=percepcion.autor_id,
                curso_id=percepcion.curso_id,
                reincidencia=decision.reincidencia,
            )
            db.add(estado)
        else:
            estado.reincidencia = decision.reincidencia

        registro = DecisionAgente(
            publicacion_id=publicacion_id,
            accion=decision.accion,
            score=decision.nlp.score_toxicidad,
            probabilidades=decision.nlp.probabilidades,
            costo_esperado=decision.costo_esperado,
            reincidencia=decision.reincidencia,
            explicacion=decision.explicacion,
            modelo=decision.nlp.modelo,
        )

        db.add(registro)
        db.commit()
        db.refresh(registro)

        return registro

    except Exception:
        db.rollback()
        raise
