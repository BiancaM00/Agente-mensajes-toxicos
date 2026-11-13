"""Router para gestión de cursos y matrículas."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware import get_current_user, require_roles
from app.models import Curso, Foro, Matricula, Usuario
from app.models.curso import RolEnCurso
from app.models.usuario import RolUsuario
from app.schemas.curso_schema import CursoCreate, CursoResponse, MatriculaUpsertRequest
from app.utils.jwt_handler import hash_password

router = APIRouter(prefix="/cursos", tags=["Cursos"])


class MatriculaLookupResponse(BaseModel):
    id: int
    curso_id: int
    curso_nombre: str
    usuario_id: int
    usuario_nombre: str
    usuario_email: str
    rol_en_curso: str
    activo: bool
    creado_en: datetime


class CursoDeleteResponse(BaseModel):
    success: bool
    message: str


class MatriculaDeleteResponse(BaseModel):
    success: bool
    message: str


class CursoMatriculaSelfRequest(BaseModel):
    rol_en_curso: str = Field(default="ESTUDIANTE")


def _serializar_matricula(matricula: Matricula) -> dict:
    return {
        "id": matricula.id,
        "curso_id": matricula.curso_id,
        "curso_nombre": matricula.curso.nombre if matricula.curso else "",
        "usuario_id": matricula.usuario_id,
        "usuario_nombre": matricula.usuario.nombre if matricula.usuario else "",
        "usuario_email": matricula.usuario.email if matricula.usuario else "",
        "rol_en_curso": matricula.rol_en_curso.value if hasattr(matricula.rol_en_curso, "value") else str(matricula.rol_en_curso),
        "activo": bool(matricula.activo),
        "creado_en": matricula.creado_en,
    }


def _cargar_curso_activo(db: Session, curso_id: int) -> Curso:
    curso = db.query(Curso).filter(Curso.id == curso_id, Curso.activo == True).first()  # noqa: E712
    if not curso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")
    return curso


def _puede_gestionar_curso(db: Session, current_user: Usuario, curso_id: int) -> bool:
    if current_user.rol == "ADMIN_INSTITUCIONAL":
        return True

    if current_user.rol != "DOCENTE":
        return False

    return db.query(Matricula).filter(
        Matricula.usuario_id == current_user.id,
        Matricula.curso_id == curso_id,
        Matricula.rol_en_curso == RolEnCurso.DOCENTE,
        Matricula.activo == True,  # noqa: E712
    ).first() is not None


def _crear_o_reactivar_matricula(
    db: Session,
    curso: Curso,
    usuario: Usuario,
    rol_en_curso: str,
) -> Matricula:
    try:
        rol_enum = RolEnCurso(rol_en_curso)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="rol_en_curso inválido. Use ESTUDIANTE o DOCENTE",
        )

    if rol_enum == RolEnCurso.ESTUDIANTE and usuario.rol == RolUsuario.ADMIN_INSTITUCIONAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un administrador no puede matricularse como ESTUDIANTE",
        )

    matricula = db.query(Matricula).filter(
        Matricula.usuario_id == usuario.id,
        Matricula.curso_id == curso.id,
    ).first()

    if matricula:
        matricula.rol_en_curso = rol_enum
        matricula.activo = True
        db.commit()
        db.refresh(matricula)
        return matricula

    matricula = Matricula(
        usuario_id=usuario.id,
        curso_id=curso.id,
        rol_en_curso=rol_enum,
        activo=True,
    )
    db.add(matricula)
    db.commit()
    db.refresh(matricula)
    return matricula


@router.post("/", response_model=CursoResponse, status_code=status.HTTP_201_CREATED)
async def crear_curso(
    curso_data: CursoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_INSTITUCIONAL", "DOCENTE"])),
):
    """Crear un nuevo curso y matricular automáticamente al creador."""
    existente = db.query(Curso).filter(
        Curso.institucion_id == curso_data.institucion_id,
        Curso.codigo == curso_data.codigo,
        Curso.periodo == curso_data.periodo,
    ).first()

    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un curso con ese código y periodo en la institución",
        )

    nuevo = Curso(
        institucion_id=curso_data.institucion_id,
        codigo=curso_data.codigo,
        nombre=curso_data.nombre,
        periodo=curso_data.periodo,
        activo=True,
    )

    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    _crear_o_reactivar_matricula(db, nuevo, current_user, "DOCENTE")

    return CursoResponse.from_orm(nuevo)


@router.get("/", status_code=status.HTTP_200_OK)
async def listar_cursos_admin(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Listar todos los cursos activos."""
    cursos = db.query(Curso).filter(Curso.activo == True).all()  # noqa: E712
    return {"success": True, "data": cursos, "count": len(cursos)}


