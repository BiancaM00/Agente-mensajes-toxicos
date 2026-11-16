from uuid import uuid4
from app.database import SessionLocal
from app.models import Institucion, Usuario, Notificacion
from app.models.usuario import RolUsuario
from app.models.notificacion import TipoNotificacion
from app.services.notificacion_service import NotificacionService

db = SessionLocal()
token = uuid4().hex[:8]
institucion_id = usuario_id = None

try:
    institucion = Institucion(
        nombre=f"Institucion Notificacion {token}",
        dominio=f"notif-{token}.local",
        activo=True
    )
    db.add(institucion)
    db.flush()
    institucion_id = institucion.id

    usuario = Usuario(
        institucion_id=institucion_id,
        nombre="Docente de prueba",
        email=f"docente-{token}@prueba.local",
        password_hash="hash-temporal",
        rol=RolUsuario.DOCENTE,
        activo=True
    )
    db.add(usuario)
    db.commit()
    usuario_id = usuario.id

    notificacion = NotificacionService.crear_notificacion(
        db=db,
        usuario_id=usuario_id,
        tipo=TipoNotificacion.REVISION_PENDIENTE,
        mensaje="Prueba de notificacion del agente"
    )

    recuperadas = NotificacionService.obtener_notificaciones(
        db=db,
        usuario_id=usuario_id
    )

    print("NOTIFICACION CREADA:", notificacion.id is not None)
    print("NOTIFICACION RECUPERADA:", len(recuperadas) == 1)
    print("TIPO:", recuperadas[0].tipo.value if recuperadas else "NINGUNA")
    print("MENSAJE:", recuperadas[0].mensaje if recuperadas else "NINGUNO")

finally:
    db.rollback()
    if usuario_id:
        db.query(Notificacion).filter_by(usuario_id=usuario_id).delete()
        db.query(Usuario).filter_by(id=usuario_id).delete()
    if institucion_id:
        db.query(Institucion).filter_by(id=institucion_id).delete()
    db.commit()
    db.close()
    print("LIMPIEZA: completada")
