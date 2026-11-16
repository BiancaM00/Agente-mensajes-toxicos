
"""Coordinador principal del agente inteligente de moderación."""

from datetime import datetime, timezone
from typing import Optional

from app.agent.tipos import Percepcion, ResultadoNLP, Decision
from app.agent.estado import calcular_reincidencia
from app.agent.decisor import decidir_accion, calcular_costos_esperados
from app.agent.actuadores import aplicar_accion


def crear_resultado_seguro() -> ResultadoNLP:
    """Resultado de respaldo cuando falla el análisis NLP."""

    return ResultadoNLP(
        texto_normalizado="",
        probabilidades={
            "insulto": 0.0,
            "acoso": 0.0,
            "amenaza": 0.0,
            "odio": 0.0,
            "spam": 0.0,
            "ninguna": 1.0,
        },
        score_toxicidad=0.0,
        fragmentos=[],
        modelo="error_nlp",
    )


def procesar(
    percepcion: Percepcion,
    resultado_nlp: Optional[ResultadoNLP],
    reincidencia_anterior: float = 0.0,
    ultima_actualizacion: Optional[datetime] = None,
    ahora: Optional[datetime] = None,
) -> Decision:
    """
    Procesa una percepción y devuelve la decisión del agente.

    Si no existe resultado NLP, el agente retiene la publicación
    para revisión manual.
    """

    ahora = ahora or datetime.now(timezone.utc)
    fallo_nlp = resultado_nlp is None

    if fallo_nlp:
        resultado_nlp = crear_resultado_seguro()

    if ultima_actualizacion is None:
        ultima_actualizacion = ahora

    reincidencia = calcular_reincidencia(
        reincidencia_anterior=reincidencia_anterior,
        ultima_actualizacion=ultima_actualizacion,
        gravedad=resultado_nlp.score_toxicidad,
        ahora=ahora,
    )

    accion, costos = decidir_accion(
        resultado_nlp,
        reincidencia,
    )

    if fallo_nlp:
        accion = "RETENER"
        explicacion = (
            "El análisis NLP falló. La publicación queda retenida "
            "para revisión manual."
        )
    else:
        explicacion = (
            f"Acción seleccionada: {accion}. "
            f"Menor costo esperado: {costos[accion]}. "
            f"Reincidencia calculada: {reincidencia:.4f}."
        )

    return Decision(
        accion=accion,
        costo_esperado=costos,
        reincidencia=reincidencia,
        explicacion=explicacion,
        nlp=resultado_nlp,
    )


def ejecutar_decision(publicacion, decision: Decision):
    """Aplica la acción elegida sobre la publicación."""

    return aplicar_accion(
        publicacion=publicacion,
        accion=decision.accion,
    )
