
import re
import unicodedata


def normalizar_texto(texto: str) -> str:
    """Normaliza mensajes y algunas formas de evasión."""

    if not texto:
        return ""

    texto = unicodedata.normalize("NFC", texto).lower()
    texto = re.sub(r"\s+", " ", texto).strip()

    # Proteger direcciones de correo y enlaces
    protegidos = re.split(
        r"(https?://\S+|[\w.+-]+@[\w.-]+\.\w+)",
        texto,
    )

    conversion = str.maketrans({
        "1": "i", "3": "e", "4": "a",
        "0": "o", "@": "a"
    })

    def procesar(fragmento):
        # Unir letras separadas
        fragmento = re.sub(
            r"\b(?:[a-záéíóúñ]\s+){3,}[a-záéíóúñ]\b",
            lambda m: m.group().replace(" ", ""),
            fragmento,
        )

        # Corregir sustituciones como 1d10t4
        def convertir(m):
            palabra = m.group()
            if re.search(r"[a-záéíóúñ]", palabra):
                return palabra.translate(conversion)
            return palabra

        fragmento = re.sub(
            r"(?<!\w)[a-záéíóúñ0-9@]+(?!\w)",
            convertir,
            fragmento,
        )

        # Reducir repeticiones excesivas
        return re.sub(
            r"([a-záéíóúñ])\1{2,}",
            r"\1",
            fragmento,
        )

    return "".join(
        parte if re.fullmatch(
            r"https?://\S+|[\w.+-]+@[\w.-]+\.\w+",
            parte,
        ) else procesar(parte)
        for parte in protegidos
    )
