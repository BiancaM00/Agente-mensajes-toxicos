from datetime import datetime, timedelta, timezone
from math import exp, isclose
from app.agent.estado import calcular_reincidencia

ahora = datetime(2026, 11, 16, 16, 0, tzinfo=timezone.utc)

# Primer incidente
primero = calcular_reincidencia(
    0.0, ahora, 0.8, ahora
)

# Segundo incidente un día después
segundo = calcular_reincidencia(
    primero, ahora, 0.5, ahora + timedelta(days=1)
)

esperado = 0.8 * exp(-1 / 7) + 0.5

# Comprobar decaimiento después de siete días
despues_de_siete_dias = calcular_reincidencia(
    primero, ahora, 0.0, ahora + timedelta(days=7)
)

print("PRIMER INCIDENTE:", round(primero, 4))
print("SEGUNDO INCIDENTE:", round(segundo, 4))
print("RESULTADO ESPERADO:", round(esperado, 4))
print("ACUMULACIÓN CORRECTA:", isclose(segundo, esperado))
print("REINCIDENCIA TRAS 7 DÍAS:", round(despues_de_siete_dias, 4))
print("DECAYIMIENTO CORRECTO:", isclose(despues_de_siete_dias, 0.8 * exp(-1)))
