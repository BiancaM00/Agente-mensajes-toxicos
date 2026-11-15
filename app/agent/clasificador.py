
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
    """Limita un valor al intervalo de 0 a 1."""
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
# 3. CLASIFICACIÓN Y COMBINACIÓN DE SEÑALES
# ==========================================================

def combinar_senales(
    texto: str,
    toxicidad: float,
    hateful: float,
    targeted: float,
    aggressive: float,
) -> dict[str, float]:
    """
    Combina las señales de los modelos de IA con reglas.

    Clasifica en insulto, acoso, amenaza, odio, spam
    y ninguna.

    Los resultados son puntuaciones heurísticas,
    no probabilidades calibradas.
    """

    texto = normalizar_texto(texto)

    toxicidad = limitar(toxicidad)
    hateful = limitar(hateful)
    targeted = limitar(targeted)
    aggressive = limitar(aggressive)

    # ------------------------------------------------------
    # 3.1. DETECCIÓN DE CONTEXTO ACADÉMICO
    # ------------------------------------------------------

    # Ejemplo:
    # "La palabra idiota es un ejemplo de insulto."

    patron_definicion = (
        r"(?:la palabra|el t[eé]rmino)\s+"
        r"\w+\s+"
        r"(?:es|constituye|representa)\s+"
        r"(?:un|una)\s+ejemplo\s+de\s+"
        r"(?:insulto|amenaza)\.?"
    )

    # Ejemplo:
    # "El profesor explicó por qué está mal decir
    # te voy a golpear."

    patron_explicacion = (
        r"(?:el profesor|la profesora|"
        r"el docente|la docente)\s+"
        r"(?:explic[oó]|coment[oó]|dijo)\s+"
        r".*?"
        r"(?:est[aá] mal|no debemos)\s+"
        r"decir\s+[\w\sáéíóúñ]+[.!]?"
    )

    contexto_academico = (
        toxicidad < 0.20
        and (
            re.fullmatch(patron_definicion, texto)
            or re.fullmatch(patron_explicacion, texto)
        )
    )

    # Evitar falsos positivos en estos patrones
    # académicos específicos.
    if contexto_academico:
        return {
            "insulto": 0.0,
            "acoso": 0.0,
            "amenaza": 0.0,
            "odio": 0.0,
            "spam": 0.0,
            "ninguna": 1.0,
        }

    # ------------------------------------------------------
    # 3.2. DETECCIÓN DE INSULTOS
    # ------------------------------------------------------

    # Reconoce variantes masculinas, femeninas
    # y palabras con o sin tilde.

    patron_insulto = (
        r"\b(?:"
        r"idiota|"
        r"imb[eé]cil|"
        r"est[uú]pid[oa]s?|"
        r"tont[oa]s?|"
        r"in[uú]til(?:es)?"
        r")\b"
    )

    es_insulto = bool(
        re.search(patron_insulto, texto)
    )

    # ------------------------------------------------------
    # 3.3. DETECCIÓN DE AMENAZAS
    # ------------------------------------------------------

    # Reconoce:
    # "Te voy a golpear"
    # "Te voy a pegar"
    # "Te rompo la cara"
    # "Te voy 4 matar"

    patron_amenaza = (
        r"\b(?:"
        r"te voy (?:a|4) "
        r"(?:matar|golpear|pegar|hacer daño)"
        r"|te (?:mato|golpeo|pego)"
        r"|voy a (?:matarte|golpearte|pegarte)"
        r"|te rompo (?:la|tu) cara"
        r")\b"
    )

    es_amenaza = bool(
        re.search(patron_amenaza, texto)
    )

    # ------------------------------------------------------
    # 3.4. DETECCIÓN DE POSIBLE ACOSO
    # ------------------------------------------------------

    # Identificar referencias a comportamientos repetidos.

    patron_repeticion = (
        r"\b(?:"
        r"llevo semanas|"
        r"cada vez que|"
        r"todos los d[ií]as"
        r")\b"
    )

    # Verbos asociados con hostigamiento.

    patron_hostigamiento = (
        r"\b(?:"
        r"burl[a-záéíóúñ]+|"
        r"humill[a-záéíóúñ]+|"
        r"molest[a-záéíóúñ]+|"
        r"acos[a-záéíóúñ]+"
        r")\b"
    )

    posible_acoso = bool(
        re.search(patron_repeticion, texto)
        and re.search(patron_hostigamiento, texto)
    )

    # ------------------------------------------------------
    # 3.5. REFERENCIAS A GRUPOS
    # ------------------------------------------------------

    # Esta regla complementa RoBERTuito.
    # Mencionar un grupo NO implica automáticamente odio.

    patron_grupos = (
        r"\b(?:"
        r"mujer(?:es)?|"
        r"hombres?|"
        r"inmigrantes?|"
        r"extranjer[oa]s?|"
        r"discapacitados?|"
        r"religiones?|"
        r"etnias?"
        r")\b"
    )

    referencia_grupal = bool(
        re.search(patron_grupos, texto)
    )

    # ------------------------------------------------------
    # 3.6. COMBINAR SEÑALES
    # ------------------------------------------------------

    resultados = {
        "insulto": max(
            0.90 if es_insulto else 0.0,
            toxicidad * targeted,
        ),

        "acoso": max(
            0.93 if posible_acoso else 0.0,
            targeted * aggressive * 0.25,
        ),

        "amenaza": (
            0.97 if es_amenaza else 0.0
        ),

        "odio": (
            hateful
            if referencia_grupal
            else hateful * 0.25
        ),

        "spam": (
            0.95 if es_spam(texto) else 0.0
        ),
    }

    # Calcular la ausencia de señales relevantes.
    resultados["ninguna"] = limitar(
        1.0 - max(resultados.values())
    )

    return resultados


