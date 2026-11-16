import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.middleware import get_current_user
from app.models import (
    Institucion, Usuario, Curso, Matricula,
    Foro, Hilo, Publicacion, DecisionAgente
)
from app.models.usuario import RolUsuario
from app.models.curso import RolEnCurso


engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base.metadata.create_all(bind=engine)
client = TestClient(app)


@pytest.fixture
def escenario():
    overrides_originales = app.dependency_overrides.copy()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSession()

    inst1 = Institucion(nombre="Institucion A", dominio="a.test")
    inst2 = Institucion(nombre="Institucion B", dominio="b.test")
    db.add_all([inst1, inst2])
    db.flush()

    docente = Usuario(
        institucion_id=inst1.id, nombre="Docente", email="docente@test.com",
        password_hash="x", rol=RolUsuario.DOCENTE, activo=True
    )
    admin = Usuario(
        institucion_id=inst1.id, nombre="Admin", email="admin@test.com",
        password_hash="x", rol=RolUsuario.ADMIN_INSTITUCIONAL, activo=True
    )
    estudiante = Usuario(
        institucion_id=inst1.id, nombre="Estudiante", email="estudiante@test.com",
        password_hash="x", rol=RolUsuario.ESTUDIANTE, activo=True
    )
    db.add_all([docente, admin, estudiante])
    db.flush()

    cursos = [
        Curso(institucion_id=inst1.id, codigo="A1", nombre="Curso A1", periodo="2026"),
        Curso(institucion_id=inst1.id, codigo="A2", nombre="Curso A2", periodo="2026"),
        Curso(institucion_id=inst2.id, codigo="B1", nombre="Curso B1", periodo="2026"),
    ]
    db.add_all(cursos)
    db.flush()

    db.add_all([
        Matricula(usuario_id=docente.id, curso_id=cursos[0].id,
                  rol_en_curso=RolEnCurso.DOCENTE, activo=True),
        Matricula(usuario_id=docente.id, curso_id=cursos[1].id,
                  rol_en_curso=RolEnCurso.DOCENTE, activo=False),
    ])

    publicaciones = []
    for curso in cursos:
        foro = Foro(curso_id=curso.id, titulo="Foro de prueba")
        db.add(foro)
        db.flush()
        hilo = Hilo(foro_id=foro.id, titulo="Hilo de prueba", creado_por=docente.id)
        db.add(hilo)
        db.flush()
        publicacion = Publicacion(
            hilo_id=hilo.id, autor_id=docente.id, contenido="Mensaje de prueba"
        )
        db.add(publicacion)
        db.flush()
        publicaciones.append(publicacion)

        db.add(DecisionAgente(
            publicacion_id=publicacion.id,
            accion="PUBLICAR",
            score=0.1,
            probabilidades={"toxico": 0.1},
            costo_esperado={"PUBLICAR": 0.0},
            reincidencia=0.0,
            explicacion="Prueba automatizada",
            modelo="test"
        ))

    db.commit()

    def override_db():
        yield db

    def usar_usuario(usuario):
        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[get_current_user] = lambda: usuario

    yield {
        "docente": docente,
        "admin": admin,
        "estudiante": estudiante,
        "cursos": cursos,
        "publicaciones": publicaciones,
        "usar_usuario": usar_usuario,
    }

    app.dependency_overrides.clear()
    app.dependency_overrides.update(overrides_originales)
    db.close()


def test_docente_solo_ve_cursos_activos(escenario):
    escenario["usar_usuario"](escenario["docente"])
    response = client.get("/moderacion/decisiones-agente")
    assert response.status_code == 200
    assert response.json()["pagination"]["total"] == 1


def test_admin_solo_ve_su_institucion(escenario):
    escenario["usar_usuario"](escenario["admin"])
    response = client.get("/moderacion/decisiones-agente")
    assert response.status_code == 200
    assert response.json()["pagination"]["total"] == 2


def test_estudiante_no_tiene_acceso(escenario):
    escenario["usar_usuario"](escenario["estudiante"])
    response = client.get("/moderacion/decisiones-agente")
    assert response.status_code == 403


def test_filtro_por_curso(escenario):
    escenario["usar_usuario"](escenario["admin"])
    curso_id = escenario["cursos"][0].id
    response = client.get(
        "/moderacion/decisiones-agente", params={"curso_id": curso_id}
    )
    assert response.status_code == 200
    assert response.json()["pagination"]["total"] == 1


def test_filtro_por_publicacion(escenario):
    escenario["usar_usuario"](escenario["admin"])
    publicacion_id = escenario["publicaciones"][1].id
    response = client.get(
        "/moderacion/decisiones-agente",
        params={"publicacion_id": publicacion_id}
    )
    assert response.status_code == 200
    assert response.json()["pagination"]["total"] == 1
    assert response.json()["data"][0]["publicacion_id"] == publicacion_id


def test_paginacion(escenario):
    escenario["usar_usuario"](escenario["admin"])
    response = client.get(
        "/moderacion/decisiones-agente", params={"limit": 1, "offset": 1}
    )
    assert response.status_code == 200
    assert response.json()["pagination"]["total"] == 2
    assert response.json()["pagination"]["limit"] == 1
    assert len(response.json()["data"]) == 1


@pytest.mark.parametrize("params", [
    {"limit": 0},
    {"limit": 101},
    {"offset": -1},
])
def test_parametros_invalidos(escenario, params):
    escenario["usar_usuario"](escenario["admin"])
    response = client.get("/moderacion/decisiones-agente", params=params)
    assert response.status_code == 400


