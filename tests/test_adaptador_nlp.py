
"""Pruebas del adaptador NLP para el agente moderador."""

from app.agent import adaptador_nlp


def test_adaptador_mensaje_vacio():
    """Verifica el contrato sin cargar los modelos."""

    resultado = adaptador_nlp.preparar_resultado_nlp("")

    assert set(resultado.keys()) == {
        "texto_normalizado",
        "probabilidades",
        "score_toxicidad",
        "fragmentos",
        "modelo",
    }

    assert resultado["texto_normalizado"] == ""
    assert resultado["score_toxicidad"] == 0.0
    assert resultado["probabilidades"]["ninguna"] == 1.0
    assert resultado["fragmentos"] == []


def test_adaptador_con_explicacion(monkeypatch):
    """Comprueba que el adaptador devuelve la explicación."""

    def analisis_simulado(texto, explicar=False):
        assert texto == "Eres un idiota"
        assert explicar is True

        return {
            "texto_normalizado": "eres un idiota",
            "categoria_principal": "insulto",
            "puntajes": {
                "insulto": 0.90,
                "acoso": 0.0,
                "amenaza": 0.0,
                "odio": 0.0,
                "spam": 0.0,
                "ninguna": 0.10,
            },
            "toxicidad": 0.95,
            "robertuito": {},
            "fragmentos": [
                {"palabra": "idiota", "impacto": 0.70}
            ],
        }

    monkeypatch.setattr(
        adaptador_nlp,
        "analizar_mensaje",
        analisis_simulado,
    )

    resultado = adaptador_nlp.preparar_resultado_nlp(
        "Eres un idiota",
        explicar=True,
    )

    assert resultado["probabilidades"]["insulto"] == 0.90
    assert resultado["score_toxicidad"] == 0.90
    assert resultado["fragmentos"] == ["idiota"]
    assert resultado["modelo"] == (
        "DistilBERT + RoBERTuito + reglas"
    )
