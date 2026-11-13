"""Router de foros y publicaciones."""

from fastapi import APIRouter, Depends, HTTPException, status, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Usuario, Publicacion, Hilo, Foro, Curso, Matricula, SeguimientoToxicidad
from app.models.evaluacion import NivelRiesgo
from app.models.publicacion import EstadoPublicacion
from app.models.moderacion import CasoModeracion
from app.models.notificacion import TipoNotificacion
from app.schemas import PublicacionCreate, PublicacionResponse, PublicacionListResponse
from app.middleware import get_current_user
from app.services import ToxicityService
from app.services.notificacion_service import NotificacionService
from typing import Optional


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
    description="Crea una nueva publicación y dispara análisis de toxicidad."
)
async def crear_publicacion(
    hilo_id: int,
    pub_data: PublicacionCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Crea una publicación en un hilo.
    
    El sistema analizará automáticamente el contenido.
    Si el riesgo es ALTO, la publicación requiere revisión docente.
    """
    hilo = db.query(Hilo).join(Foro, Foro.id == Hilo.foro_id).join(Curso, Curso.id == Foro.curso_id).filter(Hilo.id == hilo_id, Foro.activo == True, Curso.activo == True).first()
    
    if not hilo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hilo no encontrado"
        )

    if not _tiene_acceso_curso(db, current_user, hilo.foro.curso_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No estás matriculado en este curso"
        )

    try:
        # Prevent reposting a message that was recently rejected or duplicated
        from datetime import datetime, timedelta
        recent = db.query(Publicacion).filter(
            Publicacion.hilo_id == hilo_id,
            Publicacion.autor_id == current_user.id,
            Publicacion.contenido == pub_data.contenido
        ).order_by(Publicacion.creado_en.desc()).first()
        if recent:
            # If it was rejected previously, reject re-sending
            if recent.estado == EstadoPublicacion.RECHAZADO:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este mensaje fue rechazado previamente y no puede reenviarse.")
            # If a nearly identical message was created very recently, treat as duplicate
            try:
                delta = datetime.utcnow() - (recent.creado_en.replace(tzinfo=None) if recent.creado_en else datetime.utcnow())
            except Exception:
                delta = timedelta(seconds=9999)
            if delta.total_seconds() < 120:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Este mensaje parece duplicado. Espera unos segundos antes de volver a intentar.")

        score, riesgo, modelo = await ToxicityService.evaluar_texto(pub_data.contenido)

        if riesgo is None:
            seguimiento = db.query(SeguimientoToxicidad).filter(
                SeguimientoToxicidad.usuario_id == current_user.id,
                SeguimientoToxicidad.curso_id == hilo.foro.curso_id,
            ).first()
            if seguimiento and seguimiento.advertencias_consecutivas:
                seguimiento.advertencias_consecutivas = 0

            publicacion = Publicacion(
                hilo_id=hilo_id,
                autor_id=current_user.id,
                contenido=pub_data.contenido,
                estado=EstadoPublicacion.APROBADO,
            )
            db.add(publicacion)
            db.commit()
            db.refresh(publicacion)

            return {
                "success": True,
                "message": "Publicación creada correctamente",
                "data": {
                    "publicacion_id": publicacion.id,
                    "estado": publicacion.estado,
                    "evaluacion": None,
                }
            }

        # Create a Publicacion record so moderation can track it
        publicacion = Publicacion(
            hilo_id=hilo_id,
            autor_id=current_user.id,
            contenido=pub_data.contenido,
            estado=EstadoPublicacion.PENDIENTE_ANALISIS,
        )
        db.add(publicacion)
        db.commit()
        db.refresh(publicacion)

        # Persist evaluation and update publication state
        try:
            await ToxicityService.analizar_publicacion(db, publicacion.id, pub_data.contenido)
        except Exception:
            # If analysis fails, leave the publication in pending state but continue
            pass

        seguimiento = db.query(SeguimientoToxicidad).filter(
            SeguimientoToxicidad.usuario_id == current_user.id,
            SeguimientoToxicidad.curso_id == hilo.foro.curso_id,
        ).first()

        if not seguimiento:
            seguimiento = SeguimientoToxicidad(
                usuario_id=current_user.id,
                curso_id=hilo.foro.curso_id,
                advertencias_consecutivas=0,
            )
            db.add(seguimiento)

        debe_reportar = False
        if riesgo == NivelRiesgo.ALTO:
            seguimiento.advertencias_consecutivas = 0
            debe_reportar = True
        else:
            seguimiento.advertencias_consecutivas += 1
            debe_reportar = seguimiento.advertencias_consecutivas >= 3
            if debe_reportar:
                seguimiento.advertencias_consecutivas = 0

        docentes = db.query(Usuario).join(Matricula).filter(
            Matricula.curso_id == hilo.foro.curso_id,
            Matricula.rol_en_curso == "DOCENTE",
            Matricula.activo == True,
            Usuario.activo == True,
        ).all()

        if debe_reportar:
            # Mantener el último mensaje visible para moderación y para el estudiante
            publicacion.estado = EstadoPublicacion.PENDIENTE_REVISION

            if riesgo == NivelRiesgo.ALTO:
                mensaje_docente = (
                    f"El estudiante {current_user.nombre} intentó publicar contenido de alta toxicidad en {hilo.foro.curso.nombre}."
                )
            else:
                mensaje_docente = (
                    f"El estudiante {current_user.nombre} acumuló varias advertencias por contenido inapropiado en {hilo.foro.curso.nombre}."
                )

            for docente in docentes:
                NotificacionService.crear_notificacion(
                    db=db,
                    usuario_id=docente.id,
                    tipo=TipoNotificacion.REVISION_PENDIENTE,
                    mensaje=mensaje_docente,
                    publicacion_id=publicacion.id,
                )

        db.commit()

        mensaje = ToxicityService.mensaje_advertencia(
            riesgo,
            seguimiento.advertencias_consecutivas if not debe_reportar else 3,
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=mensaje,
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al analizar la publicación: {str(e)}"
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
