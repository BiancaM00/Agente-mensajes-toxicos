"""Modelo de Refresh Token."""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime, timedelta


class RefreshToken(Base):
    """Tabla para almacenar refresh tokens (invalidación en logout)."""
    
    __tablename__ = "refresh_token"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    token_hash = Column(String(255), unique=True, nullable=False)
    expira_en = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.utcnow() + timedelta(days=7))
    revocado = Column(Boolean, default=False)
    
    # Relaciones
    usuario = relationship("Usuario", back_populates="refresh_tokens")
