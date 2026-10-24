"""
REST API Router for System Test Seed Data Generation and One-Click Purge.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.core.identity.models import User
from app.database import get_db
from app.modules.system_seed.schemas import (
    SeedGenerateRequest,
    SeedOperationResponse,
    SeedPurgeRequest,
    SeedStatusResponse,
)
from app.modules.system_seed.service import SeedManagerService

router = APIRouter(prefix="/system/seed-data", tags=["System Seed Data"])


@router.get("/status", response_model=SeedStatusResponse)
def get_seed_status(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin),
):
    """
    Returns live count of active seed records per module and recent batch logs.
    Strictly scoped to the administrator's active business profile.
    """
    business_id = admin_user.business_id or 1
    return SeedManagerService.get_seed_status(db, business_id=business_id)


@router.post("/generate", response_model=SeedOperationResponse, status_code=status.HTTP_201_CREATED)
def generate_seed_data(
    payload: SeedGenerateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin),
):
    """
    Generates realistic Bangladeshi enterprise test seed data for the specified module (or all).
    Every created record is tracked in the central seed registry with [SEED] visual indicators.
    """
    business_id = admin_user.business_id or 1
    try:
        result = SeedManagerService.generate_module_seed(
            db=db,
            business_id=business_id,
            module=payload.module.lower(),
            user_id=admin_user.id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Seed generation failed: {str(e)}",
        )


@router.delete("/purge", response_model=SeedOperationResponse)
def purge_seed_data(
    module: str = Query("all", description="hrm, vehicles, ecommerce, finance, or all"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin),
):
    """
    Executes a guaranteed zero-orphan reverse-topological purge of seed records.
    Never touches real tenant or non-seed data.
    """
    business_id = admin_user.business_id or 1
    try:
        result = SeedManagerService.purge_module_seed(
            db=db,
            business_id=business_id,
            module=module.lower(),
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Seed purge failed: {str(e)}",
        )
