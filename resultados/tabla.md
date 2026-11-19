# Evaluacion de 150 mensajes

Referencia: etiquetas humanas consolidadas.
Acciones positivas: PEDIR_REESCRITURA, RETENER y RETENER_URGENTE.
PUBLICAR_CON_AVISO se considera publicacion.

| Metrica | Detector original | Agente inteligente |
|---|---:|---:|
| Accuracy | 0.5133 | 0.58 |
| Precision | 0.8571 | 0.8947 |
| Recall | 0.0769 | 0.2179 |
| F1 | 0.1412 | 0.3505 |
| F1_Macro | 0.4008 | 0.5201 |
| VP | 6 | 17 |
| VN | 71 | 70 |
| FP | 1 | 2 |
| FN | 72 | 61 |
| Latencia_Media_S | 0.1433 | 0.4342 |

## Matrices de confusion
VP: verdadero positivo; VN: verdadero negativo.
FP: falso positivo; FN: falso negativo.

Acuerdo anotadoras: Kappa Sara-Ana=1.0000; Bianca-Sofia=0.5604; agregado=0.7726.
El acuerdo agregado resume dos parejas distintas.

Nota: resultados de la ejecucion local guardada. Verificar version de spam antes de describirlos como resultados posteriores a la correccion.
