
"""Evaluación inicial del agente moderador con 30 casos."""

import csv
import time
from pathlib import Path

from app.agent.clasificador import analizar_mensaje


# Etiquetas de referencia definidas manualmente.
# Incluyen casos sencillos y algunos intentos de evasión.
CASOS = [
    # Mensajes académicos normales
    ("ninguna", "Gracias por ayudarme con la tarea."),
    ("ninguna", "Tu argumento necesita más fuentes."),
    ("ninguna", "Nuestro equipo gana si estudiamos."),
    ("ninguna", "El dinero del proyecto es limitado."),
    ("ninguna", "Consulta https://www.utb.edu.co"),
    ("ninguna", "No estoy de acuerdo con tu explicación."),

    # Insultos y alteraciones
    ("insulto", "Eres un 1d10t4."),
    ("insulto", "Eres un i d i o t a."),
    ("insulto", "Eres tontoooo."),
    ("insulto", "Eres un 3stup1d0."),
    ("insulto", "Eres un inútil."),
    ("insulto", "Eres un 1nút1l."),

    # Amenazas
    ("amenaza", "Te voy a golpear."),
    ("amenaza", "Te voy a g0lp34r."),
    ("amenaza", "Te voy a m4t4r."),
    ("amenaza", "T3 v0y 4 m4t4r."),
    ("amenaza", "Voy a matarte."),
    ("amenaza", "Te voy a hacer daño."),

    # Spam promocional
    ("spam", "Compra con descuento en https://ofertas.com"),
    ("spam", "Pr0m0ci0n en https://ofertas.com"),
    ("spam", "Reclama tu premio en https://promos.com"),
    ("spam", "Compra en https://ventas.com"),
    ("spam", "Visita https://a.com https://b.com https://c.com"),
    ("spam", "Descuentos en https://ofertas.com"),

    # Expresiones discriminatorias para evaluar odio
    ("odio", "Las mujeres no deberían estudiar ingeniería."),
    ("odio", "Los inmigrantes son inferiores."),
    ("odio", "No admitamos estudiantes extranjeros."),
    ("odio", "Todos los inmigrantes son delincuentes."),
    ("odio", "Las mujeres son inferiores."),
    ("odio", "Expulsen a todos los estudiantes extranjeros."),
]


def ejecutar_evaluacion():
    resultados = []
    aciertos = 0
    inicio = time.perf_counter()

    for numero, (esperada, mensaje) in enumerate(CASOS, 1):
        resultado = analizar_mensaje(mensaje)

        predicha = resultado["categoria_principal"]
        correcto = esperada == predicha

        if correcto:
            aciertos += 1

        registro = {
            "numero": numero,
            "mensaje": mensaje,
            "esperada": esperada,
            "predicha": predicha,
            "correcto": correcto,
            "toxicidad": round(resultado["toxicidad"], 4),
        }

        resultados.append(registro)

        estado = "OK" if correcto else "REVISAR"
        print(
            f"{numero:02d}. [{estado}] "
            f"Esperada: {esperada} | "
            f"Predicha: {predicha}"
        )

    duracion = time.perf_counter() - inicio
    exactitud = aciertos / len(CASOS)

    ruta = Path("scripts/evaluacion_nlp.csv")

    with ruta.open("w", newline="", encoding="utf-8-sig") as archivo:
        escritor = csv.DictWriter(
            archivo,
            fieldnames=resultados[0].keys(),
        )
        escritor.writeheader()
        escritor.writerows(resultados)

    print("\n========== RESULTADOS ==========")
    print(f"Mensajes evaluados: {len(CASOS)}")
    print(f"Aciertos: {aciertos}")
    print(f"Errores: {len(CASOS) - aciertos}")
    print(f"Exactitud: {exactitud:.2%}")
    print(f"Tiempo total: {duracion:.2f} segundos")
    print(f"Archivo generado: {ruta}")


if __name__ == "__main__":
    ejecutar_evaluacion()
