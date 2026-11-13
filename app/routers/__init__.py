"""Módulo de routers."""

from app.routers.auth_router import router as auth_router
from app.routers.foros_router import router as foros_router
from app.routers.moderacion_router import router as moderacion_router
from app.routers.notificaciones_router import router as notificaciones_router
from app.routers.dashboard_router import router as dashboard_router
from app.routers.cursos_router import router as cursos_router

__all__ = [
    "auth_router",
    "foros_router",
    "moderacion_router",
    "notificaciones_router",
    "dashboard_router",
    "cursos_router",
]
