
"""Gestión del estado y reincidencia del estudiante."""

from datetime import datetime, timezone
from math import exp


TAU_DIAS = 7.0


def calcular_reincidencia(
    reincidencia_anterior: float,
    ultima_actualizacion: datetime,
    gravedad: float,
    ahora: datetime | None = None,
    tau_dias: float = TAU_DIAS,
) -> float:
    """
    Calcula la reincidencia aplicando decaimiento temporal.

    La reincidencia anterior pierde peso con el paso del tiempo.
    La gravedad del nuevo incidente se suma al resultado.
    """

    if tau_dias <= 0:
        raise ValueError("tau_dias debe ser mayor que cero")

    if reincidencia_anterior < 0:
        raise ValueError("La reincidencia anterior no puede ser negativa")

    if not 0 <= gravedad <= 1:
        raise ValueError("La gravedad debe estar entre 0 y 1")

    ahora = ahora or datetime.now(timezone.utc)

    # Si alguna fecha no tiene zona horaria, se interpreta como UTC.
    if ultima_actualizacion.tzinfo is None:
        ultima_actualizacion = ultima_actualizacion.replace(
            tzinfo=timezone.utc
        )

    if ahora.tzinfo is None:
        ahora = ahora.replace(tzinfo=timezone.utc)

    diferencia = ahora - ultima_actualizacion
    dias_transcurridos = max(diferencia.total_seconds() / 86400, 0)

    reincidencia = (
        reincidencia_anterior * exp(-dias_transcurridos / tau_dias)
        + gravedad
    )

    return reincidencia
