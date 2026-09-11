from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application
    app_env: str = "development"

    # Database
    database_url: str

    # Server
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    # Authentication
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # OpenRouter
    openrouter_api_key: str
    openrouter_model: str = "openrouter/free"
    openrouter_models: str = "openrouter/free"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def async_database_url(self) -> str:
        if self.database_url.startswith("sqlite://") and not self.database_url.startswith("sqlite+aiosqlite://"):
            return self.database_url.replace("sqlite://", "sqlite+aiosqlite://", 1)
        return self.database_url.replace(
            "postgresql://",
            "postgresql+asyncpg://",
            1,
        )

    @property
    def openrouter_model_list(self) -> list[str]:
        return [m.strip() for m in self.openrouter_models.split(",") if m.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()