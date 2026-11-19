
"""Pruebas del módulo de percepción y NLP."""

from app.agent.normalizador import normalizar_texto
from app.agent.spam import es_spam


# PRUEBAS DEL NORMALIZADOR

def test_texto_normal():
    assert normalizar_texto("Hola compañeros") == "hola compañeros"


def test_leetspeak():
    assert normalizar_texto("Eres un 1d10t4") == "eres un idiota"


def test_letras_separadas():
    assert normalizar_texto("Eres un i d i o t a") == "eres un idiota"


def test_letras_repetidas():
    assert normalizar_texto("Eres tontoooo") == "eres tonto"


def test_texto_vacio():
    assert normalizar_texto("") == ""


def test_numeros_normales():
    assert normalizar_texto("Año 2026") == "año 2026"


# PRUEBAS DEL DETECTOR DE SPAM

def test_mensaje_academico():
    assert es_spam("Nuestro grupo gana si entregamos") is False


def test_mensaje_promocional():
    assert es_spam(
        "Compra con descuento en https://ofertas.com"
    ) is True


def test_enlace_universitario():
    assert es_spam(
        "Consulta https://www.utb.edu.co"
    ) is False


def test_mensaje_respetuoso():
    assert es_spam(
        "Excelente explicación, muchas gracias"
    ) is False


def test_enlace_externo_academico():
    assert es_spam(
        "Revisa este artículo https://ejemplo.com"
    ) is False


def test_multiples_enlaces():
    assert es_spam(
        "Visita https://a.com https://b.com https://c.com"
    ) is True
