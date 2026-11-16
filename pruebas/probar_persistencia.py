from uuid import uuid4

from app.database import SessionLocal
from app.models import (
    Institucion, Usuario, Curso, Foro, Hilo, Publicacion,
    EstadoAgente, DecisionAgente
)
from app.models.usuario import RolUsuario
from app.models.publicacion import EstadoPublicacion
from app.agent.tipos import Percepcion, ResultadoNLP
from app.agent.agente import procesar_con_persistencia

db = SessionLocal()
token = uuid4().hex[:8]
institucion_id = usuario_id = curso_id = foro_id = hilo_id = publicacion_id = None

try:
    institucion = Institucion(
        nombre=f"Institucion Prueba {token}",
        dominio=f"prueba-{token}.local",
        activo=True
    )
    db.add(institucion)
    db.flush()
    institucion_id = institucion.id

    usuario = Usuario(
        institucion_id=institucion_id,
        nombre="Estudiante de prueba",
        email=f"estudiante-{token}@prueba.local",
        password_hash="hash-temporal",
        rol=RolUsuario.ESTUDIANTE,
        activo=True
    )
    db.add(usuario)
    db.flush()
    usuario_id = usuario.id

    curso = Curso(
        institucion_id=institucion_id,
        codigo=f"TEST{token[:6]}",
        nombre="Curso de prueba del agente",
        periodo="2026-2",
        activo=True
    )
    db.add(curso)
    db.flush()
    curso_id = curso.id

    foro = Foro(curso_id=curso_id, titulo="Foro de prueba")
    db.add(foro)
    db.flush()
    foro_id = foro.id

    hilo = Hilo(
        foro_id=foro_id,
        titulo="Prueba de moderacion",
        creado_por=usuario_id
    )
    db.add(hilo)
    db.flush()
    hilo_id = hilo.id

    publicacion = Publicacion(
        hilo_id=hilo_id,
        autor_id=usuario_id,
        contenido="Eres un inutil",
        estado=EstadoPublicacion.PENDIENTE_ANALISIS
    )
    db.add(publicacion)
    db.commit()
    publicacion_id = publicacion.id

    percepcion = Percepcion(
        texto="Eres un inutil",
        autor_id=usuario_id,
        curso_id=curso_id,
        hilo_id=hilo_id
    )

    resultado_nlp = ResultadoNLP(
        texto_normalizado="eres un inutil",
        probabilidades={
            "insulto": 0.90,
            "acoso": 0.02,
            "amenaza": 0.01,
            "odio": 0.01,
            "spam": 0.01,
            "ninguna": 0.05
        },
        score_toxicidad=0.95,
        fragmentos=["inutil"],
        modelo="prueba"
    )

    decision = procesar_con_persistencia(
        db, percepcion, resultado_nlp, publicacion_id
    )

    registro = db.query(DecisionAgente).filter_by(
        publicacion_id=publicacion_id
    ).first()

    estado = db.query(EstadoAgente).filter_by(
        usuario_id=usuario_id,
        curso_id=curso_id
    ).first()

    print("ACCION:", decision.accion)
    print("DECISION GUARDADA:", registro is not None)
    print("ESTADO GUARDADO:", estado is not None)
    print("PUBLICACION ID:", publicacion_id)

finally:
    db.rollback()
    if publicacion_id:
        db.query(DecisionAgente).filter_by(publicacion_id=publicacion_id).delete()
    if usuario_id and curso_id:
        db.query(EstadoAgente).filter_by(
            usuario_id=usuario_id, curso_id=curso_id
        ).delete()
    if publicacion_id:
        db.query(Publicacion).filter_by(id=publicacion_id).delete()
    if hilo_id:
        db.query(Hilo).filter_by(id=hilo_id).delete()
    if foro_id:
        db.query(Foro).filter_by(id=foro_id).delete()
    if curso_id:
        db.query(Curso).filter_by(id=curso_id).delete()
    if usuario_id:
        db.query(Usuario).filter_by(id=usuario_id).delete()
    if institucion_id:
        db.query(Institucion).filter_by(id=institucion_id).delete()
    db.commit()
    db.close()
    print("LIMPIEZA: completada")
