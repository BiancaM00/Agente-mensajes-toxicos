"""Router de foros y publicaciones."""

from fastapi import APIRouter, Depends, HTTPException, status, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Usuario, Publicacion, Hilo, Foro, Curso, Matricula
from app.models.publicacion import EstadoPublicacion
from app.models.moderacion import CasoModeracion
from app.models.notificacion import TipoNotificacion
from app.schemas import PublicacionCreate, PublicacionResponse, PublicacionListResponse
from app.middleware import get_current_user
from app.services.notificacion_service import NotificacionService
from typing import Optional
from app.agent.adaptador_nlp import preparar_resultado_nlp
from app.agent.tipos import Percepcion, ResultadoNLP
from app.agent.agente import procesar_con_persistencia, ejecutar_decision


# Schemas
class HiloCreate(BaseModel):
    titulo: str
    descripcion: Optional[str] = None


router = APIRouter(prefix="/foros", tags=["Foros y Publicaciones"])


def _tiene_acceso_curso(db: Session, current_user: Usuario, curso_id: int) -> bool:
    if current_user.rol == "ADMIN_INSTITUCIONAL":
        return True

    matricula = db.query(Matricula).filter(
        Matricula.usuario_id == current_user.id,
        Matricula.curso_id == curso_id,
        Matricula.activo == True,
    ).first()

    return matricula is not None


@router.get(
    "/cursos",
    status_code=status.HTTP_200_OK,
    summary="Listar Cursos del Usuario",
)
async def listar_cursos_usuario(
    institucion_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Lista todos los cursos en los que está matriculado el usuario actual.
    
    **Parámetros opcionales:**
    - `institucion_id`: Filtrar por institución (opcional)
    """
    query = db.query(Curso).join(
        Matricula,
        Matricula.curso_id == Curso.id
    ).filter(
        Matricula.usuario_id == current_user.id,
        Matricula.activo == True,
        Curso.activo == True,
    )
    
    if institucion_id:
        query = query.filter(Curso.institucion_id == institucion_id)
    
    cursos = query.all()
    
    return {
        "success": True,
        "data": cursos,
        "count": len(cursos)
    }


@router.get(
    "/cursos/{curso_id}",
    status_code=status.HTTP_200_OK,
    summary="Listar Foros del Curso",
)
async def listar_foros_curso(
    curso_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Lista todos los foros de un curso.
    
    Solo usuarios matriculados en el curso pueden acceder.
    """
    # Verificar matrícula
    curso = db.query(Curso).filter(Curso.id == curso_id, Curso.activo == True).first()
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado"
        )

    if not _tiene_acceso_curso(db, current_user, curso_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No estás matriculado en este curso"
        )
    
    foros = db.query(Foro).filter(
        Foro.curso_id == curso_id,
        Foro.activo == True
    ).all()
    
    return {
        "success": True,
        "data": foros,
        "count": len(foros)
    }


@router.get(
    "/cursos/{curso_id}/hilos",
    status_code=status.HTTP_200_OK,
    summary="Listar Hilos del Curso",
)
async def listar_hilos_curso(
    curso_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Lista todos los hilos de todos los foros de un curso.
    
    Solo usuarios matriculados en el curso pueden acceder.
    """
    # Verificar matrícula
    curso = db.query(Curso).filter(Curso.id == curso_id, Curso.activo == True).first()
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado"
        )

    if not _tiene_acceso_curso(db, current_user, curso_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No estás matriculado en este curso"
        )
    
    # Obtener todos los hilos de todos los foros del curso
    hilos = db.query(Hilo).join(
        Foro,
        Foro.id == Hilo.foro_id
    ).filter(
        Foro.curso_id == curso_id
    ).all()
    
    return {
        "success": True,
        "data": hilos,
        "count": len(hilos)
    }


@router.post(
    "/cursos/{curso_id}/hilos",
    status_code=status.HTTP_201_CREATED,
    summary="Crear Hilo en Curso",
)
async def crear_hilo_curso(
    curso_id: int,
    hilo_data: HiloCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Crea un nuevo hilo en el primer foro activo del curso.
    
    Body esperado:
    ```json
    {
        "titulo": "Título del hilo",
        "descripcion": "Descripción del hilo (opcional)"
    }
    ```
    """
    # Verificar matrícula
    curso = db.query(Curso).filter(Curso.id == curso_id, Curso.activo == True).first()
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado"
        )

    if not _tiene_acceso_curso(db, current_user, curso_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No estás matriculado en este curso"
        )
    
    # Obtener el primer foro activo del curso
    foro = db.query(Foro).filter(
        Foro.curso_id == curso_id,
        Foro.activo == True
    ).first()
    
    if not foro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay foros disponibles en este curso"
        )
    
    # Crear el hilo
    nuevo_hilo = Hilo(
        foro_id=foro.id,
        titulo=hilo_data.titulo,
        creado_por=current_user.id
    )
    
    db.add(nuevo_hilo)
    db.commit()
    db.refresh(nuevo_hilo)
    
    return {
        "success": True,
        "message": "Hilo creado correctamente",
        "data": nuevo_hilo
    }



