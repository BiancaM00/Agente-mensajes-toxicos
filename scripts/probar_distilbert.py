
"""Prueba inicial de DistilBERT para detectar toxicidad."""

import time
from transformers import pipeline
from app.agent.normalizador import normalizar_texto

MODELO = "citizenlab/distilbert-base-multilingual-cased-toxicity"

mensajes = [
    "Gracias por compartir tu explicación.",
    "Eres un idiota, no sabes nada.",
    "Tu argumento no tiene sustento, revisa las fuentes.",
    "Eres un 1d10t4.",
]

print("Cargando DistilBERT...")
inicio_carga = time.perf_counter()

clasificador = pipeline(
    "text-classification",
    model=MODELO,
    tokenizer=MODELO,
    device=-1,  # Ejecutar en CPU
)

print(f"Modelo cargado en {time.perf_counter() - inicio_carga:.2f} s")

for mensaje in mensajes:
    texto = normalizar_texto(mensaje)

    inicio = time.perf_counter()
    resultado = clasificador(texto, truncation=True)[0]
    tiempo = time.perf_counter() - inicio

    etiqueta = resultado["label"].lower()
    confianza = float(resultado["score"])

    if etiqueta == "toxic":
        toxicidad = confianza
    elif etiqueta == "not_toxic":
        toxicidad = 1 - confianza
    else:
        raise ValueError(f"Etiqueta desconocida: {etiqueta}")

    print("\n-----------------------")
    print("Original:", mensaje)
    print("Normalizado:", texto)
    print("Clasificación:", etiqueta)
    print(f"Toxicidad: {toxicidad:.4f}")
    print(f"Tiempo: {tiempo:.3f} segundos")
