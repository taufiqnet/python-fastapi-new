from fastapi import FastAPI
from app.database import Base, engine

from app.core.config import settings
from app.routers import auth, business, tasks

try:
    Base.metadata.create_all(bind=engine)
except Exception:
    pass

app = FastAPI(
    title="Task Management API",
    version="1.0.0",
)

app.include_router(auth.router)
app.include_router(business.router)
app.include_router(tasks.router)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.app_env,
    }