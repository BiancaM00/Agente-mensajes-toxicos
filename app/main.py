"""Aplicación principal FastAPI."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from contextlib import asynccontextmanager
from app.config import get_settings
from app.database import init_db, Base, engine, crear_usuario_admin, SessionLocal
from app.routers import (
    auth_router,
    foros_router,
    moderacion_router,
    notificaciones_router,
    dashboard_router,
    cursos_router,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup y shutdown events.
    """
    # Startup
    print("🚀 Iniciando aplicación FastAPI...")
    
    # Crear tablas si no existen
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Base de datos inicializada")
    except Exception as e:
        print(f"⚠️ Error al inicializar BD: {e}")
    
    # Crear usuario admin automáticamente
    try:
        db = SessionLocal()
        crear_usuario_admin(db)
        db.close()
    except Exception as e:
        print(f"⚠️ Error al crear usuario admin: {e}")
    
    yield
    
    # Shutdown
    print("🛑 Deteniendo aplicación...")


# Crear aplicación FastAPI
app = FastAPI(
    title="Sistema Inteligente de Moderación - RAU",
    description="API REST para detección de mensajes tóxicos en foros académicos",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


# ─── Configurar CORS (DEBE SER PRIMERO) ───
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# ─── Trusted Host ───
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*"]
)


# ─── Routers ───
app.include_router(auth_router)
app.include_router(foros_router)
app.include_router(moderacion_router)
app.include_router(notificaciones_router)
app.include_router(dashboard_router)
app.include_router(cursos_router)


# ─── Frontend estático solo en producción ───
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
serve_frontend_from_backend = settings.APP_ENV == "production"

if serve_frontend_from_backend and frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

    @app.get("/", include_in_schema=False)
    async def serve_frontend_index():
        return FileResponse(frontend_dist / "index.html")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        """Servir archivos estáticos del frontend (SPA fallback a index.html)."""
        if full_path.startswith((
            "auth",
            "foros",
            "moderacion",
            "notificaciones",
            "dashboard",
            "cursos",
            "docs",
            "redoc",
            "openapi",
            "health",
            "info",
        )):
            return {"error": "Not found"}

        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)

        return FileResponse(frontend_dist / "index.html")
else:
    @app.get("/", tags=["Health"])
    async def root():
        """Ruta raíz en desarrollo (frontend separado en puerto 5173)."""
        return {
            "success": True,
            "message": "RAU API running",
            "environment": settings.APP_ENV,
            "frontend_url": "http://localhost:5173",
            "docs": "/docs",
        }


# ─── Rutas auxiliares ─── 
@app.get("/health", tags=["Health"], include_in_schema=True)
async def health_check():
    """Health check endpoint."""
    return {
        "success": True,
        "status": "healthy",
        "environment": settings.APP_ENV,
    }


@app.get("/info", tags=["Info"])
async def get_info():
    """Información sobre la aplicación."""
    return {
        "name": "Sistema Inteligente de Moderación en Foros Académicos",
        "organization": "Red Académica Universitaria (RAU)",
        "team": "Universidad Tecnológica de Bolívar - Ingeniería de Software",
        "version": "0.1.0",
        "stack": {
            "backend": "Python FastAPI",
            "database": "MySQL",
            "auth": "JWT",
            "toxicity_analysis": f"{settings.AI_PROVIDER}",
        },
        "features": [
            "Autenticación con JWT",
            "Análisis automático de toxicidad",
            "Moderación por roles",
            "Sistema de notificaciones",
            "Dashboard de métricas",
        ]
    }


# ─── Manejo de errores global ───
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Manejador global de excepciones."""
    return {
        "success": False,
        "error": {
            "code": "INTERNAL_SERVER_ERROR",
            "message": str(exc) if settings.APP_ENV == "development" else "Error interno del servidor"
        }
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=settings.APP_ENV == "development",
        log_level="info",
    )
