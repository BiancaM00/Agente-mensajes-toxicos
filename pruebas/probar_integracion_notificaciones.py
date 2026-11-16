import asyncio
from uuid import uuid4

from app.database import SessionLocal
from app.models import (
    Institucion, Usuario, Curso, Matricula, Foro, Hilo,
    Publicacion, Notificacion, DecisionAgente, EstadoAgente
)
from app.models.usuario import RolUsuario
from app.models.curso import RolEnCurso
from app.models.notificacion import TipoNotificacion
from app.schemas import PublicacionCreate
import importlib
foros_router = importlib.import_module('app.routers.foros_router')
from app.agent.tipos import ResultadoNLP

db = SessionLocal()
token = uuid4().hex[:8]
ids = {}

try:
    institucion = Institucion(
        nombre=f"Institucion Integracion {token}",
        dominio=f"integracion-{token}.local",
        activo=True
    )
    db.add(institucion)
    db.flush()
    ids["institucion"] = institucion.id

    estudiante = Usuario(
        institucion_id=institucion.id,
        nombre="Estudiante prueba",
        email=f"est-{token}@prueba.local",
        password_hash="temporal",
        rol=RolUsuario.ESTUDIANTE,
        activo=True
    )
    docente = Usuario(
        institucion_id=institucion.id,
        nombre="Docente prueba",
        email=f"doc-{token}@prueba.local",
        password_hash="temporal",
        rol=RolUsuario.DOCENTE,
        activo=True
    )
    db.add_all([estudiante, docente])
    db.flush()
    ids["estudiante"] = estudiante.id
    ids["docente"] = docente.id

    curso = Curso(
        institucion_id=institucion.id,
        codigo=f"INT{token[:6]}",
        nombre="Curso de integracion",
        periodo="2026-2",
        activo=True
    )
    db.add(curso)
    db.flush()
    ids["curso"] = curso.id

    db.add_all([
        Matricula(
            usuario_id=estudiante.id,
            curso_id=curso.id,
            rol_en_curso=RolEnCurso.ESTUDIANTE,
            activo=True
        ),
        Matricula(
            usuario_id=docente.id,
            curso_id=curso.id,
            rol_en_curso=RolEnCurso.DOCENTE,
            activo=True
        )
    ])

    foro = Foro(curso_id=curso.id, titulo="Foro integracion")
    db.add(foro)
    db.flush()
    ids["foro"] = foro.id

    hilo = Hilo(
        foro_id=foro.id,
        titulo="Prueba de notificaciones",
        creado_por=estudiante.id
    )
    db.add(hilo)
    db.commit()
    ids["hilo"] = hilo.id

    foros_router.preparar_resultado_nlp = lambda texto, explicar=False: {
        "texto_normalizado": "eres un inutil",
        "probabilidades": {
            "insulto": 0.90,
            "acoso": 0.02,
            "amenaza": 0.01,
            "odio": 0.01,
            "spam": 0.01,
            "ninguna": 0.05
        },
        "score_toxicidad": 0.95,
        "fragmentos": ["inutil"],
        "modelo": "prueba_controlada"
    }

    respuesta = asyncio.run(
        foros_router.crear_publicacion(
            hilo.id,
            PublicacionCreate(contenido="Eres un inutil"),
            db,
            estudiante
        )
    )

    publicacion_id = respuesta["data"]["publicacion_id"]
    ids["publicacion"] = publicacion_id

    notificaciones = db.query(Notificacion).filter_by(
        usuario_id=docente.id,
        publicacion_id=publicacion_id
    ).all()

    print("ACCION DEL AGENTE:", respuesta["data"]["accion"])
    print("ESTADO PUBLICACION:", respuesta["data"]["estado"].value)
    print("NOTIFICACION AL DOCENTE:", len(notificaciones) == 1)
    print("TIPO NOTIFICACION:", notificaciones[0].tipo.value if notificaciones else "NINGUNA")
    print("PUBLICACION REFERENCIADA:", notificaciones[0].publicacion_id if notificaciones else "NINGUNA")

finally:
    db.rollback()
    if ids.get("publicacion"):
        db.query(Notificacion).filter_by(publicacion_id=ids["publicacion"]).delete()
        db.query(DecisionAgente).filter_by(publicacion_id=ids["publicacion"]).delete()
        db.query(Publicacion).filter_by(id=ids["publicacion"]).delete()
    if ids.get("estudiante") and ids.get("curso"):
        db.query(EstadoAgente).filter_by(
            usuario_id=ids["estudiante"], curso_id=ids["curso"]
        ).delete()
    if ids.get("hilo"):
        db.query(Hilo).filter_by(id=ids["hilo"]).delete()
    if ids.get("foro"):
        db.query(Foro).filter_by(id=ids["foro"]).delete()
    if ids.get("curso"):
        db.query(Matricula).filter_by(curso_id=ids["curso"]).delete()
        db.query(Curso).filter_by(id=ids["curso"]).delete()
    if ids.get("estudiante"):
        db.query(Usuario).filter_by(id=ids["estudiante"]).delete()
    if ids.get("docente"):
        db.query(Usuario).filter_by(id=ids["docente"]).delete()
    if ids.get("institucion"):
        db.query(Institucion).filter_by(id=ids["institucion"]).delete()
    db.commit()
    db.close()
    print("LIMPIEZA: completada")
