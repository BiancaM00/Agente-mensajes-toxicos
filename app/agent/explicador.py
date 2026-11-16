
"""Explicación de toxicidad mediante oclusión de palabras."""

import re

from app.agent.normalizador import normalizar_texto
from app.agent.clasificador import cargar_modelos


def obtener_toxicidad(prediccion: dict) -> float:
    """Convierte la predicción de DistilBERT en un score tóxico."""
    etiqueta = prediccion["label"].lower()
    confianza = float(prediccion["score"])

    if etiqueta == "toxic":
        return confianza

    if etiqueta == "not_toxic":
        return 1.0 - confianza

    raise ValueError(f"Etiqueta inesperada: {etiqueta}")


def explicar_toxicidad(
    texto: str,
    max_fragmentos: int = 3,
    max_palabras: int = 25,
) -> dict:
    """Identifica palabras que aumentan el score de toxicidad."""

    normalizado = normalizar_texto(texto)

    if not normalizado:
        return {
            "toxicidad_original": 0.0,
            "fragmentos": [],
        }

    modelo_toxicidad, _ = cargar_modelos()

    # Obtener la toxicidad del mensaje completo.
    prediccion_original = modelo_toxicidad(
        normalizado,
        truncation=True,
    )[0]

    toxicidad_original = obtener_toxicidad(
        prediccion_original
    )

    # Identificar las posiciones de las palabras.
    palabras = list(
        re.finditer(r"\b\w+\b", normalizado)
    )[:max_palabras]

    textos_modificados = []
    palabras_eliminadas = []

    for coincidencia in palabras:
        palabra = coincidencia.group()

        # Eliminar solo esta ocurrencia de la palabra.
        texto_modificado = (
            normalizado[:coincidencia.start()]
            + normalizado[coincidencia.end():]
        )

        texto_modificado = re.sub(
            r"\s+", " ", texto_modificado
        ).strip()

        if not texto_modificado:
            continue

        palabras_eliminadas.append(palabra)
        textos_modificados.append(texto_modificado)

    if not textos_modificados:
        return {
            "toxicidad_original": toxicidad_original,
            "fragmentos": [],
        }

    # Evaluar los textos modificados por lotes.
    predicciones = modelo_toxicidad(
        textos_modificados,
        truncation=True,
        batch_size=8,
    )

    fragmentos = []

    for palabra, prediccion in zip(
        palabras_eliminadas, predicciones
    ):
        nueva_toxicidad = obtener_toxicidad(prediccion)

        impacto = toxicidad_original - nueva_toxicidad

        if impacto > 0.01:
            fragmentos.append({
                "palabra": palabra,
                "impacto": round(impacto, 4),
            })

    fragmentos.sort(
        key=lambda elemento: elemento["impacto"],
        reverse=True,
    )

    return {
        "toxicidad_original": round(
            toxicidad_original, 4
        ),
        "fragmentos": fragmentos[:max_fragmentos],
    }
