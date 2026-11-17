"""Router de moderaciÃ³n."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Usuario, Publicacion, CasoModeracion, Hilo, Foro, DecisionAgente, Matricula, Curso
from app.models.publicacion import EstadoPublicacion
from app.models.moderacion import EstadoModeracion
from app.middleware import require_roles
from app.services import NotificacionService
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/moderacion", tags=["ModeraciÃ³n"])


class ModerationDecision(BaseModel):
    """Schema para decisiÃ³n de moderaciÃ³n."""
    observacion: Optional[str] = None


@router.get(
    "/pendientes",
    status_code=status.HTTP_200_OK,
    summary="Publicaciones Pendientes de RevisiÃ³n",
    description="Lista publicaciones que requieren revisiÃ³n por toxicidad."
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
    
    **ParÃ¡metros:**
    - `curso_id`: Filtrar por curso especÃ­fico (opcional)
    - `limit`: NÃºmero mÃ¡ximo de resultados (default: 50)
    - `offset`: Offset para paginaciÃ³n (default: 0)
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
        # Verificar que el docente enseÃ±a el curso
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
    summary="Aprobar PublicaciÃ³n",
    description="Aprueba una publicaciÃ³n pendiente de revisiÃ³n."
)
async def aprobar_publicacion(
    pub_id: int,
    decision_data: ModerationDecision,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["DOCENTE", "ADMIN_INSTITUCIONAL"])),
):
    """
    Aprueba una publicaciÃ³n y la hace visible.
    
    - **observacion**: Comentario opcional del moderador
    """
    publicacion = db.query(Publicacion).filter(Publicacion.id == pub_id).first()
    
    if not publicacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PublicaciÃ³n no encontrada"
        )
    
    if publicacion.estado != EstadoPublicacion.PENDIENTE_REVISION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La publicaciÃ³n no estÃ¡ en estado PENDIENTE_REVISION"
        )
    
    # Actualizar publicaciÃ³n
    publicacion.estado = EstadoPublicacion.APROBADO
    
    # Actualizar caso de moderaciÃ³n
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
        "message": "PublicaciÃ³n aprobada correctamente",
        "data": {
            "publicacion_id": pub_id,
            "nuevo_estado": EstadoPublicacion.APROBADO
        }
    }



@router.put(
    "/{pub_id}/asignar",
    status_code=status.HTTP_200_OK,
    summary="Asignar moderador a caso",
    description="Asigna al usuario actual como moderador del caso de moderaciÃ³n (self-assign).",
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
            detail="PublicaciÃ³n no encontrada"
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
    summary="Rechazar PublicaciÃ³n",
    description="Rechaza una publicaciÃ³n por contenido inapropiado."
)
async def rechazar_publicacion(
    pub_id: int,
    decision_data: ModerationDecision,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["DOCENTE", "ADMIN_INSTITUCIONAL"])),
):
    """
    Rechaza una publicaciÃ³n y oculta su contenido.
    
    - **observacion**: RazÃ³n del rechazo (opcional pero recomendado)
    """
    publicacion = db.query(Publicacion).filter(Publicacion.id == pub_id).first()
    
    if not publicacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PublicaciÃ³n no encontrada"
        )
    
    if publicacion.estado != EstadoPublicacion.PENDIENTE_REVISION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La publicaciÃ³n no estÃ¡ en estado PENDIENTE_REVISION"
        )
    
    # Actualizar publicaciÃ³n
    publicacion.estado = EstadoPublicacion.RECHAZADO
    
    # Actualizar caso de moderaciÃ³n
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
        "message": "PublicaciÃ³n rechazada correctamente",
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
    Obtiene historial de casos de moderaciÃ³n del docente.
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
    summary="MÃ©tricas Globales de la InstituciÃ³n",
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


@router.get(
    "/decisiones-agente",
    status_code=status.HTTP_200_OK,
    summary="Historial de decisiones del agente",
)
async def obtener_decisiones_agente(
    curso_id: Optional[int] = None,
    publicacion_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["DOCENTE", "ADMIN_INSTITUCIONAL"])),
):
    """Consulta las decisiones persistidas por el agente moderador."""

    if limit < 1 or limit > 100 or offset < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit debe estar entre 1 y 100 y offset no puede ser negativo",
        )

    query = (
        db.query(DecisionAgente)
        .join(Publicacion, DecisionAgente.publicacion_id == Publicacion.id)
        .join(Hilo, Publicacion.hilo_id == Hilo.id)
        .join(Foro, Hilo.foro_id == Foro.id)
        .join(Curso, Foro.curso_id == Curso.id)
    )

    if current_user.rol == "DOCENTE":
        cursos_docente = db.query(Matricula.curso_id).filter(
            Matricula.usuario_id == current_user.id,
            Matricula.rol_en_curso == "DOCENTE",
            Matricula.activo == True,
        ).subquery()

        query = query.filter(Curso.id.in_(cursos_docente))
    else:
        query = query.filter(Curso.institucion_id == current_user.institucion_id)

    if curso_id is not None:
        query = query.filter(Curso.id == curso_id)

    if publicacion_id is not None:
        query = query.filter(DecisionAgente.publicacion_id == publicacion_id)


    total = query.count()
    decisiones = query.order_by(
        DecisionAgente.creado_en.desc()
    ).limit(limit).offset(offset).all()

    publicaciones = db.query(Publicacion).options(
        joinedload(Publicacion.autor),
        joinedload(Publicacion.hilo)
        .joinedload(Hilo.foro)
        .joinedload(Foro.curso),
    ).filter(
        Publicacion.id.in_([d.publicacion_id for d in decisiones])
    ).all()

    publicaciones_por_id = {p.id: p for p in publicaciones}

    def serializar_decision(d):
        pub = publicaciones_por_id.get(d.publicacion_id)

        return {
            "id": d.id,
            "publicacion_id": d.publicacion_id,
            "estudiante": pub.autor.nombre if pub and pub.autor else None,
            "texto": pub.contenido if pub else None,
            "curso": (
                pub.hilo.foro.curso.nombre
                if pub and pub.hilo and pub.hilo.foro and pub.hilo.foro.curso
                else None
            ),
            "accion": d.accion,
            "score": d.score,
            "probabilidades": d.probabilidades,
            "costo_esperado": d.costo_esperado,
            "reincidencia": d.reincidencia,
            "explicacion": d.explicacion,
            "modelo": d.modelo,
            "creado_en": d.creado_en.isoformat() if d.creado_en else None,
        }

    return {
        "success": True,
        "data": [serializar_decision(d) for d in decisiones],
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset,
        },
    }
