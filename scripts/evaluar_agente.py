
"""Prueba inicial: detector anterior frente al agente inteligente.

No modifica publicaciones ni guarda decisiones en la BD.
La evaluación completa con métricas se añadirá después.
"""

import asyncio

from scripts.baseline import evaluar_baseline
from app.agent.adaptador_nlp import preparar_resultado_nlp
from app.agent.tipos import Percepcion, ResultadoNLP
from app.agent.agente import procesar


MENSAJES = [
    "Gracias por compartir tu explicación.",
    "Eres un imbécil y no sabes nada.",
]


async def main():
    for texto in MENSAJES:
        print("\n" + "=" * 60)
        print("MENSAJE:", texto)

        # Detector anterior
        baseline = await evaluar_baseline(texto)

        # Agente inteligente actual
        resultado_nlp = ResultadoNLP(
            **preparar_resultado_nlp(texto)
        )

        percepcion = Percepcion(
            texto=texto,
            autor_id=1,
            curso_id=1,
            hilo_id=1,
        )

        decision = procesar(percepcion, resultado_nlp)

        print("\nDETECTOR ANTERIOR")
        print("Toxicidad:", round(baseline["score_toxicidad"], 4))
        print("Acción:", baseline["accion"])

        print("\nAGENTE INTELIGENTE")
        print("Toxicidad:", round(resultado_nlp.score_toxicidad, 4))
        print("Acción:", decision.accion)
        print("Costo esperado:", decision.costo_esperado[decision.accion])
        print("Reincidencia calculada:", round(decision.reincidencia, 4))


if __name__ == "__main__":
    asyncio.run(main())
