
"""Prueba de evasión del clasificador NLP."""

from pathlib import Path

from app.agent.clasificador import analizar_mensaje


ARCHIVO_CASOS = (
    Path(__file__).parent / "casos_evasion.txt"
)

MINIMO_DETECCIONES = 25


def test_detectar_evasiones():
    """Verifica al menos 25 detecciones en 30 mensajes."""

    mensajes = [
        linea.strip()
        for linea in ARCHIVO_CASOS.read_text(
            encoding="utf-8-sig"
        ).splitlines()
        if linea.strip()
    ]

    assert len(mensajes) == 30, (
        f"Se esperaban 30 mensajes, hay {len(mensajes)}"
    )

    detectados = 0
    fallidos = []

    for numero, mensaje in enumerate(mensajes, start=1):
        resultado = analizar_mensaje(
            mensaje,
            explicar=False,
        )

        categoria = resultado["categoria_principal"]

        if categoria != "ninguna":
            detectados += 1
            estado = "DETECTADO"
        else:
            fallidos.append((numero, mensaje))
            estado = "NO DETECTADO"

        print(
            f"{numero:02d}. [{estado}] "
            f"{categoria} | {mensaje}"
        )

    porcentaje = (detectados / len(mensajes)) * 100

    print("\n=== RESULTADOS DE EVASIÓN ===")
    print(f"Mensajes evaluados: {len(mensajes)}")
    print(f"Detectados: {detectados}")
    print(f"No detectados: {len(fallidos)}")
    print(f"Porcentaje de detección: {porcentaje:.2f}%")

    if fallidos:
        print("\nCasos no detectados:")
        for numero, mensaje in fallidos:
            print(f"{numero:02d}. {mensaje}")

    assert detectados >= MINIMO_DETECCIONES, (
        f"Solo se detectaron {detectados}/30 evasiones. "
        f"Se requieren al menos {MINIMO_DETECCIONES}."
    )
