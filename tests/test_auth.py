"""Tests básicos de autenticación."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models import Usuario
from app.utils.jwt_handler import hash_password

# Database para tests (en memoria)
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """Limpia la BD antes de cada test."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def test_root_endpoint():
    """Test del endpoint raíz."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_health_check():
    """Test del health check."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_login_credenciales_invalidas():
    """Test login con credenciales inválidas."""
    response = client.post(
        "/auth/login",
        json={
            "email": "noexiste@universidad.edu",
            "password": "password123"
        }
    )
    assert response.status_code == 401
    assert response.json()["success"] is False
