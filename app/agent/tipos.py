
"""Tipos y contratos del agente inteligente de moderación."""

from dataclasses import dataclass
from typing import Dict, List, Optional

CATEGORIAS = [
    "insulto",
    "acoso",
    "amenaza",
    "odio",
    "spam",
    "ninguna",
]

ACCIONES = [
    "PUBLICAR",
    "PUBLICAR_CON_AVISO",
    "PEDIR_REESCRITURA",
    "RETENER",
    "RETENER_URGENTE",
]


@dataclass
class Percepcion:
    texto: str
    autor_id: int
    curso_id: int
    hilo_id: int
    texto_padre: Optional[str] = None


@dataclass
class ResultadoNLP:
    texto_normalizado: str
    probabilidades: Dict[str, float]
    score_toxicidad: float
    fragmentos: List[str]
    modelo: str


@dataclass
class Decision:
    accion: str
    costo_esperado: Dict[str, float]
    reincidencia: float
    explicacion: str
    nlp: ResultadoNLP
