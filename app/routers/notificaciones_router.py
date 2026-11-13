"""Router de notificaciones."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Usuario, Notificacion
from app.middleware import get_current_user
from app.services import NotificacionService
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])


class MarkAsRead(BaseModel):
    """Schema para marcar notificación como leída."""
    leido: bool = True


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    summary="Mis Notificaciones",
)
async def obtener_mis_notificaciones(
    leidas: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Obtiene las notificaciones del usuario actual.
    
    **Parámetros:**
    - `leidas`: Filtrar por estado (null = todas, true = leídas, false = no leídas)
    - `limit`: Número máximo de resultados
    - `offset`: Offset para paginación
    """
    notificaciones = NotificacionService.obtener_notificaciones(
        db,
        current_user.id,
        leidas=leidas,
        limite=limit + offset
    )
    
    # Aplicar offset manualmente
    notificaciones = notificaciones[offset:offset + limit]
    
    total = db.query(Notificacion).filter(
        Notificacion.usuario_id == current_user.id
    )
    
    if leidas is not None:
        total = total.filter(Notificacion.leido == leidas)
    
    total = total.count()
    
    return {
        "success": True,
        "data": notificaciones,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset
        }
    }


@router.put(
    "/{notif_id}/marcar-leida",
    status_code=status.HTTP_200_OK,
    summary="Marcar Notificación como Leída",
)
async def marcar_notificacion_leida(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Marca una notificación específica como leída.
    """
    notificacion = db.query(Notificacion).filter(
        Notificacion.id == notif_id,
        Notificacion.usuario_id == current_user.id
    ).first()
    
    if not notificacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notificación no encontrada"
        )
    
    notificacion_actualizada = NotificacionService.marcar_como_leida(db, notif_id)
    
    return {
        "success": True,
        "message": "Notificación marcada como leída",
        "data": notificacion_actualizada
    }


@router.put(
    "/marcar-todas-leidas",
    status_code=status.HTTP_200_OK,
    summary="Marcar Todas las Notificaciones como Leídas",
)
async def marcar_todas_leidas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Marca todas las notificaciones no leídas como leídas.
    """
    cantidad = NotificacionService.marcar_todas_leidas(db, current_user.id)
    
    return {
        "success": True,
        "message": f"{cantidad} notificaciones marcadas como leídas",
        "count": cantidad
    }


@router.get(
    "/sin-leer/count",
    status_code=status.HTTP_200_OK,
    summary="Cantidad de Notificaciones Sin Leer",
)
async def obtener_count_no_leidas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Retorna el número de notificaciones no leídas.
    """
    count = db.query(Notificacion).filter(
        Notificacion.usuario_id == current_user.id,
        Notificacion.leido == False
    ).count()
    
    return {
        "success": True,
        "unread_count": count
    }
