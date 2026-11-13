"""Router de moderación."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Usuario, Publicacion, CasoModeracion, Hilo, Foro
from app.models.publicacion import EstadoPublicacion
from app.models.moderacion import EstadoModeracion
from app.middleware import require_roles
from app.services import NotificacionService
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/moderacion", tags=["Moderación"])


class ModerationDecision(BaseModel):
    """Schema para decisión de moderación."""
    observacion: Optional[str] = None


@router.get(
    "/pendientes",
    status_code=status.HTTP_200_OK,
    summary="Publicaciones Pendientes de Revisión",
    description="Lista publicaciones que requieren revisión por toxicidad."
)
async def obtener_publicaciones_pendientes(
    curso_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["DOCENTE", "ADMIN_INSTITUCIONAL"])),
):
    """
    Lista publicaciones en estado PENDIENTE_REVISION.
    
    **Parámetros:**
    - `curso_id`: Filtrar por curso específico (opcional)
    - `limit`: Número máximo de resultados (default: 50)
    - `offset`: Offset para paginación (default: 0)
    """
    query = db.query(Publicacion).options(
        joinedload(Publicacion.evaluacion_toxicidad),
        joinedload(Publicacion.autor),
        joinedload(Publicacion.hilo).joinedload(Hilo.foro).joinedload(Foro.curso)
    ).filter(
        Publicacion.estado == EstadoPublicacion.PENDIENTE_REVISION
    )
    
    # Si no es ADMIN, solo mostrar sus propios cursos
    if current_user.rol == "DOCENTE" and curso_id:
        # Verificar que el docente enseña el curso
        from app.models import Matricula
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
        
        query = query.join(
            CasoModeracion, CasoModeracion.publicacion_id == Publicacion.id
        ).filter(CasoModeracion.moderador_id == current_user.id)
    
    total = query.count()
    publicaciones = query.order_by(
        Publicacion.creado_en.asc()
    ).limit(limit).offset(offset).all()
    
    return {
        "success": True,
        "data": publicaciones,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset
        }
    }


@router.put(
    "/{pub_id}/aprobar",
    status_code=status.HTTP_200_OK,
    summary="Aprobar Publicación",
    description="Aprueba una publicación pendiente de revisión."
)
async def aprobar_publicacion(
    pub_id: int,
    decision_data: ModerationDecision,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["DOCENTE", "ADMIN_INSTITUCIONAL"])),
):
    """
    Aprueba una publicación y la hace visible.
    
    - **observacion**: Comentario opcional del moderador
    """
    publicacion = db.query(Publicacion).filter(Publicacion.id == pub_id).first()
    
    if not publicacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publicación no encontrada"
        )
    
    if publicacion.estado != EstadoPublicacion.PENDIENTE_REVISION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La publicación no está en estado PENDIENTE_REVISION"
        )
    
    # Actualizar publicación
    publicacion.estado = EstadoPublicacion.APROBADO
    
    # Actualizar caso de moderación
    caso = db.query(CasoModeracion).filter(
        CasoModeracion.publicacion_id == pub_id
    ).first()
    
    if not caso:
        caso = CasoModeracion(
            publicacion_id=pub_id,
            moderador_id=current_user.id,
        )
        db.add(caso)

    if caso:
        caso.moderador_id = current_user.id
        caso.estado = EstadoModeracion.APROBADO
        caso.observacion = decision_data.observacion
        caso.resuelto_en = datetime.now(timezone.utc)
    
    # Notificar al autor
    NotificacionService.notificar_caso_resuelto(
        db,
        publicacion.autor_id,
        "APROBADO",
        pub_id
    )
    
    db.commit()
    
    return {
        "success": True,
        "message": "Publicación aprobada correctamente",
        "data": {
            "publicacion_id": pub_id,
            "nuevo_estado": EstadoPublicacion.APROBADO
        }
    }



@router.put(
    "/{pub_id}/asignar",
    status_code=status.HTTP_200_OK,
    summary="Asignar moderador a caso",
    description="Asigna al usuario actual como moderador del caso de moderación (self-assign).",
)
async def asignar_moderador(
    pub_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["DOCENTE", "ADMIN_INSTITUCIONAL"])),
):
    """
    Asigna al usuario actual como moderador de un caso pendiente.
    """
    publicacion = db.query(Publicacion).filter(Publicacion.id == pub_id).first()

    if not publicacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publicación no encontrada"
        )

    caso = db.query(CasoModeracion).filter(CasoModeracion.publicacion_id == pub_id).first()

    if not caso:
        caso = CasoModeracion(publicacion_id=pub_id, moderador_id=current_user.id)
        db.add(caso)
    else:
        caso.moderador_id = current_user.id
        caso.estado = EstadoModeracion.ABIERTO

    db.commit()
    db.refresh(caso)

    return {
        "success": True,
        "message": "Caso asignado al moderador",
        "data": caso
    }


@router.put(
    "/{pub_id}/rechazar",
    status_code=status.HTTP_200_OK,
    summary="Rechazar Publicación",
    description="Rechaza una publicación por contenido inapropiado."
)
async def rechazar_publicacion(
    pub_id: int,
    decision_data: ModerationDecision,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["DOCENTE", "ADMIN_INSTITUCIONAL"])),
):
    """
    Rechaza una publicación y oculta su contenido.
    
    - **observacion**: Razón del rechazo (opcional pero recomendado)
    """
    publicacion = db.query(Publicacion).filter(Publicacion.id == pub_id).first()
    
    if not publicacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publicación no encontrada"
        )
    
    if publicacion.estado != EstadoPublicacion.PENDIENTE_REVISION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La publicación no está en estado PENDIENTE_REVISION"
        )
    
    # Actualizar publicación
    publicacion.estado = EstadoPublicacion.RECHAZADO
    
    # Actualizar caso de moderación
    caso = db.query(CasoModeracion).filter(
        CasoModeracion.publicacion_id == pub_id
    ).first()
    
    if not caso:
        caso = CasoModeracion(
            publicacion_id=pub_id,
            moderador_id=current_user.id,
        )
        db.add(caso)

    if caso:
        caso.moderador_id = current_user.id
        caso.estado = EstadoModeracion.RECHAZADO
        caso.observacion = decision_data.observacion or "Contenido inapropiado"
        caso.resuelto_en = datetime.now(timezone.utc)
    
    # Notificar al autor
    NotificacionService.notificar_caso_resuelto(
        db,
        publicacion.autor_id,
        "RECHAZADO",
        pub_id
    )
    
    db.commit()
    
    return {
        "success": True,
        "message": "Publicación rechazada correctamente",
        "data": {
            "publicacion_id": pub_id,
            "nuevo_estado": EstadoPublicacion.RECHAZADO
        }
    }


@router.get(
    "/historial",
    status_code=status.HTTP_200_OK,
    summary="Historial de Moderaciones",
)
async def obtener_historial_moderacion(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["DOCENTE", "ADMIN_INSTITUCIONAL"])),
):
    """
    Obtiene historial de casos de moderación del docente.
    """
    query = db.query(CasoModeracion).options(
        joinedload(CasoModeracion.publicacion).joinedload(Publicacion.autor),
        joinedload(CasoModeracion.publicacion).joinedload(Publicacion.hilo).joinedload(Hilo.foro).joinedload(Foro.curso)
    ).filter(
        CasoModeracion.moderador_id == current_user.id
    )
    
    total = query.count()
    casos = query.order_by(
        CasoModeracion.resuelto_en.desc()
    ).limit(limit).offset(offset).all()
    
    return {
        "success": True,
        "data": casos,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset
        }
    }


@router.get(
    "/metricas-globales",
    status_code=status.HTTP_200_OK,
    summary="Métricas Globales de la Institución",
)
async def obtener_metricas_globales(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["DOCENTE", "ADMIN_INSTITUCIONAL"])),
):
    from sqlalchemy import func, desc
    from app.models import Curso, Matricula, EvaluacionToxicidad
    
    is_admin = current_user.rol == "ADMIN_INSTITUCIONAL"

    if is_admin:
        total_evaluadas = db.query(Publicacion).count()
        total_cursos = db.query(Curso).filter(Curso.activo == True).count()
        total_casos = db.query(CasoModeracion).count()
        avg_score = db.query(func.avg(EvaluacionToxicidad.score)).scalar() or 0.0
        
        incidentes_query = db.query(
            Curso.nombre, func.count(CasoModeracion.id).label('total')
        ).join(Foro, Foro.curso_id == Curso.id)\
         .join(Hilo, Hilo.foro_id == Foro.id)\
         .join(Publicacion, Publicacion.hilo_id == Hilo.id)\
         .join(CasoModeracion, CasoModeracion.publicacion_id == Publicacion.id)\
         .group_by(Curso.nombre)\
         .order_by(desc('total')).all()
         
        periodos_query = db.query(Curso.periodo).distinct().order_by(desc(Curso.periodo)).all()
    else:
        cursos_docente = db.query(Matricula.curso_id).filter(
            Matricula.usuario_id == current_user.id,
            Matricula.rol_en_curso == "DOCENTE",
            Matricula.activo == True
        ).subquery()
        
        total_cursos = db.query(Curso).filter(Curso.id.in_(cursos_docente), Curso.activo == True).count()
        total_evaluadas = db.query(Publicacion).join(Hilo).join(Foro).filter(Foro.curso_id.in_(cursos_docente)).count()
        total_casos = db.query(CasoModeracion).join(Publicacion, Publicacion.id == CasoModeracion.publicacion_id).join(Hilo).join(Foro).filter(Foro.curso_id.in_(cursos_docente)).count()
        avg_score = db.query(func.avg(EvaluacionToxicidad.score)).join(Publicacion, Publicacion.id == EvaluacionToxicidad.publicacion_id).join(Hilo).join(Foro).filter(Foro.curso_id.in_(cursos_docente)).scalar() or 0.0
        
        incidentes_query = db.query(
            Curso.nombre, func.count(CasoModeracion.id).label('total')
        ).filter(Curso.id.in_(cursos_docente))\
         .join(Foro, Foro.curso_id == Curso.id)\
         .join(Hilo, Hilo.foro_id == Foro.id)\
         .join(Publicacion, Publicacion.hilo_id == Hilo.id)\
         .join(CasoModeracion, CasoModeracion.publicacion_id == Publicacion.id)\
         .group_by(Curso.nombre)\
         .order_by(desc('total')).all()
         
        periodos_query = db.query(Curso.periodo).filter(Curso.id.in_(cursos_docente)).distinct().order_by(desc(Curso.periodo)).all()

    detalles_incidentes = [{"curso": r.nombre, "incidentes": r.total} for r in incidentes_query]
    
    periodos = [p[0] for p in periodos_query if p[0]]
    tendencia_str = "+0"
    if len(periodos) >= 2:
        periodo_actual, periodo_anterior = periodos[0], periodos[1]
        
        def count_casos(periodo_val):
            q = db.query(CasoModeracion).join(Publicacion).join(Hilo).join(Foro).join(Curso).filter(Curso.periodo == periodo_val)
            if not is_admin:
                q = q.filter(Curso.id.in_(cursos_docente))
            return q.count()
            
        casos_actual, casos_anterior = count_casos(periodo_actual), count_casos(periodo_anterior)
        diferencia = casos_actual - casos_anterior
        
        if diferencia > 0:
            tendencia_str = f"+{diferencia}"
        elif diferencia < 0:
            tendencia_str = f"{diferencia}"
        else:
            tendencia_str = "0"

    incidentes_por_curso = (total_casos / total_cursos) if total_cursos > 0 else 0.0
    riesgo_promedio_str = "ALTO" if avg_score > 0.6 else "MEDIO" if avg_score > 0.3 else "BAJO"

    return {
        "success": True,
        "data": {
            "total_evaluadas": total_evaluadas,
            "incidentes_por_curso": round(incidentes_por_curso, 1),
            "riesgo_promedio": riesgo_promedio_str,
            "avg_score": avg_score,
            "tendencia": tendencia_str,
            "detalles_incidentes": detalles_incidentes
        }
    }
