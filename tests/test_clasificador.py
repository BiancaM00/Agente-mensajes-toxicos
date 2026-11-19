
"""Pruebas automatizadas del clasificador del agente."""

import pytest

from app.agent import clasificador, explicador


def verificar_probabilidades(resultado):
    """Comprueba que las seis puntuaciones sean válidas."""

    assert set(resultado.keys()) == set(clasificador.CATEGORIAS)

    assert all(
        0.0 <= valor <= 1.0
        for valor in resultado.values()
    )

    assert sum(resultado.values()) == pytest.approx(
        1.0,
        abs=1e-6,
    )


def test_detectar_amenaza():
    resultado = clasificador.combinar_senales(
        "Te voy a golpear",
        toxicidad=0.57,
        hateful=0.10,
        targeted=0.02,
        aggressive=0.06,
    )

    assert resultado["amenaza"] == max(resultado.values())
    assert resultado["amenaza"] > 0.90

    verificar_probabilidades(resultado)


def test_detectar_insulto():
    resultado = clasificador.combinar_senales(
        "Eres un idiota",
        toxicidad=0.90,
        hateful=0.01,
        targeted=0.01,
        aggressive=0.01,
    )

    assert resultado["insulto"] == max(resultado.values())
    assert resultado["insulto"] > 0.85

    verificar_probabilidades(resultado)


def test_detectar_spam():
    resultado = clasificador.combinar_senales(
        "Compra con descuento en https://ofertas.com",
        toxicidad=0.02,
        hateful=0.01,
        targeted=0.01,
        aggressive=0.01,
    )

    assert resultado["spam"] == max(resultado.values())
    assert resultado["spam"] > 0.90

    verificar_probabilidades(resultado)


def test_mensaje_respetuoso():
    resultado = clasificador.combinar_senales(
        "Gracias por ayudarme con la tarea",
        toxicidad=0.01,
        hateful=0.02,
        targeted=0.01,
        aggressive=0.01,
    )

    assert max(resultado, key=resultado.get) == "ninguna"

    verificar_probabilidades(resultado)


def test_mensaje_vacio():
    resultado = clasificador.analizar_mensaje("")

    assert resultado["categoria_principal"] == "ninguna"
    assert resultado["toxicidad"] == 0.0
    assert resultado["score_toxicidad"] == 0.0
    assert resultado["fragmentos"] == []

    verificar_probabilidades(resultado["puntajes"])


def test_integracion_modelos_y_explicador(monkeypatch):
    """Verifica el flujo utilizando modelos simulados."""

    def modelo_toxicidad(texto, **kwargs):
        return [
            {"label": "toxic", "score": 0.91}
        ]

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
    assert resultado["toxicidad"] == pytest.approx(0.91)
    assert resultado["fragmentos"][0]["palabra"] == "idiota"
    assert "hateful" in resultado["robertuito"]

    verificar_probabilidades(resultado["puntajes"])


def test_amenaza_romper_cara():
    """Verifica una amenaza que anteriormente no se detectaba."""

    resultado = clasificador.combinar_senales(
        "Te voy a romper la cara después de clase",
        toxicidad=0.60,
        hateful=0.05,
        targeted=0.03,
        aggressive=0.08,
    )

    assert resultado["amenaza"] == max(resultado.values())
    assert resultado["amenaza"] > 0.90

    verificar_probabilidades(resultado)


def test_cita_academica():
    """Evita clasificar una cita académica como insulto."""

    resultado = clasificador.combinar_senales(
        "En clase analizamos la expresión eres un idiota.",
        toxicidad=0.15,
        hateful=0.01,
        targeted=0.01,
        aggressive=0.01,
    )

    assert resultado["ninguna"] == max(resultado.values())

    verificar_probabilidades(resultado)


def test_evasion_leetspeak():
    """Verifica insultos escritos mediante sustituciones."""

    resultado = clasificador.combinar_senales(
        "Eres un 1d10t4",
        toxicidad=0.80,
        hateful=0.01,
        targeted=0.01,
        aggressive=0.01,
    )

    assert resultado["insulto"] == max(resultado.values())

    verificar_probabilidades(resultado)


def test_contexto_con_mensaje_padre(monkeypatch):
    """Verifica que el clasificador admita contexto."""

    def modelo_toxicidad(texto, **kwargs):
        return [
            {"label": "not_toxic", "score": 0.95}
        ]

    def modelo_odio(texto, **kwargs):
        return [
            {"label": "hateful", "score": 0.01},
            {"label": "targeted", "score": 0.01},
            {"label": "aggressive", "score": 0.01},
        ]

    monkeypatch.setattr(
        clasificador,
        "cargar_modelos",
        lambda: (modelo_toxicidad, modelo_odio),
    )

    resultado = clasificador.analizar_mensaje(
        "No estoy de acuerdo con esa afirmación.",
        texto_padre="Creo que el algoritmo es óptimo.",
    )

    assert resultado["categoria_principal"] == "ninguna"

    verificar_probabilidades(resultado["puntajes"])
