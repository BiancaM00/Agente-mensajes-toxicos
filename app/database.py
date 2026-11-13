"""
Configuración de la base de datos con SQLAlchemy.
Manejo de sesiones y conexión a MySQL.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from app.config import get_settings

settings = get_settings()

# Crear el motor de base de datos
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.APP_ENV == "development",
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    connect_args={"charset": "utf8mb4"}
)

# Crear SessionLocal para obtener sesiones de BD
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base para todos los modelos ORM
Base = declarative_base()


def get_db() -> Session:
    """
    Dependencia para obtener sesión de base de datos en endpoints.
    
    Yields:
        Session: Sesión de SQLAlchemy
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Inicializa la base de datos creando todas las tablas."""
    Base.metadata.create_all(bind=engine)


def drop_db():
    """Elimina todas las tablas (solo para desarrollo)."""
    Base.metadata.drop_all(bind=engine)


def crear_institucion_defecto(db: Session):
    """
    Crea la institución por defecto si no existe.
    
    Args:
        db: Sesión de base de datos
    """
    from app.models import Institucion
    
    institucion_existente = db.query(Institucion).filter(
        Institucion.dominio == "rau.edu"
    ).first()
    
    if not institucion_existente:
        institucion = Institucion(
            nombre="Red Académica Universitaria",
            dominio="rau.edu",
            activo=True
        )
        db.add(institucion)
        db.commit()
        db.refresh(institucion)
        print(f"✅ Institución creada: {institucion.nombre} (ID: {institucion.id})")
        return institucion
    
    return institucion_existente


def crear_usuario_admin(db: Session):
    """
    Crea automáticamente el usuario admin en la base de datos si no existe.
    
    Args:
        db: Sesión de base de datos
    """
    from app.models import Usuario, Institucion
    from app.models.usuario import RolUsuario
    from app.utils.jwt_handler import hash_password
    
    # Crear institución por defecto si no existe
    institucion = crear_institucion_defecto(db)
    
    # Verificar si el admin ya existe
    admin_existente = db.query(Usuario).filter(
        Usuario.email == "admin@rau.edu"
    ).first()
    
    if not admin_existente:
        # Crear usuario admin
        admin = Usuario(
            nombre="Administrador del Sistema",
            email="admin@rau.edu",
            password_hash=hash_password("Admin123456"),  # Contraseña por defecto
            rol=RolUsuario.ADMIN_INSTITUCIONAL,
            institucion_id=institucion.id,
            activo=True
        )
        
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        print("✅ Usuario ADMIN creado automáticamente")
        print(f"   📧 Email: admin@rau.edu")
        print(f"   🔐 Contraseña: Admin123456")
        print(f"   ⚠️  IMPORTANTE: Cambia esta contraseña en producción")
        
        return admin
    
    print("ℹ️  Usuario admin ya existe")
    return admin_existente
