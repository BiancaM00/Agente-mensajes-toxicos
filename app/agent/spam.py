
"""Detector heuristico de spam promocional."""

import re
from urllib.parse import urlparse

from app.agent.normalizador import normalizar_texto


# Detecta enlaces con protocolo, www o dominio sin protocolo.
PATRON_ENLACE = re.compile(
    r"""(?ix)
    (?:https?://|www\.)[^\s<>"']+
    |
    (?<![@\w])
    (?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+
    [a-z]{2,}
    (?:/[^\s<>"']*)?
    """
)

# Palabras asociadas a publicidad comercial.
PATRON_PROMOCIONAL = re.compile(
    r"\b(?:compras?|comprar|descuentos?|"
    r"promoci[oó]n(?:es)?|premios?|ofertas?)\b",
    re.IGNORECASE,
)

# Promesas de ganancias o ingresos.
PATRON_GANANCIAS = re.compile(
    r"\b(?:gana(?:r)?|gan[ae]|genera)\s+"
    r"(?:dinero|plata|ingresos?)\b"
    r"|\b(?:dinero|plata|ingresos?)\s+"
    r"(?:f[aá]cil(?:es)?|garantizad[oa]s?)\b",
    re.IGNORECASE,
)

# Promesas comerciales sospechosas.
PATRON_PROMESA = re.compile(
    r"\b100\s*%\s*(?:garantizad[oa]s?|segur[oa]s?)\b"
    r"|\bsin\s+experiencia\b"
    r"|\b(?:ganancias?|ingresos?)\s+garantizad[oa]s?\b",
    re.IGNORECASE,
)

# Publicidad relacionada con apuestas.
PATRON_APUESTAS = re.compile(
    r"\b(?:apuestas?|pron[oó]sticos?|"
    r"casinos?|tipsters?|cuotas\s+deportivas)\b",
    re.IGNORECASE,
)

# Canales utilizados habitualmente para captar clientes.
PATRON_CONTACTO = re.compile(
    r"\b(?:whatsapp|telegram|escr[ií]beme|"
    r"contacta(?:me)?|env[ií]ame|"
    r"grupo\s+de\s+(?:whatsapp|telegram))\b",
    re.IGNORECASE,
)

# Repetición de llamadas comerciales.
PATRON_COMPRA_REPETIDA = re.compile(
    r"\b(?:compra|comprar)\s+(?:ya|ahora|hoy)\b",
    re.IGNORECASE,
)


def limpiar_enlace(enlace: str) -> str:
    """Elimina signos de puntuación al final de un enlace."""
    return enlace.rstrip(".,;:!?)]}")


def es_dominio_universitario(url: str) -> bool:
    """Reconoce enlaces pertenecientes al dominio de la UTB."""

    url = limpiar_enlace(url.strip())

    if not re.match(r"^[a-z][a-z0-9+.-]*://", url, re.IGNORECASE):
        url = "https://" + url.lstrip("/")

    dominio = (urlparse(url).hostname or "").lower()

    return (
        dominio == "utb.edu.co"
        or dominio.endswith(".utb.edu.co")
    )


def es_spam(texto: str) -> bool:
    """
    Detecta patrones de spam promocional mediante reglas heurísticas.

    Considera enlaces externos, publicidad, promesas de ganancias,
    promociones de apuestas y repetición comercial excesiva.
    """

    if not texto or not texto.strip():
        return False

    texto = normalizar_texto(texto)

    # Extraer enlaces, incluyendo dominios sin protocolo.
    enlaces = [
        limpiar_enlace(enlace)
        for enlace in PATRON_ENLACE.findall(texto)
    ]

    enlaces_externos = [
        enlace
        for enlace in enlaces
        if not es_dominio_universitario(enlace)
    ]

    # Tres o más enlaces externos constituyen una señal fuerte.
    if len(enlaces_externos) >= 3:
        return True

    promocional = bool(PATRON_PROMOCIONAL.search(texto))

    promesa_ganancias = bool(
        PATRON_GANANCIAS.search(texto)
        or PATRON_PROMESA.search(texto)
    )

    apuestas = bool(PATRON_APUESTAS.search(texto))
    contacto = bool(PATRON_CONTACTO.search(texto))

    # Detectar repetición excesiva de llamadas comerciales.
    repeticiones = len(
        PATRON_COMPRA_REPETIDA.findall(texto)
    )

    if repeticiones >= 3:
        return True

    # Enlace externo acompañado de publicidad.
    if enlaces_externos and promocional:
        return True

    # Promesas de ganancias acompañadas de canales de captación.
    if promesa_ganancias and contacto:
        return True

    # Publicidad de apuestas con promesas, contacto o enlaces.
    if apuestas and (
        promesa_ganancias
        or contacto
        or enlaces_externos
    ):
        return True

    # Promoción comercial acompañada de captación de clientes.
    if promocional and contacto:
        return True

    return False
