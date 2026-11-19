
"""Evaluacion del detector original frente al agente inteligente.

Lee mensajes del CSV, ejecuta ambos sistemas y guarda
sus predicciones sin modificar la base de datos.
"""

import argparse
import asyncio
import csv
import time
from pathlib import Path

from scripts.baseline import evaluar_baseline
from app.agent.adaptador_nlp import preparar_resultado_nlp
from app.agent.tipos import Percepcion, ResultadoNLP
from app.agent.agente import procesar


RUTA_DATOS = Path("datos/test_mensajes.csv")
RUTA_RESULTADOS = Path("resultados/comparacion_agente.csv")


def cargar_mensajes():
    """Carga y valida los mensajes del dataset."""

    with RUTA_DATOS.open(
        "r", encoding="utf-8-sig", newline=""
    ) as archivo:
        lector = csv.DictReader(archivo)
        mensajes = list(lector)

    if len(mensajes) != 150:
        raise ValueError(
            f"Se esperaban 150 mensajes, pero hay {len(mensajes)}"
        )

    return mensajes


async def evaluar_mensaje(fila):
    """Compara ambos sistemas utilizando el mismo mensaje."""

    texto = fila["texto"]
    texto_padre = fila["texto_padre"].strip() or None

    # 1. Evaluar con el detector original.
    inicio = time.perf_counter()

    baseline = await evaluar_baseline(texto)

    tiempo_baseline = time.perf_counter() - inicio

    # 2. Evaluar con el NLP y el agente inteligente.
    inicio = time.perf_counter()

    resultado_nlp = ResultadoNLP(
        **preparar_resultado_nlp(
            texto,
            texto_padre=texto_padre,
        )
    )

    percepcion = Percepcion(
        texto=texto,
        autor_id=1,
        curso_id=1,
        hilo_id=1,
        texto_padre=texto_padre,
    )

    # No consulta ni modifica historial de estudiantes.
    decision = procesar(percepcion, resultado_nlp)

    tiempo_agente = time.perf_counter() - inicio

    # 3. Obtener la categoria principal del agente.
    categoria = max(
        resultado_nlp.probabilidades,
        key=resultado_nlp.probabilidades.get,
    )

    # 4. Preparar el registro de resultados.
    return {
        "id": fila["id"],
        "texto": texto,
        "texto_padre": texto_padre or "",
        "score_baseline": round(
            baseline["score_toxicidad"], 4
        ),
        "accion_baseline": baseline["accion"],
        "modelo_baseline": baseline["modelo"],
        "categoria_agente": categoria,
        "score_agente": round(
            resultado_nlp.score_toxicidad, 4
        ),
        "accion_agente": decision.accion,
        "costo_agente": decision.costo_esperado[
            decision.accion
        ],
        "reincidencia_calculada": round(
            decision.reincidencia, 4
        ),
        "modelo_agente": resultado_nlp.modelo,
        "tiempo_baseline_s": round(tiempo_baseline, 4),
        "tiempo_agente_s": round(tiempo_agente, 4),
    }


async def main(limite=None):
    """Ejecuta la evaluacion y exporta los resultados."""

    mensajes = cargar_mensajes()

    if limite is not None:
        if limite < 1:
            raise ValueError(
                "El limite debe ser mayor o igual a 1."
            )
        mensajes = mensajes[:limite]

    resultados = []

    for numero, fila in enumerate(mensajes, start=1):
        resultado = await evaluar_mensaje(fila)
        resultados.append(resultado)

        print(
            f"{numero}/{len(mensajes)} | "
            f"ID: {resultado['id']} | "
            f"Baseline: {resultado['accion_baseline']} | "
            f"Agente: {resultado['accion_agente']}"
        )

    # Crear la carpeta de resultados si no existe.
    RUTA_RESULTADOS.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    # Guardar las predicciones de ambos sistemas.
    with RUTA_RESULTADOS.open(
        "w", encoding="utf-8-sig", newline=""
    ) as archivo:
        escritor = csv.DictWriter(
            archivo,
            fieldnames=list(resultados[0].keys()),
        )
        escritor.writeheader()
        escritor.writerows(resultados)

    print("\nEVALUACION TERMINADA")
    print(f"Mensajes procesados: {len(resultados)}")
    print(f"Archivo generado: {RUTA_RESULTADOS}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--limite",
        type=int,
        default=None,
        help="Cantidad de mensajes para una prueba parcial",
    )

    argumentos = parser.parse_args()

    asyncio.run(main(argumentos.limite))
