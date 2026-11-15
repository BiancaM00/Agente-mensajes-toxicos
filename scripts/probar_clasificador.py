
"""Pruebas de clasificación con los dos modelos integrados."""

from app.agent.clasificador import analizar_mensaje

mensajes = [
    "Gracias por ayudarme con la tarea.",
    "Eres un idiota, no sabes nada.",
    "Te voy a golpear.",
    "Tu explicación tiene errores, revisa las fuentes.",
    "Compra con descuento en https://ofertas.com",
    "Eres un 1d10t4.",
]

for numero, mensaje in enumerate(mensajes, start=1):
    resultado = analizar_mensaje(mensaje)

    print(f"\n{'=' * 50}")
    print(f"PRUEBA {numero}")
    print(f"Mensaje: {mensaje}")
    print(f"Normalizado: {resultado['texto_normalizado']}")
    print(f"Categoría: {resultado['categoria_principal']}")
    print(f"Toxicidad: {resultado['toxicidad']:.4f}")

    print("Puntuaciones por categoría:")

    for categoria, puntuacion in resultado["puntajes"].items():
        print(f"  {categoria}: {puntuacion:.4f}")

print("\nPruebas finalizadas.")
