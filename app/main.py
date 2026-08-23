from fastapi import FastAPI
from app.database import Base, engine

from app.core.config import settings
from app.routers import tasks

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Task Management API",
    version="1.0.0",
)

app.include_router(tasks.router)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.app_env,
    }