from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base backend directory containing .env
BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    """
    Application Settings loaded from environment or .env file.
    Provides typed, validated configuration parameters.
    """
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    MONGODB_URI: str = "mongodb://localhost:27017"
    DB_NAME: str = "dsa_tracker"

    JWT_SECRET: str = "super_secret_jwt_key_for_dsa_tracker_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours


settings = Settings()
