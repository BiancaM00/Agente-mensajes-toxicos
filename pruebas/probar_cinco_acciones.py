from types import SimpleNamespace
from app.agent.tipos import ResultadoNLP
from app.agent.decisor import decidir_accion
from app.agent.actuadores import aplicar_accion

pruebas = {
    "PUBLICAR": [0.045208, 0.009156, 0.027068, 0.045749, 0.137182, 0.735637],
    "PUBLICAR_CON_AVISO": [0.069583, 0.016295, 0.003505, 0.014360, 0.431619, 0.464638],
    "PEDIR_REESCRITURA": [0.237175, 0.075106, 0.060134, 0.038798, 0.276723, 0.312063],
    "RETENER": [0.201964, 0.088936, 0.132934, 0.098973, 0.172294, 0.304899],
    "RETENER_URGENTE": [0.019551, 0.456204, 0.270509, 0.126885, 0.101346, 0.025506],
}

categorias = ["insulto", "acoso", "amenaza", "odio", "spam", "ninguna"]

for esperada, valores in pruebas.items():
    probabilidades = dict(zip(categorias, valores))
    nlp = ResultadoNLP(
        texto_normalizado="mensaje de prueba",
        probabilidades=probabilidades,
        score_toxicidad=1 - probabilidades["ninguna"],
        fragmentos=[],
        modelo="prueba"
    )

    accion, costos = decidir_accion(nlp)
    publicacion = SimpleNamespace(estado=None)
    resultado = aplicar_accion(publicacion, accion)

    print(
        f"Esperada: {esperada} | Obtenida: {accion} | "
        f"Correcta: {accion == esperada} | "
        f"Estado: {resultado['estado'].value}"
    )

