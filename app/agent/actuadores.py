
"""Actuadores del agente de moderación."""

from app.agent.tipos import ACCIONES
from app.models.publicacion import EstadoPublicacion


MENSAJES_ACCION = {
    "PUBLICAR": "Tu publicación fue aprobada.",
    "PUBLICAR_CON_AVISO": (
        "Tu publicación fue aprobada. Recuerda mantener "
        "un lenguaje respetuoso en el foro."
    ),
    "PEDIR_REESCRITURA": (
        "Tu publicación necesita ser modificada antes de publicarse."
    ),
    "RETENER": (
        "Tu publicación quedó pendiente de revisión por un moderador."
    ),
    "RETENER_URGENTE": (
        "Tu publicación requiere una revisión prioritaria del docente."
    ),
}


ESTADOS_ACCION = {
    "PUBLICAR": EstadoPublicacion.APROBADO,
    "PUBLICAR_CON_AVISO": EstadoPublicacion.APROBADO,
    "PEDIR_REESCRITURA": EstadoPublicacion.PENDIENTE_REVISION,
    "RETENER": EstadoPublicacion.PENDIENTE_REVISION,
    "RETENER_URGENTE": EstadoPublicacion.PENDIENTE_REVISION,
}


def aplicar_accion(publicacion, accion):
    """Aplica la acción seleccionada sobre una publicación."""

    if accion not in ACCIONES:
        raise ValueError(f"Acción no válida: {accion}")

    publicacion.estado = ESTADOS_ACCION[accion]

    return {
        "accion": accion,
        "estado": publicacion.estado,
        "mensaje": MENSAJES_ACCION[accion],
        "requiere_notificacion_urgente": accion == "RETENER_URGENTE",
        "requiere_reescritura": accion == "PEDIR_REESCRITURA",
    }
