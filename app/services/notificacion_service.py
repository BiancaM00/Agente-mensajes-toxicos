"""Servicio de notificaciones."""

from sqlalchemy.orm import Session
from app.models import Notificacion, Usuario
from app.models.notificacion import TipoNotificacion
from sqlalchemy.exc import OperationalError, IntegrityError


class NotificacionService:
    """Servicio de gestión de notificaciones."""
    
    @staticmethod
    def crear_notificacion(
        db: Session,
        usuario_id: int,
        tipo: TipoNotificacion,
        mensaje: str,
        publicacion_id: int | None = None,
    ) -> Notificacion:
        """
        Crea una notificación para un usuario.
        
        Args:
            db: Sesión de base de datos
            usuario_id: ID del usuario destinatario
            tipo: Tipo de notificación
            mensaje: Contenido del mensaje
        
        Returns:
            Notificación creada
        """
        notificacion = Notificacion(
            usuario_id=usuario_id,
            tipo=tipo,
            mensaje=mensaje,
            leido=False,
            publicacion_id=publicacion_id,
        )
        
        db.add(notificacion)
        try:
            db.commit()
            db.refresh(notificacion)
            return notificacion
        except OperationalError as oe:
            # Fallback for deployments where DB schema wasn't migrated yet
            db.rollback()
            # If the error mentions publicacion_id, retry without it
            msg = str(oe).lower()
            if 'publicacion_id' in msg or 'unknown column' in msg:
                try:
                    fallback = Notificacion(
                        usuario_id=usuario_id,
                        tipo=tipo,
                        mensaje=mensaje,
                        leido=False,
                    )
                    db.add(fallback)
                    db.commit()
                    db.refresh(fallback)
                    return fallback
                except Exception:
                    db.rollback()
                    raise
            raise
        except IntegrityError:
            db.rollback()
            raise
    
    @staticmethod
    def notificar_comentario_marcado(
        db: Session,
        usuario_id: int,
        publicacion_id: int,
    ) -> Notificacion:
        """
        Notifica a un estudiante que su comentario fue marcado.
        """
        mensaje = f"Tu comentario (ID: {publicacion_id}) está siendo revisado por el docente."
        return NotificacionService.crear_notificacion(
            db=db,
            usuario_id=usuario_id,
            tipo=TipoNotificacion.COMENTARIO_MARCADO,
            mensaje=mensaje,
            publicacion_id=publicacion_id,
        )
    
    @staticmethod
    def notificar_revisar_pendientes(
        db: Session,
        docente_id: int,
        curso_nombre: str,
        cantidad: int,
    ) -> Notificacion:
        """
        Notifica a un docente que hay comentarios pendientes de revisión.
        """
        mensaje = f"Tienes {cantidad} comentario(s) pendiente(s) de revisión en {curso_nombre}."
        return NotificacionService.crear_notificacion(
            db=db,
            usuario_id=docente_id,
            tipo=TipoNotificacion.REVISION_PENDIENTE,
            mensaje=mensaje,
        )
    
    @staticmethod
    def notificar_caso_resuelto(
        db: Session,
        usuario_id: int,
        estado_resolucion: str,
        publicacion_id: int,
    ) -> Notificacion:
        """
        Notifica a un estudiante que su caso de moderación fue resuelto.
        """
        if estado_resolucion == "APROBADO":
            mensaje = f"Tu comentario (ID: {publicacion_id}) ha sido aprobado y es visible."
        else:
            mensaje = f"Tu comentario (ID: {publicacion_id}) ha sido rechazado. Contacta al docente si tienes dudas."
        
        return NotificacionService.crear_notificacion(
            db=db,
            usuario_id=usuario_id,
            tipo=TipoNotificacion.CASO_RESUELTO,
            mensaje=mensaje,
            publicacion_id=publicacion_id,
        )
    
    @staticmethod
    def obtener_notificaciones(
        db: Session,
        usuario_id: int,
        leidas: bool = None,
        limite: int = 50,
    ) -> list[Notificacion]:
        """
        Obtiene notificaciones de un usuario.
        
        Args:
            db: Sesión de base de datos
            usuario_id: ID del usuario
            leidas: Filtrar por estado (None = todas)
            limite: Número máximo de notificaciones
        
        Returns:
            Lista de notificaciones
        """
        query = db.query(Notificacion).filter(
            Notificacion.usuario_id == usuario_id
        )
        
        if leidas is not None:
            query = query.filter(Notificacion.leido == leidas)
        
        return query.order_by(Notificacion.creado_en.desc()).limit(limite).all()
    
    @staticmethod
    def marcar_como_leida(db: Session, notificacion_id: int) -> Notificacion:
        """Marca una notificación como leída."""
        notificacion = db.query(Notificacion).filter(
            Notificacion.id == notificacion_id
        ).first()
        
        if notificacion:
            notificacion.leido = True
            db.commit()
            db.refresh(notificacion)
        
        return notificacion
    
    @staticmethod
    def marcar_todas_leidas(db: Session, usuario_id: int) -> int:
        """Marca todas las notificaciones de un usuario como leídas."""
        notificaciones = db.query(Notificacion).filter(
            Notificacion.usuario_id == usuario_id,
            Notificacion.leido == False
        ).all()
        
        for notif in notificaciones:
            notif.leido = True
        
        db.commit()
        return len(notificaciones)
