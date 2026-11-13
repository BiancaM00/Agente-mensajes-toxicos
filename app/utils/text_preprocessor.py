"""Preprocesamiento de texto para análisis de toxicidad."""

import re
import unicodedata
from typing import Optional


def limpiar_texto(texto: str) -> str:
    """
    Limpia y normaliza texto para análisis de toxicidad.
    
    Procesos:
    - Elimina espacios en blanco extra
    - Normaliza unicode
    - Elimina caracteres de control
    - Preserva puntuación esencial
    
    Args:
        texto: Texto a limpiar
    
    Returns:
        Texto limpio y normalizado
    """
    if not texto:
        return ""
    
    # Normalizar unicode (NFKD)
    texto = unicodedata.normalize("NFKD", texto)
    
    # Eliminar espacios en blanco extra
    texto = re.sub(r'\s+', ' ', texto).strip()
    
    # Eliminar caracteres de control (excepto saltos de línea)
    texto = "".join(ch for ch in texto if unicodedata.category(ch)[0] != "C" or ch in "\n\t")
    
    return texto


def extraer_karakteristicas(texto: str) -> dict:
    """
    Extrae características del texto para análisis más profundo.
    
    Args:
        texto: Texto a analizar
    
    Returns:
        Dict con características extraídas
    """
    texto_limpio = limpiar_texto(texto).lower()
    
    return {
        "longitud": len(texto),
        "palabras": len(texto_limpio.split()),
        "mayusculas_ratio": sum(1 for c in texto if c.isupper()) / max(len(texto), 1),
        "puntuacion_repetida": bool(re.search(r'[!?]{2,}', texto)),
        "todos_mayusculas": texto == texto.upper() and len(texto) > 1,
        "caracteres_especiales": len(re.findall(r'[^\w\s]', texto)) / max(len(texto), 1),
    }


def obtener_palabras_clave(texto: str, num: int = 10) -> list[str]:
    """
    Extrae palabras clave del texto (sin stopwords comunes).
    
    Args:
        texto: Texto a analizar
        num: Número máximo de palabras a retornar
    
    Returns:
        Lista de palabras ordenadas por frecuencia
    """
    # Stopwords comunes en español
    stopwords = {
        "el", "la", "de", "que", "y", "a", "en", "un", "es", "se",
        "no", "si", "por", "con", "para", "una", "su", "al", "lo",
        "como", "más", "o", "pero", "sus", "le", "ya", "o", "esto",
        "sí", "porque", "esta", "son", "entre", "está", "cuando",
        "muy", "sin", "sobre", "será", "también", "me", "hasta",
        "hay", "donde", "han", "quien", "están", "estado", "desde",
        "todo", "nos", "durante", "estados", "todos", "uno", "les",
        "ni", "contra", "otros", "fueron", "ese", "eso", "había",
        "ante", "ellos", "e", "esto", "mio", "antes", "algunos",
        "algo", "nosotros", "mi", "mis", "tú", "te", "ti", "tu",
        "tus", "ellas", "nosotras", "vosotros", "vosotras", "os",
    }
    
    texto_limpio = limpiar_texto(texto).lower()
    palabras = re.findall(r'\b\w+\b', texto_limpio)
    
    # Filtrar stopwords
    palabras = [p for p in palabras if p not in stopwords and len(p) > 2]
    
    # Contar frecuencias
    from collections import Counter
    frecuencias = Counter(palabras)
    
    # Retornar top N
    return [palabra for palabra, _ in frecuencias.most_common(num)]


def es_spam(texto: str) -> bool:
    """
    Detecta patrones simples de spam.
    
    Args:
        texto: Texto a analizar
    
    Returns:
        True si parece spam, False en caso contrario
    """
    texto_limpio = limpiar_texto(texto).lower()
    
    # Patrones de spam comunes
    spam_patterns = [
        r'(?:http|ftp|https):\/\/\S+',  # URLs
        r'\b(?:click|compra|gana|dinero|fácil|rápido)\b',  # Palabras spam
        r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',  # Emails
    ]
    
    for pattern in spam_patterns:
        if re.search(pattern, texto_limpio):
            return True
    
    return False
