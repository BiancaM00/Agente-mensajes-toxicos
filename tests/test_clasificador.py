
"""Pruebas automatizadas del clasificador del agente."""

from app.agent import clasificador, explicador


def test_detectar_amenaza():
    resultado = clasificador.combinar_senales(
        "Te voy a golpear",
        toxicidad=0.57,
        hateful=0.10,
        targeted=0.02,
        aggressive=0.06,
    )

    assert resultado["amenaza"] == 0.97
    assert resultado["amenaza"] == max(resultado.values())


def test_detectar_insulto():
    resultado = clasificador.combinar_senales(
        "Eres un idiota",
        toxicidad=0.90,
        hateful=0.01,
        targeted=0.01,
        aggressive=0.01,
    )

    assert resultado["insulto"] == 0.90
    assert resultado["insulto"] == max(resultado.values())


def test_detectar_spam():
    resultado = clasificador.combinar_senales(
        "Compra con descuento en https://ofertas.com",
        toxicidad=0.02,
        hateful=0.01,
        targeted=0.01,
        aggressive=0.01,
    )

    assert resultado["spam"] == 0.95


def test_mensaje_respetuoso():
    resultado = clasificador.combinar_senales(
        "Gracias por ayudarme con la tarea",
        toxicidad=0.01,
        hateful=0.02,
        targeted=0.01,
        aggressive=0.01,
    )

    assert max(resultado, key=resultado.get) == "ninguna"


def test_mensaje_vacio():
    resultado = clasificador.analizar_mensaje("")

    assert resultado["categoria_principal"] == "ninguna"
    assert resultado["toxicidad"] == 0.0
    assert resultado["fragmentos"] == []


def test_integracion_modelos_y_explicador(monkeypatch):
    """Verifica el flujo usando modelos simulados."""

    def modelo_toxicidad(texto, **kwargs):
        return [{"label": "toxic", "score": 0.91}]

    def modelo_odio(texto, **kwargs):
        return [
            {"label": "hateful", "score": 0.01},
            {"label": "targeted", "score": 0.02},
            {"label": "aggressive", "score": 0.03},
        ]

    monkeypatch.setattr(
        clasificador,
        "cargar_modelos",
        lambda: (modelo_toxicidad, modelo_odio),
    )

    monkeypatch.setattr(
        explicador,
        "explicar_toxicidad",
        lambda texto: {
            "toxicidad_original": 0.91,
            "fragmentos": [
                {"palabra": "idiota", "impacto": 0.70}
            ],
        },
    )

    resultado = clasificador.analizar_mensaje(
        "Eres un idiota",
        explicar=True,
    )

    assert resultado["categoria_principal"] == "insulto"
    assert resultado["toxicidad"] == 0.91
    assert resultado["fragmentos"][0]["palabra"] == "idiota"
    assert "hateful" in resultado["robertuito"]
