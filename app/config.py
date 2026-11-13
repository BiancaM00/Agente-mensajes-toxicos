"""
Configuración de la aplicación FastAPI.
Carga variables de entorno desde .env
"""

from pydantic import BaseSettings
from functools import lru_cache
from pathlib import Path


class Settings(BaseSettings):
    """Configuración global de la aplicación."""
    
    # ─── Base de Datos ───
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "rau_toxicity"
    DB_USER: str = "rau_user"
    DB_PASSWORD: str = "your_secure_password"
    
    # ─── JWT ───
    JWT_SECRET_KEY: str = "your_super_secret_key_256bits_minimum_length"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 horas
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # ─── API de IA ───
    AI_PROVIDER: str = "openai"  # openai | perspective | huggingface
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "omni-moderation-latest"
    PERSPECTIVE_API_KEY: str = ""
    HUGGINGFACE_API_TOKEN: str = ""
    TOXICITY_WARNING_THRESHOLD: float = 0.2
    TOXICITY_MEDIUM_THRESHOLD: float = 0.55
    TOXICITY_THRESHOLD: float = 0.7
    
    # ─── App ───
    APP_ENV: str = "development"  # development | production
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:8000"
    
    # ─── Path ───
    BASE_DIR: Path = Path(__file__).parent.parent
    
    @property
    def DATABASE_URL(self) -> str:
        """Construye la URL de conexión a la BD."""
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Retorna la instancia singleton de configuración."""
    return Settings()
