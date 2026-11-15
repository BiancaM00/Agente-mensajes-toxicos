
"""Medición de latencia del clasificador NLP de Sara."""

import csv
import time
from pathlib import Path
from statistics import mean, median

from app.agent.clasificador import analizar_mensaje, cargar_modelos


MENSAJES = [
    "Hola, gracias por tu ayuda",
    "Eres un idiota",
    "Te voy a golpear",
    "No dejes de molestar a ese estudiante",
    "Compra con descuento https://ofertas.com",
]

REPETICIONES = 5
SALIDA = Path("scripts/latencia_nlp.csv")


def medir():
    print("Cargando modelos...")
    cargar_modelos()

    # Calentamiento: no incluir estas ejecuciones en las métricas.
    for mensaje in MENSAJES:
        analizar_mensaje(mensaje, explicar=False)
        analizar_mensaje(mensaje, explicar=True)

    registros = []

    for repeticion in range(1, REPETICIONES + 1):
        for mensaje in MENSAJES:
            for explicar in (False, True):
                inicio = time.perf_counter()
                analizar_mensaje(mensaje, explicar=explicar)
                duracion_ms = (time.perf_counter() - inicio) * 1000

                registros.append({
                    "repeticion": repeticion,
                    "mensaje": mensaje,
                    "explicacion": explicar,
                    "latencia_ms": round(duracion_ms, 2),
                })

                print(
                    f"Repetición {repeticion} | "
                    f"Explicación={explicar} | "
                    f"{duracion_ms:.2f} ms"
                )

    SALIDA.parent.mkdir(parents=True, exist_ok=True)

    with SALIDA.open("w", newline="", encoding="utf-8-sig") as archivo:
        escritor = csv.DictWriter(
            archivo,
            fieldnames=[
                "repeticion",
                "mensaje",
                "explicacion",
                "latencia_ms",
            ],
        )
        escritor.writeheader()
        escritor.writerows(registros)

    print("\n=== RESUMEN DE LATENCIA NLP ===")

    for explicar in (False, True):
        tiempos = [
            registro["latencia_ms"]
            for registro in registros
            if registro["explicacion"] == explicar
        ]

        print(
            f"Explicación={explicar}: "
            f"promedio={mean(tiempos):.2f} ms, "
            f"mediana={median(tiempos):.2f} ms, "
            f"máximo={max(tiempos):.2f} ms"
        )

    print(f"\nResultados guardados en: {SALIDA}")
    print(f"Total de mediciones: {len(registros)}")


if __name__ == "__main__":
    medir()
