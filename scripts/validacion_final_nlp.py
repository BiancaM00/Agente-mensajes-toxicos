
"""Validación adicional del clasificador con nuevos mensajes."""

from app.agent.clasificador import analizar_mensaje

CASOS = [
    ("ninguna", "El documento explica por qué los insultos son ofensivos."),
    ("ninguna", "En clase analizamos la expresión eres un idiota."),
    ("ninguna", "Voy a pegar el enlace de la tarea."),
    ("ninguna", "Tu respuesta necesita más argumentos."),

    ("insulto", "Eres un imbécil y no entiendes nada."),
    ("insulto", "Qué tonta eres, revisa lo que escribiste."),

    ("amenaza", "Te voy a romper la cara después de clase."),
    ("amenaza", "Como sigas así, te pego."),

    ("odio", "Las mujeres son incapaces de programar."),

    ("acoso", "Cada vez que participes, me burlaré de ti."),

    ("spam", "Compra aquí https://tienda.com"),
    ("spam", "Reclama tu premio en https://premios.net"),
]

aciertos = 0

for numero, (esperada, mensaje) in enumerate(CASOS, 1):
    resultado = analizar_mensaje(mensaje)
    predicha = resultado["categoria_principal"]

    correcto = esperada == predicha
    aciertos += int(correcto)

    print(f"\n{numero:02d}. {'OK' if correcto else 'REVISAR'}")
    print(f"Mensaje: {mensaje}")
    print(f"Esperada: {esperada}")
    print(f"Predicha: {predicha}")

print("\n=== VALIDACIÓN ADICIONAL ===")
print(f"Total: {len(CASOS)}")
print(f"Aciertos: {aciertos}")
print(f"Errores: {len(CASOS) - aciertos}")
print(f"Exactitud: {aciertos / len(CASOS):.2%}")
