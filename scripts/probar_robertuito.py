
"""Prueba del modelo RoBERTuito para análisis de odio y agresividad."""

import time
from transformers import pipeline

MODELO = "pysentimiento/robertuito-hate-speech"

mensajes = [
    "Gracias por compartir tu explicación.",
    "Eres un idiota, no sabes nada.",
    "Te voy a golpear.",
    "Tu argumento no tiene sustento, revisa las fuentes.",
]

print("Cargando RoBERTuito...")
inicio_carga = time.perf_counter()

clasificador = pipeline(
    "text-classification",
    model=MODELO,
    tokenizer=MODELO,
    device=-1,
)

print(f"Modelo cargado en {time.perf_counter() - inicio_carga:.2f} s")

for mensaje in mensajes:
    inicio = time.perf_counter()

    resultados = clasificador(
        mensaje,
        top_k=None,
        truncation=True,
    )

    tiempo = time.perf_counter() - inicio

    probabilidades = {
        resultado["label"].lower(): resultado["score"]
        for resultado in resultados
    }

    print("\n-----------------------")
    print("Mensaje:", mensaje)

    for categoria in ["hateful", "targeted", "aggressive"]:
        valor = probabilidades.get(categoria, 0.0)
        print(f"{categoria}: {valor:.4f}")

    print(f"Tiempo: {tiempo:.3f} segundos")
