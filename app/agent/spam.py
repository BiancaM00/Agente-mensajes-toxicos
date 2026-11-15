
import re
from urllib.parse import urlparse

from app.agent.normalizador import normalizar_texto


def es_dominio_universitario(url: str) -> bool:
    """Reconoce enlaces del dominio de la UTB."""
    dominio = (urlparse(url).hostname or "").lower()

    return (
        dominio == "utb.edu.co"
        or dominio.endswith(".utb.edu.co")
    )


def es_spam(texto: str) -> bool:
    """Detecta patrones básicos de spam promocional."""

    if not texto:
        return False

    texto = normalizar_texto(texto)

    enlaces = re.findall(r"https?://[^\s]+", texto)

    enlaces_externos = [
        enlace for enlace in enlaces
        if not es_dominio_universitario(enlace)
    ]

    # Detectar mensajes con muchos enlaces externos
    if len(enlaces_externos) >= 3:
        return True

    # Palabras promocionales sospechosas
    patron_promocional = (
        r"\b(compra|comprar|descuento|descuentos|"
        r"promocion|promociones|premio|premios|"
        r"gana dinero)\b"
    )

    promocional = bool(
        re.search(patron_promocional, texto)
    )

    # Un enlace externo y lenguaje promocional
    return bool(enlaces_externos and promocional)
