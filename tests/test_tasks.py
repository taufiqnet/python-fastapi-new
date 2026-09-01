from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


from app.core.config import settings


def test_health_check():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "environment": settings.app_env}