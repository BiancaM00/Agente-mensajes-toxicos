
"""Línea base del sistema original de moderación.

Reutiliza ToxicityService para evaluar los mensajes sin
crear publicaciones ni modificar la base de datos.
"""

import asyncio

from app.models.evaluacion import NivelRiesgo
from app.services.toxicity_service import ToxicityService


async def evaluar_baseline(texto: str) -> dict:
    score, riesgo, modelo = await ToxicityService.evaluar_texto(texto)

    retener = riesgo == NivelRiesgo.ALTO

    return {
        "score_toxicidad": float(score),
        "nivel_riesgo": riesgo.value if riesgo else "SIN_RIESGO",
        "accion": "RETENER" if retener else "PUBLICAR",
        "prediccion_toxica": int(retener),
        "modelo": modelo,
    }


async def main():
    mensajes = [
        "Gracias por compartir tu explicación.",
        "Eres un imbécil y no sabes nada.",
    ]

    for mensaje in mensajes:
        resultado = await evaluar_baseline(mensaje)
        print(f"\nMensaje: {mensaje}")
        print(f"Resultado: {resultado}")


if __name__ == "__main__":
    asyncio.run(main())
