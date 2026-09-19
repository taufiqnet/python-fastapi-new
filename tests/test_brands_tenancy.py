import io
import openpyxl
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.core.deps import get_current_user_optional, get_current_user
from app.core.identity.models import User
from app.core.tenancy.models import BusinessProfile

sync_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
SyncTestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=sync_engine
)


@pytest.fixture
def sync_db():
    Base.metadata.create_all(bind=sync_engine)
    db = SyncTestingSessionLocal()
    try:
        b1 = BusinessProfile(id=1, name_en="Business 1", subscription_plan_id=1)
        b2 = BusinessProfile(id=2, name_en="Business 2", subscription_plan_id=1)
        db.add_all([b1, b2])
        db.commit()
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=sync_engine)


@pytest_asyncio.fixture
async def setup_brand_tenants(sync_db):
    def _override_get_db():
        yield sync_db

    app.dependency_overrides[get_db] = _override_get_db

    superuser = User(
        id=1,
        username="superuser",
        email="super@example.com",
        is_active=True,
        is_superuser=True,
        business_id=1,
    )
    superuser.get_all_permission_codes = lambda: {
        "ecommerce:brands:view", "ecommerce:brands:create", "ecommerce:brands:update", "ecommerce:brands:delete"
    }
    superuser.has_permission = lambda code: True

    user_a = User(
        id=2,
        username="usera",
        email="usera@example.com",
        is_active=True,
        is_superuser=False,
        business_id=1,
    )
    user_a.get_all_permission_codes = lambda: {
        "ecommerce:brands:view", "ecommerce:brands:create", "ecommerce:brands:update", "ecommerce:brands:delete"
    }
    user_a.has_permission = lambda code: True

    user_b = User(
        id=3,
        username="userb",
        email="userb@example.com",
        is_active=True,
        is_superuser=False,
        business_id=2,
    )
    user_b.get_all_permission_codes = lambda: {
        "ecommerce:brands:view", "ecommerce:brands:create", "ecommerce:brands:update", "ecommerce:brands:delete"
    }
    user_b.has_permission = lambda code: True

    yield {
        "superuser": superuser,
        "user_a": user_a,
        "user_b": user_b,
        "sync_db": sync_db,
    }

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_brand_api_and_html_tenant_isolation(setup_brand_tenants):
    ctx = setup_brand_tenants
    superuser = ctx["superuser"]
    user_a = ctx["user_a"]
    user_b = ctx["user_b"]

    transport = ASGITransport(app=app)

    # 1. Superuser creates Brand 1 (Business 1) and Brand 2 (Business 2)
    app.dependency_overrides[get_current_user_optional] = lambda request=None: superuser
    app.dependency_overrides[get_current_user] = lambda request=None: superuser

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res_b1 = await ac.post("/brands/", json={
            "name": "Apple Biz 1",
            "slug": "apple-biz-1",
            "business_id": 1,
            "description": "Brand for business 1",
        })
        assert res_b1.status_code == 201, res_b1.text
        b1_id = res_b1.json()["id"]

        res_b2 = await ac.post("/brands/", json={
            "name": "Sony Biz 2",
            "slug": "sony-biz-2",
            "business_id": 2,
            "description": "Brand for business 2",
        })
        assert res_b2.status_code == 201, res_b2.text
        b2_id = res_b2.json()["id"]

    # 2. Test User A (Business 1, non-superuser)
    app.dependency_overrides[get_current_user_optional] = lambda request=None: user_a
    app.dependency_overrides[get_current_user] = lambda request=None: user_a

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # List brands via API: User A only sees Brand 1
        res_list = await ac.get("/brands/")
        assert res_list.status_code == 200
        b_ids = [b["id"] for b in res_list.json()]
        assert b1_id in b_ids
        assert b2_id not in b_ids

        # Query param business_id=2 is overridden by User A's business_id (1)
        res_param = await ac.get("/brands/?business_id=2")
        assert res_param.status_code == 200
        param_ids = [b["id"] for b in res_param.json()]
        assert b1_id in param_ids
        assert b2_id not in param_ids

        # Dropdown API for User A only returns Brand 1
        res_dd = await ac.get("/brands/dropdown")
        assert res_dd.status_code == 200
        dd_ids = [b["id"] for b in res_dd.json()]
        assert b1_id in dd_ids
        assert b2_id not in dd_ids

        # Accessing Brand 2 by ID returns 404 Not Found
        res_get2 = await ac.get(f"/brands/{b2_id}")
        assert res_get2.status_code == 404

        res_put2 = await ac.put(f"/brands/{b2_id}", json={"name": "Hacked Brand 2"})
        assert res_put2.status_code == 404

        res_del2 = await ac.delete(f"/brands/{b2_id}")
        assert res_del2.status_code == 404

        # Creating brand specifying business_id=2 forces business_id=1 for User A
        res_create = await ac.post("/brands/", json={
            "name": "Nike Biz 1",
            "slug": "nike-biz-1",
            "business_id": 2,
        })
        assert res_create.status_code == 201
        assert res_create.json()["business_id"] == 1

        # HTML listing page for User A
        res_html = await ac.get("/brands")
        assert res_html.status_code == 200
        assert "Apple Biz 1" in res_html.text
        assert "Sony Biz 2" not in res_html.text

        # HTML detail & edit pages for Brand 2 return 404 Not Found
        res_html_detail = await ac.get(f"/brands/detail/{b2_id}")
        assert res_html_detail.status_code == 404

        res_html_edit = await ac.get(f"/brands/edit/{b2_id}")
        assert res_html_edit.status_code == 404