@router.get("/{curso_id}/matriculas", status_code=status.HTTP_200_OK)
async def listar_matriculas_curso(
    curso_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Lista las matrículas activas de un curso para gestión."""
    curso = _cargar_curso_activo(db, curso_id)

    if not _puede_gestionar_curso(db, current_user, curso_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para gestionar las matrículas de este curso",
        )

    matriculas = db.query(Matricula).filter(
        Matricula.curso_id == curso.id,
        Matricula.activo == True,  # noqa: E712
    ).all()

    return {
        "success": True,
        "data": [_serializar_matricula(matricula) for matricula in matriculas],
        "count": len(matriculas),
    }


@router.post("/{curso_id}/matriculas", status_code=status.HTTP_201_CREATED)
async def crear_matricula(
    curso_id: int,
    payload: MatriculaUpsertRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Crea o reactiva una matrícula en un curso."""
    curso = _cargar_curso_activo(db, curso_id)

    if not _puede_gestionar_curso(db, current_user, curso_id) and current_user.rol != "ADMIN_INSTITUCIONAL":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para matricular usuarios en este curso",
        )

    usuario: Optional[Usuario] = None
    if payload.usuario_id is not None:
        usuario = db.query(Usuario).filter(Usuario.id == payload.usuario_id).first()
    elif payload.usuario_email:
        usuario = db.query(Usuario).filter(Usuario.email == payload.usuario_email).first()

    if not usuario and payload.crear_si_no_existe:
        if not payload.usuario_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requiere usuario_email para crear el usuario automáticamente",
            )
        usuario = Usuario(
            institucion_id=curso.institucion_id,
            nombre=payload.nombre or payload.usuario_email.split("@")[0],
            email=payload.usuario_email,
            password_hash=hash_password("password"),
            rol=RolUsuario.DOCENTE if payload.rol_en_curso == "DOCENTE" else RolUsuario.ESTUDIANTE,
            activo=True,
        )
        db.add(usuario)
        db.commit()
        db.refresh(usuario)

    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    matricula = _crear_o_reactivar_matricula(db, curso, usuario, payload.rol_en_curso)

    return {
        "success": True,
        "message": "Matrícula creada o reactivada correctamente",
        "data": _serializar_matricula(matricula),
    }


@router.post("/{curso_id}/matriculas/me", status_code=status.HTTP_201_CREATED)
async def auto_matricular_usuario_actual(
    curso_id: int,
    payload: CursoMatriculaSelfRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Permite que el usuario actual se matricule a un curso."""
    curso = _cargar_curso_activo(db, curso_id)

    if current_user.rol == "ESTUDIANTE":
        rol_en_curso = "ESTUDIANTE"
    else:
        rol_en_curso = payload.rol_en_curso

    matricula = _crear_o_reactivar_matricula(db, curso, current_user, rol_en_curso)

    return {
        "success": True,
        "message": "Te has matriculado correctamente",
        "data": _serializar_matricula(matricula),
    }


@router.delete("/{curso_id}/matriculas/{usuario_id}", status_code=status.HTTP_200_OK)
async def eliminar_matricula(
    curso_id: int,
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Desactiva una matrícula de un curso."""
    _cargar_curso_activo(db, curso_id)

    if not _puede_gestionar_curso(db, current_user, curso_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para quitar matrículas de este curso",
        )

    matricula = db.query(Matricula).filter(
        Matricula.curso_id == curso_id,
        Matricula.usuario_id == usuario_id,
    ).first()

    if not matricula:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Matrícula no encontrada")

    matricula.activo = False
    db.commit()

    return {"success": True, "message": "Matrícula desactivada correctamente"}


@router.delete("/{curso_id}", response_model=CursoDeleteResponse, status_code=status.HTTP_200_OK)
async def eliminar_curso(
    curso_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_INSTITUCIONAL"])),
):
    """Desactiva un curso y sus dependencias visibles."""
    curso = db.query(Curso).filter(Curso.id == curso_id).first()

    if not curso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")

    curso.activo = False

    db.query(Foro).filter(Foro.curso_id == curso_id).update({Foro.activo: False})
    db.query(Matricula).filter(Matricula.curso_id == curso_id).update({Matricula.activo: False})

    db.commit()

    return CursoDeleteResponse(success=True, message="Curso desactivado correctamente")