@router.post(
    "/cursos/{curso_id}/foros",
    status_code=status.HTTP_201_CREATED,
    summary="Crear Foro en Curso",
)
async def crear_foro_curso(
    curso_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Crea un foro dentro de un curso.

    Payload esperado: {"titulo": "Título del foro"}
    Solo usuarios matriculados como DOCENTE o ADMIN pueden crear foros.
    """
    # Validar rol
    if current_user.rol not in ("DOCENTE", "ADMIN_INSTITUCIONAL"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permisos insuficientes")

    if current_user.rol == "DOCENTE" and not _tiene_acceso_curso(db, current_user, curso_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No estás matriculado en este curso")

    # Verificar que el curso exista
    curso = db.query(Curso).filter(Curso.id == curso_id, Curso.activo == True).first()
    if not curso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")

    titulo = payload.get("titulo")
    if not titulo:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Se requiere el título del foro")

    foro = Foro(curso_id=curso_id, titulo=titulo)
    db.add(foro)
    db.commit()
    db.refresh(foro)

    return {"success": True, "message": "Foro creado", "data": foro}



@router.get(
    "/{foro_id}/hilos",
    status_code=status.HTTP_200_OK,
    summary="Listar Hilos del Foro",
)
async def listar_hilos_foro(
    foro_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Lista todos los hilos de un foro.
    """
    foro = db.query(Foro).join(Curso, Curso.id == Foro.curso_id).filter(Foro.id == foro_id, Foro.activo == True, Curso.activo == True).first()
    
    if not foro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Foro no encontrado"
        )
    
    # Verificar matrícula en el curso del foro
    if not _tiene_acceso_curso(db, current_user, foro.curso_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No estás matriculado en este curso"
        )
    
    hilos = db.query(Hilo).filter(Hilo.foro_id == foro_id).all()
    
    return {
        "success": True,
        "data": hilos,
        "count": len(hilos)
    }


