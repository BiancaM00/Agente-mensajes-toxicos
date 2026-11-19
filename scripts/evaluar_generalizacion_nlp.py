
"""Evaluación de generalización y casos exploratorios de acoso."""

import time

from app.agent.clasificador import analizar_mensaje


# ==========================================================
# 1. MENSAJES NUEVOS PARA EVALUAR EL CLASIFICADOR
# ==========================================================

CASOS = [
    # Comentarios académicos legítimos
    ("ninguna", "Agradezco tus observaciones; revisaré la bibliografía."),
    ("ninguna", "No comparto tu interpretación del artículo."),
    ("ninguna", "La palabra idiota es un ejemplo de insulto."),
    ("ninguna", "El profesor explicó por qué está mal decir te voy a golpear."),
    ("ninguna", "Consulta https://biblioteca.utb.edu.co"),

    # Insultos
    ("insulto", "No sabes nada, eres imbécil."),
    ("insulto", "Qué estúpida eres."),
    ("insulto", "Eres una tonta, siempre te equivocas."),

    # Amenazas
    ("amenaza", "Si te veo mañana, te rompo la cara."),
    ("amenaza", "Voy a golpearte cuando salgas."),
    ("amenaza", "Te voy a pegar."),

    # Spam
    ("spam", "Aprovecha las promociones en https://rebajas.net"),
    ("spam", "Compra ahora en https://descuentos.com"),

    # Discriminación
    ("odio", "Los extranjeros no deberían entrar a esta universidad."),
    ("odio", "Las mujeres no sirven para aprender programación."),
]


# ==========================================================
# 2. CASOS EXPLORATORIOS DE ACOSO
# ==========================================================

# Estos casos requieren analizar contexto e historial.
# No se incluyen en el porcentaje de exactitud.

CASOS_ACOSO = [
    "Llevo semanas burlándome de ti y no voy a parar.",
    "Cada vez que escribas, voy a humillarte delante de todos.",
    "Todos los días te enviaré mensajes para molestarte.",
]


# ==========================================================
# 3. FUNCIÓN DE EVALUACIÓN
# ==========================================================

def evaluar():
    aciertos = 0
    errores = []
    inicio = time.perf_counter()

    print("\n=== EVALUACIÓN CON MENSAJES NUEVOS ===")

    for numero, (esperada, mensaje) in enumerate(CASOS, 1):
        resultado = analizar_mensaje(mensaje)

        predicha = resultado["categoria_principal"]
        correcto = esperada == predicha

        if correcto:
            aciertos += 1
        else:
            errores.append({
                "numero": numero,
                "mensaje": mensaje,
                "esperada": esperada,
                "predicha": predicha,
            })

        estado = "OK" if correcto else "REVISAR"

        print(f"\n{numero:02d}. [{estado}] {mensaje}")
        print(f"    Esperada: {esperada}")
        print(f"    Predicha: {predicha}")

        # Mostrar detalles de los casos mal clasificados
        if not correcto:
            print(
                "    Texto normalizado:",
                resultado["texto_normalizado"],
            )

            print(
                f"    Toxicidad DistilBERT: "
                f"{resultado['toxicidad']:.4f}"
            )

            print("    Puntuaciones por categoría:")
            for categoria, valor in resultado["puntajes"].items():
                print(f"      {categoria}: {valor:.4f}")

            print("    Resultados de RoBERTuito:")
            for categoria, valor in resultado["robertuito"].items():
                print(f"      {categoria}: {valor:.4f}")

    # ======================================================
    # 4. EVALUACIÓN EXPLORATORIA DE ACOSO
    # ======================================================

    print("\n=== CASOS EXPLORATORIOS DE ACOSO ===")

    for numero, mensaje in enumerate(CASOS_ACOSO, 1):
        resultado = analizar_mensaje(mensaje)

        print(f"\nAcoso {numero}: {mensaje}")
        print(f"    Categoría: {resultado['categoria_principal']}")
        print(f"    Toxicidad: {resultado['toxicidad']:.4f}")
        print(f"    Señal de acoso: {resultado['puntajes']['acoso']:.4f}")

        print("    Señales de RoBERTuito:")
        for categoria, valor in resultado["robertuito"].items():
            print(f"      {categoria}: {valor:.4f}")

    # ======================================================
    # 5. RESUMEN FINAL
    # ======================================================

    tiempo = time.perf_counter() - inicio

    print("\n=== RESUMEN ===")
    print(f"Casos etiquetados: {len(CASOS)}")
    print(f"Aciertos: {aciertos}")
    print(f"Errores: {len(errores)}")
    print(f"Exactitud exploratoria: {aciertos / len(CASOS):.2%}")
    print(f"Tiempo total: {tiempo:.2f} segundos")

    # ======================================================
    # 6. DETALLE DE ERRORES
    # ======================================================

    if errores:
        print("\n=== ERRORES ENCONTRADOS ===")

        for error in errores:
            print(
                f"\nCaso {error['numero']:02d}: "
                f"{error['mensaje']}"
            )
            print(f"    Esperada: {error['esperada']}")
            print(f"    Predicha: {error['predicha']}")
    else:
        print("\nNo se encontraron errores en los casos etiquetados.")

    print("\nEvaluación finalizada.")


if __name__ == "__main__":
    evaluar()
