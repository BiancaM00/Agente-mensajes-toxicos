
"""Adaptador del clasificador al contrato ResultadoNLP del agente."""

from typing import Any

from app.agent.clasificador import analizar_mensaje


def preparar_resultado_nlp(
    texto: str,
    explicar: bool = False,
    texto_padre: str | None = None,
) -> dict[str, Any]:
    """
    Adapta el resultado del clasificador al contrato NLP.

    Devuelve:
    - Texto normalizado.
    - Probabilidades por categoría.
    - Score de toxicidad.
    - Fragmentos explicativos.
    - Nombre del modelo.

    Admite mensajes con o sin texto padre.
    """

    # Analizar el mensaje con contexto opcional.
    if texto_padre is None:
        resultado = analizar_mensaje(
            texto,
            explicar=explicar,
        )
    else:
        resultado = analizar_mensaje(
            texto,
            explicar=explicar,
            texto_padre=texto_padre,
        )

    # Obtener las puntuaciones por categoría.
    probabilidades = resultado["puntajes"]

    # Calcular el score según el contrato del agente.
    score_toxicidad = max(
        0.0,
        min(1.0, 1.0 - probabilidades["ninguna"]),
    )

    # Convertir los fragmentos al formato list[str].
    fragmentos = [
        fragmento["palabra"]
        if isinstance(fragmento, dict)
        else str(fragmento)
        for fragmento in resultado["fragmentos"]
    ]

    # Identificar los modelos utilizados.
    modelo = resultado.get(
        "modelo",
        "DistilBERT + RoBERTuito + reglas",
    )

    return {
        "texto_normalizado": resultado["texto_normalizado"],
        "probabilidades": probabilidades,
        "score_toxicidad": score_toxicidad,
        "fragmentos": fragmentos,
        "modelo": modelo,
    }
