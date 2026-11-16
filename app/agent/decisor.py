
"""Decisor basado en costos esperados."""

from typing import Dict

from app.agent.tipos import ACCIONES, CATEGORIAS, ResultadoNLP


# Costos de cada acción según la categoría detectada.
# Menor costo significa una decisión más conveniente.
COSTOS = {
    "PUBLICAR": {
        "insulto": 10, "acoso": 15, "amenaza": 30,
        "odio": 20, "spam": 5, "ninguna": 0,
    },
    "PUBLICAR_CON_AVISO": {
        "insulto": 6, "acoso": 10, "amenaza": 25,
        "odio": 15, "spam": 4, "ninguna": 1,
    },
    "PEDIR_REESCRITURA": {
        "insulto": 3, "acoso": 5, "amenaza": 12,
        "odio": 7, "spam": 3, "ninguna": 4,
    },
    "RETENER": {
        "insulto": 2, "acoso": 3, "amenaza": 5,
        "odio": 3, "spam": 2, "ninguna": 8,
    },
    "RETENER_URGENTE": {
        "insulto": 4, "acoso": 2, "amenaza": 0,
        "odio": 1, "spam": 5, "ninguna": 15,
    },
}


def validar_probabilidades(probabilidades: Dict[str, float]) -> None:
    """Verifica que el NLP entregue las seis categorías correctamente."""

    if set(probabilidades) != set(CATEGORIAS):
        raise ValueError(
            "El NLP debe entregar exactamente las seis categorías."
        )

    for categoria, valor in probabilidades.items():
        if not isinstance(valor, (int, float)) or not 0 <= valor <= 1:
            raise ValueError(
                f"Probabilidad inválida para {categoria}: {valor}"
            )

    if abs(sum(probabilidades.values()) - 1.0) > 0.01:
        raise ValueError("Las probabilidades deben sumar aproximadamente 1.")


def calcular_costos_esperados(
    probabilidades: Dict[str, float],
    reincidencia: float = 0.0,
) -> Dict[str, float]:
    """Calcula el costo esperado de cada acción."""

    validar_probabilidades(probabilidades)

    if reincidencia < 0:
        raise ValueError("La reincidencia no puede ser negativa.")

    costos = {}

    for accion in ACCIONES:
        costo_total = 0.0

        for categoria in CATEGORIAS:
            costo = COSTOS[accion][categoria]

            # La reincidencia aumenta el costo de permitir
            # contenido potencialmente tóxico.
            if categoria != "ninguna" and accion in [
                "PUBLICAR",
                "PUBLICAR_CON_AVISO",
                "PEDIR_REESCRITURA",
            ]:
                costo *= (1 + reincidencia)

            costo_total += probabilidades[categoria] * costo

        costos[accion] = round(costo_total, 4)

    return costos


def decidir_accion(
    resultado_nlp: ResultadoNLP,
    reincidencia: float = 0.0,
) -> tuple[str, Dict[str, float]]:
    """Selecciona la acción con el menor costo esperado."""

    costos = calcular_costos_esperados(
        resultado_nlp.probabilidades,
        reincidencia,
    )

    mejor_accion = min(costos, key=costos.get)

    return mejor_accion, costos
