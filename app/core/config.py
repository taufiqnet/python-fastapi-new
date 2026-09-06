from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"

    database_url: str

    app_host: str = "0.0.0.0"
    app_port: int = 8000

    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def async_database_url(self) -> str:
        return self.database_url.replace(
            "postgresql://",
            "postgresql+asyncpg://",
            1,
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()