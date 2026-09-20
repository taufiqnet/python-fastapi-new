import io
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.deps import get_current_user_optional, get_current_user
from app.database import Base, get_db, get_async_db
from app.main import app
from app.core.identity.models import User

TEST_DATABASE_FILE = "./test_shared_tenancy.db"

@pytest.fixture
def shared_db():
    import os
    from sqlalchemy import create_engine
    if os.path.exists(TEST_DATABASE_FILE):
        os.remove(TEST_DATABASE_FILE)

    sync_engine = create_engine(
        f"sqlite:///{TEST_DATABASE_FILE}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=sync_engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)
    session = TestingSession()

    async_engine = create_async_engine(f"sqlite+aiosqlite:///{TEST_DATABASE_FILE}", echo=False)
    AsyncTestingSession = sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

    yield session, AsyncTestingSession, sync_engine

    session.close()
    if os.path.exists(TEST_DATABASE_FILE):
        os.remove(TEST_DATABASE_FILE)


@pytest.mark.asyncio
async def test_business_crud_and_views(shared_db):
    sync_db, AsyncTestingSession, sync_engine = shared_db

    async with AsyncTestingSession() as async_session:
        def _override_get_db():
            yield sync_db

        async def _override_get_async_db():
            yield async_session

        app.dependency_overrides[get_db] = _override_get_db
        app.dependency_overrides[get_async_db] = _override_get_async_db

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            # 1. Create a new business
            payload = {
                "name_en": "Test Corp",
                "short_name": "TestCorp",
                "legal_name": "Test Corp Ltd.",
                "company_tagline": "Innovating the future",
                "description": "A test company profile",
                "cr_number": "CR-123456",
                "vat_number": "VAT-987654",
                "city": "Dhaka",
                "country": "Bangladesh",
                "email": "info@testcorp.com",
                "is_active": True,
            }

            create_res = await ac.post("/business/", json=payload)
            assert create_res.status_code == 201
            created_data = create_res.json()
            assert created_data["name_en"] == "Test Corp"
            assert "id" in created_data
            business_id = created_data["id"]

            # 2. Get business profile API
            get_res = await ac.get(f"/business/{business_id}")
            assert get_res.status_code == 200
            assert get_res.json()["cr_number"] == "CR-123456"

            # 3. List business profiles API
            list_res = await ac.get("/business/")
            assert list_res.status_code == 200
            items = list_res.json()
            assert any(b["id"] == business_id for b in items)

            # 4. Update business profile API
            payload["name_en"] = "Updated Test Corp"
            put_res = await ac.put(f"/business/{business_id}", json=payload)
            assert put_res.status_code == 200
            assert put_res.json()["name_en"] == "Updated Test Corp"

            # 5. Test HTML View routes
            page_res = await ac.get("/businesses/manage")
            assert page_res.status_code == 200
            assert "Updated Test Corp" in page_res.text

            create_page_res = await ac.get("/businesses/create")
            assert create_page_res.status_code == 200
            assert "Create Business Profile" in create_page_res.text or "Business Profile" in create_page_res.text

            detail_page_res = await ac.get(f"/businesses/{business_id}")
            assert detail_page_res.status_code == 200
            assert "Updated Test Corp" in detail_page_res.text

            # Edit Page with superuser
            superuser = User(id=99, username="superadmin", email="superadmin@example.com", is_superuser=True, is_active=True)
            app.dependency_overrides[get_current_user_optional] = lambda request=None: superuser

            edit_page_res = await ac.get(f"/businesses/{business_id}/edit")
            assert edit_page_res.status_code == 200
            assert "Edit Business Profile" in edit_page_res.text or "Business Profile" in edit_page_res.text

            # 6. Logo Upload & Remove Test
            user = User(id=10, username="tenantuser", email="tenant@example.com", business_id=business_id, is_active=True)
            app.dependency_overrides[get_current_user] = lambda: user

            image_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
            files = {"file": ("logo.png", io.BytesIO(image_content), "image/png")}

            upload_res = await ac.post("/business/my-profile/logo", files=files)
            assert upload_res.status_code == 200
            logo_url = upload_res.json()["logo"]
            assert logo_url and logo_url.startswith("/static/uploads/logos/")

            # Remove Logo
            remove_res = await ac.delete("/business/my-profile/logo")
            assert remove_res.status_code == 200
            assert remove_res.json()["logo"] is None

            # 7. Delete business profile API
            del_res = await ac.delete(f"/business/{business_id}")
            assert del_res.status_code == 204

            get_after_del = await ac.get(f"/business/{business_id}")
            assert get_after_del.status_code == 404

        app.dependency_overrides.clear()
