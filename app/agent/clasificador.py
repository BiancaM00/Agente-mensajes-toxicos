
"""Clasificador NLP para el agente moderador.

Combina DistilBERT, RoBERTuito y reglas.
Las puntuaciones son heurísticas normalizadas.
"""

import re
from functools import lru_cache

from transformers import pipeline

from app.agent.normalizador import normalizar_texto
from app.agent.spam import es_spam


MODELO_TOXICIDAD = (
    "citizenlab/distilbert-base-multilingual-cased-toxicity"
)
MODELO_ODIO = "pysentimiento/robertuito-hate-speech"

CATEGORIAS = [
    "insulto", "acoso", "amenaza",
    "odio", "spam", "ninguna"
]

PATRON_INSULTO = re.compile(
    r"\b(?:idiota|imb[eé]cil(?:es)?|"
    r"est[uú]pid[oa]s?|tont[oa]s?|"
    r"in[uú]til(?:es)?)\b"
)

PATRON_AMENAZA = re.compile(
    r"\b(?:"
    r"te voy (?:a|4) "
    r"(?:matar|golpear|pegar|hacer da[nñ]o|"
    r"romper (?:la|tu) cara)"
    r"|te (?:mato|golpeo|pego|rompo (?:la|tu) cara)"
    r"|voy a (?:matarte|golpearte|pegarte)"
    r"|si te veo[^.!?]{0,55}"
    r"te (?:rompo (?:la|tu) cara|golpeo|pego)"
    r"|como sigas as[ií],? te (?:pego|golpeo)"
    r")\b"
)

PATRON_REPETICION = re.compile(
    r"\b(?:llevo semanas|cada vez que|"
    r"todos los d[ií]as)\b"
)

PATRON_HOSTIGAMIENTO = re.compile(
    r"\b(?:burl[a-záéíóúñ]*|"
    r"humill[a-záéíóúñ]*|"
    r"molest[a-záéíóúñ]*|"
    r"acos[a-záéíóúñ]*)\b"
)

PATRON_GRUPOS = re.compile(
    r"\b(?:mujer(?:es)?|hombres?|"
    r"inmigrantes?|extranjer[oa]s?|"
    r"discapacitad[oa]s?|religiones?|etnias?)\b"
)

PATRONES_CITA = (
    re.compile(
        r"(?:la palabra|el t[eé]rmino)\s+"
        r"[\wáéíóúñ]+\s+"
        r"(?:es|constituye|representa)\s+"
        r"(?:un|una)\s+ejemplo\s+de\s+"
        r"(?:insulto|amenaza)\.?"
    ),
    re.compile(
        r"(?:en clase analizamos|"
        r"en clase estudiamos|hoy analizamos)\s+"
        r"(?:la expresi[oó]n|la frase|"
        r"el t[eé]rmino)\s+"
        r"[\w\sáéíóúñ]+[.!]?"
    ),
    re.compile(
        r"(?:el profesor|la profesora|"
        r"el docente|la docente)\s+"
        r"(?:explic[oó]|coment[oó]|dijo)\s+"
        r".{0,130}?"
        r"(?:est[aá] mal|no debemos)\s+"
        r"decir\s+[\w\sáéíóúñ]+[.!]?"
    ),
    re.compile(
        r"(?:la expresi[oó]n|la frase)\s+"
        r"[\w\sáéíóúñ]+\s+"
        r"(?:es|constituye|representa)\s+"
        r"un\s+(?:insulto|ejemplo de amenaza)\.?"
    ),
)


def limitar(valor: float) -> float:
    return max(0.0, min(1.0, float(valor)))


def obtener_score_toxicidad(prediccion: dict) -> float:
    etiqueta = (
        prediccion["label"].strip().lower()
        .replace("-", "_")
    )
    confianza = limitar(prediccion["score"])

    if etiqueta == "toxic":
        return confianza

    if etiqueta in {"not_toxic", "non_toxic"}:
        return 1.0 - confianza

    raise ValueError(
        f"Etiqueta desconocida de DistilBERT: {etiqueta}"
    )


def es_cita_academica(texto: str) -> bool:
    normalizado = normalizar_texto(texto)
    return any(
        patron.fullmatch(normalizado)
        for patron in PATRONES_CITA
    )


def normalizar_puntuaciones(
    senales: dict[str, float]
) -> dict[str, float]:

    valores = {
        categoria: limitar(senales.get(categoria, 0.0))
        for categoria in CATEGORIAS
    }

    total = sum(valores.values())

    if total <= 0:
        return {
            categoria: float(categoria == "ninguna")
            for categoria in CATEGORIAS
        }

    resultado = {
        categoria: valores[categoria] / total
        for categoria in CATEGORIAS
    }

    resultado["ninguna"] += 1.0 - sum(resultado.values())

    return resultado


