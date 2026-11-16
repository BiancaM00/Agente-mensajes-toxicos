
"""Normalización de mensajes y detección de evasiones textuales."""

import re
import unicodedata


# Caracteres que pueden aparecer separados para evadir el detector.
CARACTERES = r"a-záéíóúñ0134@"

# Una palabra fragmentada debe contener al menos cuatro caracteres.
PATRON_SEPARADO = re.compile(
    rf"(?<!\w)(?:[{CARACTERES}]\s+){{3,}}"
    rf"[{CARACTERES}](?!\w)"
)

# Protección de enlaces y direcciones de correo.
PATRON_PROTEGIDOS = re.compile(
    r"(https?://\S+|[\w.+-]+@[\w.-]+\.\w+)"
)

CONVERSION = str.maketrans({
    "1": "i",
    "3": "e",
    "4": "a",
    "0": "o",
    "@": "a",
})


def normalizar_texto(texto: str) -> str:
    """
    Normaliza mensajes para facilitar su clasificación.

    Incluye:
    - Conversión a minúsculas.
    - Normalización Unicode.
    - Unión de caracteres separados.
    - Conversión de leetspeak.
    - Reducción de repeticiones excesivas.
    - Protección de correos y enlaces.
    """

    if not texto:
        return ""

    texto = unicodedata.normalize("NFC", texto).lower()
    texto = re.sub(r"\s+", " ", texto).strip()

    # Separar el contenido normal de los enlaces protegidos.
    partes = PATRON_PROTEGIDOS.split(texto)

    def procesar(fragmento: str) -> str:
        """Aplica la normalización a un fragmento de texto."""

        # Unir caracteres separados.
        def unir_caracteres(coincidencia):
            secuencia = coincidencia.group()

            # Evitar unir "a" con una palabra separada:
            # "voy a m a t a r" -> "voy a matar".
            if secuencia.startswith("a m "):
                return "a " + secuencia[2:].replace(" ", "")

            return secuencia.replace(" ", "")

        fragmento = PATRON_SEPARADO.sub(
            unir_caracteres,
            fragmento,
        )

        # Convertir sustituciones como 1d10t4 -> idiota.
        def convertir(coincidencia):
            palabra = coincidencia.group()

            # No alterar números puros.
            if re.search(r"[a-záéíóúñ]", palabra):
                return palabra.translate(CONVERSION)

            return palabra

        fragmento = re.sub(
            r"(?<!\w)[a-záéíóúñ0-9@]+(?!\w)",
            convertir,
            fragmento,
        )

        # Reducir tres o más repeticiones consecutivas.
        fragmento = re.sub(
            r"([a-záéíóúñ])\1{2,}",
            r"\1",
            fragmento,
        )

        return fragmento

    # Normalizar únicamente los fragmentos no protegidos.
    resultado = []

    for parte in partes:
        if PATRON_PROTEGIDOS.fullmatch(parte):
            resultado.append(parte)
        else:
            resultado.append(procesar(parte))

    return "".join(resultado)
