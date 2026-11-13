"""Tests de toxicidad."""

import pytest
from app.utils.text_preprocessor import (
    limpiar_texto,
    extraer_karakteristicas,
    obtener_palabras_clave,
    es_spam,
)


def test_limpiar_texto():
    """Test de limpieza de texto."""
    texto = "  Hola  mundo  \n\n  "
    resultado = limpiar_texto(texto)
    assert resultado == "Hola mundo"


def test_limpiar_texto_vacio():
    """Test con texto vacío."""
    assert limpiar_texto("") == ""
    assert limpiar_texto(None) == ""


def test_extraer_caracteristicas():
    """Test de extracción de características."""
    texto = "Hola mundo!!!"
    caracteristicas = extraer_karakteristicas(texto)
    
    assert "longitud" in caracteristicas
    assert "palabras" in caracteristicas
    assert "mayusculas_ratio" in caracteristicas
    assert "puntuacion_repetida" in caracteristicas


def test_es_spam_con_url():
    """Test detección de spam con URLs."""
    assert es_spam("Visita https://maliciosos.com para ganar dinero") is True


def test_es_spam_con_email():
    """Test detección de spam con email."""
    assert es_spam("Contacta a spam@example.com") is True


def test_es_spam_falso():
    """Test con texto normal."""
    assert es_spam("Excelente explicación en la clase") is False