@pytest.mark.asyncio
async def test_brand_excel_import_and_template_tenancy(setup_brand_tenants):
    ctx = setup_brand_tenants
    superuser = ctx["superuser"]
    user_a = ctx["user_a"]

    transport = ASGITransport(app=app)

    # 1. User A downloads template (business_id=2 is forced to business_id=1)
    app.dependency_overrides[get_current_user_optional] = lambda request=None: user_a
    app.dependency_overrides[get_current_user] = lambda request=None: user_a

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res_temp = await ac.get("/brands/template-excel?business_id=2")
        assert res_temp.status_code == 200
        assert "brand_template_business_1.xlsx" in res_temp.headers.get("content-disposition", "")

        # 2. Excel Import by User A
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["Brand Name", "Slug", "Logo URL", "Description"])
        ws.append(["Imported Brand A", "imported-brand-a", "", "Imported description"])

        file_stream = io.BytesIO()
        wb.save(file_stream)
        file_stream.seek(0)

        files = {"file": ("brands_import.xlsx", file_stream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        res_imp = await ac.post("/brands/import-excel?business_id=2", files=files)
        assert res_imp.status_code == 200, res_imp.text
        assert res_imp.json()["imported_count"] == 1

        # Verify imported brand belongs to User A's business (1)
        res_brands = await ac.get("/brands/")
        assert res_brands.status_code == 200
        imported_brand = next((b for b in res_brands.json() if b["slug"] == "imported-brand-a"), None)
        assert imported_brand is not None
        assert imported_brand["business_id"] == 1


@pytest.mark.asyncio
async def test_superuser_brands_access(setup_brand_tenants):
    ctx = setup_brand_tenants
    superuser = ctx["superuser"]

    transport = ASGITransport(app=app)

    app.dependency_overrides[get_current_user_optional] = lambda request=None: superuser
    app.dependency_overrides[get_current_user] = lambda request=None: superuser

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create for business 1
        res_b1 = await ac.post("/brands/", json={
            "name": "Super Brand Biz 1",
            "slug": "super-brand-biz-1",
            "business_id": 1,
        })
        assert res_b1.status_code == 201
        b1_id = res_b1.json()["id"]

        # Create for business 2
        res_b2 = await ac.post("/brands/", json={
            "name": "Super Brand Biz 2",
            "slug": "super-brand-biz-2",
            "business_id": 2,
        })
        assert res_b2.status_code == 201
        b2_id = res_b2.json()["id"]

        # Superuser lists all
        res_all = await ac.get("/brands/")
        assert res_all.status_code == 200
        all_ids = [b["id"] for b in res_all.json()]
        assert b1_id in all_ids
        assert b2_id in all_ids

        # Superuser filters by business_id=2
        res_biz2 = await ac.get("/brands/?business_id=2")
        assert res_biz2.status_code == 200
        biz2_ids = [b["id"] for b in res_biz2.json()]
        assert b2_id in biz2_ids
        assert b1_id not in biz2_ids

        # Superuser can access detail page for any business
        res_detail = await ac.get(f"/brands/detail/{b2_id}")
        assert res_detail.status_code == 200
        assert "Super Brand Biz 2" in res_detail.text
