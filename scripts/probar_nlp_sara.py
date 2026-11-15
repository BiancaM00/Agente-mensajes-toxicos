
import time

from app.agent.clasificador import analizar_mensaje

mensajes = [
    "Muchas gracias por tu explicación.",
    "Eres un idiota.",
    "Te voy a golpear cuando te vea.",
    "Odio a toda esa gente.",
    "Tu argumento no tiene sustento, revisa las fuentes.",
    "Eres un 1d10t4.",
    "Nuestro grupo gana si entregamos."
]

for numero, texto in enumerate(mensajes, start=1):
    print(f"\n{'=' * 55}")
    print(f"PRUEBA {numero}")
    print(f"Mensaje: {texto}")

    inicio = time.perf_counter()

    try:
        resultado = analizar_mensaje(texto, explicar=False)
        tiempo = time.perf_counter() - inicio

        print("Categoria:", resultado["categoria_principal"])
        print("Puntajes:", resultado["puntajes"])
        print("Toxicidad:", resultado["toxicidad"])
        print("RoBERTuito:", resultado["robertuito"])
        print(f"Tiempo: {tiempo:.4f} segundos")

    except Exception as error:
        print("ERROR:", type(error).__name__, str(error))
        break
