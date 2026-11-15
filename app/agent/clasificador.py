
"""Clasificador de mensajes para el agente moderador inteligente."""

import re
from functools import lru_cache

from transformers import pipeline

from app.agent.normalizador import normalizar_texto
from app.agent.spam import es_spam


# ==========================================================
# 1. CONFIGURACIÓN DE LOS MODELOS
# ==========================================================

MODELO_TOXICIDAD = (
    "citizenlab/distilbert-base-multilingual-cased-toxicity"
)

MODELO_ODIO = "pysentimiento/robertuito-hate-speech"

CATEGORIAS = [
    "insulto",
    "acoso",
    "amenaza",
    "odio",
    "spam",
    "ninguna",
]


# ==========================================================
# 2. FUNCIONES AUXILIARES
# ==========================================================

def limitar(valor: float) -> float:
    """Limita un valor al intervalo entre 0 y 1."""
    return max(0.0, min(1.0, float(valor)))


def obtener_score_toxicidad(prediccion: dict) -> float:
    """Obtiene la puntuación de toxicidad de DistilBERT."""

    etiqueta = prediccion["label"].lower()
    confianza = float(prediccion["score"])

    if etiqueta == "toxic":
        return confianza

    if etiqueta == "not_toxic":
        return 1.0 - confianza

    raise ValueError(
        f"Etiqueta desconocida de DistilBERT: {etiqueta}"
    )


# ==========================================================
# 3. COMBINACIÓN DE SEÑALES
# ==========================================================

def combinar_senales(
    texto: str,
    toxicidad: float,
    hateful: float,
    targeted: float,
    aggressive: float,
) -> dict[str, float]:
    """
    Combina las señales de IA con reglas de moderación.

    Devuelve puntuaciones heurísticas por categoría.
    No son probabilidades calibradas.
    """

    texto = normalizar_texto(texto)

    toxicidad = limitar(toxicidad)
    hateful = limitar(hateful)
    targeted = limitar(targeted)
    aggressive = limitar(aggressive)

    # Detectar insultos explícitos
    es_insulto = bool(
        re.search(
            r"\b(idiota|imbécil|estúpido|tonto|inútil)\b",
            texto,
        )
    )

    # Detectar amenazas explícitas
    es_amenaza = bool(
        re.search(
            r"\b("
            r"te voy a (matar|golpear|hacer daño)"
            r"|te mato"
            r"|te golpeo"
            r"|voy a matarte"
            r"|voy a golpearte"
            r")\b",
            texto,
        )
    )

    # Construir los puntajes por categoría
    resultados = {
        "insulto": max(
            0.85 if es_insulto and toxicidad >= 0.5 else 0.0,
            toxicidad * targeted,
        ),
        "acoso": targeted * aggressive,
        "amenaza": 0.95 if es_amenaza else 0.0,
        "odio": hateful,
        "spam": 0.95 if es_spam(texto) else 0.0,
    }

    # Puntaje de ausencia de señales
    resultados["ninguna"] = limitar(
        1.0 - max(resultados.values())
    )

    return resultados


# ==========================================================
# 4. CARGA DE LOS MODELOS DE IA
# ==========================================================

@lru_cache(maxsize=1)
def cargar_modelos():
    """
    Carga DistilBERT y RoBERTuito.

    Los modelos se cargan una sola vez por proceso
    para evitar repetir la inicialización.
    """

    print("Cargando DistilBERT...")

    modelo_toxicidad = pipeline(
        "text-classification",
        model=MODELO_TOXICIDAD,
        tokenizer=MODELO_TOXICIDAD,
        device=-1,
    )

    print("Cargando RoBERTuito...")

    modelo_odio = pipeline(
        "text-classification",
        model=MODELO_ODIO,
        tokenizer=MODELO_ODIO,
        device=-1,
    )

    print("Ambos modelos están listos.")

    return modelo_toxicidad, modelo_odio


# ==========================================================
# 5. ANÁLISIS COMPLETO DEL MENSAJE
# ==========================================================

def analizar_mensaje(
    texto: str,
    explicar: bool = False,
) -> dict:
    """
    Analiza un mensaje con ambos modelos.

    Incluye:
    - Texto normalizado.
    - Categoría principal.
    - Puntajes por categoría.
    - Toxicidad de DistilBERT.
    - Señales de RoBERTuito.
    - Fragmentos explicativos opcionales.
    """

    # 1. Normalizar el mensaje
    texto_normalizado = normalizar_texto(texto)

    # 2. Manejar mensajes vacíos
    if not texto_normalizado:
        return {
            "texto_normalizado": "",
            "categoria_principal": "ninguna",
            "puntajes": {
                "insulto": 0.0,
                "acoso": 0.0,
                "amenaza": 0.0,
                "odio": 0.0,
                "spam": 0.0,
                "ninguna": 1.0,
            },
            "toxicidad": 0.0,
            "robertuito": {},
            "fragmentos": [],
        }

    # 3. Cargar los modelos
    modelo_toxicidad, modelo_odio = cargar_modelos()

    # 4. Ejecutar DistilBERT
    resultado_toxicidad = modelo_toxicidad(
        texto_normalizado,
        truncation=True,
    )[0]

    toxicidad = obtener_score_toxicidad(
        resultado_toxicidad
    )

    # 5. Ejecutar RoBERTuito
    resultados_odio = modelo_odio(
        texto_normalizado,
        top_k=None,
        truncation=True,
    )

    puntuaciones_odio = {
        resultado["label"].lower(): float(resultado["score"])
        for resultado in resultados_odio
    }

    # Validar las etiquetas del modelo
    etiquetas_requeridas = {
        "hateful",
        "targeted",
        "aggressive",
    }

    etiquetas_faltantes = (
        etiquetas_requeridas - puntuaciones_odio.keys()
    )

    if etiquetas_faltantes:
        raise ValueError(
            f"Faltan etiquetas de RoBERTuito: "
            f"{etiquetas_faltantes}"
        )

    # 6. Combinar las señales de los modelos
    puntajes = combinar_senales(
        texto=texto_normalizado,
        toxicidad=toxicidad,
        hateful=puntuaciones_odio["hateful"],
        targeted=puntuaciones_odio["targeted"],
        aggressive=puntuaciones_odio["aggressive"],
    )

    # 7. Identificar la categoría principal
    categoria_principal = max(
        puntajes,
        key=puntajes.get,
    )

    # 8. Preparar la explicación
    fragmentos = []

    if explicar:
        from app.agent.explicador import explicar_toxicidad

        resultado_explicacion = explicar_toxicidad(
            texto_normalizado
        )

        fragmentos = resultado_explicacion["fragmentos"]

    # 9. Devolver el resultado completo
    return {
        "texto_normalizado": texto_normalizado,
        "categoria_principal": categoria_principal,
        "puntajes": puntajes,
        "toxicidad": toxicidad,
        "robertuito": puntuaciones_odio,
        "fragmentos": fragmentos,
    }