# ==========================================================
# 4. CARGA DE LOS MODELOS DE INTELIGENCIA ARTIFICIAL
# ==========================================================

@lru_cache(maxsize=1)
def cargar_modelos():
    """
    Carga DistilBERT y RoBERTuito una sola vez
    por proceso para reutilizarlos en los análisis.
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
# 5. ANÁLISIS COMPLETO DE UN MENSAJE
# ==========================================================

def analizar_mensaje(
    texto: str,
    explicar: bool = False,
) -> dict:
    """
    Analiza un mensaje utilizando ambos modelos.

    Devuelve:
    - Texto normalizado.
    - Categoría principal.
    - Puntajes por categoría.
    - Puntuación de toxicidad.
    - Señales de RoBERTuito.
    - Fragmentos explicativos opcionales.
    """

    # ------------------------------------------------------
    # 5.1. NORMALIZACIÓN
    # ------------------------------------------------------

    texto_normalizado = normalizar_texto(texto)

    # Manejar mensajes vacíos.
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

    # ------------------------------------------------------
    # 5.2. CARGAR LOS MODELOS
    # ------------------------------------------------------

    modelo_toxicidad, modelo_odio = cargar_modelos()

    # ------------------------------------------------------
    # 5.3. ANÁLISIS CON DISTILBERT
    # ------------------------------------------------------

    resultado_toxicidad = modelo_toxicidad(
        texto_normalizado,
        truncation=True,
    )[0]

    toxicidad = obtener_score_toxicidad(
        resultado_toxicidad
    )

    # ------------------------------------------------------
    # 5.4. ANÁLISIS CON ROBERTUITO
    # ------------------------------------------------------

    resultados_odio = modelo_odio(
        texto_normalizado,
        top_k=None,
        truncation=True,
    )

    puntuaciones_odio = {
        resultado["label"].lower(): float(
            resultado["score"]
        )
        for resultado in resultados_odio
    }

    # Comprobar que estén todas las etiquetas.
    etiquetas_requeridas = {
        "hateful",
        "targeted",
        "aggressive",
    }

    etiquetas_faltantes = (
        etiquetas_requeridas
        - puntuaciones_odio.keys()
    )

    if etiquetas_faltantes:
        raise ValueError(
            "Faltan etiquetas de RoBERTuito: "
            f"{etiquetas_faltantes}"
        )

    # ------------------------------------------------------
    # 5.5. COMBINACIÓN DE RESULTADOS
    # ------------------------------------------------------

    puntajes = combinar_senales(
        texto=texto_normalizado,
        toxicidad=toxicidad,
        hateful=puntuaciones_odio["hateful"],
        targeted=puntuaciones_odio["targeted"],
        aggressive=puntuaciones_odio["aggressive"],
    )

    # ------------------------------------------------------
    # 5.6. CATEGORÍA PRINCIPAL
    # ------------------------------------------------------

    categoria_principal = max(
        puntajes,
        key=puntajes.get,
    )

    # ------------------------------------------------------
    # 5.7. EXPLICACIÓN MEDIANTE OCLUSIÓN
    # ------------------------------------------------------

    fragmentos = []

    if explicar:
        # Importación local para evitar dependencias
        # circulares entre clasificador y explicador.
        from app.agent.explicador import explicar_toxicidad

        resultado_explicacion = explicar_toxicidad(
            texto_normalizado
        )

        fragmentos = resultado_explicacion[
            "fragmentos"
        ]

    # ------------------------------------------------------
    # 5.8. RESULTADO FINAL
    # ------------------------------------------------------

    return {
        "texto_normalizado": texto_normalizado,
        "categoria_principal": categoria_principal,
        "puntajes": puntajes,
        "toxicidad": toxicidad,
        "robertuito": puntuaciones_odio,
        "fragmentos": fragmentos,
    }