def combinar_senales(
    texto: str,
    toxicidad: float,
    hateful: float,
    targeted: float,
    aggressive: float,
) -> dict[str, float]:

    texto = normalizar_texto(texto)

    if not texto or es_cita_academica(texto):
        return {
            categoria: float(categoria == "ninguna")
            for categoria in CATEGORIAS
        }

    toxicidad = limitar(toxicidad)
    hateful = limitar(hateful)
    targeted = limitar(targeted)
    aggressive = limitar(aggressive)

    insulto = bool(PATRON_INSULTO.search(texto))
    amenaza = bool(PATRON_AMENAZA.search(texto))

    acoso = bool(
        PATRON_REPETICION.search(texto)
        and PATRON_HOSTIGAMIENTO.search(texto)
    )

    grupo = bool(PATRON_GRUPOS.search(texto))

    senales = {
        "insulto": max(
            0.90 if insulto else 0.0,
            toxicidad * targeted,
        ),
        "acoso": max(
            0.93 if acoso else 0.0,
            targeted * aggressive * 0.25,
        ),
        "amenaza": 0.97 if amenaza else 0.0,
        "odio": hateful if grupo else hateful * 0.25,
        "spam": 0.95 if es_spam(texto) else 0.0,
    }

    senales["ninguna"] = limitar(
        1.0 - max(senales.values())
    )

    return normalizar_puntuaciones(senales)


@lru_cache(maxsize=1)
def cargar_modelos():
    """Carga los modelos una sola vez por proceso."""

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


def _inferir(
    texto_normalizado: str
) -> tuple[float, dict[str, float]]:

    modelo_toxicidad, modelo_odio = cargar_modelos()

    prediccion = modelo_toxicidad(
        texto_normalizado,
        truncation=True,
    )[0]

    toxicidad = obtener_score_toxicidad(prediccion)

    predicciones_odio = modelo_odio(
        texto_normalizado,
        top_k=None,
        truncation=True,
    )

    if (
        predicciones_odio
        and isinstance(predicciones_odio[0], list)
    ):
        predicciones_odio = predicciones_odio[0]

    odio = {
        resultado["label"].lower(): limitar(
            resultado["score"]
        )
        for resultado in predicciones_odio
    }

    faltantes = {
        "hateful", "targeted", "aggressive"
    } - odio.keys()

    if faltantes:
        raise ValueError(
            f"Faltan etiquetas de RoBERTuito: {sorted(faltantes)}"
        )

    return toxicidad, odio


def analizar_mensaje(
    texto: str,
    explicar: bool = False,
    texto_padre: str | None = None,
) -> dict:

    texto_normalizado = normalizar_texto(texto)

    if not texto_normalizado:
        puntajes = {
            categoria: float(categoria == "ninguna")
            for categoria in CATEGORIAS
        }

        return {
            "texto_normalizado": "",
            "categoria_principal": "ninguna",
            "puntajes": puntajes,
            "probabilidades": puntajes,
            "toxicidad": 0.0,
            "score_toxicidad": 0.0,
            "robertuito": {},
            "fragmentos": [],
            "modelo": "DistilBERT + RoBERTuito + reglas",
        }

    toxicidad, odio = _inferir(texto_normalizado)

    puntajes = combinar_senales(
        texto_normalizado,
        toxicidad,
        hateful=odio["hateful"],
        targeted=odio["targeted"],
        aggressive=odio["aggressive"],
    )

    if (
        texto_padre
        and texto_padre.strip()
        and not (
            PATRON_AMENAZA.search(texto_normalizado)
            or PATRON_INSULTO.search(texto_normalizado)
        )
    ):
        contexto = normalizar_texto(texto_padre)

        combinado = (
            f"{contexto[:500]} [SEP] "
            f"{texto_normalizado}"
        )

        toxicidad_contexto, _ = _inferir(combinado)

        if toxicidad_contexto < toxicidad:
            ajustadas = dict(puntajes)

            ajustadas["insulto"] *= (
                toxicidad_contexto / max(toxicidad, 1e-9)
            )

            ajustadas["ninguna"] = limitar(
                1.0 - max(
                    ajustadas[categoria]
                    for categoria in CATEGORIAS
                    if categoria != "ninguna"
                )
            )

            puntajes = normalizar_puntuaciones(ajustadas)

    categoria_principal = max(
        CATEGORIAS,
        key=lambda categoria: puntajes[categoria],
    )

    fragmentos = []

    if explicar and categoria_principal != "ninguna":
        from app.agent.explicador import explicar_toxicidad

        resultado_explicacion = explicar_toxicidad(
            texto_normalizado
        )

        fragmentos = resultado_explicacion["fragmentos"]

    return {
        "texto_normalizado": texto_normalizado,
        "categoria_principal": categoria_principal,
        "puntajes": puntajes,
        "probabilidades": puntajes,
        "toxicidad": toxicidad,
        "score_toxicidad": limitar(
            1.0 - puntajes["ninguna"]
        ),
        "robertuito": odio,
        "fragmentos": fragmentos,
        "modelo": "DistilBERT + RoBERTuito + reglas",
    }