@router.get(
    "/hilos/{hilo_id}/publicaciones",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Listar Publicaciones del Hilo",
)
async def listar_publicaciones_hilo(
    hilo_id: int,
    filtro_estado: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Lista las publicaciones de un hilo.
    
    **Filtros:**
    - `filtro_estado`: APROBADO, PENDIENTE_REVISION, RECHAZADO (opcional)
    
    Los estudiantes solo ves sus propias publicaciones pendientes/rechazadas.
    Los docentes ven todas.
    """
    hilo = db.query(Hilo).join(Foro, Foro.id == Hilo.foro_id).join(Curso, Curso.id == Foro.curso_id).filter(Hilo.id == hilo_id, Foro.activo == True, Curso.activo == True).first()
    
    if not hilo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hilo no encontrado"
        )
    
    query = db.query(Publicacion).options(
        joinedload(Publicacion.evaluacion_toxicidad),
        joinedload(Publicacion.autor)
    ).filter(Publicacion.hilo_id == hilo_id)
    
    # Filtrar por estado si es estudiante
    if current_user.rol == "ESTUDIANTE":
        query = query.filter(
            (Publicacion.estado == EstadoPublicacion.APROBADO) |
            ((Publicacion.autor_id == current_user.id) & (Publicacion.estado != EstadoPublicacion.RECHAZADO))
        )
    
    if filtro_estado:
        query = query.filter(Publicacion.estado == filtro_estado)
    
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


@router.post(
    "/hilos/{hilo_id}/publicaciones",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Crear Publicación",
    description="Crea una publicación y ejecuta el agente inteligente de moderación."
)
def crear_publicacion(
    hilo_id: int,
    pub_data: PublicacionCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Crea una publicación y aplica la decisión del agente moderador."""

    from datetime import datetime, timedelta

    hilo = (
        db.query(Hilo)
        .join(Foro, Foro.id == Hilo.foro_id)
        .join(Curso, Curso.id == Foro.curso_id)
        .filter(
            Hilo.id == hilo_id,
            Foro.activo == True,
            Curso.activo == True,
        )
        .first()
    )

    if not hilo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hilo no encontrado",
        )

    curso_id = hilo.foro.curso_id

    if not _tiene_acceso_curso(db, current_user, curso_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No estás matriculado en este curso",
        )

    try:
        # Evitar publicaciones duplicadas o mensajes rechazados previamente.
        recent = (
            db.query(Publicacion)
            .filter(
                Publicacion.hilo_id == hilo_id,
                Publicacion.autor_id == current_user.id,
                Publicacion.contenido == pub_data.contenido,
            )
            .order_by(Publicacion.creado_en.desc())
            .first()
        )

        if recent:
            if recent.estado == EstadoPublicacion.RECHAZADO:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Este mensaje fue rechazado previamente y no puede reenviarse.",
                )

            try:
                delta = datetime.utcnow() - (
                    recent.creado_en.replace(tzinfo=None)
                    if recent.creado_en
                    else datetime.utcnow()
                )
            except Exception:
                delta = timedelta(seconds=9999)

            if delta.total_seconds() < 120:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Este mensaje parece duplicado. Espera unos segundos antes de volver a intentar.",
                )

        # Registrar primero la publicación para obtener su identificador.
        publicacion = Publicacion(
            hilo_id=hilo_id,
            autor_id=current_user.id,
            contenido=pub_data.contenido,
            estado=EstadoPublicacion.PENDIENTE_ANALISIS,
        )
        db.add(publicacion)
        db.commit()
        db.refresh(publicacion)

        # Construir la percepción del agente.
        percepcion = Percepcion(
            texto=pub_data.contenido,
            autor_id=current_user.id,
            curso_id=curso_id,
            hilo_id=hilo_id,
        )

        # Ejecutar el módulo NLP.
        try:
            datos_nlp = preparar_resultado_nlp(
                texto=pub_data.contenido,
                explicar=False,
            )
            resultado_nlp = ResultadoNLP(**datos_nlp)
        except Exception:
            # Si falla el NLP, el agente retendrá la publicación
            # para revisión manual.
            resultado_nlp = None

        # Procesar la percepción, calcular la decisión y guardar
        # la decisión junto con el estado de reincidencia.
        decision = procesar_con_persistencia(
            db=db,
            percepcion=percepcion,
            resultado_nlp=resultado_nlp,
            publicacion_id=publicacion.id,
        )

        # Aplicar la acción seleccionada a la publicación.
        resultado_accion = ejecutar_decision(
            publicacion=publicacion,
            decision=decision,
        )

        db.commit()
        db.refresh(publicacion)

        # Notificar a los docentes si la publicación requiere revisión.
        if publicacion.estado == EstadoPublicacion.PENDIENTE_REVISION:
            docentes = (
                db.query(Usuario)
                .join(Matricula)
                .filter(
                    Matricula.curso_id == curso_id,
                    Matricula.rol_en_curso == "DOCENTE",
                    Matricula.activo == True,
                    Usuario.activo == True,
                )
                .all()
            )

            mensaje_docente = (
                f"La publicación {publicacion.id} del estudiante "
                f"{current_user.nombre} requiere revisión. "
                f"Acción del agente: {decision.accion}."
            )

            for docente in docentes:
                NotificacionService.crear_notificacion(
                    db=db,
                    usuario_id=docente.id,
                    tipo=TipoNotificacion.REVISION_PENDIENTE,
                    mensaje=mensaje_docente,
                    publicacion_id=publicacion.id,
                )

        return {
            "success": True,
            "message": resultado_accion["mensaje"],
            "data": {
                "publicacion_id": publicacion.id,
                "estado": publicacion.estado,
                "accion": decision.accion,
                "score_toxicidad": decision.nlp.score_toxicidad,
                "probabilidades": decision.nlp.probabilidades,
                "reincidencia": decision.reincidencia,
                "explicacion": decision.explicacion,
                "modelo": decision.nlp.modelo,
                "requiere_notificacion_urgente": (
                    resultado_accion["requiere_notificacion_urgente"]
                ),
                "requiere_reescritura": (
                    resultado_accion["requiere_reescritura"]
                ),
            },
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar la publicación: {str(e)}",
        )

@router.get(
    "/publicaciones/{pub_id}",
    status_code=status.HTTP_200_OK,
    summary="Detalle de Publicación",
)
async def obtener_publicacion(
    pub_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Obtiene el detalle de una publicación específica.
    """
    publicacion = db.query(Publicacion).options(
        joinedload(Publicacion.autor),
        joinedload(Publicacion.evaluacion_toxicidad)
    ).filter(
        Publicacion.id == pub_id
    ).first()
    
    if not publicacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publicación no encontrada"
        )
    
    # Verificar permisos (estudiante solo si es autor o está aprobada)
    if current_user.rol == "ESTUDIANTE":
        if publicacion.estado != EstadoPublicacion.APROBADO and publicacion.autor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para ver esta publicación"
            )
    
    return {
        "success": True,
        "data": publicacion
    }


@router.get(
    "/mis-publicaciones",
    status_code=status.HTTP_200_OK,
    summary="Mis Publicaciones",
)
async def obtener_mis_publicaciones(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Obtiene todas las publicaciones del usuario actual.
    
    Los estudiantes ven todas sus propias publicaciones.
    Los docentes y admins ven todas las publicaciones.
    """
    # Cargar relaciones necesarias para mostrar autor y curso en el frontend
    query = db.query(Publicacion).options(
        joinedload(Publicacion.evaluacion_toxicidad),
        joinedload(Publicacion.autor),
        joinedload(Publicacion.hilo).joinedload(Hilo.foro).joinedload(Foro.curso)
    )
    
    # Filtrar por usuario si es estudiante
    if current_user.rol == "ESTUDIANTE":
        query = query.filter(Publicacion.autor_id == current_user.id)
    
    total = query.count()
    publicaciones = query.order_by(
        Publicacion.creado_en.desc()
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
