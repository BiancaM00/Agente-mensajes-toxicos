"""Router de dashboard y métricas."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Usuario, Publicacion, EvaluacionToxicidad, CasoModeracion, Curso, Matricula
from app.models.evaluacion import NivelRiesgo
from app.models.moderacion import EstadoModeracion
from app.middleware import require_roles
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/usuarios",
    status_code=status.HTTP_200_OK,
    summary="Listar Usuarios",
    description="Lista usuarios para administración (solo ADMIN)."
)
async def listar_usuarios_admin(
    incluir_inactivos: bool = False,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_INSTITUCIONAL"])),
):
    query = db.query(Usuario)

    if not incluir_inactivos:
        query = query.filter(Usuario.activo == True)  # noqa: E712

    usuarios = query.order_by(Usuario.creado_en.desc()).all()

    return {
        "success": True,
        "data": [
            {
                "id": usuario.id,
                "nombre": usuario.nombre,
                "email": usuario.email,
                "rol": usuario.rol.value if hasattr(usuario.rol, "value") else str(usuario.rol),
                "activo": bool(usuario.activo),
                "creado_en": usuario.creado_en,
            }
            for usuario in usuarios
        ],
        "count": len(usuarios),
    }


@router.delete(
    "/usuarios/{usuario_id}",
    status_code=status.HTTP_200_OK,
    summary="Desactivar Usuario",
    description="Desactiva un usuario y sus matrículas (solo ADMIN)."
)
async def desactivar_usuario_admin(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_INSTITUCIONAL"])),
):
    if current_user.id == usuario_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes desactivarte a ti mismo desde este panel",
        )

    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()

    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    usuario.activo = False
    db.query(Matricula).filter(Matricula.usuario_id == usuario_id).update({Matricula.activo: False})
    db.commit()

    return {
        "success": True,
        "message": "Usuario desactivado correctamente",
    }


@router.get(
    "/metricas",
    status_code=status.HTTP_200_OK,
    summary="Métricas Generales",
    description="Dashboard con métricas globales del sistema (solo ADMIN)."
)
async def obtener_metricas_globales(
    dias: int = 30,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_INSTITUCIONAL"])),
):
    """
    Retorna métricas globales del sistema.
    
    **Parámetros:**
    - `dias`: Período de análisis (default: 30)
    """
    fecha_limite = datetime.now(timezone.utc) - timedelta(days=dias)
    
    # Total de publicaciones analizadas
    total_publicaciones = db.query(func.count(Publicacion.id)).filter(
        Publicacion.creado_en >= fecha_limite
    ).scalar() or 0
    
    # Total de evaluaciones
    total_evaluaciones = db.query(func.count(EvaluacionToxicidad.id)).filter(
        EvaluacionToxicidad.evaluado_en >= fecha_limite
    ).scalar() or 0
    
    # Distribución por riesgo
    evaluaciones_por_riesgo = db.query(
        EvaluacionToxicidad.riesgo,
        func.count(EvaluacionToxicidad.id).label("cantidad")
    ).filter(
        EvaluacionToxicidad.evaluado_en >= fecha_limite
    ).group_by(EvaluacionToxicidad.riesgo).all()
    
    riesgo_dict = {
        "BAJO": 0,
        "MEDIO": 0,
        "ALTO": 0,
    }
    
    for riesgo, cantidad in evaluaciones_por_riesgo:
        riesgo_dict[riesgo.value] = cantidad
    
    # Casos de moderación
    casos_abiertos = db.query(func.count(CasoModeracion.id)).filter(
        CasoModeracion.estado == EstadoModeracion.ABIERTO
    ).scalar() or 0
    
    casos_resueltos = db.query(func.count(CasoModeracion.id)).filter(
        CasoModeracion.estado != EstadoModeracion.ABIERTO,
        CasoModeracion.resuelto_en >= fecha_limite
    ).scalar() or 0
    
    # Score promedio de toxicidad
    score_promedio = db.query(func.avg(EvaluacionToxicidad.score)).filter(
        EvaluacionToxicidad.evaluado_en >= fecha_limite
    ).scalar() or 0.0
    
    return {
        "success": True,
        "data": {
            "periodo_dias": dias,
            "total_publicaciones": total_publicaciones,
            "total_evaluaciones": total_evaluaciones,
            "distribucion_riesgo": riesgo_dict,
            "casos_abiertos": casos_abiertos,
            "casos_resueltos": casos_resueltos,
            "score_promedio_toxicidad": round(float(score_promedio), 3),
        }
    }


@router.get(
    "/metricas/curso/{curso_id}",
    status_code=status.HTTP_200_OK,
    summary="Métricas por Curso",
    description="Métricas específicas de un curso (docente o admin)."
)
async def obtener_metricas_curso(
    curso_id: int,
    dias: int = 30,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["DOCENTE", "ADMIN_INSTITUCIONAL"])),
):
    """
    Retorna métricas de un curso específico.
    
    - Docentes: solo sus propios cursos
    - Admins: cualquier curso
    """
    # Verificar acceso
    if current_user.rol == "DOCENTE":
        matricula = db.query(Matricula).filter(
            Matricula.usuario_id == current_user.id,
            Matricula.curso_id == curso_id,
            Matricula.rol_en_curso == "DOCENTE"
        ).first()
        
        if not matricula:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes acceso a este curso"
            )
    
    # Verificar que el curso existe
    curso = db.query(Curso).filter(Curso.id == curso_id).first()
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado"
        )
    
    fecha_limite = datetime.now(timezone.utc) - timedelta(days=dias)
    
    # Publicaciones del curso
    publicaciones_curso = db.query(Publicacion).join(
        "hilo"
    ).filter(
        Publicacion.creado_en >= fecha_limite
    ).all()
    
    total_publicaciones = len(publicaciones_curso)
    
    # Evaluaciones por riesgo
    evaluaciones_por_riesgo = db.query(
        EvaluacionToxicidad.riesgo,
        func.count(EvaluacionToxicidad.id).label("cantidad")
    ).filter(
        EvaluacionToxicidad.evaluado_en >= fecha_limite
    ).group_by(EvaluacionToxicidad.riesgo).all()
    
    riesgo_dict = {"BAJO": 0, "MEDIO": 0, "ALTO": 0}
    for riesgo, cantidad in evaluaciones_por_riesgo:
        riesgo_dict[riesgo.value] = cantidad
    
    # Score promedio
    score_promedio = db.query(func.avg(EvaluacionToxicidad.score)).scalar() or 0.0
    
    return {
        "success": True,
        "data": {
            "curso_id": curso_id,
            "curso_nombre": curso.nombre,
            "periodo_dias": dias,
            "total_publicaciones": total_publicaciones,
            "distribucion_riesgo": riesgo_dict,
            "score_promedio_toxicidad": round(float(score_promedio), 3),
        }
    }
