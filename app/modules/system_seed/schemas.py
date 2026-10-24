"""
Pydantic schemas for System Seed Data operations.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SeedGenerateRequest(BaseModel):
    module: str = Field(default="all", description="Target module: hrm, vehicles, ecommerce, finance, or all")


class SeedPurgeRequest(BaseModel):
    module: str = Field(default="all", description="Target module: hrm, vehicles, ecommerce, finance, or all")


class SeedBatchSummary(BaseModel):
    id: str
    module: str
    status: str
    record_count: int
    created_at: Optional[str] = None
    metadata_info: Optional[Dict[str, Any]] = None


class SeedStatusResponse(BaseModel):
    business_id: int
    counts: Dict[str, int]
    recent_batches: List[SeedBatchSummary]


class SeedOperationResponse(BaseModel):
    message: str
    total_records: Optional[int] = None
    total_purged: Optional[int] = None
    modules: Optional[Dict[str, Any]] = None
    details: Optional[Dict[str, Any]] = None
