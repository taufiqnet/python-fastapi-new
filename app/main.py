from fastapi import FastAPI

from app.core.config import settings
from app.database import Base, engine
from app.modules.categories.models import Category  # noqa: F401
from app.modules.products.models import Product  # noqa: F401
from app.modules.sellers.models import Seller  # noqa: F401
from app.routers import auth, business, categories, products, tasks

try:
    Base.metadata.create_all(bind=engine)
except Exception:
    pass

app = FastAPI(
    title="E-Commerce API",
    version="1.0.0",
)

app.include_router(auth.router)
app.include_router(business.router)
app.include_router(categories.router)
app.include_router(products.router)
app.include_router(tasks.router)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.app_env,
    }
