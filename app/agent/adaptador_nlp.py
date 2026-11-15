
"""Adaptador de resultados NLP para el agente moderador."""

from typing import Any

from app.agent.clasificador import analizar_mensaje


def preparar_resultado_nlp(
    texto: str,
    explicar: bool = False,
) -> dict[str, Any]:
    """
    Prepara el análisis de NLP para integrarlo
    con el agente moderador.

    Las puntuaciones son heurísticas,
    no probabilidades calibradas.
    """

    resultado = analizar_mensaje(
        texto,
        explicar=explicar,
    )

    return {
        "texto_normalizado": resultado["texto_normalizado"],
        "probabilidades": resultado["puntajes"],
        "score_toxicidad": resultado["toxicidad"],
        "fragmentos": resultado["fragmentos"],
        "modelo": "DistilBERT + RoBERTuito + reglas",
    }
