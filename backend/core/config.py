import os
from pydantic import BaseModel


class Settings(BaseModel):
    APP_ENV: str = os.getenv("APP_ENV", "development")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "postgresql://app_user:change-me@localhost:5432/postgres"
    )
    DATABASE_ADMIN_URL: str = os.getenv("DATABASE_ADMIN_URL", "")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = int(os.getenv("JWT_EXPIRY_MINUTES", "480"))
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://localhost:8080,http://127.0.0.1:8080",
    )
    AI_BUDGET_SECONDS: float = float(os.getenv("AI_BUDGET_SECONDS", "8"))
    AI_CACHE_TTL_SECONDS: int = int(os.getenv("AI_CACHE_TTL_SECONDS", "60"))

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()
        ]

    def require_jwt_secret(self) -> str:
        if self.JWT_SECRET:
            return self.JWT_SECRET
        if self.APP_ENV == "production":
            raise RuntimeError("JWT_SECRET must be set in production")
        return "dev-only-not-for-production"


settings = Settings()
